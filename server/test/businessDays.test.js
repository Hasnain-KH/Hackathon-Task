import test from 'node:test';
import assert from 'node:assert/strict';
import { workingDaysInRange } from '../src/utils/businessDays.js';

test('workingDaysInRange excludes weekends and one holiday', () => {
  assert.equal(workingDaysInRange('2026-07-06', '2026-07-10', [0, 6], new Set(['2026-07-07'])), 4);
});

test('workingDaysInRange counts weekdays when there are no holidays', () => {
  assert.equal(workingDaysInRange('2026-07-06', '2026-07-10', [0, 6]), 5);
});

test('workingDaysInRange handles month boundaries', () => {
  assert.equal(workingDaysInRange('2026-01-30', '2026-02-02', [0, 6]), 2);
});
