import { body, param, query } from 'express-validator';

const pageFields = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

export const announcementList = pageFields;
export const announcementCreate = [
  body('title').isString().trim().isLength({ min: 3, max: 120 }),
  body('body').isString().trim().isLength({ min: 3, max: 2000 }),
  body('audience').optional().isIn(['all', 'hr', 'admin', 'employee']),
  body('pinned').optional().isBoolean().toBoolean(),
];
export const announcementId = [param('id').isMongoId()];

export const notificationQuery = [
  ...pageFields,
  query('unreadOnly').optional().isBoolean().toBoolean(),
];
export const notificationId = [param('id').isMongoId()];

export const auditQuery = [
  ...pageFields,
  query('action').optional().isString().trim().isLength({ min: 1, max: 50 }),
  query('entity').optional().isString().trim().isLength({ min: 1, max: 100 }),
  query('from').optional().matches(/^\d{4}-\d{2}-\d{2}$/).isISO8601({ strict: true, strictSeparator: true }),
  query('to').optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .isISO8601({ strict: true, strictSeparator: true })
    .custom((value, { req }) => !req.query.from || req.query.from <= value)
    .withMessage('To date must be on or after from date.'),
  query('actorUserId').optional().isMongoId(),
];
