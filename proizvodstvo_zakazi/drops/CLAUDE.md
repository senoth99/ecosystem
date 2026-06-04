# DROPS — CASHER Drop Management Panel

## Project Overview
Web panel for managing clothing drops. Each drop contains one or more items, each progressing through stages with tasks and tracked moments.

**URL**: drops.cashercollection.com  
**Auth**: Password-only (`1234`)  
**Language**: Russian UI  

## Stack (актуально)
- **App**: Next.js 15 в `web/` — Prisma + PostgreSQL
- **Сборка и запуск**: `./deploy.sh` из корня репозитория (см. `README.md`, `deploy/README.md`)
- **Стили**: Tailwind CSS
- Легаси: `drops-app/` — Vite + PocketBase (не входит в `deploy.sh`)

## Stack (исторический черновик)
- **Frontend**: React + Vite (SPA)
- **Database**: Supabase (PostgreSQL + subscriptions)
- **Deploy**: Static → nginx (старый сценарий для `drops-app`)

## Design
- Dark green palette, near-black background with subtle grid/material texture
- Animated logo `optimize.gif` in header (file in project root)
- Mobile-first, fully responsive

## Data Model

### drops
| field | type | notes |
|---|---|---|
| id | uuid | PK |
| name | text | drop name |
| type | enum | `single` / `collection` |
| drop_date | timestamptz | scheduled drop datetime |
| status | enum | `ideation` / `development` / `finalization` / `dropped` |
| created_at | timestamptz | |

### items
| field | type | notes |
|---|---|---|
| id | uuid | PK |
| drop_id | uuid | FK → drops |
| name | text | position/item name |
| stage | enum | `ideation` / `development` / `finalization` |
| created_at | timestamptz | |

### moments
Text fields per stage that get filled in and saved.

| field | type | notes |
|---|---|---|
| id | uuid | PK |
| scope | enum | `drop` / `item` |
| scope_id | uuid | drop_id or item_id |
| stage | enum | stage name |
| key | text | moment identifier |
| value | text | saved content |
| updated_at | timestamptz | |

### tasks
| field | type | notes |
|---|---|---|
| id | uuid | PK |
| scope | enum | `drop` / `item` |
| scope_id | uuid | drop_id or item_id |
| stage | enum | stage name |
| title | text | |
| completed | boolean | |
| completed_at | timestamptz | |

## Stages Per Item

### Stage 1: УСТАНОВКА ИДЕЙНОСТИ ДРОПА
**Moments (text fields):**
- Тема/идея
- Рефы
- Палитра
- Месседж
- Цели и метрики (продажи/имидж)
- Аудитория (внутренняя/внешняя)
- Список позиций (черновой)
- Упаковка/вложение
- Где/что/когда снимаем
- Нужен ли AI-контент
- Ориентировочная дата дропа
- Лекала

**Tasks (per-item):**
- Собрать мудборд дропа (позиции)
- Собрать мудборд дропа (медийка)
- Отдать в работу дизайны одежды
- Отдать в работу дизайнерам наполнения
- Расписать съёмки
- Расписать посты черновые

### Stage 2: ПРОРАБОТКА И СОГЛАСОВАНИЕ
**Moments (text fields):**
- Финальные дизайны / правки
- Финальное название и названия позиций
- Маркетинговый упор (позиция)
- Количество стартового тиража
- Список позиций финальный
- Упаковка финальная
- Согласовать съёмки
- Согласовать AI-контент
- Количество блогеров
- Бюджет на маркетинг

**Tasks (mix — per-item and collection-level):**

Collection-level (scope: drop):
- Отдать в работу AI-контент
- Поиск блогеров для договорённостей
- Запланировать съёмку
- Согласовать блогеров
- Согласовать съёмку и AI контент

Per-item (scope: item):
- Отдать в печать тестовые образцы
- Поставить упаковку в производство
- Поиск моделей и реквизита/студий
- Просчитать себестоимость позиций
- Подбить мудборд дропа (позиции)
- Подбить мудборд дропа (медийка)
- Прислать мокапы на согласование
- Сделать мокап вещей
- Сделать общий мокап
- Сделать размерные сетки
- Согласовать тестовые образцы
- Согласовать мокапы

### Stage 3: ФИНАЛИЗАЦИЯ И ДРОП
**Tasks (collection-level, scope: drop):**
- Подготовить ВСЕ посты под прогрев и дроп
- Подготовить тексты рассылок
- Подготовить розыгрыши и закупы
- Подготовка графического дизайна
- Отослать позиции в оффлайн
- Отослать блогерам
- Проверить заливку товаров
- Залить везде товары

## Stage Progression
Item moves to next stage only when ALL tasks in current stage are completed AND all moments have been filled.

## UI Structure

### Dashboard (main view)
- All drops cards: name, type, status badge, drop date countdown
- Quick stats: total items, tasks done/pending per drop
- Create new drop button

### Drop View
- Drop header: name, date/time, status, edit
- Items list with stage progress bars
- Collection-level tasks panel

### Item View
- Current stage with progress
- Moments panel: text fields + Save button per field (or save all)
- Tasks checklist
- Stage advance button (enabled when stage complete)

### Real-time
- Supabase subscriptions on tasks, moments, drops tables
- Any user update reflects instantly for all connected users

## File Structure
```
src/
  components/
    auth/         # password gate
    dashboard/    # drops overview
    drop/         # single drop view
    item/         # item detail + stages
    ui/           # shared: Button, Card, Badge, Input, etc.
  lib/
    supabase.js   # client + helpers
    constants.js  # stages, moments, tasks definitions
  pages/
    Login.jsx
    Dashboard.jsx
    DropPage.jsx
    ItemPage.jsx
  styles/
    globals.css   # tailwind + custom dark green theme
```

## Commands
```bash
./deploy.sh          # Postgres (docker), миграции, production build, next start
./deploy.sh dev      # Postgres + next dev (в каталоге web/)
./deploy.sh help
```

Подробнее: `deploy/README.md`.

## Deployment (prod)
- Nginx → reverse proxy на `127.0.0.1:3000` (пример: `deploy/nginx-drops.example.conf`).
- Для легаси Vite: статика в `drops-app/dist/`, `try_files $uri /index.html` для SPA.

## Supabase Setup
1. Create project at supabase.com
2. Run SQL migrations (in `supabase/migrations/`)
3. Copy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`
4. Enable real-time on tables: drops, items, tasks, moments
