# bugs2.md — полный аудит кодовой базы

> Дата: 2026-05-15  
> Область: `src/` (экраны, контексты, API routes, lib)  
> Сверка с `bugs.md`: часть пунктов там уже закрыта; ниже — **актуальное** состояние репозитория.

---

## Краткое резюме

| Уровень | Кол-во (новых/актуальных) |
|---------|---------------------------|
| 🔴 Критичные | 8 |
| 🟠 Значительные | 14 |
| 🟡 Средние | 12 |
| 🟢 UX / долг | 8 |

---

## ✅ Исправлено (не дублировать как открытые баги)

Эти пункты из `bugs.md` / `CLAUDE.md` в текущем коде **уже не воспроизводятся**:

| ID (старый) | Что было | Сейчас |
|-------------|----------|--------|
| B1 | KPI/график по `createdAt` | `integrationsPublishedInMonth` и `integrationReachByCalendarDayInMonth` используют `releaseDate` (`dashboard-metrics.ts`) |
| B2 | Задача выхода без времени | `localReleaseDateTimeMs` → начало локального дня (`panel-tasks.ts:62`) |
| B3 (reach=0) | `reach=0` закрывал задачу | автозакрытие только при `reach > 0` (`PanelDataContext.tsx:1264`) |
| B4–B5 | Undo без таймера / race | таймер 8 с + блок второго `showUndo` (`UndoContext.tsx`) |
| B7 | Δ промокодов 0 в 1-й день | база `0`, если один снапшот (`DashboardScreen.tsx:100`) |
| P1 | O(n²) контрагенты | `Map` по `contractorId` (`ContractorsScreen.tsx:92–117`) |
| P2 | Двойной `/api/promocodes` | единый `PromocodesProvider` |
| N1 | Redirect ломал «Назад» | детальные страницы рендерят экран по `params.*Id` |
| U4 (retry) | Нет retry при ошибке сохранения | кнопка «Повторить» в `AppShell.tsx` |
| U6 (confirm) | Удаление без подтверждения | `ConfirmDeleteButton` на ключевых экранах |
| U9 | Нет индикатора сохранения | `savePending` в `Header.tsx` |
| U11 | Форма ссылки не сбрасывалась | `closeLinkModal()` очищает черновик |
| A5 (retry) | Нет retry на save | 3 попытки + exponential backoff (`pushSnapshotToServer`) |
| A6 | Нет Error Boundary | `ErrorBoundary` в `providers.tsx` |
| F1 | Отчёты-заглушка | реализован `ReportsScreen.tsx` |
| F2 | Урезанный CSV | расширенные колонки в `handleExportThisMonth` |
| U9 focus | Нет focus-trap | tab-trap в `SlideOver.tsx` |

---

## 🔴 Критичные (логика / безопасность)

### C1. Двойное хранение `completedTaskKeys`: снапшот + per-user
**Файлы:** `PanelDataContext.tsx`, `prisma/schema.prisma` (`User.completedTaskKeys`), `api/tasks/completed/route.ts`  
**Проблема:** Выполненные задачи пишутся в `User.completedTaskKeys` через `completeTaskKey`, но в JSON-снапшоте поле `completedTaskKeys` **по-прежнему существует** и мержится:  
`[...data.completedTaskKeys, ...userTaskKeys]` (строка 1909). Старые ключи в снапшоте — **глобальные для всех пользователей**. Новые — per-user, но при каждом `patch` снапшот уезжает на сервер вместе с устаревшим массивом.  
**Симптом:** один пользователь «закрыл» задачу в старой версии → все видят её выполненной; или наоборот — рассинхрон после 409.  
**Фикс:** убрать `completedTaskKeys` из `PanelSnapshot.data`; миграция — очистить поле в снапшоте; единственный источник — `User.completedTaskKeys`.

### C2. Отметка задачи не снимается при очистке охватов
**Файл:** `PanelDataContext.tsx` (`updateIntegration`)  
**Проблема:** При `reach > 0` ключ добавляется через `completeTaskKeyRef`, при удалении/обнулении охватов ключ **не удаляется** из `userTaskKeys` / API. Задача «Ввести охваты» не возвращается в открытые, но висит в «Выполнено» (`buildCompletedTasks`).  
**Фикс:** при `reach == null` или `reach <= 0` — удалять `integration-reach:{id}` из user keys (и PUT на API).

### C3. Неверный формат `releaseTime` блокирует задачу «Убедиться в выходе»
**Файл:** `panel-tasks.ts:63–64`  
**Проблема:** Если дата есть, но время введено с опечаткой (`25:00`, `9:5` без ведущего нуля вне regex), `localReleaseDateTimeMs` возвращает `null` → задача **не создаётся**, хотя дата валидна.  
**Фикс:** при невалидном времени fallback на начало дня (как для пустого времени).

