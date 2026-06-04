#!/usr/bin/env sh
set -eu
log="$(mktemp)"
trap 'rm -f "$log"' EXIT

if npx prisma migrate deploy 2>"$log"; then
  exit 0
fi

if grep -q "P3005" "$log" 2>/dev/null || grep -q "schema is not empty" "$log" 2>/dev/null; then
  echo "[prisma] База без истории миграций — baseline 20260202200000_init"
  npx prisma migrate resolve --applied "20260202200000_init" 2>/dev/null || true
  if npx prisma migrate deploy 2>"$log"; then
    exit 0
  fi
fi

cat "$log" >&2
exit 1
