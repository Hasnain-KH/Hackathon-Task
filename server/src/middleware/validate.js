import { validationResult } from 'express-validator';

export default function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed.',
      details: result.array().map(({ path, param, msg }) => ({ field: path || param || '_body', msg })),
    });
  }
  return next();
}