### C4. Пользователь `user` без привязки к сотруднику видит **все** задачи
**Файл:** `TasksScreen.tsx:97–99`  
```ts
if (isAdmin || !myEmployeeId) return openTasks;
```  
**Проблема:** Нет `employeeId` у сессии → показываются задачи всех сотрудников; можно отметить чужие `completeTaskKey`.  
**Фикс:** при `!myEmployeeId && !isAdmin` — пустой список + подсказка «Привяжите сотрудника к логину».

### C5. Та же утечка видимости в доставках
**Файл:** `DeliveriesScreen.tsx:111`  
**Проблема:** `employeeFilter` по умолчанию `myEmployeeId ?? "all"` — без привязки non-admin видит **все** доставки.  
**Фикс:** default только «мои» или пусто, не `"all"`.

### C6. API без проверки сессии (утечка данных / злоупотребление)
**Файлы:**  
- `app/api/promocodes/route.ts` — агрегированные активации Casher  
- `app/api/casher-products/route.ts` — полный каталог  
- `app/api/cdek/status/route.ts` — запросы в СДЭК по треку  

**Проблема:** `AuthGate` защищает только UI-страницы. Любой, кто знает URL, может дергать API без cookie (промокоды, каталог, квота СДЭК).  
**Фикс:** `getSessionUser()` + 401 на всех внутренних прокси.

### C7. Фоновый poll может затереть несохранённые правки
**Файл:** `PanelDataContext.tsx:762–783`  
**Проблема:** Каждые 42 с подтягивается сервер, если `revision` выше. Проверяется только `pendingSaveRef` (активный PUT), **не** таймер debounce 650 ms (`flushTimerRef`). Между последним `patch` и отправкой PUT локальные изменения могут быть перезаписаны сервером.  
**Фикс:** не применять poll, пока `flushTimerRef != null || pendingSaveRef || savePending`.

### C8. Конфликт 409 без слияния локальных правок
**Файл:** `PanelDataContext.tsx:648–652`  
**Проблема:** При 409 вызывается `applyServerPayload` — локальное состояние **полностью** заменяется сервером. Несохранённый debounced-diff теряется; `userTaskKeys` не перечитываются с API.  
**Фикс:** merge-стратегия или повторная отправка локального diff после rebase; reload task keys.

---

## 🟠 Значительные

### S1. Лидерборд сотрудников за месяц считает интеграции по `createdAt`
**Файл:** `employee-utils.ts:117–121` (`buildLeaderboardForYearMonth`)  
**Проблема:** Блок «Сотрудники» на дашборде (`DashboardEmployeesSummary`) не согласован с KPI по `releaseDate`. Интеграция создана в апреле, вышла в мае → засчитается апрелю.  
**Фикс:** для интеграций использовать `ymdInYearMonth(releaseDate, ym)` + статус published (как в KPI).

### S2. Дашборд: KPI по выходу, диаграммы — по созданию
**Файл:** `DashboardScreen.tsx`  
**Проблема:** StatCards и топ блогеров — `integrationsPublishedInMonth` / `releaseDate`. Секции «Создано в месяце · статусы/площадки» — `integrationsCreatedInMonth` (`createdAt`). Пользователь видит разные «месяцы» в одном экране без явного пояснения (подписи есть, но легко перепутать).  
**Фикс:** либо единая метрика, либо явный disclaimer в KPI-блоке.

### S3. Карточка контрагента: обзор смешивает `createdAt` и `releaseDate`
**Файл:** `ContractorDetailScreen.tsx:323–357`  
**Проблема:** `overviewStatusBars` / `overviewPlatformBars` — интеграции **созданные** в месяце; pipeline по выходу — отдельный фильтр по `releaseDate`.  
**Фикс:** унифицировать метрики или подписать оси явно («создано» vs «план выхода»).

### S4. `completeTaskKey`: ошибка API глотается
**Файл:** `PanelDataContext.tsx:1809–1814`  
**Проблема:** `fetch(...).catch(() => {})` — UI показывает задачу выполненной, после перезагрузки она снова открыта.  
**Фикс:** toast/баннер при ошибке; откат `userTaskKeys` при неуспехе.

### S5. PUT `/api/tasks/completed` перезаписывает весь массив
**Файл:** `api/tasks/completed/route.ts:26–27`  
**Проблема:** Два таба / два быстрых клика — последний PUT побеждает, ключи из другого таба теряются.  
**Фикс:** PATCH append/remove по ключу или optimistic locking на revision пользователя.

