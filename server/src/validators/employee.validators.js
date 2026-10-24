import { body, param, query } from 'express-validator';

const genderValues = ['male', 'female', 'other', 'prefer_not_to_say'];
const employmentTypes = ['full_time', 'part_time', 'contract', 'intern'];
const statusValues = ['active', 'probation', 'resigned', 'terminated'];
const employeeFields = [
  'employeeCode', 'firstName', 'lastName', 'email', 'phone', 'address', 'gender',
  'dateOfBirth', 'dateOfJoining', 'employmentType', 'status', 'departmentId',
  'designationId', 'reportingTo',
];

const createFields = [
  body('employeeCode').trim().matches(/^[a-zA-Z0-9]{3,12}$/).withMessage('Employee code must be 3-12 alphanumeric characters.').toUpperCase(),
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email').trim().isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('dateOfJoining').isISO8601({ strict: true }).withMessage('Date of joining must be a valid date.'),
  body('departmentId').isMongoId().withMessage('Department id must be valid.'),
  body('designationId').isMongoId().withMessage('Designation id must be valid.'),
  body('gender').optional().isIn(genderValues).withMessage('Gender is invalid.'),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601({ strict: true }).withMessage('Date of birth must be a valid date.'),
  body('employmentType').optional().isIn(employmentTypes).withMessage('Employment type is invalid.'),
  body('status').optional().isIn(statusValues).withMessage('Status is invalid.'),
  body('phone').optional().isString().trim(),
  body('address').optional().isString().trim(),
  body('reportingTo').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Reporting employee id must be valid.'),
  body('salary').isObject().withMessage('Salary details are required.'),
  body('salary.basic').isFloat({ min: 1 }).withMessage('Basic salary must be at least 1.').toFloat(),
  ...['hra', 'medical', 'transport', 'other'].map((field) =>
    body(`salary.${field}`).optional().isFloat({ min: 0 }).withMessage(`${field} allowance must be zero or greater.`).toFloat()),
  body('tempPassword').optional().isString().isLength({ min: 8 }).withMessage('Temporary password must be at least 8 characters.'),
];

export const createEmployee = createFields;
export const updateEmployee = [
  param('id').isMongoId().withMessage('Employee id must be valid.'),
  ...employeeFields.map((field) => body(field).optional({ nullable: true, checkFalsy: true })),
  body('employeeCode').custom((value, { req }) => value === undefined).withMessage('Employee code cannot be changed.'),
  body('email').optional().trim().isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty.'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty.'),
  body('departmentId').optional().isMongoId().withMessage('Department id must be valid.'),
  body('designationId').optional().isMongoId().withMessage('Designation id must be valid.'),
  body('reportingTo').optional({ nullable: true, checkFalsy: true }).isMongoId().withMessage('Reporting employee id must be valid.'),
  body('gender').optional().isIn(genderValues).withMessage('Gender is invalid.'),
  body('employmentType').optional().isIn(employmentTypes).withMessage('Employment type is invalid.'),
  body('status').optional().isIn(statusValues).withMessage('Status is invalid.'),
  body('salary').optional().isObject().withMessage('Salary must be an object.'),
  body('dateOfJoining').optional().isISO8601({ strict: true }).withMessage('Date of joining must be a valid date.'),
  body('dateOfBirth').optional({ nullable: true, checkFalsy: true }).isISO8601({ strict: true }).withMessage('Date of birth must be a valid date.'),
  ...['basic', 'hra', 'medical', 'transport', 'other'].map((field) =>
    body(`salary.${field}`).optional().isFloat({ min: field === 'basic' ? 1 : 0 }).withMessage(`${field} salary value is invalid.`).toFloat()),
];
export const selfUpdate = [
  param('id').optional().isMongoId(),
  body('phone').optional().isString().trim(),
  body('address').optional().isString().trim(),
  body().custom((value) => Object.keys(value || {}).every((key) => ['phone', 'address'].includes(key))).withMessage('Only phone and address may be updated.'),
  body().custom((value) => Object.keys(value || {}).length > 0).withMessage('Provide phone or address to update.'),
];
export const employeeId = [param('id').isMongoId().withMessage('Employee id must be valid.')];
export const employeeList = [
  query('q').optional().isString().isLength({ max: 100 }).trim(),
  query('departmentId').optional().isMongoId().withMessage('Department id must be valid.'),
  query('designationId').optional().isMongoId().withMessage('Designation id must be valid.'),
  query('status').optional().isIn(statusValues).withMessage('Status is invalid.'),
  query('employmentType').optional().isIn(employmentTypes).withMessage('Employment type is invalid.'),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];
export const importEmployees = [
  body('csv').isString().notEmpty().withMessage('CSV content is required.'),
  body('dryRun').isBoolean().withMessage('dryRun must be a boolean.').toBoolean(),
];
