#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
#  CarDesk — Full Automated Installer
#  Supports: Ubuntu 20.04/22.04/24.04, Debian 11/12
#  Installs: Node.js 20, PostgreSQL 16, CarDesk app
#  Run as root or with sudo privileges
# ─────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▸ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }
section() { echo -e "\n${BOLD}━━━ $* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"; }

echo -e "${CYAN}${BOLD}"
echo "   ██████╗ █████╗ ██████╗ ██████╗ ███████╗███████╗██╗  ██╗"
echo "  ██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔════╝██║ ██╔╝"
echo "  ██║     ███████║██████╔╝██║  ██║█████╗  ███████╗█████╔╝ "
echo "  ██║     ██╔══██║██╔══██╗██║  ██║██╔══╝  ╚════██║██╔═██╗ "
echo "  ╚██████╗██║  ██║██║  ██║██████╔╝███████╗███████║██║  ██╗"
echo "   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝"
echo -e "${RESET}"
echo -e "  ${BOLD}Full Installer — Node.js · PostgreSQL · CarDesk${RESET}"
echo ""

# ─────────────────────────────────────────────
# Root check
# ─────────────────────────────────────────────

if [[ $EUID -ne 0 ]]; then
  error "This installer must be run as root.\n  Run: sudo bash install.sh"
fi

# ─────────────────────────────────────────────
section "Detecting OS"
# ─────────────────────────────────────────────

if [[ ! -f /etc/os-release ]]; then
  error "Cannot detect OS. /etc/os-release not found."
fi

source /etc/os-release
OS_ID="${ID:-unknown}"
OS_CODENAME="${VERSION_CODENAME:-}"

case "$OS_ID" in
  ubuntu|debian) ;;
  *) error "Unsupported OS: $OS_ID. This installer supports Ubuntu and Debian." ;;
esac

success "Detected: $PRETTY_NAME"

# ─────────────────────────────────────────────
section "Collecting configuration"
# ─────────────────────────────────────────────

if [[ -f .env.local ]]; then
  warn ".env.local already exists — environment setup will be skipped"
  SKIP_ENV=true
else
  SKIP_ENV=false

  echo ""
  echo -e "  ${BOLD}PostgreSQL database name${RESET} [cardesk_db]:"
  read -rp "  > " DB_NAME
  DB_NAME="${DB_NAME:-cardesk_db}"

  echo ""
  echo -e "  ${BOLD}PostgreSQL user${RESET} [cardesk]:"
  read -rp "  > " DB_USER
  DB_USER="${DB_USER:-cardesk}"

  echo ""
  echo -e "  ${BOLD}PostgreSQL password${RESET} (leave blank to auto-generate):"
  read -rsp "  > " DB_PASS
  echo ""
  if [[ -z "$DB_PASS" ]]; then
    DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
    info "Generated DB password: ${BOLD}${DB_PASS}${RESET}"
  fi

  echo ""
  echo -e "  ${BOLD}App URL${RESET} (e.g. https://cardesk.example.com or http://YOUR-SERVER-IP:3000):"
  read -rp "  > " APP_URL
  APP_URL="${APP_URL:-http://localhost:3000}"

  echo ""
  echo -e "  ${BOLD}App port${RESET} [3000]:"
  read -rp "  > " APP_PORT
  APP_PORT="${APP_PORT:-3000}"
fi

# ─────────────────────────────────────────────
section "System packages"
# ─────────────────────────────────────────────

info "Updating apt package list …"
apt-get update -qq

info "Installing base packages …"
apt-get install -y -qq \
  curl \
  gnupg \
  ca-certificates \
  lsb-release \
  openssl \
  git \
  unzip \
  build-essential

success "Base packages ready"

# ─────────────────────────────────────────────
section "Node.js 20"
# ─────────────────────────────────────────────

NEED_NODE=true
if command -v node &>/dev/null; then
  CURRENT_NODE=$(node -e "console.log(parseInt(process.versions.node.split('.')[0]))")
  if [[ "$CURRENT_NODE" -ge 20 ]]; then
    success "Node.js $(node --version) already installed"
    NEED_NODE=false
  else
    warn "Node.js $(node --version) found — upgrading to v20"
  fi
fi

if [[ "$NEED_NODE" == true ]]; then
  info "Adding NodeSource repository (Node.js 20) …"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &>/dev/null
  apt-get install -y -qq nodejs
  success "Node.js $(node --version) installed"
fi

# ─────────────────────────────────────────────
section "PostgreSQL 16"
# ─────────────────────────────────────────────

NEED_PG=true
if command -v psql &>/dev/null; then
  PG_VER=$(psql --version | grep -oP '\d+' | head -1)
  if [[ "$PG_VER" -ge 15 ]]; then
    success "PostgreSQL $PG_VER already installed"
    NEED_PG=false
  else
    warn "PostgreSQL $PG_VER found — upgrading to 16"
  fi
fi

