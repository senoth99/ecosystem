# Деплой Casher Ecosystem на сервер

Один VPS, Docker, Caddy (HTTPS автоматически), все 8 приложений за одним доменом.

## Архитектура

```
https://DOMAIN/
├── /                    → portal (вход, плитки, админка прав)
├── /api/eco/*           → auth-service
├── /api/catalog/*       → catalog-service
├── /api/media/*         → media-service
├── /bloggers/*          → bloggers
├── /drops/*             → drops
├── /scheduler/*         → production-scheduler
├── /shop/*              → shop-scheduler
├── /nakleiki/*          → nakleiki
├── /proizvodstvo/*      → proizvodstvo
├── /zakazi/*            → proizvodstvo-zakazi
└── /zarplaty/*          → zarplaty
```

## Требования к серверу

- Ubuntu 22.04+ / Debian 12+
- 4+ GB RAM (рекомендуется 8 GB)
- 40+ GB диск
- Открыты порты **80**, **443**
- DNS: A-запись `DOMAIN` → IP сервера

## 1. Подготовка сервера (один раз)

```bash
# На сервере под root
cd /opt
git clone <ваш-репозиторий> casher-ecosystem
cd casher-ecosystem/ecosystem
sudo ./deploy/setup-server.sh
```

## 2. Конфигурация

```bash
cp .env.production.example .env
nano .env
```

Обязательно заполните:

| Переменная | Пример |
|------------|--------|
| `DOMAIN` | `eco.cashercollection.com` |
| `PUBLIC_BASE_URL` | `https://eco.cashercollection.com` |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | сильный пароль |
| `TELEGRAM_BOT_TOKEN` | от @BotFather |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | имя бота без @ |
| `TELEGRAM_WEBHOOK_SECRET` | случайная строка |
| `COOKIE_DOMAIN` | `.cashercollection.com` или ваш домен |
| `COOKIE_SECURE` | `true` |

`DROPS_DB_PASSWORD` по умолчанию `drops` — при смене пароля обновите также `ecosystem/scripts/init-dbs.sql` **до первого запуска** Postgres.

## 3. Деплой

```bash
chmod +x deploy/deploy.sh deploy/setup-server.sh
./deploy/deploy.sh
```

Скрипт соберёт образы, поднимет контейнеры, применит схему БД и seed приложений.

## 4. Telegram webhook

```bash
source .env
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://${DOMAIN}/api/eco/telegram/webhook" \
  -d "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

## 5. TLS / Caddy

Если в логах `Timeout during connect` или `challenge failed`, а локально `curl http://127.0.0.1` отвечает:

1. Откройте **80/tcp и 443/tcp** в файрволе панели VPS (не только `ufw` на сервере).
2. В `Caddyfile` должен быть `acme_ca https://acme-v02.api.letsencrypt.org/directory` (не staging). Сбросьте старые ACME-данные:

```bash
docker compose -f docker-compose.prod.yml stop caddy
docker compose -f docker-compose.prod.yml run --rm -v casher-ecosystem_caddy_data:/data alpine \
  sh -c 'rm -rf /data/caddy/acme/* /data/caddy/certificates/* /data/caddy/locks/*'
docker compose -f docker-compose.prod.yml exec caddy rm -f /config/caddy/autosave.json 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d caddy
```

Если в логах `acme-staging` или `zerossl` — обновите `Caddyfile` и выполните команды выше.

3. Проверка с ноутбука (путь ACME **не** должен отдавать 308):

```bash
curl -sI "http://eco.cashercollection.com/.well-known/acme-challenge/test" | head -3
```

4. После `certificate obtained` в логах — webhook Telegram (см. §4).

## 6. Проверка

1. Откройте `https://DOMAIN` — страница входа.
2. Войдите через Telegram (суперадмины: `@contact_voropaev`, `@ivanvoropaeff`).
3. В **Права** выдайте доступ пользователям.
4. Плитки должны открывать приложения по путям `/bloggers`, `/scheduler`, …

## Обновление

```bash
cd /opt/casher-ecosystem
git pull
cd ecosystem
./deploy/deploy.sh
```

## Полезные команды

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f portal
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml restart production-scheduler
```

## Бэкапы

| Данные | Volume / путь |
|--------|----------------|
| Postgres (ecosystem + drops) | `pg_data` |
| Медиа | `media_data` |
| SQLite приложений | `*_data` volumes |

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U ecosystem ecosystem > backup-ecosystem.sql
```

## Локальная разработка

См. [README.md](./README.md) — `docker compose up` (без prod) или порты 3010–3017.

## Файлы

| Файл | Назначение |
|------|------------|
| `docker-compose.prod.yml` | Production-стек |
| `docker-compose.yml` | Локально / без всех apps |
| `Caddyfile` | Reverse proxy + TLS |
| `.env.production.example` | Шаблон переменных |
| `deploy/deploy.sh` | Сборка и запуск |
| `deploy/setup-server.sh` | Установка Docker на VPS |
