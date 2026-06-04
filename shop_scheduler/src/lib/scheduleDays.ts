export type DaySlotConfig = {
  id: string;
  dayOfWeek: number;
  title: string;
};

export const DAY_SLOTS: DaySlotConfig[] = [
  { id: "dow-1", dayOfWeek: 1, title: "Понедельник" },
  { id: "dow-2", dayOfWeek: 2, title: "Вторник" },
  { id: "dow-3", dayOfWeek: 3, title: "Среда" },
  { id: "dow-4", dayOfWeek: 4, title: "Четверг" },
  { id: "dow-5", dayOfWeek: 5, title: "Пятница" },
  { id: "dow-6", dayOfWeek: 6, title: "Суббота" },
  { id: "dow-7", dayOfWeek: 7, title: "Воскресенье" }
];

export const daySlotKey = (zoneId: string, dayOfWeek: number) => `${zoneId}|${dayOfWeek}`;
