import { getLocalDateString, isWeekend } from './time.js';

export function eachDateInRange(startDate, endDate) {
  const dates = [];
  const cursor = new Date(`${startDate}T12:00:00.000Z`);
  const last = new Date(`${endDate}T12:00:00.000Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function isWeekendDate(dateStr, weekendDays = [0, 6]) {
  return isWeekend(dateStr, weekendDays);
}

export function dateRangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function todayLocalDateStr() {
  return getLocalDateString();
}

export function yearOf(dateStr) {
  return Number(dateStr.slice(0, 4));
}
