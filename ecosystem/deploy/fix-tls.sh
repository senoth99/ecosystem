#!/usr/bin/env bash
# Сброс ACME/Caddy и перезапуск (если сертификат не выдался)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env)

echo "==> Остановка Caddy..."
"${COMPOSE[@]}" stop caddy

echo "==> Очистка ACME-кэша..."
"${COMPOSE[@]}" run --rm -v casher-ecosystem_caddy_data:/data alpine \
  sh -c 'rm -rf /data/caddy/acme/* /data/caddy/certificates/* /data/caddy/locks/* 2>/dev/null; true'

"${COMPOSE[@]}" exec caddy rm -f /config/caddy/autosave.json 2>/dev/null || true

echo "==> Запуск Caddy..."
"${COMPOSE[@]}" up -d caddy

echo "==> Ждём сертификат (30 с)..."
sleep 30
"${COMPOSE[@]}" logs caddy --tail 25