if [[ "$NEED_PG" == true ]]; then
  info "Adding PostgreSQL official repository …"
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /usr/share/keyrings/postgresql-archive-keyring.gpg

  echo "deb [signed-by=/usr/share/keyrings/postgresql-archive-keyring.gpg] \
https://apt.postgresql.org/pub/repos/apt ${OS_CODENAME}-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list

  apt-get update -qq
  apt-get install -y -qq postgresql-16
  systemctl enable postgresql
  systemctl start postgresql
  success "PostgreSQL 16 installed and running"
fi

# ─────────────────────────────────────────────
section "Database setup"
# ─────────────────────────────────────────────

if [[ "$SKIP_ENV" == false ]]; then
  info "Creating PostgreSQL user and database …"

  sudo -u postgres psql -c \
    "DO \$\$ BEGIN
       IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
         CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
       END IF;
     END \$\$;" 2>/dev/null

  sudo -u postgres psql -c \
    "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" \
    | grep -q 1 || \
  sudo -u postgres psql -c \
    "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

  sudo -u postgres psql -c \
    "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

  success "Database '${DB_NAME}' and user '${DB_USER}' ready"
else
  info "Skipping DB creation (.env.local already exists)"
fi

# ─────────────────────────────────────────────
section "Environment configuration"
# ─────────────────────────────────────────────

if [[ "$SKIP_ENV" == false ]]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  DB_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"

  cat > .env.local <<EOF
# Database
DATABASE_URL="${DB_URL}"

# Auth.js
AUTH_SECRET="${AUTH_SECRET}"
AUTH_URL="${APP_URL}"

# App
NEXT_PUBLIC_APP_URL="${APP_URL}"
NEXT_PUBLIC_APP_NAME="CarDesk"
PORT=${APP_PORT}
EOF

  # .env for Prisma CLI
  cat > .env <<EOF
DATABASE_URL="${DB_URL}"
EOF

  success ".env.local created"
else
  warn "Skipped — using existing .env.local"
fi

# ─────────────────────────────────────────────
section "Installing Node.js dependencies"
# ─────────────────────────────────────────────

if [[ -f package-lock.json ]]; then
  info "Running npm ci …"
  npm ci 2>&1 | tail -5
else
  info "No lock file found — running npm install to generate one …"
  npm install 2>&1 | tail -5
  warn "Lock file generated. Commit package-lock.json to git for reproducible installs."
fi
success "Dependencies installed"

# ─────────────────────────────────────────────
section "Prisma — generate & migrate"
# ─────────────────────────────────────────────

info "Generating Prisma client …"
npm run db:generate

info "Applying database migrations …"
npm run db:migrate:deploy

info "Seeding default users …"
npm run db:seed

success "Database ready"

# ─────────────────────────────────────────────
section "Building application"
# ─────────────────────────────────────────────

info "Building Next.js app (may take 1–2 minutes) …"
NODE_ENV=production npm run build
success "Build complete"

# ─────────────────────────────────────────────
section "Systemd service"
# ─────────────────────────────────────────────

INSTALL_DIR="$(pwd)"
APP_USER="${SUDO_USER:-$(whoami)}"
SERVICE_FILE="/etc/systemd/system/cardesk.service"

# Determine port from .env.local
APP_PORT_FINAL=$(grep -E '^PORT=' .env.local | cut -d= -f2 | tr -d '"' || echo "3000")
APP_PORT_FINAL="${APP_PORT_FINAL:-3000}"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=CarDesk
Documentation=https://github.com/your-org/cardesk
After=network.target postgresql.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(which node) ${INSTALL_DIR}/.next/standalone/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cardesk

Environment=NODE_ENV=production
Environment=PORT=${APP_PORT_FINAL}
Environment=HOSTNAME=0.0.0.0
EnvironmentFile=${INSTALL_DIR}/.env.local

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cardesk
systemctl start cardesk

sleep 2
if systemctl is-active --quiet cardesk; then
  success "CarDesk service started"
else
  warn "Service may have failed to start. Check: journalctl -u cardesk -n 50"
fi

# ─────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────

APP_URL_FINAL=$(grep -E '^AUTH_URL=' .env.local | cut -d= -f2 | tr -d '"' || echo "http://localhost:3000")

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗"
echo -e "║     CarDesk installed successfully!     ║"
echo -e "╚══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}URL:${RESET}              ${APP_URL_FINAL}"
echo -e "  ${BOLD}Service:${RESET}          systemctl status cardesk"
echo -e "  ${BOLD}Logs:${RESET}             journalctl -u cardesk -f"
echo ""
echo -e "  ${BOLD}Default logins:${RESET}"
echo -e "  Admin       admin@cardesk.com    / Admin@123"
echo -e "  Employee    employee@cardesk.com / Employee@123"
echo ""
echo -e "  ${YELLOW}${BOLD}Change default passwords after first login!${RESET}"

if [[ "$SKIP_ENV" == false ]]; then
  echo ""
  echo -e "  ${BOLD}DB credentials saved to .env.local${RESET}"
  echo -e "  DB name:   ${DB_NAME}"
  echo -e "  DB user:   ${DB_USER}"
  echo -e "  DB pass:   ${DB_PASS}"
  echo -e "  ${YELLOW}Store these credentials securely.${RESET}"
fi

echo ""
