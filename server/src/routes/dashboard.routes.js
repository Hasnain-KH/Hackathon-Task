import { Router } from 'express';
import { dataScope, requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { dashboardService } from '../services/dashboard.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/errors.js';
import { resolveDateRange } from '../utils/dateRange.js';
import { rangeQuery } from '../validators/dashboard.validators.js';
import { getLocalDateString } from '../utils/time.js';

const router = Router();
router.use(verifyToken);

function range(req) {
  return { ...resolveDateRange(req.query), departmentId: req.query.departmentId };
}

router.get('/headcount', requireRole('admin', 'hr'), rangeQuery, validate, asyncHandler(async (req, res) => {
  res.json({ data: await dashboardService.getHeadcount({ asOfDate: req.query.to || getLocalDateString(), departmentId: req.query.departmentId }) });
}));
router.get('/attendance-summary', requireRole('admin', 'hr'), rangeQuery, validate, asyncHandler(async (req, res) => {
  res.json({ data: await dashboardService.getAttendanceSummary(range(req)) });
}));
router.get('/late-comers', requireRole('admin', 'hr'), rangeQuery, validate, asyncHandler(async (req, res) => {
  res.json({ data: await dashboardService.getLateComers({ ...range(req), limit: req.query.limit }) });
}));
router.get('/leave-summary', requireRole('admin', 'hr'), rangeQuery, validate, asyncHandler(async (req, res) => {
  res.json({ data: await dashboardService.getLeaveSummary(range(req)) });
}));
router.get('/payroll-summary', requireRole('admin'), rangeQuery, validate, asyncHandler(async (req, res) => {
  res.json({ data: await dashboardService.getPayrollSummary(range(req)) });
}));
router.get('/employee', requireRole('employee'), asyncHandler(async (req, res) => {
  const scope = dataScope(req);
  if (!scope.employeeId) throw new AppError(403, 'An employee profile is required.');
  res.json({ data: await dashboardService.getEmployeeDashboard(scope.employeeId) });
}));

export default router;