### S6. `promocodeSnapshots` в общем JSON-снапшоте
**Файл:** `PanelDataContext.tsx` (`recordPromocodeSnapshot`)  
**Проблема:** Снапшоты промокодов пишутся в `PanelSnapshot` при каждом визите дашборда → рост JSON, лишние конфликты 409 между пользователями.  
**Фикс:** вынести в отдельную таблицу или server-only cache; не синхронизировать через panel-data.

### S7. «Выполнено» в задачах: зомби-записи
**Файл:** `panel-tasks.ts:179–196` (`buildCompletedTasks`)  
**Проблема:** Секция «Выполнено» строится по ключам, а не по актуальности условия (доставка снова не delivered, охваты снова нужны).  
**Фикс:** показывать completed только если задача **ещё** удовлетворяет условиям ИЛИ снимать ключ при изменении сущности.

### S8. `removeContractor` не чистит `completedTaskKeys` в снапшоте
**Файл:** `PanelDataContext.tsx:940–950`  
**Проблема:** Удаляются сущности, но ключи `delivery-notify:*`, `integration-*` остаются в `data.completedTaskKeys` (мусор + ложные «выполнено»).  
**Фикс:** фильтровать ключи по удалённым id (и не хранить их в снапшоте после C1).

### S9. `restoreIntegration` пишет ключи в снапшот, не в user API
**Файл:** `PanelDataContext.tsx:1299–1314`  
**Проблема:** Undo после удаления интеграции восстанавливает `completedTaskKeys` в **глобальный** снапшот.  
**Фикс:** восстанавливать через `setUserTaskKeys` + PUT `/api/tasks/completed`.

### S10. Rate limit логина только in-memory
**Файл:** `api/auth/login/route.ts:16`  
**Проблема:** `loginAttempts` Map сбрасывается при рестарте; не работает при нескольких инстансах.  
**Фикс:** Redis / таблица попыток в SQLite.

### S11. `isoInYearMonth` для `createdAt` (UTC) vs `releaseDate` (YYYY-MM-DD локально)
**Файл:** `dashboard-metrics.ts`  
**Проблема:** Доставки и «созданные» интеграции фильтруются по ISO UTC (`getUTCFullYear/Month`). Даты выхода — по префиксу строки без сдвига TZ. Пограничные случаи около полуночи UTC± могут попадать не в тот месяц для доставок.  
**Фикс:** единый календарный разбор (только YYYY-MM-DD или только UTC с документацией).

### S12. Дублирующий промокод у двух контрагентов
**Файл:** `DashboardPromocodesPanel.tsx`  
**Проблема:** `promoDeltaByCodeKey` — одна дельта на `codeKey`; два контрагента с одним кодом показывают **одинаковую** Δ (не привязано к контрагенту).  
**Фикс:** документировать ограничение или хранить Δ per contractorId+code.

### S13. Ссылка «Топ блогеров» ведёт на legacy URL
**Файл:** `DashboardTopBloggers.tsx:59`  
**Проблема:** `href={/contractors?id=...}` вместо `/contractors/${id}`. Drawer на списке работает, прямой canonical URL и история — нет.  
**Фикс:** `Link href={/contractors/${id}}` или единый паттерн навигации.

### S14. `PUT /api/panel-data` без валидации схемы
**Файл:** `api/panel-data/route.ts`  
**Проблема:** Любой JSON до 12 MB сохраняется в БД. Битый клиент / старая вкладка может испортить снапшот для всех.  
**Фикс:** серверная `coercePanelStoredShape` + отказ 400 при критических нарушениях.

---

## 🟡 Средние

### M1. `showUndo` игнорирует повторный вызов, пока баннер виден
**Файл:** `UndoContext.tsx:46`  
**Проблема:** Второе удаление подряд не показывает undo (тихий no-op).  
**Фикс:** очередь или сброс таймера с заменой сообщения.

### M2. Error Boundary не оборачивает `AuthProvider` / `PanelDataProvider`
**Файл:** `providers.tsx`  
**Проблема:** Падение в auth/panel-data роняет всё приложение белым экраном.  
**Фикс:** внешний boundary или error.tsx на сегментах.

### M3. Нет предупреждения при уходе со страницы во время `savePending`
**Файл:** `PanelDataContext.tsx`  
**Проблема:** Пользователь закрывает вкладку в debounce — данные могут не уйти на сервер.  
**Фикс:** `beforeunload` при `savePending`.

### M4. Маршрут `/integrations` → компонент `PanelScreen`
**Файлы:** `app/(app)/integrations/page.tsx`, `PanelScreen.tsx`  
**Проблема:** Устаревшее имя «Panel» в коде при нормальном URL `/integrations` — путаница для разработчиков.  
**Фикс:** переименовать в `IntegrationsScreen.tsx`.

