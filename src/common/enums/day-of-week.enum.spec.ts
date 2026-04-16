import {
  DayOfWeek,
  ALL_DAYS,
  hasDay,
  addDay,
  removeDay,
  toDaysList,
} from './day-of-week.enum';

describe('DayOfWeek enum', () => {
  it('should have correct bit-flag values', () => {
    expect(DayOfWeek.Monday).toBe(1);
    expect(DayOfWeek.Tuesday).toBe(2);
    expect(DayOfWeek.Wednesday).toBe(4);
    expect(DayOfWeek.Thursday).toBe(8);
    expect(DayOfWeek.Friday).toBe(16);
    expect(DayOfWeek.Saturday).toBe(32);
    expect(DayOfWeek.Sunday).toBe(64);
  });

  it('ALL_DAYS should equal the OR of all days', () => {
    const allDaysOr =
      DayOfWeek.Monday |
      DayOfWeek.Tuesday |
      DayOfWeek.Wednesday |
      DayOfWeek.Thursday |
      DayOfWeek.Friday |
      DayOfWeek.Saturday |
      DayOfWeek.Sunday;
    expect(ALL_DAYS).toBe(allDaysOr);
    expect(ALL_DAYS).toBe(127);
  });
});

describe('hasDay', () => {
  it('returns true when the day is present in the mask', () => {
    expect(hasDay(DayOfWeek.Monday, DayOfWeek.Monday)).toBe(true);
    expect(hasDay(ALL_DAYS, DayOfWeek.Friday)).toBe(true);
    expect(hasDay(DayOfWeek.Monday | DayOfWeek.Wednesday, DayOfWeek.Wednesday)).toBe(true);
  });

  it('returns false when the day is absent from the mask', () => {
    expect(hasDay(0, DayOfWeek.Monday)).toBe(false);
    expect(hasDay(DayOfWeek.Monday, DayOfWeek.Tuesday)).toBe(false);
    expect(hasDay(DayOfWeek.Wednesday | DayOfWeek.Friday, DayOfWeek.Saturday)).toBe(false);
  });
});

describe('addDay', () => {
  it('adds a day to an empty mask', () => {
    expect(addDay(0, DayOfWeek.Monday)).toBe(DayOfWeek.Monday);
  });

  it('adds a day to an existing mask', () => {
    const mask = addDay(DayOfWeek.Monday, DayOfWeek.Friday);
    expect(hasDay(mask, DayOfWeek.Monday)).toBe(true);
    expect(hasDay(mask, DayOfWeek.Friday)).toBe(true);
  });

  it('is idempotent — adding an already-present day does not change the mask', () => {
    const mask = DayOfWeek.Tuesday;
    expect(addDay(mask, DayOfWeek.Tuesday)).toBe(mask);
  });
});

describe('removeDay', () => {
  it('removes a day from a mask', () => {
    const mask = DayOfWeek.Monday | DayOfWeek.Wednesday;
    const result = removeDay(mask, DayOfWeek.Monday);
    expect(hasDay(result, DayOfWeek.Monday)).toBe(false);
    expect(hasDay(result, DayOfWeek.Wednesday)).toBe(true);
  });

  it('removing a day not present in the mask is a no-op', () => {
    const mask = DayOfWeek.Thursday;
    expect(removeDay(mask, DayOfWeek.Friday)).toBe(mask);
  });

  it('removing from an empty mask yields 0', () => {
    expect(removeDay(0, DayOfWeek.Saturday)).toBe(0);
  });
});

describe('toDaysList', () => {
  it('returns an empty array for a zero mask', () => {
    expect(toDaysList(0)).toEqual([]);
  });

  it('returns all seven days for ALL_DAYS', () => {
    const result = toDaysList(ALL_DAYS);
    expect(result).toHaveLength(7);
    expect(result).toContain(DayOfWeek.Monday);
    expect(result).toContain(DayOfWeek.Tuesday);
    expect(result).toContain(DayOfWeek.Wednesday);
    expect(result).toContain(DayOfWeek.Thursday);
    expect(result).toContain(DayOfWeek.Friday);
    expect(result).toContain(DayOfWeek.Saturday);
    expect(result).toContain(DayOfWeek.Sunday);
  });

  it('returns only the days present in the mask', () => {
    const mask = DayOfWeek.Monday | DayOfWeek.Wednesday | DayOfWeek.Friday;
    const result = toDaysList(mask);
    expect(result).toHaveLength(3);
    expect(result).toContain(DayOfWeek.Monday);
    expect(result).toContain(DayOfWeek.Wednesday);
    expect(result).toContain(DayOfWeek.Friday);
    expect(result).not.toContain(DayOfWeek.Tuesday);
    expect(result).not.toContain(DayOfWeek.Thursday);
    expect(result).not.toContain(DayOfWeek.Saturday);
    expect(result).not.toContain(DayOfWeek.Sunday);
  });

  it('returns a single-element array for a single-day mask', () => {
    expect(toDaysList(DayOfWeek.Sunday)).toEqual([DayOfWeek.Sunday]);
  });
});
