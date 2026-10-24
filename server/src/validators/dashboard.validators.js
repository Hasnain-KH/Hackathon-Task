import { query } from 'express-validator';

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const rangeQuery = [
  query('from').optional().custom(isDate).withMessage('From must be a valid YYYY-MM-DD date.'),
  query('to').optional().custom(isDate).withMessage('To must be a valid YYYY-MM-DD date.'),
  query('departmentId').optional().isMongoId().withMessage('Department id must be valid.'),
];