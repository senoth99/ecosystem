# bugs.md — аудит после рефакторинга Cursor

> Дата: 2026-05-15  
> Статус: выявлено на основе анализа кода. Старые баги из CLAUDE.md помечены `[CLAUDE]`, новые — `[NEW]`.

---

## 🔴 Критичные баги (логика сломана)

### B1. Метрики дашборда по `createdAt`, а не `releaseDate` `[CLAUDE]`
**Файл:** `src/screens/DashboardScreen.tsx:110–118`, `src/components/dashboard/DashboardIntegrationsMonthTable.tsx:31–36`  
**Проблема:** `integrationsPublishedInMonth` и bar-chart охватов (`integrationReachByCalendarDayInMonth`) фильтруют по `createdAt`. Интеграция создана в апреле, вышла в мае → в мае не считается.  
**Фикс:** фильтровать по `releaseDate`.

### B2. Задача «проверить выход» не создаётся без времени `[CLAUDE]`
**Файл:** `src/lib/panel-tasks.ts:50–73`  
**Проблема:** `localReleaseDateTimeMs()` возвращает `null` если нет `releaseTime`. Интеграция с датой без времени → задача на проверку выхода не появляется.  
**Фикс:** если нет времени — брать начало дня (00:00).

### B3. `reach = 0` автоматически закрывает задачу `[NEW]`
**Файл:** `src/context/PanelDataContext.tsx:1222–1234`  
**Проблема:** При установке охватов `reach = 0` задача `integration-reach` помечается выполненной. Ноль охватов — не выполненная задача.  
**Фикс:** требовать `reach > 0` для автозакрытия.

### B4. UndoContext: баннер не гасится по таймеру `[NEW]`
**Файл:** `src/context/UndoContext.tsx`  
**Проблема:** Баннер отмены остаётся бесконечно — нет таймера на 5–10 секунд. Пользователь видит устаревший баннер.  
**Фикс:** `setTimeout` на 7–10 секунд, сбрасывать при повторном вызове `showUndo`.

### B5. UndoContext: race condition при двойном вызове `[NEW]`
**Файл:** `src/context/UndoContext.tsx`  
**Проблема:** Второй вызов `showUndo` перезаписывает `onUndoRef` до клика — пользователь отменяет не ту операцию.  
**Фикс:** хранить очередь callbacks или блокировать новый `showUndo` пока предыдущий активен.

### B6. Месяц замораживается при монтировании компонента `[CLAUDE]`
**Файл:** `src/screens/TasksScreen.tsx:70` (`useMemo([], [])`), `src/screens/ContractorDetailScreen.tsx:175`  
**Проблема:** `now` / `overviewYm` вычисляются один раз при монтировании. Открыл в конце месяца — в новом месяце метрики старые.  
**Фикс:** убрать `useMemo` (вычисление дешёвое) или `useState` + `useEffect` с интервалом.

### B7. Delta промокодов = 0 при одном снапшоте в месяце `[CLAUDE]`
**Файл:** `src/context/PanelDataContext.tsx:76–102`, `src/screens/DashboardScreen.tsx:75–102`  
**Проблема:** `last - first` где `first === last` → дельта 0. В первый день месяца — весь день нули.  
**Фикс:** для первого снапшота месяца база = 0 (или последний снапшот прошлого месяца).

### B8. `completedTaskKeys` — race condition между пользователями `[CLAUDE]`
**Файл:** `src/context/PanelDataContext.tsx`  
**Проблема:** Глобальный снапшот, два пользователя одновременно отмечают задачи → 409, без retry. Один теряет изменения.  
**Фикс:** хранить `completedTaskKeys` per-user (таблица `User` или отдельная таблица).

---

## 🟠 Баги производительности

### P1. O(n²) при рендере списка контрагентов `[CLAUDE]`
**Файл:** `src/screens/ContractorsScreen.tsx:98–116`, `src/context/PanelDataContext.tsx:98–116`  
**Проблема:** Для каждого контрагента фильтруют весь массив интеграций. 100 контрагентов × 1000 интеграций = 100 000 итераций.  
**Фикс:** `Map<contractorId, Integration[]>` один раз перед циклом.

