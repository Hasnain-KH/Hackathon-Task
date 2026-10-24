import { dateRangesOverlap } from './dateHelpers.js';
import { workingDaysInRange } from './businessDays.js';

export function computeWorkingDays(startDate, endDate, weekendDays = [0, 6], holidays = new Set()) {
  return workingDaysInRange(startDate, endDate, weekendDays, holidays);
}

export { dateRangesOverlap };
