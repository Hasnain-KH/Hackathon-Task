import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeProviderErrorCode, sanitizeProviderErrorStatus } from '../src/utils/providerError.js';

test('sanitizeProviderErrorCode allows recognized provider codes', () => {
  assert.equal(sanitizeProviderErrorCode(400), 400);
  assert.equal(sanitizeProviderErrorCode('RESOURCE_EXHAUSTED'), 'RESOURCE_EXHAUSTED');
});

test('sanitizeProviderErrorCode rejects unrecognized provider-controlled values', () => {
  assert.equal(sanitizeProviderErrorCode(418), null);
  assert.equal(sanitizeProviderErrorCode('secret-token'), null);
  assert.equal(sanitizeProviderErrorCode('https://provider.example/error'), null);
  assert.equal(sanitizeProviderErrorCode({ code: 'INVALID_ARGUMENT' }), null);
});

test('sanitizeProviderErrorStatus allows only recognized RPC statuses', () => {
  assert.equal(sanitizeProviderErrorStatus('INVALID_ARGUMENT'), 'INVALID_ARGUMENT');
  assert.equal(sanitizeProviderErrorStatus('DEADLINE_EXCEEDED'), 'DEADLINE_EXCEEDED');
});

test('sanitizeProviderErrorStatus rejects unrecognized provider-controlled values', () => {
  assert.equal(sanitizeProviderErrorStatus('secret-token'), null);
  assert.equal(sanitizeProviderErrorStatus('400'), null);
  assert.equal(sanitizeProviderErrorStatus('type.googleapis.com/google.rpc.BadRequest'), null);
});
