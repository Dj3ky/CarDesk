#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
#  CarDesk — Update Script
#  Pulls latest code, migrates DB, rebuilds
# ─────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▸ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }
section() { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }

echo -e "${BOLD}  CarDesk Update${RESET}"
echo ""

[[ ! -f .env.local ]] && error ".env.local not found. Run install.sh first."

# When run from the Next.js standalone server via the UI, the process inherits
# NODE_PATH pointing at .next/standalone/node_modules/. Unset it so that npm,
# prisma, and node all resolve modules from the project root instead.
unset NODE_PATH NODE_OPTIONS

# Remove stale standalone build BEFORE git pull so this runs even when bash
# has buffered the old version of this script. The corrupted Prisma files
# inside .next/standalone/node_modules/ cause npm postinstall to fail.
rm -rf .next/standalone

# ─────────────────────────────────────────────
section "Pulling latest code"
# ─────────────────────────────────────────────

if git rev-parse --is-inside-work-tree &>/dev/null; then
  info "Fetching from git …"
  git pull
  success "Code updated"
else
  warn "Not a git repository — skipping git pull"
fi

# ─────────────────────────────────────────────
section "Installing dependencies"
# ─────────────────────────────────────────────

info "Running npm install …"
npm install --ignore-scripts --prefix .
success "Dependencies up to date"

# ─────────────────────────────────────────────
section "Database"
# ─────────────────────────────────────────────

if [[ -f .env.local ]]; then
  DB_URL=$(grep -E '^DATABASE_URL=' .env.local | cut -d'=' -f2- | tr -d '"')
  DB_NAME_FROM_URL=$(echo "$DB_URL" | sed -E 's|.*\/([^?]+).*|\1|')
  if [[ -n "$DB_NAME_FROM_URL" ]]; then
    info "Ensuring pg_trgm extension …"
    sudo -u postgres psql -d "$DB_NAME_FROM_URL" -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;" 2>/dev/null || true
  fi
fi

info "Generating Prisma client …"
npm run db:generate

if [[ -d prisma/migrations ]] && compgen -G "prisma/migrations/*/migration.sql" > /dev/null 2>&1; then
  info "Applying migrations …"
  npm run db:migrate:deploy
else
  info "No migrations found — pushing schema to database …"
  npx prisma db push --accept-data-loss
fi
success "Database up to date"

# ─────────────────────────────────────────────
section "Building"
# ─────────────────────────────────────────────

info "Building Next.js app …"
NODE_ENV=production npm run build
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
success "Build complete"

# ─────────────────────────────────────────────
section "Restarting service"
# ─────────────────────────────────────────────

if systemctl is-active --quiet cardesk 2>/dev/null; then
  info "Restarting cardesk service …"
  if [[ $EUID -ne 0 ]]; then
    sudo systemctl restart cardesk
  else
    systemctl restart cardesk
  fi
  sleep 2
  systemctl is-active --quiet cardesk && success "Service restarted" || warn "Service may have failed — check: journalctl -u cardesk -n 50"
else
  warn "cardesk service not active"
  echo -e "  Start with: ${BOLD}npm run start${RESET}  or  ${BOLD}sudo systemctl start cardesk${RESET}"
fi

echo ""
success "CarDesk updated"
echo ""
