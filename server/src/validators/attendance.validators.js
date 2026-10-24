import { body, param, query } from 'express-validator';

const requestTypes = ['fix_missing_checkin', 'fix_missing_checkout', 'mark_half_day', 'mark_present', 'mark_on_leave', 'mark_absent'];
const dateFormat = /^\d{4}-\d{2}-\d{2}$/;

const validDate = (value) => {
  if (!dateFormat.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const correctionCreate = [
  body('date').custom(validDate).withMessage('Date must use YYYY-MM-DD format.'),
  body('requestType').isIn(requestTypes).withMessage('Correction type is invalid.'),
  body('reason').isString().trim().isLength({ min: 5, max: 500 }).withMessage('Reason must be between 5 and 500 characters.'),
];

export const correctionReview = [
  param('id').isMongoId().withMessage('Correction id must be valid.'),
  body('decision').isIn(['approve', 'reject']).withMessage('Decision must be approve or reject.'),
  body('comment').optional().isString().trim().isLength({ max: 500 }).withMessage('Comment must be 500 characters or fewer.'),
  body('comment').if(body('decision').equals('reject')).isString().trim().isLength({ min: 1, max: 500 }).withMessage('A comment is required to reject a correction.'),
];

export const boardQuery = [
  query('date').optional().custom(validDate).withMessage('Date must use YYYY-MM-DD format.'),
  query('departmentId').optional().isMongoId().withMessage('Department id must be valid.'),
  query('q').optional().isString().isLength({ max: 100 }).trim(),
  query('status').optional().isIn(['present', 'late', 'half_day', 'missing_checkout', 'absent', 'on_leave', 'not_checked_in', 'scheduled']).withMessage('Status is invalid.'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const attendanceRange = [
  query('from').optional().custom(validDate).withMessage('From must use YYYY-MM-DD format.'),
  query('to').optional().custom(validDate).withMessage('To must use YYYY-MM-DD format.'),
];
export const correctionListQuery = [
  query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Status is invalid.'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];
export const locationBody = [
  body('location').optional().isObject().withMessage('Location must be an object.'),
  body('location.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Latitude is invalid.').toFloat(),
  body('location.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Longitude is invalid.').toFloat(),
  body('location.accuracy').optional().isFloat({ min: 0 }).withMessage('Location accuracy must be zero or greater.').toFloat(),
  body().custom((value) => Object.keys(value || {}).length === 0 || Object.keys(value || {}).every((key) => key === 'location')).withMessage('Only location may be submitted.'),
];
