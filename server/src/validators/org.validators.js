import { body, param, query } from 'express-validator';

const requiredText = (field, label) => body(field).trim().notEmpty().withMessage(`${label} is required.`);
const optionalText = (field) => body(field).optional().isString().trim();
const objectId = (field) => body(field).isMongoId().withMessage(`${field} must be a valid id.`);
const optionalBoolean = (field) => body(field).optional().isBoolean().withMessage(`${field} must be a boolean.`).toBoolean();

export const departmentCreate = [
  requiredText('name', 'Name'),
  body('code').trim().notEmpty().withMessage('Code is required.').isLength({ max: 20 }).withMessage('Code must be 20 characters or fewer.').toUpperCase(),
  body('description').optional().isString().withMessage('Description must be text.').trim(),
];
export const departmentUpdate = [
  param('id').isMongoId().withMessage('Department id must be valid.'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('code').optional().trim().notEmpty().withMessage('Code cannot be empty.').isLength({ max: 20 }).withMessage('Code must be 20 characters or fewer.').toUpperCase(),
  optionalText('description'),
  optionalBoolean('isActive'),
];
export const departmentList = [
  query('q').optional().isString().isLength({ max: 100 }).trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('isActive').optional().isBoolean().toBoolean(),
];

export const designationCreate = [
  requiredText('name', 'Name'),
  objectId('departmentId'),
  body('level').optional().isIn(['junior', 'mid', 'senior', 'lead', 'manager']).withMessage('Level is invalid.'),
];
export const designationUpdate = [
  param('id').isMongoId().withMessage('Designation id must be valid.'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('departmentId').optional().isMongoId().withMessage('Department id must be valid.'),
  body('level').optional().isIn(['junior', 'mid', 'senior', 'lead', 'manager']).withMessage('Level is invalid.'),
  optionalBoolean('isActive'),
];
export const designationList = [
  query('departmentId').optional().isMongoId().withMessage('Department id must be valid.'),
  query('q').optional().isString().isLength({ max: 100 }).trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const leaveTypeCreate = [
  requiredText('name', 'Name'),
  body('code').trim().notEmpty().withMessage('Code is required.').isLength({ max: 20 }).withMessage('Code must be 20 characters or fewer.').toUpperCase(),
  body('quotaPerYear').isFloat({ min: 0 }).withMessage('Yearly quota must be zero or greater.').toFloat(),
  body('isPaid').optional().isBoolean().withMessage('Paid status must be a boolean.').toBoolean(),
];
export const leaveTypeUpdate = [
  param('id').isMongoId().withMessage('Leave type id must be valid.'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('code').optional().trim().notEmpty().withMessage('Code cannot be empty.').isLength({ max: 20 }).withMessage('Code must be 20 characters or fewer.').toUpperCase(),
  body('quotaPerYear').optional().isFloat({ min: 0 }).withMessage('Yearly quota must be zero or greater.').toFloat(),
  optionalBoolean('isPaid'),
  optionalBoolean('isActive'),
];
export const leaveTypeList = [
  query('q').optional().isString().isLength({ max: 100 }).trim(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const holidayCreate = [
  requiredText('name', 'Name'),
  body('date').isISO8601({ strict: true }).withMessage('Date must be a valid date.'),
  body('isOptional').optional().isBoolean().withMessage('Optional status must be a boolean.').toBoolean(),
];
export const holidayUpdate = [
  param('id').isMongoId().withMessage('Holiday id must be valid.'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('date').optional().isISO8601({ strict: true }).withMessage('Date must be a valid date.'),
  optionalBoolean('isOptional'),
];
export const holidayList = [
  query('year').optional().isInt({ min: 1900, max: 9999 }).toInt(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const companySettingsUpdate = [
  body().custom((value) => {
    const allowed = new Set([
      'companyName', 'officeStart', 'graceMinutes', 'halfDayThresholdHours', 'weekendDays',
      'officeLat', 'officeLng', 'officeRadiusMeters',
    ]);
    return Object.keys(value || {}).every((key) => allowed.has(key));
  }).withMessage('One or more settings are not allowed.'),
  body('companyName').optional().trim().notEmpty().withMessage('Company name cannot be empty.'),
  body('officeStart').optional().matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Office start must use HH:mm format.'),
  body('graceMinutes').optional().isInt({ min: 0, max: 60 }).withMessage('Grace minutes must be between 0 and 60.').toInt(),
  body('halfDayThresholdHours').optional().isFloat({ min: 1, max: 12 }).withMessage('Half-day threshold must be between 1 and 12 hours.').toFloat(),
  body('weekendDays').optional().isArray({ max: 7 }).withMessage('Weekend days must be an array of weekdays.'),
  body('weekendDays.*').optional().isInt({ min: 0, max: 6 }).withMessage('Each weekend day must be between 0 and 6.').toInt(),
  body('weekendDays').custom((days) => !days || !Array.isArray(days) || new Set(days).size === days.length).withMessage('Weekend days must be unique.'),
  body('officeLat').optional({ nullable: true }).isFloat({ min: -90, max: 90 }).withMessage('Latitude must be between -90 and 90.').toFloat(),
  body('officeLng').optional({ nullable: true }).isFloat({ min: -180, max: 180 }).withMessage('Longitude must be between -180 and 180.').toFloat(),
  body('officeRadiusMeters').optional().isInt({ min: 10, max: 1000 }).withMessage('Office radius must be between 10 and 1000 meters.').toInt(),
  body().custom((value) => Object.keys(value || {}).length > 0).withMessage('Provide at least one setting to update.'),
];

export const hrUserCreate = [
  requiredText('name', 'Name'),
  body('email').trim().isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('tempPassword').isString().isLength({ min: 8 }).withMessage('Temporary password must be at least 8 characters.'),
];
export const userList = [
  query('role').optional().isIn(['hr', 'employee']).withMessage('Role must be hr or employee.'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('q').optional().isString().isLength({ max: 100 }).trim(),
  query('isActive').optional().isBoolean().toBoolean(),
];
export const userIdParam = [param('id').isMongoId().withMessage('User id must be valid.')];
export const orgIdParam = [param('id').isMongoId().withMessage('Record id must be valid.')];
export const resetPassword = [
  ...userIdParam,
  body('tempPassword').isString().isLength({ min: 8 }).withMessage('Temporary password must be at least 8 characters.'),
];
