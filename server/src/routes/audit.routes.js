import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { auditService } from '../services/audit.service.js';
import { auditQuery } from '../validators/comms.validators.js';

const router = Router();
router.get('/', verifyToken, requireRole('admin'), auditQuery, validate, asyncHandler(async (req, res) => {
  res.json(await auditService.list(req.query));
}));

export default router;
