process.env.TZ = process.env.TZ || 'Asia/Karachi';

const timeZone = () => process.env.TZ || 'Asia/Karachi';

function dateParts(date, timeZoneName = timeZone()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZoneName,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

export function getLocalDateString(date = new Date()) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getLocalMinutes(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone(),
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

export function parseHHMM(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new TypeError('Time must be in HH:mm format.');
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesBetween(a, b) {
  return Math.max(0, Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

export function isWeekend(localDateStr, weekendDays = [0, 6]) {
  const [year, month, day] = localDateStr.split('-').map(Number);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: timeZone(), weekday: 'short' })
    .format(new Date(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00Z`));
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  return weekendDays.includes(dayIndex);
}

export function localDateTime(dateString, timeString) {
  const value = new Date(`${dateString}T${timeString}:00`);
  if (Number.isNaN(value.getTime())) throw new TypeError('Invalid local date/time.');
  return value;
}
