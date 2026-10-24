import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/errors.js';
import { attendanceService } from '../services/attendance.service.js';
import {
  attendanceRange, boardQuery, cameraCheckIn, correctionCreate, correctionListQuery, correctionReview, locationBody,
} from '../validators/attendance.validators.js';
import AttendanceCorrection from '../models/AttendanceCorrection.js';
import Employee from '../models/Employee.js';
import { auditService } from '../services/audit.service.js';
import { notificationService } from '../services/notification.service.js';

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
  '/check-in/camera',
  requireRole('employee'),
  cameraCheckIn,
  validate,
  asyncHandler(async (req, res) => {
    const record = await attendanceService.checkInWithCamera(req.user.id, req.body);
    const location = record.location
      ? { lat: Number(record.location.lat.toFixed(4)), lng: Number(record.location.lng.toFixed(4)), accuracy: Math.round(record.location.accuracy) }
      : undefined;
    await auditService.log(req, {
      action: 'CREATE',
      entity: 'Attendance',
      entityId: record._id,
      after: { source: 'camera', date: record.date, faceDetected: true },
      meta: { source: 'camera', location },
    });
    res.status(201).json({ data: record });
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
    const before = await AttendanceCorrection.findById(req.params.id);
    const correction = await attendanceService.reviewCorrection(req.params.id, req.user.id, req.body);
    await auditService.log(req, {
      action: req.body.decision === 'approve' ? 'APPROVE' : 'REJECT',
      entity: 'AttendanceCorrection',
      entityId: correction._id,
      before,
      after: correction,
    });
    try {
      const employee = await Employee.findById(correction.employeeId).select('userRef');
      if (employee?.userRef) {
        await notificationService.create(employee.userRef, {
          type: 'attendance_correction',
          title: `Attendance correction ${correction.status}`,
          body: correction.reviewComment || `Your attendance correction was ${correction.status}.`,
          link: '/employee/attendance',
          meta: { correctionId: correction._id },
        });
      }
    } catch (error) {
      console.warn('Attendance correction notification failed:', error.message);
    }
    res.json({ data: correction });
  }),
);

export default router;
