# bugs3.md — полный аудит кодовой базы

> Дата: 2026-05-15  
> Область: весь репозиторий (`src/`, `prisma/`, API routes)  
> Сверка: `bugs.md`, `bugs2.md`, актуальный код в git working tree

**Источник правды для текущего состояния — этот файл.** При закрытии бага сверяйте с кодом, а не только с `bugs.md` / `bugs2.md`.

---

## Краткое резюме

| Уровень | Открытых (актуальных) |
|---------|------------------------|
| 🔴 Критичные | 9 |
| 🟠 Значительные | 16 |
| 🟡 Средние | 18 |
| 🟢 UX / качество | 10 |
| 🏗 Архитектурный долг | 4 |

---

## ✅ Исправлено (не дублировать как открытые)

Сводка по трём прошлым аудитам — в текущем коде **не воспроизводится**:

| Тема | Где смотреть |
|------|----------------|
| KPI/график охватов по `releaseDate`, не `createdAt` | `dashboard-metrics.ts:77–108` |
| Задача выхода без времени → начало дня | `panel-tasks.ts` + `localReleaseDateTimeMs` |
| `reach = 0` не автозакрывает задачу охватов | `PanelDataContext.tsx:1341–1344`, `panel-tasks.ts:178–179` |
| Undo: таймер 8 с, замена баннера | `UndoContext.tsx` |
| Δ промокодов: база 0 при одном снапшоте | `DashboardScreen.tsx` |
| O(n²) контрагенты → `Map` | `ContractorsScreen.tsx` |
| Единый `PromocodesProvider` | `providers.tsx` |
| Детальные страницы без redirect | `app/(app)/**/[id]/page.tsx` |
| Retry сохранения, `savePending`, Error Boundary | `AppShell`, `Header`, `providers.tsx` |
| `ConfirmDeleteButton` на ключевых экранах | detail screens |
| Focus-trap в `SlideOver` | `SlideOver.tsx` |
| `completedTaskKeys` убраны из JSON снапшота | `panelSnapshotPayload` |
| Очистка reach → `uncompleteTaskKey` | `PanelDataContext.tsx:1343–1361` |
| Задачи без привязки сотрудника → пусто + подсказка | `TasksScreen.tsx:97–167` |
| Auth на внутренних API (promocodes, products, cdek, panel-data GET) | `app/api/**` |
| Poll не перезаписывает во время debounce/PUT | `PanelDataContext.tsx:825` |
| Баннер «данные обновились» вместо silent overwrite | `AppShell.tsx:36–56` |
| Rate limit логина в SQLite | `login-rate-limit.ts`, `LoginAttempt` |
| Top bloggers → `/contractors/${id}` | `DashboardTopBloggers.tsx` |
| `coercePanelStoredShape` на PUT | `api/panel-data/route.ts:51–57` |
| Счётчики на вкладках контрагента | `ContractorDetailScreen.tsx` TabButton `count=` |
| `HorizontalScrollTable` fade/hint | `HorizontalScrollTable.tsx` |
| `ReportsScreen` реализован + rollover месяца | `ReportsScreen.tsx:22–40` |
| `EmployeesDashboardScreen` → `ConfirmDeleteButton` | строка ~301 |
| `agreementsCreatedInMonth` используется | `ReportsScreen.tsx` |

---

## 🔴 Критичные (логика / безопасность / потеря данных)

### C1. Любой авторизованный пользователь может перезаписать весь снапшот CRM
**Файл:** `src/app/api/panel-data/route.ts:30–33`  
**Проблема:** `PUT` проверяет только `getSessionUser()`, без роли `admin`/`superadmin`. Роль `user` с валидной сессией может отправить полный JSON и изменить данные для всех.  
**Фикс:** `if (user.role !== "admin" && user.role !== "superadmin") return 403` на PUT; опционально разделить read/write.

### C2. `updateIntegration` без проверки `isAdminRef`
**Файл:** `src/context/PanelDataContext.tsx:1236–1364`  
**Проблема:** В отличие от `addIntegration` / `removeIntegration`, мутация статуса, охватов, бюджета, ответственного доступна любой роли через контекст + C1.  
**Фикс:** `if (!isAdminRef.current) return` в начале колбэка; дублировать на сервере.

### C3. `updateDeliveryStatus` без проверки `isAdminRef` + побочные эффекты
**Файл:** `src/context/PanelDataContext.tsx:1731–1780`  
**Проблема:** Смена статуса на `delivered` добавляет строки в `contractorItems` (остатки). Любой пользователь может менять статусы через UI и CDEK-poll.  
**Фикс:** guard `isAdminRef`; скрыть `StatusBadgeDropdown` для non-admin.

