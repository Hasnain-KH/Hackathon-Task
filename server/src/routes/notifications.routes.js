import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { notificationService } from '../services/notification.service.js';
import { notificationId, notificationQuery } from '../validators/comms.validators.js';

const router = Router();
router.use(verifyToken, requireRole('admin', 'hr', 'employee'));

router.get('/', notificationQuery, validate, asyncHandler(async (req, res) => {
  res.json(await notificationService.listMine(req.user.id, req.query));
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  res.json({ count: await notificationService.unreadCount(req.user.id) });
}));

router.patch('/read-all', asyncHandler(async (req, res) => {
  res.json({ data: await notificationService.markAllRead(req.user.id) });
}));

router.patch('/:id/read', notificationId, validate, asyncHandler(async (req, res) => {
  res.json({ data: await notificationService.markRead(req.user.id, req.params.id) });
}));

export default router;
