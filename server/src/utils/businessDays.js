function toDateString(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function dateRange(from, to) {
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!validDate(from) || !validDate(to) || from > to) {
    throw new TypeError('Date range must use ordered YYYY-MM-DD dates.');
  }
  const dates = [];
  const cursor = new Date(`${from}T12:00:00.000Z`);
  const last = new Date(`${to}T12:00:00.000Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function workingDaysInRange(from, to, weekendDays = [0, 6], holidays = new Set()) {
  const holidayDates = new Set([...holidays].map(toDateString));
  return dateRange(from, to).filter((date) => {
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
    return !weekendDays.includes(weekday) && !holidayDates.has(date);
  }).length;
}