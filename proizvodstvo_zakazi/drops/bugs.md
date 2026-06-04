# DROPS — Аудит: баги, несоответствия, UX

---

## 🔴 КРИТИЧЕСКИЕ БАГИ

### 1. `useNavigate` не импортирован в ItemPage — страница крашится
**Файл:** `src/pages/ItemPage.jsx`

```js
// импорт:
import { useParams } from 'react-router-dom'

// использование:
const navigate = useNavigate() // ReferenceError: useNavigate is not defined
```

ItemPage не открывается вообще. `useNavigate` вызывается но не импортирован.  
`navigate` объявлен но нигде не используется — можно просто удалить.  
**Фикс:** убрать `const navigate = useNavigate()` из ItemPage.

---

### 2. `handleToggle` в StageSection вызывает `loadTasks()` дважды
**Файл:** `src/pages/ItemPage.jsx`

```js
async function handleToggle(task) {
  setTasks(prev => ...)  // оптимистичное обновление
  const { error } = await toggleTask(task.id, !task.completed)
  if (error) loadTasks()
  else loadTasks()  // вызов в ОБОИХ ветках
}
```

Optimistic update сразу перетирается сетевым запросом. Два лишних RTT на каждый клик.  
**Фикс:** `loadTasks()` только в `if (error)` ветке.

---

### 3. Стадия "Финализация" показывается как активная у задропанных дропов
**Файл:** `src/lib/stageUtils.js`

```js
if (dropStatus === 'dropped') {
  return { done: stageIndex < 2, active: stageIndex === 2 }
  // finalization (index 2) → active, НЕ done
}
```

У задропанного дропа полоска "ФИНАЛИЗАЦИЯ" светится как активная (полупрозрачный зелёный), а не как завершённая.  
**Фикс:** вернуть `{ done: true, active: false }` для всех стадий когда `dropped`.

---

### 4. `supabase.js` подключён, не используется, но импортирует undefined переменные
**Файлы:** `src/lib/supabase.js` + любая страница

`supabase.js` существует и вызывает `createClient(url, key)` где `url` и `key` берутся из `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Если эти переменные не заданы — `createClient` падает с ошибкой при инициализации модуля. Файл никем не импортируется, но сам факт его существования — риск при рефакторе.  
Кроме того, `fetchMoments` в supabase.js не фильтрует по `scope`, что вернёт неправильные данные.

---

### 5. `initItemTasks` / `initDropTasks` в supabase.js создают дубли задач
**Файл:** `src/lib/supabase.js`

```js
async function initItemTasks(itemId, stage) {
  const rows = titles.map(title => ({ ... }))
  await supabase.from('tasks').insert(rows)  // нет проверки на существующие
}
```

PocketBase-версия проверяет существующие задачи перед вставкой. Supabase-версия вставляет без проверки → дубли при повторном вызове.

---

## 🟡 НЕСООТВЕТСТВИЯ С instructions.md

### 6. Нет перехода дропа по стадиям (ideation → development → finalization)
**Файл:** `src/pages/DropPage.jsx`

`advanceDropStage()` в `pocketbase.js` существует, но нигде не вызывается из UI. Единственная кнопка — "ЗАДРОПАЛИ" (→ `dropped`). Дроп нельзя переместить ideation → development → finalization через интерфейс.  
Инструкция: _"после того как все задачи и моменты зафиксированы вещь может уйти в этап 2"_.

---

### 7. При создании дропа нет поля для даты
**Файл:** `src/pages/Dashboard.jsx`

В форме "НОВЫЙ ДРОП" отсутствует `<input type="datetime-local">` для `drop_date`, хотя state `form.drop_date` существует и передаётся в `createDrop()`. Пользователь не может задать дату при создании.  
Дата добавляется только через отдельную кнопку "ИЗМЕНИТЬ ДАТУ" уже внутри дропа.

---

### 8. Нет редактирования названия и типа дропа
**Файл:** `src/pages/DropPage.jsx`

Инструкция: _"Drop header: name, date/time, status, **edit**"_. Кнопки Edit для названия/типа нет. Позицию тоже нельзя переименовать после создания.

---

### 9. Момент-поля только для items, не для drop
**Данные:** CLAUDE.md таблица `moments` имеет `scope: 'drop' | 'item'`

В constants.js у `development` стадии есть моменты (маркетинговый упор, тираж, бюджет и т.д.) которые логически принадлежат дропу, не айтему. Но MomentField хардкодит `scope = "item"`. Drop-level моменты не реализованы.

---

### 10. Сортировка дропов на дашборде обратная
**Файл:** `src/pages/Dashboard.jsx`

```js
const order = { dropped: 0, finalization: 1, development: 2, ideation: 3 }
```

Задропанные дропы (`dropped: 0`) идут ПЕРВЫМИ. Активные (ideation) — последними. Логика должна быть обратной: активные и срочные вперёд.

---

### 11. Нет статуса "переходного этапа" как отдельной фазы
**Из instructions.md:**
```
переходный этап
- Согласовать тестовые образцы
- Согласовать мокапы
- Согласовать блогеров
- Согласовать съёмку и AI контент
```

Эти задачи добавлены в stage 2 (`development`), но переходный этап визуально не выделен — нет отдельного состояния/индикатора между этапами 2 и 3.

---

### 12. Dashboard не показывает задачи всех стадий — только текущей
**Файл:** `src/pages/Dashboard.jsx` → `loadStatsFor`

```js
const stage = drop.status === 'dropped' ? 'finalization' : drop.status
// фильтр: только задачи текущей стадии дропа
```

KPI "Задач выполнено / осталось" показывает только активный этап, а не суммарно по всему дропу. Метрика вводит в заблуждение.

---

## 🟠 UX / ДИЗАЙН

### 13. DropPage: двухколоночный layout не адаптирован под мобилку
**Файл:** `src/pages/DropPage.jsx`

```js
gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)'
```

Нет media query — на мобиле колонки схлопнутся до минимума и будут нечитаемы. Нужен `@media (max-width: 768px) { grid-template-columns: 1fr }`.

---

### 14. `confirm()` для удаления — плохо на мобиле
**Файлы:** Dashboard.jsx, DropPage.jsx

```js
if (!confirm('Удалить дроп?')) return
```

Нативный `confirm()` выглядит нестандартно на iOS/Android, не стилизован под тему. Нужен модальный диалог подтверждения.

---

### 15. `Header.jsx` — мёртвый код
**Файл:** `src/components/layout/Header.jsx`

Файл существует, нигде не импортируется. Все страницы используют `AppShell`. Путаница при поддержке.

---

### 16. `App.css` — Vite boilerplate не удалён
**Файл:** `src/App.css`

Весь дефолтный CSS от Vite-темплейта (`.counter`, `.hero`, `.ticks`, `#next-steps`, etc.) никогда не используется. Мусор в бандле.

