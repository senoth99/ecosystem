# Деплой Shop Scheduler (production)

## Требования

- Node.js **≥ 20.18**
- PM2 (VPS) или Docker
- HTTPS-домен для Telegram webhook и `SESSION_COOKIE_SECURE=true`
- Постоянный диск для SQLite и загрузок фото

## 1. Переменные окружения (`.env` на сервере)

Скопируйте `.env.example` → `.env` и заполните:

| Переменная | Production |
|------------|------------|
| `APP_URL` | `https://ваш-домен.ru` (со схемой) |
| `DATABASE_URL` | `file:/data/app/shop.db` (каталог с правами на запись) |
| `UPLOADS_DIR` | `/data/app/uploads` |
| `SESSION_SECRET` | длинная случайная строка (не из примера) |
| `SESSION_COOKIE_SECURE` | `true` |
| `TELEGRAM_BOT_TOKEN` | токен бота |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | username без `@` |
| `TELEGRAM_WEBHOOK_SECRET` | случайная строка |
| `TELEGRAM_ADMIN_USERNAME` / `TELEGRAM_ADMIN_TELEGRAM_ID` | резервный суперадмин |

**Отключить на проде:**

```env
NEXT_PUBLIC_TELEGRAM_AUTH_DEV=false
TELEGRAM_ALLOW_DEV_LOGIN=false
```

Не коммитьте `.env` в git.

## 2. Деплой на VPS (PM2)

```bash
cd /path/to/shop_scheduler
git pull

# Каталоги для данных
sudo mkdir -p /data/app
sudo chown "$USER:$USER" /data/app

cp .env.example .env   # один раз, отредактировать

./deploy.sh
```

`deploy.sh` выполняет: `npm ci` → `prisma generate` → миграции SQLite → `npm run build` → `pm2 reload`.

Имя процесса PM2: **shop-scheduler** (см. `ecosystem.config.js`).

### Первый запуск на пустой базе

После миграций при необходимости один раз (только dev/staging, **не на проде с реальными данными**):

```bash
npm run prisma:seed
```

На проде создайте суперадмина через Telegram allowlist или ссылку из админки.

### Telegram webhook

После деплоя (нужны `jq`, `TELEGRAM_BOT_TOKEN`, `APP_URL`):

```bash
./scripts/telegram-set-webhook.sh
```

## 3. Docker

```bash
docker build --build-arg NEXT_PUBLIC_BUILD_REF=$(git rev-parse --short HEAD) -t shop-scheduler .
docker run -d \
  --name shop-scheduler \
  -p 3000:3000 \
  --env-file .env \
  -v shop-data:/data/app \
  shop-scheduler
```

В `.env` для контейнера: `DATABASE_URL=file:/data/app/shop.db`, `UPLOADS_DIR=/data/app/uploads`.

## 4. Nginx (пример)

Прокси на `127.0.0.1:3000`, TLS от Let's Encrypt. `client_max_body_size 4m;` для загрузки фото отчётов.

## 5. Проверка после деплоя

- `curl -s https://ваш-домен.ru/api/health` → `{"ok":true}`
- Вход через Telegram / бота
- `/schedule` — график, **Шоурум на флаконе**, 12:00–21:00 · обед 15:00–16:00
- `/admin` — скачать QR прихода
- Отчёт смены: 5 фото + сумма продаж

## 6. Режим одной точки

В `src/lib/multiZone.ts`: `MULTI_ZONE_ENABLED = false`. Несколько точек в UI включаются флагом `true` + redeploy.

## 7. Обновление схемы

При `git pull` с новыми миграциями достаточно снова запустить `./deploy.sh` — применится `prisma migrate deploy` (с baseline для старых баз без истории миграций).
