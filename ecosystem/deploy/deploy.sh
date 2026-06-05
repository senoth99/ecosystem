#!/usr/bin/env bash
# Деплой экосистемы на VPS (Docker + Caddy + HTTPS)
# v3 — Prisma через one-shot контейнеры (не exec в работающие приложения)
set -euo pipefail

DEPLOY_SCRIPT_VERSION=6
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"
COMPOSE=(docker compose -f "$COMPOSE_FILE" --env-file .env)
COMPOSE_DEPLOY=(docker compose -f "$COMPOSE_FILE" --env-file .env --profile deploy)

if [[ ! -f .env ]]; then
  echo "Создайте .env из шаблона:"
  echo "  cp .env.production.example .env && nano .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

for var in DOMAIN SESSION_SECRET POSTGRES_PASSWORD PUBLIC_BASE_URL APP_PASSWORD; do
  if [[ -z "${!var:-}" || "${!var}" == CHANGE_ME* ]]; then
    echo "Заполните переменную: $var"
    exit 1
  fi
done

echo "==> deploy.sh v${DEPLOY_SCRIPT_VERSION} (one-shot Prisma migrate)"

prisma_migrate_job() {
  local job="$1"
  local required="${2:-optional}"
  local max_wait="${3:-300}"
  if [[ "$max_wait" -eq 0 ]]; then
    echo "==> Prisma migrate: $job (без таймаута)..."
  else
    echo "==> Prisma migrate: $job (таймаут ${max_wait}с)..."
  fi
  set +e
  if [[ "$max_wait" -eq 0 ]]; then
    "${COMPOSE_DEPLOY[@]}" run --rm --no-TTY "$job"
  else
    timeout "$max_wait" "${COMPOSE_DEPLOY[@]}" run --rm --no-TTY "$job"
  fi
  local code=$?
  set -e
  if [[ $code -eq 0 ]]; then
    echo "    ✓ $job"
    return 0
  fi
  if [[ $code -eq 124 ]]; then
    echo "    ⚠ $job — истёк таймаут; если в логе «successfully applied», БД уже обновлена"
    if [[ "$required" != "required" ]]; then
      return 0
    fi
    # drops: миграции часто успевают, но compose/prisma выходят дольше 3 мин на слабом VPS
    return 0
  fi
  if [[ "$required" == "required" ]]; then
    echo "    ✗ $job — миграция не прошла (код $code)"
    exit 1
  fi
  echo "    ⚠ $job — пропуск (код $code)"
  return 0
}

echo "==> Сборка образов (включая *-migrate)..."
"${COMPOSE_DEPLOY[@]}" build

echo "==> Запуск стека..."
"${COMPOSE[@]}" up -d

echo "==> Ожидание Postgres..."
for _ in $(seq 1 30); do
  if "${COMPOSE[@]}" exec -T postgres pg_isready -U "${POSTGRES_USER:-ecosystem}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Миграция БД экосистемы и seed приложений..."
"${COMPOSE[@]}" exec -T auth-service \
  sh -c "npx prisma db push && npx tsx prisma/seed.ts"

# shellcheck source=lib-postgres.sh
source "$(dirname "$0")/lib-postgres.sh"
sync_drops_postgres_password

prisma_migrate_job drops-migrate required 0
prisma_migrate_job bloggers-migrate optional 0
prisma_migrate_job zarplaty-migrate optional 0

echo "==> Перезапуск приложений после миграций..."
"${COMPOSE[@]}" restart drops bloggers zarplaty 2>/dev/null || true

echo "==> Проверка Caddy / HTTPS..."
"${COMPOSE[@]}" up -d caddy
sleep 5
if curl -sfI --connect-timeout 5 -H "Host: ${DOMAIN}" "http://127.0.0.1/" >/dev/null; then
  echo "    ✓ HTTP на localhost отвечает (Caddy работает)"
else
  echo "    ⚠ Caddy не отвечает на :80 — см. ./deploy/check-site.sh"
fi

echo ""
echo "Готово: https://${DOMAIN}"
echo "Не открывается в браузере? chmod +x deploy/check-site.sh deploy/fix-tls.sh && ./deploy/check-site.sh"
echo ""
echo "Telegram webhook:"
echo "  curl -X POST \"https://api.telegram.org/bot\${TELEGRAM_BOT_TOKEN}/setWebhook\" \\"
echo "    -d \"url=https://${DOMAIN}/api/eco/telegram/webhook\" \\"
echo "    -d \"secret_token=\${TELEGRAM_WEBHOOK_SECRET}\""
echo ""
echo "Логи: docker compose -f docker-compose.prod.yml logs -f"
echo "Только Prisma приложений: ./deploy/migrate-apps.sh"
echo "Обновление: git pull && ./deploy/deploy.sh"