### P2. Двойной запрос `/api/promocodes` `[CLAUDE U1]`
**Файл:** `src/screens/ContractorDetailScreen.tsx`, `src/screens/DashboardScreen.tsx`  
**Проблема:** Оба вызывают `usePromocodes()` независимо → два параллельных запроса.  
**Фикс:** вынести в `PanelDataContext` или отдельный `PromocodesContext`.

### P3. `filteredProducts` без мемоизации в DeliveriesScreen `[NEW]`
**Файл:** `src/screens/DeliveriesScreen.tsx:347–357`  
**Проблема:** Пересчитывается при каждом изменении состояния модала.  
**Фикс:** обернуть в `useMemo`.

---

## 🟠 Навигационные баги

### N1. Redirect-страницы ломают историю браузера `[NEW]`
**Файл:** `src/app/(app)/integrations/[integrationId]/page.tsx`, аналогично contractors и deliveries  
**Проблема:** Детальные страницы делают redirect на `?id=...` query param. Кнопка «Назад» уводит из приложения, а не в список.  
**Фикс:** рендерить detail-компонент прямо в `[id]/page.tsx`, убрать redirect.

### N2. `<Suspense>` без Server Components не работает `[NEW]`
**Файл:** `src/app/(app)/dashboard/layout.tsx`  
**Проблема:** `<Suspense>` обёртки вокруг Client Components — граница стриминга не работает, только лишний рендер.  
**Фикс:** убрать `<Suspense>` или перевести нужные части на Server Components.

### N3. Dashboard layout `min-w-0` — лишний враппер `[NEW]`
**Файл:** `src/app/(app)/dashboard/layout.tsx`  
**Проблема:** Одинокий `div` с `min-w-0` без другого содержимого.  
**Фикс:** убрать, перенести в app layout.

---

## 🟠 UX/UI проблемы

### U1. `isActive()` продублирован в 4 местах `[NEW]`
**Файлы:** `AppSidebar.tsx:40`, `MobileBottomNav.tsx:16`, `MainMenuNav.tsx:15`  
**Фикс:** вынести в `src/lib/nav-utils.ts`.

### U2. Боковая панель не раскрывается автоматически при переходе `[NEW]`
**Файл:** `src/components/AppSidebar.tsx:61`  
**Проблема:** `onClick` раскрывает только при клике на collapsed-item, но программная навигация не раскрывает sidebar.  
**Фикс:** `useEffect` на pathname → если collapsed, expand().

### U3. localStorage ошибки глотаются молча `[NEW]`
**Файл:** `src/components/AppSidebar.tsx:91–95`  
**Проблема:** `try/catch` без логирования — при bitrot localStorage не понятно почему сайдбар не сохраняет состояние.  
**Фикс:** `console.warn` в catch.

### U4. Баннер ошибки сохранения без кнопки retry `[NEW]`
**Файл:** `src/components/AppShell.tsx:17`  
**Проблема:** `saveError` отображается, но нет кнопки «Повторить». Пользователь не знает что делать.  
**Фикс:** добавить кнопку retry рядом с текстом ошибки.

### U5. Нет fade/индикатора горизонтального скролла в таблицах `[CLAUDE U3]`
**Файл:** `src/screens/ContractorsScreen.tsx:534`, `src/screens/DeliveriesScreen.tsx`  
**Фикс:** CSS gradient overlay `::after` при `overflow-x: auto`.

### U6. Нет confirm-диалога при удалении `[CLAUDE U5]`
**Файлы:** `src/screens/ContractorDetailScreen.tsx:1288`, `src/screens/DeliveryDetailScreen.tsx:206–212`  
**Проблема:** `window.confirm()` блокирует поток. Некоторые удаления без confirm вообще.  
**Фикс:** inline-подтверждение (двойной клик / mini-dialog) вместо `window.confirm`.

### U7. Вкладки контрагента без счётчиков `[CLAUDE U4]`
**Файл:** `src/screens/ContractorDetailScreen.tsx`  
**Фикс:** рядом с каждой вкладкой badge с количеством элементов.

### U8. Пустые состояния без CTA `[CLAUDE U6]`
**Файлы:** `src/screens/DeliveriesScreen.tsx:789–796`  
**Проблема:** «Нет доставок» без ссылки создать. Новый пользователь не знает куда идти.  
**Фикс:** кнопка/ссылка «Создать первую доставку» в пустом состоянии.

