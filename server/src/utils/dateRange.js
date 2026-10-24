import AppError from './errors.js';
import { getLocalDateString } from './time.js';

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function resolveDateRange({ from, to } = {}) {
  const today = getLocalDateString();
  const resolvedTo = to || today;
  let resolvedFrom = from;
  if (!resolvedFrom) {
    const cursor = new Date(`${resolvedTo}T12:00:00.000Z`);
    cursor.setUTCDate(cursor.getUTCDate() - 29);
    resolvedFrom = cursor.toISOString().slice(0, 10);
  }
  if (!isIsoDate(resolvedFrom) || !isIsoDate(resolvedTo) || resolvedFrom > resolvedTo) {
    throw new AppError(422, 'Date range must use valid YYYY-MM-DD dates with from on or before to.');
  }
  return { from: resolvedFrom, to: resolvedTo };
}
