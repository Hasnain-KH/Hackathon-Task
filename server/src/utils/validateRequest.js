import { validationResult } from 'express-validator';
import AppError from './errors.js';

export default function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(422, errors.array()[0].msg));
  }
  return next();
}