### M5. `EmployeesDashboardScreen` — `window.confirm` для удаления
**Файл:** `EmployeesDashboardScreen.tsx:133`  
**Проблема:** Несогласованность с `ConfirmDeleteButton` на остальных экранах.  
**Фикс:** унифицировать UI подтверждения.

### M6. Роль `user` и мутации данных
**Файл:** `PanelDataContext.tsx`  
**Проблема:** CRUD заблокирован `isAdminRef`, но **чтение** всего снапшота доступно любому авторизованному. Если нужна изоляция по сотруднику — её нет.  
**Фикс:** продуктовое решение + фильтрация на сервере при необходимости.

### M7. Polling 42 с + редактирование в другой вкладке
**Проблема:** Вкладка A редактирует, вкладка B сохранила — через 42 с A перезапишется сервером без предупреждения (кроме 409 на save).  
**Фикс:** broadcast channel / version banner «данные обновились».

### M8. `agreementsCreatedInMonth` нигде не используется
**Файл:** `dashboard-metrics.ts:59`  
**Проблема:** Мёртвый код или забытая метрика «договорённости».  
**Фикс:** подключить к UI или удалить.

### M9. `deliveriesDeliveredInMonth` — fallback на `createdAt`
**Файл:** `dashboard-metrics.ts:114–118`  
**Проблема:** Если `updatedAt` пуст, используется `createdAt` — доставка могла быть получена позже.  
**Фикс:** явное поле `deliveredAt` обязательно при статусе `delivered`.

### M10. Кеш промокодов 30 мин на сервере, клиент опрашивает чаще
**Файлы:** `api/promocodes/route.ts` (`revalidate: 1800`), `usePromocodes.ts` (интервал 30 мин)  
**Проблема:** `recordPromocodeSnapshot` на дашборде может писать одинаковые точки в снапшот (есть дедуп 60 с, но снапшот всё равно растёт). См. S6.

### M11. `AuthGate` inline styles вместо Tailwind
**Файл:** `AuthGate.tsx:28`  
**Проблема:** Жёсткий `#000000` — расхождение с темой при смене `app-bg`.  
**Фикс:** классы `bg-app-bg text-app-fg/55`.

### M12. Нет тестов на критичные pure-функции
**Файлы:** `panel-tasks.ts`, `dashboard-metrics.ts`, `auth-password.ts`, `panel-session-server.ts`  
**Проблема:** Регрессии (C3, S1, UTC) не ловятся CI.  
**Фикс:** минимальный набор unit-тестов.

---

## 🟢 UX / качество (актуально)

| ID | Проблема | Файл |
|----|----------|------|
| U1 | Нет fade/подсказки горизонтального скролла таблиц | `ContractorsScreen`, `DeliveriesScreen`, таблицы дашборда |
| U2 | Вкладки контрагента без счётчиков | `ContractorDetailScreen` |
| U3 | Пустые состояния без CTA «создать первое…» | списки доставок, интеграций |
| U4 | Путаница «ФИО» vs `name` / `contactPerson` | формы и таблицы контрагентов |
| U5 | Два источника активаций промо (ручное поле на интеграции vs Casher API) | KPI vs `DashboardPromocodesPanel` |
| U6 | `Undo` при втором действии молча не показывается | см. M1 |
| U7 | `ReportsScreen` вызывает `currentYearMonth()` на каждый рендер — ок, но при долгой сессии без смены месяца таблица «6 месяцев» не сдвигается | `ReportsScreen.tsx:20` |
| U8 | `ErrorBoundary` без кнопки «Сообщить детали» / сброса state без full reload | `ErrorBoundary.tsx` |

---

## Архитектурный долг (без изменений с прошлого аудита)

- **A1.** Весь домен в одном JSON `PanelSnapshot.data` — конфликты, нет индексов.  
- **A2.** `PanelDataContext.tsx` ~1980 строк — god-object.  
- **A3.** Крупные экраны (`ContractorDetailScreen` ~1790, `DeliveriesScreen` ~1340, `PanelScreen` ~1050 строк) — логика + UI в одном файле.

---

## Рекомендуемый порядок исправлений

| Приоритет | ID |
|-----------|-----|
| P0 | C6 (auth на API), C1 + C4 + C5 (задачи/доставки/ключи), C7 + C8 (потеря данных) |
| P1 | C2, C3, S1, S4, S5 |
| P2 | S6–S9, S13, S14, M3 |
| P3 | S2, S3, M1–M12, UX-таблица |

---

## Примечание по `bugs.md`

Файл `bugs.md` содержит частично устаревшие пункты (помечены `[NEW]`, но уже исправлены в коде). **Источник правды для текущего состояния — этот файл (`bugs2.md`).** При закрытии бага — сверять с кодом, а не только с `bugs.md`.
