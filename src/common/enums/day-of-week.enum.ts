export enum DayOfWeek {
  Monday    = 1 << 0, // 1
  Tuesday   = 1 << 1, // 2
  Wednesday = 1 << 2, // 4
  Thursday  = 1 << 3, // 8
  Friday    = 1 << 4, // 16
  Saturday  = 1 << 5, // 32
  Sunday    = 1 << 6, // 64
}

export const ALL_DAYS = 127; // 0b1111111

// Helpers
export const hasDay = (mask: number, day: DayOfWeek): boolean =>
  (mask & day) !== 0;

export const addDay = (mask: number, day: DayOfWeek): number =>
  mask | day;

export const removeDay = (mask: number, day: DayOfWeek): number =>
  mask & ~day;

export const toDaysList = (mask: number): DayOfWeek[] =>
  Object.values(DayOfWeek)
    .filter((v): v is DayOfWeek => typeof v === 'number' && hasDay(mask, v));