### C4. Массовая смена статуса интеграций без `isAdmin`
**Файл:** `src/screens/IntegrationsScreen.tsx:851–878`  
**Проблема:** Панель «Изменить статус» при `selectedIds.size > 0` не обёрнута в `isAdmin` (в отличие от per-row dropdown на `1240`).  
**Фикс:** рендерить bulk-бар только при `isAdmin`.

### C5. CDEK auto-poll меняет статусы всех доставок для любого пользователя
**Файл:** `src/screens/DeliveriesScreen.tsx:440–447`, `400–413`  
**Проблема:** `setInterval` вызывает `refreshStatuses(deliveriesRef.current)` без фильтра по роли; каждый ответ вызывает `updateDeliveryStatus`.  
**Фикс:** poll только для admin или только для «своих» доставок; guard в `updateDeliveryStatus`.

### C6. Open redirect после логина
**Файл:** `src/screens/LoginScreen.tsx:17, 22, 34`  
**Проблема:** `nextPath.startsWith("/")` пропускает `//evil.com` → `router.replace("//evil.com")` (protocol-relative redirect).  
**Фикс:** разрешать только `^/[a-zA-Z0-9_./?=&%-]*$` и отклонять `//`.

### C7. Конфликт 409: потеря несохранённых правок при retry
**Файл:** `src/context/PanelDataContext.tsx:690–702`  
**Проблема:** На 409: сервер применяется, затем локальный `localAttempt` уходит повторным PUT. Debounced-изменения, не попавшие в `snapshot` аргумента, теряются. Нет merge по полям.  
**Фикс:** блокировать редактирование до разрешения конфликта; merge diff или rebase с актуальной ревизией.

### C8. `/api/auth/me` отдаёт список всех пользователей любой сессии
**Файл:** `src/app/api/auth/me/route.ts:35–41`  
**Проблема:** `prisma.user.findMany()` → логины, роли, `employeeId` всех аккаунтов любому авторизованному клиенту.  
**Фикс:** `users` только для superadmin; остальным `{ authenticated, me }`.

### C9. Non-admin без привязки видит все доставки после сброса фильтра
**Файл:** `src/screens/DeliveriesScreen.tsx:343–344`  
**Проблема:** `onRemove` чипа сотрудника: `setEmployeeFilter(isAdmin ? "all" : (myEmployeeId ?? "all"))` — при отсутствии `myEmployeeId` подставляется `"all"` → все доставки.  
**Фикс:** для non-admin всегда `myEmployeeId ?? ""`, никогда `"all"`.

---

## 🟠 Значительные

### S1. Лидерборд: доставки считаются по `createdAt`, не по факту доставки
**Файл:** `src/lib/employee-utils.ts:126–131`  
**Проблема:** Интеграции — `ymdInYearMonth(releaseDate)` + published; доставки — `isoInYearMonth(d.createdAt)` без `status === "delivered"`.  
**Фикс:** `dateIsoInYearMonth(d.deliveredAt ?? d.updatedAt, ym)` + фильтр `delivered`.

### S2. `User.employeeId` не используется для скоупа задач/доставок
**Файлы:** `TasksScreen.tsx:95`, `DeliveriesScreen.tsx:107`, `employee-utils.ts:20–30`  
**Проблема:** Привязка только через `Employee.panelLogin` / Telegram; поле `User.employeeId` из админки игнорируется → «Привяжите сотрудника» при уже назначенном `employeeId` в БД.  
**Фикс:** `myEmployeeId = me.employeeId ?? findEmployeeIdByPanelSession(...)`.

### S3. Дашборд смешивает метрики «создано» и «вышло»
**Файл:** `src/screens/DashboardScreen.tsx`  
**Проблема:** KPI — `integrationsPublishedInMonth` (`releaseDate`); блоки статусов/площадок — `integrationsCreatedInMonth` (`createdAt`). Подписи есть, легко перепутать.  
**Фикс:** единая ось или явный disclaimer в шапке KPI.

### S4. Карточка контрагента: обзор смешивает оси
**Файл:** `src/screens/ContractorDetailScreen.tsx:324–360`  
**Проблема:** `overviewStatusBars` / `overviewPlatformBars` — созданные в месяце; pipeline — `releaseDate`.  
**Фикс:** унифицировать или подписать «создано» vs «план выхода».

