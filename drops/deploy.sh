#!/usr/bin/env bash
# Точка входа: сборка и запуск панели DROPS (Next.js в ./web).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB="$ROOT/web"
COMPOSE_FILE="$ROOT/docker-compose.yml"

usage() {
  cat <<'EOF'
DROPS — сборка и запуск (Next.js в ./web).

Команды:
  (по умолчанию)  — то же, что start
  install         — npm ci в web/
  build           — prisma migrate deploy + production build (без сервера)
  start           — Postgres (docker) при необходимости, install, migrate, build, next start
  dev             — Postgres + next dev
  help            — эта справка

Переменные:
  SKIP_COMPOSE=1  — не поднимать docker compose (Postgres уже запущен отдельно)
  PORT            — порт для next start / next dev (по умолчанию 3000; см. next start --help)
EOF
}

require_env_file() {
  if [[ ! -f "$WEB/.env" ]]; then
    echo "Ошибка: нет $WEB/.env — скопируйте из $WEB/.env.example и задайте DATABASE_URL, APP_PASSWORD, SESSION_SECRET." >&2
    exit 1
  fi
}

compose_up() {
  if [[ "${SKIP_COMPOSE:-}" == "1" ]]; then
    echo "SKIP_COMPOSE=1 — пропускаю docker compose."
    return 0
  fi
  if ! command -v docker >/dev/null 2>&1; then
    echo "Ошибка: docker не найден. Установите Docker или задайте SKIP_COMPOSE=1 и укажите внешний Postgres в DATABASE_URL." >&2
    exit 1
  fi
  docker compose -f "$COMPOSE_FILE" up -d
  echo "Ожидание готовности Postgres..."
  local i=0
  while [[ $i -lt 45 ]]; do
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U drops -d drops >/dev/null 2>&1; then
      echo "Postgres готов."
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Предупреждение: pg_isready не ответил за 45 с — продолжаю (проверьте DATABASE_URL)." >&2
}

npm_install() {
  (cd "$WEB" && npm ci)
}

run_build() {
  require_env_file
  (cd "$WEB" && npx prisma migrate deploy)
  (cd "$WEB" && NODE_ENV=production npm run build)
}

run_start() {
  require_env_file
  export PORT="${PORT:-3000}"
  (cd "$WEB" && exec npm run start)
}

run_dev() {
  require_env_file
  export PORT="${PORT:-3000}"
  (cd "$WEB" && exec npm run dev)
}

cmd="${1:-start}"
[[ -z "$cmd" ]] && cmd=start
case "$cmd" in
  help|-h|--help)
    usage
    ;;
  install)
    npm_install
    ;;
  build)
    compose_up
    require_env_file
    npm_install
    run_build
    ;;
  start)
    compose_up
    require_env_file
    npm_install
    run_build
    run_start
    ;;
  dev)
    compose_up
    require_env_file
    npm_install
    (cd "$WEB" && npx prisma migrate deploy)
    run_dev
    ;;
  *)
    echo "Неизвестная команда: $cmd" >&2
    usage
    exit 1
    ;;
esac
