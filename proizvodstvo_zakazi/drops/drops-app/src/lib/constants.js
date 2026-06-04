export const STAGES = [
  { key: 'ideation', label: 'СОЗДАНИЕ', short: 'СОЗДАНИЕ' },
  { key: 'development', label: 'ПРОРАБОТКА', short: 'ПРОРАБОТКА' },
  { key: 'finalization', label: 'ФИНАЛИЗАЦИЯ И ДРОП', short: 'ФИНАЛИЗАЦИЯ' },
]

/** Подэтапы фазы «Создание» (ideation): порядок совпадает с TASKS.ideation.item. */
export const IDEATION_SUBSTAGES = [
  { key: 'concept', label: 'Идейность' },
  { key: 'approval', label: 'Согласование' },
]

export const STAGE_INDEX = { ideation: 0, development: 1, finalization: 2 }

export const NEXT_STAGE = {
  ideation: 'development',
  development: 'finalization',
  finalization: null,
}

export const MOMENTS = {
  ideation: [
    { key: 'theme', label: 'Тема/идея' },
    { key: 'refs', label: 'Рефы' },
    { key: 'palette', label: 'Палитра' },
    { key: 'message', label: 'Месседж' },
    { key: 'goals', label: 'Цели и метрики (продажи/имидж)' },
    { key: 'audience', label: 'Аудитория (внутренняя/внешняя)' },
    { key: 'positions_draft', label: 'Список позиций (черновой)' },
    { key: 'packaging', label: 'Упаковка/вложение (карточки/стикеры/допы)' },
    { key: 'shooting', label: 'Где/что/когда снимаем' },
    { key: 'ai_content', label: 'Нужен ли AI-контент?' },
    { key: 'drop_date_est', label: 'Когда дропаемся ориентировочно?' },
    { key: 'patterns', label: 'Определиться с лекалами' },
  ],
  development: [
    { key: 'designs_final', label: 'Зафиналить дизайны и/или отдать на правки' },
    { key: 'name_final', label: 'Согласовать финальное название и название позиций' },
    { key: 'marketing_focus', label: 'Куда делаем маркетинговый упор (позиция)' },
    { key: 'initial_qty', label: 'Количество стартового тиража?' },
    { key: 'positions_final', label: 'Список позиций финальный' },
    { key: 'packaging_final', label: 'Упаковка финальная' },
    { key: 'shooting_approved', label: 'Согласовать съёмки' },
    { key: 'ai_approved', label: 'Согласовать AI-контент' },
    { key: 'bloggers_count', label: 'Согласовать количество блогеров' },
    { key: 'marketing_budget', label: 'Согласовать бюджет на маркетинг' },
  ],
}

/** Моменты ideation с уровнем «коллекция» (PocketBase scope=drop), не у позиции. */
export const MOMENTS_IDEATION_KEYS_SCOPE_DROP = new Set([
  'positions_draft',
  'packaging',
  'shooting',
  'ai_content',
  'drop_date_est',
  'patterns',
])

/** Поля «моментов» только на уровне дропа (страница коллекции). */
export const MOMENTS_DROP = {
  ideation: MOMENTS.ideation.filter(m => MOMENTS_IDEATION_KEYS_SCOPE_DROP.has(m.key)),
}

export const TASKS = {
  ideation: {
    item: [
      'Отдать дизайнерам в работу',
      'Согласовать дизайны',
    ],
    drop: [
      'Собрать мудборд дропа (позиции)',
      'Собрать мудборд дропа (медийка)',
      'Расписать съёмки',
      'Расписать посты черновые',
    ],
  },
  development: {
    drop: [
      'Отдать в работу AI-контент',
      'Поиск блогеров для договорённостей',
      'Запланировать съёмку',
      'Согласовать блогеров',
      'Согласовать съёмку и AI контент',
    ],
    item: [
      'Сделать мокапы',
      'Сделать размерную сетку',
      'Произвести семпл',
    ],
  },
  finalization: {
    drop: [
      'Подготовить ВСЕ посты под прогрев и дроп',
      'Подготовить тексты рассылок',
      'Подготовить розыгрыши и закупы',
      'Подготовка графического дизайна',
      'Отослать позиции в оффлайн',
      'Отослать блогерам',
      'Проверить заливку товаров',
      'Залить везде товары',
    ],
    item: [],
  },
}

export const STATUS_CONFIG = {
  ideation: { label: 'Идейность', color: '#14C97A' },
  development: { label: 'Проработка', color: '#0E9A56' },
  finalization: { label: 'Финализация', color: '#0E7A45' },
  dropped: { label: 'ДРОП', color: '#C8C8C8' },
}

export const DROP_TYPES = {
  single: 'Единичный дроп',
  collection: 'Коллекция / Капсула',
}

export const PASSWORD = '1234'
export const AUTH_KEY = 'casher_auth'
