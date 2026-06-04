#!/usr/bin/env bash
# Запуск всех приложений на своих портах + прокси через портал :3100
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ECO="$ROOT/ecosystem"

export SESSION_SECRET="${SESSION_SECRET:-local-dev-secret-min-32-chars-ok}"
export ECOSYSTEM_PUBLIC_URL="${ECOSYSTEM_PUBLIC_URL:-http://localhost:3100}"
export ECOSYSTEM_AUTH_ENABLED="${ECOSYSTEM_AUTH_ENABLED:-true}"
export ECOSYSTEM_PROXY_APPS=true

run_app() {
  local dir="$1" port="$2" base="$3" extra="${4:-}"
  echo "→ $dir http://127.0.0.1:$port$base"
  (
    cd "$ROOT/$dir"
    export PORT="$port"
    export NEXT_PUBLIC_BASE_PATH="$base"
    export ECOSYSTEM_PUBLIC_URL
    export SESSION_SECRET
    export ECOSYSTEM_AUTH_ENABLED=true
    eval "$extra"
  ) &
}

mkdir -p "$ECO/.logs"

run_app "bloggers" 3010 "/bloggers" "npm run dev >> \"$ECO/.logs/bloggers.log\" 2>&1"
run_app "drops/web" 3011 "/drops" "npm run dev >> \"$ECO/.logs/drops.log\" 2>&1"
run_app "production-scheduler" 3012 "/scheduler" "npm run dev >> \"$ECO/.logs/scheduler.log\" 2>&1"
run_app "shop_scheduler" 3013 "/shop" "npm run dev >> \"$ECO/.logs/shop.log\" 2>&1"
run_app "nakleiki/production-scheduler" 3014 "/nakleiki" "npm run dev >> \"$ECO/.logs/nakleiki.log\" 2>&1"
run_app "proizvodstvo" 3015 "/proizvodstvo" "npm run dev >> \"$ECO/.logs/proizvodstvo.log\" 2>&1"
run_app "proizvodstvo_zakazi/web" 3016 "/zakazi" "npm run dev >> \"$ECO/.logs/zakazi.log\" 2>&1"
run_app "zarplaty" 3017 "/zarplaty" "npm run dev >> \"$ECO/.logs/zarplaty.log\" 2>&1"

echo ""
echo "Портал (открой плитки здесь): http://localhost:3100"
echo "Логи: $ECO/.logs/"
echo "Остановка: pkill -f 'next dev' (осторожно — убьёт все Next dev)"
wait
