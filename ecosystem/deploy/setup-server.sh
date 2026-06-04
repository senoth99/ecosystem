#!/usr/bin/env bash
# Однократная подготовка Ubuntu/Debian VPS
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запустите с sudo"
  exit 1
fi

apt-get update
apt-get install -y ca-certificates curl git

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker
systemctl start docker

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin || true
fi

echo "Docker: $(docker --version)"
echo "Compose: $(docker compose version)"

ufw allow 22/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

echo "Сервер готов. Далее:"
echo "  git clone <repo> /opt/casher-ecosystem"
echo "  cd /opt/casher-ecosystem/ecosystem"
echo "  cp .env.production.example .env && nano .env"
echo "  ./deploy/deploy.sh"
