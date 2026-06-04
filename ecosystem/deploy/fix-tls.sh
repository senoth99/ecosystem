#!/usr/bin/env bash
# Сброс ACME (в т.ч. старый ZeroSSL) и перезапуск Caddy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env)

docker_volume() {
  local suffix="$1"
  local vol
  vol="$(docker volume ls -q --filter "name=${suffix}" 2>/dev/null | head -1)"
  if [[ -z "$vol" ]]; then
    vol="casher-ecosystem_${suffix}"
  fi
  echo "$vol"
}

wipe_volume() {
  local vol="$1"
  local mount="$2"
  echo "    очистка тома $vol ($mount)"
  docker run --rm -v "${vol}:${mount}" alpine:3.20 \
    sh -c "rm -rf ${mount}/caddy 2>/dev/null; mkdir -p ${mount}/caddy; true"
}

echo "==> Остановка Caddy..."
"${COMPOSE[@]}" stop caddy 2>/dev/null || true

echo "==> Полная очистка данных Caddy (acme, certificates, zerossl)..."
wipe_volume "$(docker_volume caddy_data)" /data
wipe_volume "$(docker_volume caddy_config)" /config

echo "==> Запуск Caddy (Let's Encrypt)..."
"${COMPOSE[@]}" up -d --force-recreate caddy

echo ""
echo "==> Ждём выдачу сертификата (45 с)..."
sleep 45
"${COMPOSE[@]}" logs caddy --tail 30
