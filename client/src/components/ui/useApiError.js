export function apiErrorMessage(error, fallback) {
  return error.response?.data?.error || fallback;
}

export function apiFieldErrors(error) {
  return (error.response?.data?.details || []).reduce((result, { field, msg }) => {
    result[field] = msg;
    const rootField = field.split('.')[0];
    if (!result[rootField]) result[rootField] = msg;
    return result;
  }, {});
}
