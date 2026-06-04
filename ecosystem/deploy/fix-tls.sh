#!/usr/bin/env bash
# Сброс ACME (в т.ч. старый ZeroSSL) и перезапуск Caddy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env)

echo "==> Остановка Caddy..."
"${COMPOSE[@]}" stop caddy 2>/dev/null || true

echo "==> Полная очистка данных Caddy (acme, certificates, zerossl)..."
"${COMPOSE[@]}" run --rm -v casher-ecosystem_caddy_data:/data alpine \
  sh -c 'rm -rf /data/caddy 2>/dev/null; mkdir -p /data/caddy; true'

"${COMPOSE[@]}" run --rm -v casher-ecosystem_caddy_config:/config alpine \
  sh -c 'rm -rf /config/caddy 2>/dev/null; mkdir -p /config/caddy; true'

echo "==> Запуск Caddy (Let's Encrypt)..."
"${COMPOSE[@]}" up -d --force-recreate caddy

echo ""
echo "==> Ждём выдачу сертификата (45 с)..."
echo "    Пока порты 80/443 закрыты снаружи — будет Timeout during connect."
sleep 45
"${COMPOSE[@]}" logs caddy --tail 30
