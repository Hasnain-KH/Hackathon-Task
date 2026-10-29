const providerErrorCodes = new Set([
  400, 401, 403, 404, 408, 429, 500, 502, 503, 504,
  'INVALID_ARGUMENT',
  'FAILED_PRECONDITION',
  'OUT_OF_RANGE',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'ABORTED',
  'RESOURCE_EXHAUSTED',
  'CANCELLED',
  'DATA_LOSS',
  'UNKNOWN',
  'INTERNAL',
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'UNIMPLEMENTED',
]);

const providerErrorStatuses = new Set([
  'INVALID_ARGUMENT',
  'FAILED_PRECONDITION',
  'OUT_OF_RANGE',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'ALREADY_EXISTS',
  'ABORTED',
  'RESOURCE_EXHAUSTED',
  'CANCELLED',
  'DATA_LOSS',
  'UNKNOWN',
  'INTERNAL',
  'UNAVAILABLE',
  'DEADLINE_EXCEEDED',
  'UNIMPLEMENTED',
]);

export function sanitizeProviderErrorCode(value) {
  return providerErrorCodes.has(value) ? value : null;
}

export function sanitizeProviderErrorStatus(value) {
  return providerErrorStatuses.has(value) ? value : null;
}
