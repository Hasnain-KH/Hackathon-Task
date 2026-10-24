import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { announcementService } from '../services/announcement.service.js';
import { announcementCreate, announcementId, announcementList } from '../validators/comms.validators.js';

const router = Router();
router.use(verifyToken);

router.get('/', announcementList, validate, asyncHandler(async (req, res) => {
  res.json(await announcementService.listFor(req.user.role, req.query));
}));

router.post('/', requireRole('admin'), announcementCreate, validate, asyncHandler(async (req, res) => {
  res.status(201).json({ data: await announcementService.create(req.body, req.user.id, req) });
}));

router.delete('/:id', requireRole('admin'), announcementId, validate, asyncHandler(async (req, res) => {
  res.json({ data: await announcementService.remove(req.params.id, req) });
}));

export default router;
