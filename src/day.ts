/**
 * Training day: what counts is when a workout STARTS, and a day runs from 06:00 to 06:00.
 * A workout started at 01:30 on Friday belongs to Thursday.
 */
export const DAY_START_HOUR = 6;

/** The training day a timestamp belongs to, as a Date at noon of that (local) calendar day. */
export function trainingDate(ts: number = Date.now()) {
  const d = new Date(ts - DAY_START_HOUR * 3600e3);
  d.setHours(12, 0, 0, 0);
  return d;
}

/** Noon of the training day, as a number – handy for comparing with period starts (midnight). */
export const dayTs = (ts: number = Date.now()) => trainingDate(ts).getTime();

const pad = (n: number) => String(n).padStart(2, '0');
/** YYYY-MM-DD of a calendar date. */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** YYYY-MM-DD of the training day a timestamp belongs to. */
export const dayKey = (ts: number = Date.now()) => dateKey(trainingDate(ts));
