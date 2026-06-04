#!/usr/bin/env bash
# Диагностика: почему не открывается https://DOMAIN
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE=(docker compose -f docker-compose.prod.yml --env-file .env)

[[ -f .env ]] && source .env

domain="${DOMAIN:-eco.cashercollection.com}"
echo "=== Проверка сайта: $domain ==="
echo ""

echo "--- docker compose ps (caddy, portal, drops) ---"
"${COMPOSE[@]}" ps caddy portal drops auth-service 2>/dev/null || "${COMPOSE[@]}" ps
echo ""

echo "--- порты 80/443 на хосте ---"
ss -tlnp 2>/dev/null | grep -E ':80 |:443 ' || netstat -tlnp 2>/dev/null | grep -E ':80 |:443 ' || echo "(ss/netstat недоступны)"
echo ""

echo "--- curl localhost:80 ---"
curl -sI --connect-timeout 3 http://127.0.0.1/ 2>&1 | head -8 || echo "нет ответа на :80"
echo ""

echo "--- curl localhost с Host: $domain ---"
curl -sI --connect-timeout 3 -H "Host: $domain" http://127.0.0.1/ 2>&1 | head -8 || echo "нет ответа"
echo ""

echo "--- последние логи Caddy (TLS / ACME) ---"
"${COMPOSE[@]}" logs caddy --tail 40 2>&1 || true
echo ""

echo "--- .env DOMAIN / PUBLIC_BASE_URL ---"
grep -E '^DOMAIN=|^PUBLIC_BASE_URL=' .env 2>/dev/null || true
echo ""
echo "Если с сервера curl OK, а с браузера нет — откройте 80/tcp и 443/tcp в файрволе Timeweb (панель VPS)."
echo "Сброс TLS: ./deploy/fix-tls.sh && docker compose -f docker-compose.prod.yml up -d caddy"
