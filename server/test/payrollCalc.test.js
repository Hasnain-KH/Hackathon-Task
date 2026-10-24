import test from 'node:test';
import assert from 'node:assert/strict';
import { calcGross, calcPerDay, calcTax } from '../src/utils/payrollCalc.js';

test('calcTax handles every annual slab boundary', () => {
  const cases = [
    [0, 0], [600000, 0], [600001, 0.05], [1200000, 30000],
    [1200001, 30000.15], [2400000, 210000], [2400001, 210000.25],
    [3600000, 510000], [3600001, 510000.35], [5000000, 1000000],
  ];
  for (const [annualGross, annualTax] of cases) {
    assert.equal(calcTax(annualGross / 12).annualTax, annualTax, `annual gross ${annualGross}`);
  }
});

test('calcGross applies the 1.5x basic fallback when allowances are zero', () => {
  assert.equal(calcGross({ basic: 100000, hra: 0, medical: 0, transport: 0, other: 0 }), 150000);
  assert.equal(calcGross({ basic: 100000, hra: 40000, medical: 10000 }), 150000);
});

test('calcPerDay rounds to cents', () => {
  assert.equal(calcPerDay(1000, 3), 333.33);
  assert.equal(calcPerDay(1000.01, 4), 250);
});