### S5. `completedTaskKeyStillValid` для verify требует reach > 0
**Файл:** `src/lib/panel-tasks.ts:203–209`  
**Проблема:** Задачу «Убедиться в выходе» можно отметить вручную, но в «Выполнено» она не попадёт без охватов > 0.  
**Фикс:** для `integration-release-verify` не требовать `integrationReachIsFilled`.

### S6. Автозакрытие verify при `returned`/`exchange` без отката
**Файл:** `src/context/PanelDataContext.tsx:1346–1348`  
**Проблема:** Ключ verify добавляется при статусах returned/exchange; при возврате в published ключ не снимается.  
**Фикс:** `uncompleteTaskKey` при смене статуса обратно.

### S7. `reach = 0` скрывает открытую задачу «Ввести охваты»
**Файл:** `src/lib/panel-tasks.ts:126–127`  
**Проблема:** `typeof row.reach === "number"` пропускает `0`; задача исчезает из открытых, но не считается заполненной (`reach > 0`). Тупик для пользователя.  
**Фикс:** пропускать только при `integrationReachIsFilled(reach)`.

### S8. `persistUserTaskKeys` — полный PUT vs PATCH (гонка)
**Файлы:** `PanelDataContext.tsx:631–641`, `api/tasks/completed/route.ts:21–32`  
**Проблема:** Массовые операции (удаление контрагента, restore) шлют PUT всего массива; `completeTaskKey` — PATCH. Два таба → потеря ключей.  
**Фикс:** везде PATCH add/remove; убрать PUT или merge в транзакции.

### S9. PATCH task keys не атомарен
**Файл:** `src/app/api/tasks/completed/route.ts:47–56`  
**Проблема:** read-modify-write без `$transaction` / блокировки строки.  
**Фикс:** транзакция Prisma + опционально version на `User`.

### S10. Зомби-ключи в БД
**Файл:** `src/lib/panel-tasks.ts:183–211`  
**Проблема:** UI фильтрует через `completedTaskKeyStillValid`, но невалидные ключи остаются в `User.completedTaskKeys` до явного `uncompleteTaskKey`.  
**Фикс:** фоновая очистка при загрузке или при изменении сущности.

### S11. Смешанная семантика дат UTC vs YYYY-MM-DD
**Файл:** `src/lib/dashboard-metrics.ts:25–46, 111–129`  
**Проблема:** `isoInYearMonth` — UTC; `ymdInYearMonth` — префикс строки; `dateIsoInYearMonth` — гибрид. Пограничные случаи около полуночи для доставок/createdAt.  
**Фикс:** единый календарный разбор + документация.

### S12. Δ промокодов одна на `codeKey` для всех контрагентов
**Файлы:** `DashboardScreen.tsx`, `DashboardPromocodesPanel.tsx`  
**Проблема:** Два контрагента с одним кодом — одна дельта в панели.  
**Фикс:** per `contractorId+code` или явное ограничение в UI.

### S13. Рейтинг контрагента учитывает черновики
**Файл:** `src/lib/contractor-rating.ts:44–54`  
**Проблема:** Все интеграции без фильтра `isPublishedIntegrationStatus`.  
**Фикс:** только published, как в KPI.

### S14. Shallow-валидация снапшота
**Файлы:** `panel-stored-shape.ts:28–64`, `api/panel-data/route.ts`  
**Проблема:** Проверяются только массивы верхнего уровня; битые объекты без `id` сохраняются.  
**Фикс:** per-entity validators, 400 на критические нарушения.

### S15. Два источника числа активаций промо
**Файлы:** KPI `sumPromoActivations` (ручное поле на интеграции) vs `DashboardPromocodesPanel` (Casher API).  
**Фикс:** подписать источники или убрать дубль.

### S16. Маршрут `/admin` без server-side guard
**Файл:** `src/app/(app)/admin/page.tsx`  
**Проблема:** Только client redirect в `AdminScreen.tsx:64–68`; URL доступен до редиректа.  
**Фикс:** middleware / server layout с проверкой роли.

---

## 🟡 Средние

### M1. Двойной таймер Undo: 5 с в баннере, 8 с в контексте
**Файлы:** `UndoBanner.tsx:6,24–27`, `UndoContext.tsx:20,50–53`  
**Проблема:** Баннер вызывает `onDismiss` через 5 с раньше, чем контекст сбрасывает callback (8 с). Окно «Отменить» фактически 5 с.  
**Фикс:** один таймер только в `UndoContext`; убрать `useEffect` из `UndoBanner`.

