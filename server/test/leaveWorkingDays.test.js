import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWorkingDays, dateRangesOverlap } from '../src/utils/leaveWorkingDays.js';

test('computeWorkingDays excludes weekends from a full week', () => {
  assert.equal(computeWorkingDays('2026-06-01', '2026-06-07'), 5);
});

test('computeWorkingDays returns zero when the range is only weekends', () => {
  assert.equal(computeWorkingDays('2026-06-06', '2026-06-07'), 0);
});

test('dateRangesOverlap handles overlapping, adjacent, and separated ranges', () => {
  assert.equal(dateRangesOverlap('2026-06-01', '2026-06-05', '2026-06-04', '2026-06-07'), true);
  assert.equal(dateRangesOverlap('2026-06-01', '2026-06-03', '2026-06-04', '2026-06-07'), false);
  assert.equal(dateRangesOverlap('2026-06-01', '2026-06-03', '2026-06-08', '2026-06-10'), false);
});
