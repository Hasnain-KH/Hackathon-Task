import { param, query } from 'express-validator';

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export const monthParam = [
  param('month').matches(monthPattern).withMessage('Month must be in YYYY-MM format.')
    .bail().custom((value) => Number(value.slice(0, 4)) >= 1900).withMessage('Year must be 1900 or later.'),
];

export const listQuery = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['draft', 'finalized']).withMessage('Status must be draft or finalized.'),
];

export const idParam = [
  param('id').isMongoId().withMessage('Payslip id must be valid.'),
];
