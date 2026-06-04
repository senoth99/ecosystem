# ECOSYSTEM

Все внутренние приложения Casher + **единая экосистема** в папке [`ecosystem/`](ecosystem/README.md).

## Запуск экосистемы

**Локально:** см. [ecosystem/README.md](ecosystem/README.md)

**Production (VPS):** см. [ecosystem/DEPLOY.md](ecosystem/DEPLOY.md)

```bash
cd ecosystem
cp .env.production.example .env   # заполнить DOMAIN, секреты, Telegram
./deploy/deploy.sh
```

## Приложения

| Папка | Путь (nginx) | Slug в правах |
|-------|----------------|---------------|
| bloggers | /bloggers | bloggers |
| drops | /drops | drops |
| production-scheduler | /scheduler | production-scheduler |
| shop_scheduler | /shop | shop-scheduler |
| nakleiki/production-scheduler | /nakleiki | nakleiki |
| proizvodstvo | /proizvodstvo | proizvodstvo |
| proizvodstvo_zakazi/web | /zakazi | proizvodstvo-zakazi |
| zarplaty | /zarplaty | zarplaty |

Подробности: [ecosystem/README.md](ecosystem/README.md)
