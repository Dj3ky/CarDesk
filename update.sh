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

# Resolve the project root from the script's own location so paths are correct
# regardless of what cwd the caller set.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

[[ ! -f .env.local ]] && error ".env.local not found. Run install.sh first."

# ─────────────────────────────────────────────
# BOOTSTRAP: git pull first, then re-exec with the updated script.
#
# Bash reads (and buffers) the entire script file before executing it, so any
# changes that git pull writes to update.sh are invisible in the current run.
# Re-exec-ing after pull starts a fresh bash that reads the new file from disk.
# The env var guard prevents infinite recursion.
# ─────────────────────────────────────────────
if [[ "${_CARDESK_REEXEC:-}" != "1" ]]; then
  # Rescue uploads before wiping standalone.
  # standalone/server.js calls process.chdir(__dirname), so cwd becomes .next/standalone/
  # and uploads land inside it — rm -rf .next/standalone would delete them all.
  if [[ -d .next/standalone/uploads ]]; then
    info "Rescuing uploaded files from .next/standalone/uploads …"
    mkdir -p uploads
    cp -rn .next/standalone/uploads/. uploads/ 2>/dev/null || true
  fi

  rm -rf .next/standalone

  section "Pulling latest code"
  if git rev-parse --is-inside-work-tree &>/dev/null; then
    info "Fetching from git …"
    git fetch origin master
    git reset --hard origin/master
    success "Code updated"
  else
    warn "Not a git repository — skipping git pull"
  fi

  export _CARDESK_REEXEC=1
  exec bash "$SCRIPT_DIR/update.sh" "$@"
fi

# ── Everything below runs in the re-exec'd invocation with the fresh script ──

# ─────────────────────────────────────────────
section "Installing dependencies"
# ─────────────────────────────────────────────

info "Running npm install …"
npm install --include=dev
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
echo "  cwd: $(pwd)  schema: $(ls prisma/schema.prisma 2>/dev/null && echo OK || echo MISSING)"
node_modules/.bin/prisma generate

DB_URL=$(grep -E '^DATABASE_URL=' .env.local | cut -d'=' -f2- | tr -d '"')
if [[ -d prisma/migrations ]] && compgen -G "prisma/migrations/*/migration.sql" > /dev/null 2>&1; then
  info "Applying migrations …"
  DATABASE_URL="$DB_URL" node_modules/.bin/prisma migrate deploy
else
  info "No migrations found — pushing schema to database …"
  DATABASE_URL="$DB_URL" node_modules/.bin/prisma db push --accept-data-loss
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

# Migrate any legacy files that were saved to public/uploads/ (old code path)
if [[ -d public/uploads ]]; then
  mkdir -p uploads
  cp -n public/uploads/* uploads/ 2>/dev/null || true
fi

# Ensure UPLOADS_DIR is set to an absolute path in .env.local so the app
# always finds uploads regardless of what cwd the standalone server uses.
if ! grep -q '^UPLOADS_DIR=' .env.local; then
  echo "" >> .env.local
  echo "# Uploads — absolute path so files survive rebuilds" >> .env.local
  echo "UPLOADS_DIR=$(pwd)/uploads" >> .env.local
  info "Added UPLOADS_DIR=$(pwd)/uploads to .env.local"
fi

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
