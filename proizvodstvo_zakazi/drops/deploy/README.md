# Деплой DROPS (продакшен)

Панель в каталоге `web/` (Next.js 15 + Prisma + PostgreSQL).

## Быстрый старт на сервере

1. Установите Node.js 20+ и Docker (или отдельный Postgres).
2. Склонируйте репозиторий, создайте `web/.env` из `web/.env.example`.
3. Для базы из docker-compose (как в разработке):

   ```bash
   export DATABASE_URL="postgresql://drops:drops@127.0.0.1:5432/drops?schema=public"
   ```

   Задайте сильные `APP_PASSWORD` и `SESSION_SECRET` (случайная строка).

4. После `git pull` на сервере снова `./deploy.sh build` (или полный `./deploy.sh`) — подтянутся миграции и UI.

5. Фото позиций: `web/data/uploads/` (не в git), отдача через `GET /api/items/{id}/photo`. После обновления с версии с `public/uploads` — **загрузите фото заново** или перенесите файлы в `data/uploads/items/`.

6. Сборка и запуск одной командой из корня репозитория:

   ```bash
   chmod +x ./deploy.sh
   ./deploy.sh
   ```

   То же самое: `./deploy.sh start` — поднимает Postgres (`docker compose`), `npm ci`, `prisma migrate deploy`, `next build`, `next start`.

5. Внешний Postgres (managed DB или свой): `SKIP_COMPOSE=1 ./deploy.sh` и корректный `DATABASE_URL` в `web/.env`.

## Команды `./deploy.sh`

| Команда   | Действие |
|-----------|----------|
| *(пусто)* / `start` | полный цикл: compose → install → migrate → build → `next start` |
| `build`   | compose (если не `SKIP_COMPOSE`) → install → migrate → build |
| `install` | только `npm ci` в `web/` |
| `dev`     | compose → install → migrate → `next dev` |
| `help`    | справка |

## Nginx

Скопируйте и адаптируйте `deploy/nginx-drops.example.conf` (TLS, `proxy_pass` на `127.0.0.1:3000`).

## Режим standalone (опционально)

В `next.config.ts` включён `output: "standalone"`. После `npm run build` в `web/`:

- сервер: `node .next/standalone/server.js` из каталога `web/` (см. [документацию Next](https://nextjs.org/docs/app/building-your-application/deploying#self-hosting));
- нужно положить рядом статику: скопировать `.next/static` в `.next/standalone/.next/static` и `public` в `.next/standalone/public` (типичный шаг в Dockerfile).

Для большинства VPS достаточно `./deploy.sh` и `next start` без ручного копирования.

Непрерывный запуск под **systemd**: пример юнита `deploy/drops-web.service.example` — только `npm run start` после того, как один раз выполнен `./deploy.sh build` (или полный `./deploy.sh`) для выкладки артефактов. Поправьте `User` и путь `WorkingDirectory`.

## Легаси

Каталог `drops-app/` (Vite + PocketBase) в этом репозитории не задействован в `./deploy.sh`. Для него остаются `cd drops-app && npm run build` и отдельный хостинг статики + PocketBase.
