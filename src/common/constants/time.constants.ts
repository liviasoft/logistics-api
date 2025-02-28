export const MILLISECONDS = 1000 as const;

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export const TIME_PERIOD = {
  SECOND,
  MINUTE,
  HOUR,
  DAY,
  WEEK,
  MONTH,
  YEAR,
} as const;

export type TIME_PERIOD_KEY = keyof typeof TIME_PERIOD;