### M2. `useDashboardMonth` не обновляет месяц без смены URL
**Файл:** `src/hooks/useDashboardMonth.ts:17–19`  
**Проблема:** `currentYearMonth()` в `useMemo([search])` — долгая сессия без `?m=` показывает старый месяц (дашборд, обзор контрагента). `ReportsScreen` уже чинит interval — хук нет.  
**Фикс:** interval / `visibilitychange` как в `ReportsScreen`.

### M3. `beforeunload` только при `savePending`, не при активном debounce
**Файл:** `PanelDataContext.tsx:812–819`  
**Проблема:** Закрытие вкладки в 650 ms debounce до `savePending` — данные могут не уйти.  
**Фикс:** `beforeunload` при `flushTimerRef != null || savePending`.

### M4. 409 retry не перечитывает task keys при частичном успехе
**Файл:** `PanelDataContext.tsx:696–699`  
**Проблема:** `reloadUserTaskKeys` в try/catch с пустым catch — ошибка reload игнорируется.  
**Фикс:** surface error; обязательный reload перед retry panel-data.

### M5. `parseKeys` при битом JSON → `[]` и перезапись
**Файл:** `src/app/api/tasks/completed/route.ts:5–10`  
**Проблема:** Повреждённый `completedTaskKeys` в БД трактуется как пустой массив → следующий save затирает историю.  
**Фикс:** 500 + log; не писать без repair.

### M6. Нет лимита на размер `completedTaskKeys`
**Файлы:** `prisma/schema.prisma:17`, `api/tasks/completed/route.ts`  
**Проблема:** Массив ключей растёт без ограничений.  
**Фикс:** cap ~500 ключей, max длина строки.

### M7. Promocode dedupe только с последней строкой глобально
**Файл:** `src/lib/promocode-snapshots-local.ts:66–74`  
**Проблема:** Сравнение с `next[next.length - 1]`, не с последним по `codeKey` → лишние точки в series.  
**Фикс:** `Map<codeKey, lastRow>`.

### M8. Дедлайн задач: date-only ISO сдвигает день в TZ
**Файл:** `src/lib/task-deadline.ts:16–18`  
**Проблема:** `new Date("YYYY-MM-DD")` — UTC полночь → неверный локальный день для deadline delivery-notify.  
**Фикс:** парсить YYYY-MM-DD как локальную дату (как release dates).

### M9. `extractActivations` может взять поле заказов вместо активаций
**Файл:** `src/app/api/promocodes/route.ts:51–80`  
**Проблема:** Regex `/(activation|use|used|order)/i` цепляет `ordersCount` и т.п.  
**Фикс:** whitelist полей upstream API.

### M10. Rate limit: spoof `X-Forwarded-For`
**Файл:** `src/lib/login-rate-limit.ts:6–11`  
**Проблема:** Первый hop из заголовка доверяется всегда → обход лимита / блокировка чужого IP.  
**Фикс:** доверять только за reverse proxy; ключ login+IP.

### M11. Нет rate limit на CDEK proxy
**Файл:** `src/app/api/cdek/status/route.ts`  
**Проблема:** Любая сессия + auto-poll → исчерпание квоты СДЭК.  
**Фикс:** per-user throttle.

### M12. CDEK: сортировка статусов через `localeCompare` на строках дат
**Файл:** `src/app/api/cdek/status/route.ts:189–196`  
**Проблема:** Ненадёжный хронологический порядок → неверный «последний» статус.  
**Фикс:** parse `Date`.

### M13. `usePromocodes` без явного `credentials: "include"`
**Файл:** `src/hooks/usePromocodes.ts`  
**Проблема:** Same-origin обычно ок; хрупко при subpath/cross-origin proxy.  
**Фикс:** добавить `credentials: "include"`.

### M14. Multi-tab: применение remote data — полная замена
**Файл:** `PanelDataContext.tsx` (`applyRemoteUpdate`)  
**Проблема:** Нет merge с локальными несохранёнными правками; только баннер.  
**Фикс:** diff / блокировка редактирования до выбора.

### M15. `deliveriesDeliveredInMonth` fallback на `createdAt`
**Файл:** `src/lib/dashboard-metrics.ts:122–129`  
**Проблема:** Без `deliveredAt` месяц доставки ≈ месяц создания записи.  
**Фикс:** обязательный `deliveredAt` при статусе `delivered`.

