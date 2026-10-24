import { body, param, query } from 'express-validator';

const leaveStatuses = ['pending', 'approved', 'rejected', 'cancelled'];

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const applyLeave = [
  body('leaveTypeId').isMongoId().withMessage('Leave type id must be valid.'),
  body('startDate').custom(isRealDate).withMessage('Start date must be a valid YYYY-MM-DD date.'),
  body('endDate').custom(isRealDate).withMessage('End date must be a valid YYYY-MM-DD date.'),
  body('endDate').custom((value, { req }) => !isRealDate(req.body.startDate) || value >= req.body.startDate).withMessage('End date must be on or after start date.'),
  body('reason').isString().trim().isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters.'),
];

export const reviewLeave = [
  param('id').isMongoId().withMessage('Leave request id must be valid.'),
  body('decision').isIn(['approve', 'reject']).withMessage('Decision must be approve or reject.'),
  body('comment').optional().isString().trim().isLength({ max: 500 }).withMessage('Comment must be 500 characters or fewer.'),
  body('comment').if(body('decision').equals('reject')).isString().trim().isLength({ min: 1, max: 500 }).withMessage('A comment is required when rejecting.'),
];

export const cancelLeave = [param('id').isMongoId().withMessage('Leave request id must be valid.')];

export const listInboxQuery = [
  query('status').optional().isIn(leaveStatuses).withMessage('Status is invalid.'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('employeeId').optional().isMongoId().withMessage('Employee id must be valid.'),
  query('leaveTypeId').optional().isMongoId().withMessage('Leave type id must be valid.'),
  query('q').optional().isString().isLength({ max: 100 }).trim(),
];

export const leaveRangeQuery = [
  query('from').optional().custom(isRealDate).withMessage('From must be a valid YYYY-MM-DD date.'),
  query('to').optional().custom(isRealDate).withMessage('To must be a valid YYYY-MM-DD date.'),
];

export const leaveBalanceYear = [
  query('year').optional().isInt({ min: 1900, max: 9999 }).toInt(),
];

export const employeeIdParam = [
  param('employeeId').isMongoId().withMessage('Employee id must be valid.'),
];

export const previewQuery = [
  query('from').custom(isRealDate).withMessage('From must be a valid YYYY-MM-DD date.'),
  query('to').custom(isRealDate).withMessage('To must be a valid YYYY-MM-DD date.'),
  query('to').custom((value, { req }) => !isRealDate(req.query.from) || value >= req.query.from).withMessage('To must be on or after from.'),
];
