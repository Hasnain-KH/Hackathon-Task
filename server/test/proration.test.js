import test from 'node:test';
import assert from 'node:assert/strict';
import { activeWorkingDaysInMonth } from '../src/utils/monthHelpers.js';

test('activeWorkingDaysInMonth prorates a joiner mid-month', () => {
  assert.equal(activeWorkingDaysInMonth('2026-06', '2026-06-15', null), 12);
});

test('activeWorkingDaysInMonth prorates a leaver mid-month', () => {
  assert.equal(activeWorkingDaysInMonth('2026-06', '2026-06-01', '2026-06-15'), 11);
});

test('activeWorkingDaysInMonth returns full month workdays when employed all month', () => {
  assert.equal(activeWorkingDaysInMonth('2026-06', '2026-06-01', null), 22);
});
