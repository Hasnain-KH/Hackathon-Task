import { getLocalDateString } from './time.js';

export function isValidMonth(monthStr) {
  if (typeof monthStr !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) return false;
  const [year, month] = monthStr.split('-').map(Number);
  return year >= 1900 && year <= 9999 && month >= 1 && month <= 12;
}

export function monthRange(monthStr) {
  if (!isValidMonth(monthStr)) throw new TypeError('Month must be in YYYY-MM format.');
  const [year, month] = monthStr.split('-').map(Number);
  const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startDateStr = `${monthStr}-01`;
  const endDateStr = `${monthStr}-${String(endDay).padStart(2, '0')}`;
  return {
    startDate: new Date(`${startDateStr}T00:00:00.000Z`),
    endDate: new Date(`${endDateStr}T23:59:59.999Z`),
    startDateStr,
    endDateStr,
  };
}

function dateStringsBetween(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T12:00:00.000Z`);
  const last = new Date(`${end}T12:00:00.000Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function isWeekend(dateStr, weekendDays) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekendDays.includes(weekday);
}

export function workingDaysInMonth(monthStr, weekendDays = [0, 6], holidaysDateStrSet = new Set()) {
  const { startDateStr, endDateStr } = monthRange(monthStr);
  return dateStringsBetween(startDateStr, endDateStr)
    .filter((date) => !isWeekend(date, weekendDays) && !holidaysDateStrSet.has(date)).length;
}

export function activeWorkingDaysInMonth(monthStr, joinDate, leaveDate, weekendDays = [0, 6], holidaysDateStrSet = new Set()) {
  const { startDateStr, endDateStr } = monthRange(monthStr);
  const joinStr = joinDate ? new Date(joinDate).toISOString().slice(0, 10) : startDateStr;
  const leaveStr = leaveDate ? new Date(leaveDate).toISOString().slice(0, 10) : endDateStr;
  const activeStart = joinStr > startDateStr ? joinStr : startDateStr;
  const activeEnd = leaveStr < endDateStr ? leaveStr : endDateStr;
  if (activeStart > activeEnd) return 0;
  return dateStringsBetween(activeStart, activeEnd)
    .filter((date) => !isWeekend(date, weekendDays) && !holidaysDateStrSet.has(date)).length;
}

export function currentMonthStr() {
  return getLocalDateString().slice(0, 7);
}