---

### 17. Момент-поля: двойной save при blur + debounce
**Файл:** `src/pages/ItemPage.jsx` → `MomentField`

```js
timer.current = setTimeout(() => handleSave(e.target.value), 2000)
// ...
onBlur={() => { clearTimeout(timer.current); handleSave() }}
```

При blur `clearTimeout` отменяет дебаунс — ок. Но `handleSave()` вызывается без аргумента, используя `value` из closure. Если React batched state ещё не обновился, `value` может быть устаревшим. Нужно `handleSave(value)` вместо `handleSave()`.

---

### 18. CollectionTasks подписывается на ВСЕ задачи глобально
**Файл:** `src/pages/DropPage.jsx`

```js
pb.collection('tasks').subscribe('*', load)
```

Подписка на `'*'` — любое изменение любой задачи в системе вызывает перегрузку данных. При нескольких пользователях — постоянный noise. Нужен фильтр по `scope_id`.

---

### 19. DropPage подписки тоже глобальные
**Файл:** `src/pages/DropPage.jsx`

```js
sub('items', '*', load)
sub('tasks', '*', load)
```

Аналогично — нет фильтрации по `dropId`. Любое изменение в системе триггерит `load()`.

---

### 20. Нет Inter шрифта — fallback на system-ui
**Файл:** `src/index.css`

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

`@import` для Inter отсутствует. На машинах без Inter — system-ui, что отличается по виду и kerning-у. Нужен `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap')` или self-hosted.

---

### 21. Нет пустого состояния для панели задач коллекции
**Файл:** `src/pages/DropPage.jsx` → `CollectionTasks`

```js
if (!visible || loading || !tasks.length) return null
```

Если на текущем этапе нет коллективных задач (ideation: `drop: []`) — правая колонка полностью пустая без объяснения. Пользователь не понимает, почему там ничего нет.

---

### 22. Хлебные крошки в AppShell не показывают имя дропа
**Файл:** `src/components/layout/AppShell.jsx`

Дефолтная логика:
```js
{dropId && !isItem && <Link to={`/drops/${dropId}`} style={tabLink(true)}>ДРОП</Link>}
```

Когда `tabs` не переданы — показывается "ДРОП", а не имя дропа. DropPage передаёт кастомные tabs с именем, но это ломается если имя дропа длинное (обрезается без `...` на мобиле из-за фиксированного `maxWidth`).

---

### 23. Кнопка выхода — только иконка, нет tooltip на мобиле
**Файл:** `src/components/layout/AppShell.jsx`

SVG-иконка выхода без подписи. На мобиле нет hover-tooltip. Новый пользователь может не понять что это logout.

---

### 24. Задачи на DropPage не реагируют на завершение всех задач айтема
Когда все задачи айтема выполнены — нет автоматического предложения перейти на следующий этап на уровне дропа. Связи между состоянием айтемов и прогрессом дропа в UI нет.

---

## СВОДКА

| Категория | Кол-во |
|---|---|
| 🔴 Критические баги | 5 |
| 🟡 Несоответствия инструкции | 7 |
| 🟠 UX / Дизайн | 12 |
| **Итого** | **24** |

**Первоочередные фиксы:**
1. `useNavigate` в ItemPage (краш страницы)
2. Двойной `loadTasks()` в handleToggle
3. `stageUtils` — dropped статус показывает finalization как активную
4. Добавить переход дропа по стадиям
5. Адаптивный layout DropPage под мобилку
