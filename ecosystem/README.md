# Casher Ecosystem

Единый вход по Telegram, портал с плитками приложений и админка прав доступа.

## Сервисы

| Сервис | Порт | Назначение |
|--------|------|------------|
| **portal** | 3100 | UI: логин, главная, админка прав |
| **auth-service** | 4001 | Telegram auth, JWT `eco_session`, RBAC |
| **catalog** | 4002 | Прокси `api.cashercollection.com/products` |
| **media** | 4003 | Загрузки и proxy изображений |
| **postgres** | 5432 | БД экосистемы + drops |

## Быстрый старт

```bash
cd ecosystem
cp .env.example .env
# Заполните TELEGRAM_BOT_TOKEN и NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

docker compose up -d postgres auth-service catalog media portal nginx
```

Портал: http://localhost (через nginx) или http://localhost:3100 напрямую.

### Локально: плитки открывают приложения

Портал проксирует `/bloggers`, `/scheduler`, … на порты 3010–3017. Запуск всего стека:

```bash
# Терминал 1 — экосистема (postgres + auth + portal уже должны быть)
cd ecosystem && ./scripts/start-dev-apps.sh
```

Или вручную: `ecosystem/scripts/start-dev-apps.sh` поднимает 8 приложений; портал с `ECOSYSTEM_PROXY_APPS=true` (см. `.env`).

Сначала **Dev login** на http://localhost:3100, затем жми плитку — откроется приложение с тем же cookie.

Суперадмины по умолчанию: `@contact_voropaev`, `@ivanvoropaeff`.

## Подключение приложений

В каждом приложении скопирован `src/lib/ecosystem-gate.ts`. В `.env`:

```env
ECOSYSTEM_PUBLIC_URL=http://localhost
SESSION_SECRET=тот-же-что-в-ecosystem
ECOSYSTEM_AUTH_ENABLED=true
NEXT_PUBLIC_BASE_PATH=/scheduler   # путь за nginx
```

Пока `ECOSYSTEM_PUBLIC_URL` не задан — старый локальный логин приложения работает как раньше.

## Все приложения в Docker

```bash
docker compose --profile apps up -d --build
```

Раскомментируйте `location` в `nginx/default.conf` для проксирования `/scheduler`, `/drops` и т.д.

## Webhook Telegram

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<DOMAIN>/api/eco/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## API auth-service (через portal `/api/eco/...`)

- `POST /auth/telegram` — Mini App initData
- `POST /auth/browser/start` | `complete` — вход через бота
- `GET /me` — текущий пользователь и доступные приложения
- `GET /admin/users` — список (superadmin)
- `PUT /admin/users/:id/permissions` — матрица прав