### U9. Нет индикатора pending-сохранения `[NEW]`
**Файл:** `src/context/PanelDataContext.tsx`  
**Проблема:** 650ms debounce — данные уходят на сервер, но UI ничего не показывает. Пользователь уходит со страницы до сохранения.  
**Фикс:** спиннер / «Сохранение...» пока debounce активен.

### U10. Месяц-пикер в карточке контрагента не синхронизирован с дашбордом `[NEW]`
**Файл:** `src/screens/ContractorDetailScreen.tsx:175`  
**Проблема:** Два независимых месяц-пикера (дашборд + детальная карточка) — пользователь переключает месяц в двух местах.  
**Фикс:** вынести выбранный месяц в общий контекст или URL-параметр.

### U11. Форма добавления ссылки не сбрасывается при закрытии модала `[NEW]`
**Файл:** `src/screens/ContractorDetailScreen.tsx:177–181`  
**Проблема:** Черновик ссылки остаётся после закрытия — при повторном открытии видны старые данные.  
**Фикс:** сбрасывать state при `onClose`.

### U12. Нет focus-trap в модальных окнах `[CLAUDE U9]`
**Фикс:** `focus-trap-react` или нативная реализация с `tabIndex` и `onKeyDown`.

### U13. Highlight при добавлении доставки гасится через 2s без feedback `[NEW]`
**Файл:** `src/screens/DeliveriesScreen.tsx:527–531`  
**Фикс:** сопроводить toast-уведомлением об успешном добавлении.

---

## 🟡 Архитектурный долг

### A1. `PanelDataContext.tsx` — 1941 строк god-object `[CLAUDE A2]`
Содержит загрузку, синхронизацию, весь CRUD, бизнес-логику. Нужно разбить:
- `useContractors` / `useIntegrations` / `useDeliveries` — CRUD хуки
- `usePanelSync` — сетевой слой
- `useDashboardMetrics` — агрегация

### A2. Экраны смешивают логику и рендер `[CLAUDE A3]`
- `ContractorDetailScreen.tsx` — 1790 строк
- `DeliveriesScreen.tsx` — 1340 строк
- `IntegrationDetailScreen.tsx` — 1000+ строк  
**Фикс:** выносить в хуки, дробить на компоненты.

### A3. Детальные страницы через query-param вместо сегмента URL `[NEW]`
Паттерн `[id]/page.tsx → redirect ?id=...` означает детальная страница не работает при прямом переходе (SSR не знает id).  
**Фикс:** рендерить компонент по `params.contractorId` напрямую.

### A4. Дублирование навигационных типов и логики `[NEW]`
`NavItem` тип определён локально в `AppSidebar` и `MobileBottomNav`. `isActive()` — 4 копии.  
**Фикс:** `src/lib/nav-utils.ts` с типами и хелперами.

### A5. Нет сетевых retry в `PanelDataContext` `[CLAUDE F3]`
409-конфликт обрабатывается, но нет экспоненциального backoff. Сетевые ошибки падают тихо.  
**Фикс:** 3 retry с exponential backoff на `fetch` внутри `syncToServer`.

### A6. `Providers.tsx` без Error Boundary `[NEW]`
Крах любого из 4 вложенных контекстов уронит всё приложение без фallback UI.  
**Фикс:** обернуть в `<ErrorBoundary>`.

---

## Приоритет исправлений

| Приоритет | Что |
|-----------|-----|
| 🔴 P0 | B3 (reach=0 закрывает задачу), B4/B5 (UndoContext), N1 (back-navigation) |
| 🔴 P1 | B1 (метрики по createdAt), B2 (задача без времени), B6 (замороженный месяц) |
| 🟠 P2 | P1 (O(n²)), U4 (retry баннер), U9 (pending indicator), A6 (Error Boundary) |
| 🟠 P3 | U1 (дубль isActive), U6 (confirm удаление), U11 (сброс формы), A3 (query-param) |
| 🟡 P4 | A1/A2 (рефактор god-files), U5/U7/U8/U12/U13 (UX polish) |
