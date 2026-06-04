#!/usr/bin/env bash
# Деплой экосистемы на VPS (Docker + Caddy + HTTPS)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Создайте .env из шаблона:"
  echo "  cp .env.production.example .env && nano .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

for var in DOMAIN SESSION_SECRET POSTGRES_PASSWORD PUBLIC_BASE_URL TELEGRAM_BOT_TOKEN; do
  if [[ -z "${!var:-}" || "${!var}" == CHANGE_ME* ]]; then
    echo "Заполните переменную: $var"
    exit 1
  fi
done

echo "==> Сборка образов..."
docker compose -f docker-compose.prod.yml --env-file .env build

echo "==> Запуск стека..."
docker compose -f docker-compose.prod.yml --env-file .env up -d

echo "==> Ожидание Postgres..."
sleep 8

echo "==> Миграция БД экосистемы и seed приложений..."
docker compose -f docker-compose.prod.yml --env-file .env exec -T auth-service \
  sh -c "npx prisma db push && npx tsx prisma/seed.ts"

echo "==> Prisma/SQLite в приложениях (таймаут 3 мин на сервис)..."
# Сайт уже поднят после 'up -d'; этот шаг можно прервать Ctrl+C — на HTTPS не влияет.
prisma_sqlite_push() {
  local svc="$1"
  echo "    → $svc"
  timeout 180 docker compose -f docker-compose.prod.yml --env-file .env exec -T "$svc" \
    sh -c "npx prisma db push" 2>/dev/null || echo "    ⚠ $svc: пропуск (таймаут или не нужен)"
}
prisma_sqlite_push drops
prisma_sqlite_push bloggers
prisma_sqlite_push zarplaty

echo ""
echo "Готово: https://${DOMAIN}"
echo ""
echo "Telegram webhook:"
echo "  curl -X POST \"https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/setWebhook\" \\"
echo "    -d \"url=https://${DOMAIN}/api/eco/telegram/webhook\" \\"
echo "    -d \"secret_token=\${TELEGRAM_WEBHOOK_SECRET}\""
echo ""
echo "Логи: docker compose -f docker-compose.prod.yml logs -f"
echo "Обновление: git pull && ./deploy/deploy.sh"
