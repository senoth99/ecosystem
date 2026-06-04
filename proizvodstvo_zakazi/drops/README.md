# DROPS — CASHER

Панель управления дропами: **Next.js** в [`web/`](web/README.md).

## Запуск

Из корня репозитория:

```bash
chmod +x ./deploy.sh
./deploy.sh          # продакшен-цикл: Postgres (Docker) → сборка → next start
./deploy.sh dev      # разработка: Postgres + next dev
./deploy.sh help     # все команды
```

Настройка окружения: `web/.env` (шаблон — `web/.env.example`). Продакшен и nginx — [`deploy/README.md`](deploy/README.md).

## Прочее

- `docker-compose.yml` — локальный PostgreSQL для разработки и простого продакшена.
- [`drops-app/`](drops-app/) — старый стек Vite + PocketBase, не входит в `deploy.sh`.
