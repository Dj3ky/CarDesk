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

info "Running npm ci …"
npm ci --prefer-offline 2>&1 | tail -3
success "Dependencies up to date"

# ─────────────────────────────────────────────
section "Database"
# ─────────────────────────────────────────────

info "Generating Prisma client …"
npm run db:generate

info "Applying migrations …"
npm run db:migrate:deploy
success "Database up to date"

# ─────────────────────────────────────────────
section "Building"
# ─────────────────────────────────────────────

info "Building Next.js app …"
NODE_ENV=production npm run build
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
