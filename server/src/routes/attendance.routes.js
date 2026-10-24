import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/errors.js';
import { attendanceService } from '../services/attendance.service.js';
import {
  attendanceRange, boardQuery, correctionCreate, correctionListQuery, correctionReview, locationBody,
} from '../validators/attendance.validators.js';

const router = Router();
const actorFor = (user) => ({ id: user.id, role: user.role, employeeId: user.employeeRef });
router.use(verifyToken);

router.post(
  '/check-in',
  requireRole('employee'),
  locationBody,
  validate,
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await attendanceService.checkIn(req.user.id, req.body) });
  }),
);

router.post(
  '/check-out',
  requireRole('employee'),
  asyncHandler(async (req, res) => {
    if (Object.keys(req.body || {}).length) throw new AppError(422, 'Check-out does not accept a request body.');
    res.json({ data: await attendanceService.checkOut(req.user.id) });
  }),
);

router.get(
  '/me/today',
  requireRole('employee'),
  asyncHandler(async (req, res) => {
    res.json({ data: await attendanceService.getMyToday(req.user.id) });
  }),
);

router.get(
  '/me/corrections',
  requireRole('employee'),
  correctionListQuery,
  validate,
  asyncHandler(async (req, res) => {
    res.json(await attendanceService.listCorrections(req.query, actorFor(req.user)));
  }),
);

router.get(
  '/me',
  requireRole('employee'),
  attendanceRange,
  validate,
  asyncHandler(async (req, res) => {
    res.json({ data: await attendanceService.getMyAttendance(req.user.id, req.query) });
  }),
);

router.get(
  '/board',
  requireRole('admin', 'hr'),
  boardQuery,
  validate,
  asyncHandler(async (req, res) => {
    res.json(await attendanceService.getBoard(req.query, actorFor(req.user)));
  }),
);

router.get(
  '/corrections',
  requireRole('admin', 'hr'),
  correctionListQuery,
  validate,
  asyncHandler(async (req, res) => {
    res.json(await attendanceService.listCorrections(req.query, actorFor(req.user)));
  }),
);

router.post(
  '/corrections',
  requireRole('employee'),
  correctionCreate,
  validate,
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await attendanceService.requestCorrection(req.user.id, req.body) });
  }),
);

router.patch(
  '/corrections/:id',
  requireRole('admin', 'hr'),
  correctionReview,
  validate,
  asyncHandler(async (req, res) => {
    res.json({ data: await attendanceService.reviewCorrection(req.params.id, req.user.id, req.body) });
  }),
);

export default router;
