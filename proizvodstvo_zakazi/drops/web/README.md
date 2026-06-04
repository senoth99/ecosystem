# DROPS — Next.js

Панель управления дропами на **Next.js 15** + **Prisma** + **SQLite** (локально) / **PostgreSQL** (продакшен).

## Запуск

**Рекомендуемо из корня репозитория** — один скрипт для БД, миграций, сборки и сервера:

```bash
cd ..
chmod +x ./deploy.sh
cp web/.env.example web/.env   # задайте DATABASE_URL, APP_PASSWORD, SESSION_SECRET
./deploy.sh                     # прод: docker compose + migrate + build + next start
./deploy.sh dev                 # разработка
```

Локально только в `web/`:

```bash
cd web
npm install
npx prisma migrate dev
npm run dev
```

Открой http://localhost:3000 — пароль задаётся в `.env` (`APP_PASSWORD`, по умолчанию в примере `1234`).

## PostgreSQL (продакшен)

```bash
# из корня репозитория
docker compose up -d

# в web/.env:
DATABASE_URL="postgresql://drops:drops@localhost:5432/drops?schema=public"
```

В `prisma/schema.prisma` смени `provider` на `postgresql`, затем:

```bash
npx prisma db push
```

## Структура

- `src/app` — страницы (App Router)
- `src/app/actions.ts` — server actions
- `prisma/schema.prisma` — модель БД
- Старый Vite + PocketBase: `../drops-app` (не используется)
