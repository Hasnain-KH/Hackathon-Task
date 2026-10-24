import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineMeters, verifyOffice } from '../src/services/geo.service.js';

test('haversineMeters measures a known equatorial distance to within one meter', () => {
  const distance = haversineMeters(0, 0, 0, 0.0089932);
  assert.ok(Math.abs(distance - 1000) <= 1, `Expected approximately 1000 m, got ${distance}`);
});

test('verifyOffice accepts a location within the configured radius', () => {
  assert.deepEqual(
    verifyOffice({ lat: 24.8607, lng: 67.0011, accuracy: 25 }, {
      officeLat: 24.8607, officeLng: 67.0011, officeRadiusMeters: 150,
    }),
    { ok: true, distanceMeters: 0 },
  );
});

test('verifyOffice rejects locations outside the configured radius', () => {
  const result = verifyOffice({ lat: 24.8707, lng: 67.0011, accuracy: 20 }, {
    officeLat: 24.8607, officeLng: 67.0011, officeRadiusMeters: 150,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /allowed radius/);
});

test('verifyOffice rejects GPS accuracy above 100 meters', () => {
  const result = verifyOffice({ lat: 24.8607, lng: 67.0011, accuracy: 101 }, {
    officeLat: 24.8607, officeLng: 67.0011, officeRadiusMeters: 150,
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /accuracy/);
});

test('verifyOffice rejects settings without office coordinates', () => {
  const result = verifyOffice({ lat: 24.8607, lng: 67.0011, accuracy: 20 }, {});
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'Office location not configured');
});