### M16. `promocodeSnapshots` в localStorage без межустройственной синхронизации
**Файл:** `promocode-snapshots-local.ts`  
**Проблема:** Δ промо на дашборде разная на разных браузерах; рост до `HARD_LIMIT`.  
**Фикс:** server-side snapshots или документировать.

### M17. Роль `user` читает весь снапшот
**Файл:** `PanelDataContext` + GET panel-data  
**Проблема:** Нет серверной изоляции по сотруднику — продуктовое решение не зафиксировано.  
**Фикс:** фильтрация на API или явная политика «все видят всё».

### M18. `debug=1` на promocodes для любой сессии
**Файл:** `src/app/api/promocodes/route.ts:105–106`  
**Проблема:** Утечка snippet/preview upstream Casher admin API.  
**Фикс:** только superadmin или отключить в production.

---

## 🟢 UX / качество / a11y

| ID | Проблема | Файл | Фикс |
|----|----------|------|------|
| U1 | Два независимых месяц-пикера (дашборд URL vs обзор контрагента) | `useDashboardMonth` в дашборде и `ContractorDetailScreen` | общий `?m=` или контекст |
| U2 | Путаница «ФИО» / `name` / `contactPerson` | формы контрагентов | унифицировать подписи |
| U3 | Пустые списки без CTA «создать первое…» | часть list screens | onboarding-ссылки |
| U4 | `AppSidebar`: ссылка «Админ» видна всем ролям | `AppSidebar.tsx:38` | `isAdmin &&` |
| U5 | `MobileBottomNav` без «Отчёты» и «Админ» | `MobileBottomNav.tsx` | добавить или «Ещё» |
| U6 | `HorizontalScrollTable`: hint всегда, даже без overflow | `HorizontalScrollTable.tsx` | проверять `scrollWidth > clientWidth` |
| U7 | `ErrorBoundary`: reset не перемонтирует детей | `ErrorBoundary.tsx` | `key` + remount |
| U8 | `ContractorListModal`: O(n×m) рейтинг | `ContractorListModal.tsx` | `Map` по contractorId |
| U9 | `SlideOver`: нет `inert` на фоне, focus restore | `SlideOver.tsx` | dialog pattern |
| U10 | `ContractorListModal`: нет dialog a11y / trap | `ContractorListModal.tsx` | как SlideOver |
| U11 | `StatusBadgeDropdown`: нет Escape, клавиатура | `StatusBadgeDropdown.tsx` | listbox a11y |
| U12 | `ReachByDayBarChart`: данные только в `title` | `ReachByDayBarChart.tsx` | `aria-label` |
| U13 | `app/(app)/layout.tsx`: loading `#000000` inline | `layout.tsx:14–17` | Tailwind tokens |
| U14 | `Header`: двойной клик logout | `Header.tsx` | `disabled` while busy |
| U15 | `integrations/page.tsx`: export `PanelRoute` | `integrations/page.tsx` | переименовать |

---

## 🏗 Архитектурный долг

| ID | Проблема |
|----|----------|
| A1 | Весь домен в одном JSON `PanelSnapshot.data` — конфликты 409, нет индексов |
| A2 | `PanelDataContext.tsx` ~2000 строк — god-object (load, sync, CRUD, tasks) |
| A3 | Крупные экраны: `ContractorDetailScreen` ~1780, `DeliveriesScreen` ~1360, `IntegrationsScreen` ~1580 строк |
| A4 | Нет unit/integration тестов на `panel-tasks`, `dashboard-metrics`, `auth-password`, `panel-session-server` |

---

## Рекомендуемый порядок исправлений

| Приоритет | ID |
|-----------|-----|
| **P0** | C1–C6 (RBAC write + UI + login redirect), C9 |
| **P1** | C7–C8, S1–S2, S5–S7, S8–S9 |
| **P2** | S3–S4, S10–S14, S16, M1–M12 |
| **P3** | M13–M18, U1–U15, A1–A4 |

---

## Примечания по предыдущим файлам

- **`bugs.md`** — частично устарел (много `[NEW]`, уже закрыто).
- **`bugs2.md`** — актуален на момент написания, но **C1–C7, S4, S5, U7 и др. уже исправлены** в коде после bugs2; не копируйте их как открытые без проверки.
- **`bugs3.md`** — полный срез на 2026-05-15: исправленное + всё ещё открытое + новые находки (RBAC, open redirect, reach=0, undo timers, employeeId, и т.д.).
