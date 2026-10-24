import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { leaveService } from '../services/leave.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  applyLeave, cancelLeave, employeeIdParam, leaveBalanceYear, leaveRangeQuery,
  listInboxQuery, previewQuery, reviewLeave,
} from '../validators/leave.validators.js';

const router = Router();
router.use(verifyToken);

router.get('/preview', requireRole('employee'), previewQuery, validate, asyncHandler(async (req, res) => {
  res.json({ data: await leaveService.preview({ from: req.query.from, to: req.query.to }) });
}));

router.get('/balances/me', requireRole('employee'), leaveBalanceYear, validate, asyncHandler(async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  res.json({ data: await leaveService.getMyBalances(req.user.id, year) });
}));

router.get('/balances/:employeeId', requireRole('admin', 'hr'), employeeIdParam, leaveBalanceYear, validate, asyncHandler(async (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  res.json({ data: await leaveService.getEmployeeBalances(req.params.employeeId, year) });
}));

router.post('/requests', requireRole('employee'), applyLeave, validate, asyncHandler(async (req, res) => {
  res.status(201).json({ data: await leaveService.apply(req.user.id, req.body) });
}));

router.get('/requests/me', requireRole('employee'), leaveRangeQuery, validate, asyncHandler(async (req, res) => {
  res.json(await leaveService.listMine(req.user.id, req.query));
}));

router.get('/requests/employee/:employeeId', requireRole('admin', 'hr'), employeeIdParam, validate, asyncHandler(async (req, res) => {
  res.json(await leaveService.listEmployeeRequests(req.params.employeeId, req.query));
}));

router.post('/requests/:id/cancel', requireRole('employee'), cancelLeave, validate, asyncHandler(async (req, res) => {
  res.json({ data: await leaveService.cancel(req.user.id, req.params.id) });
}));

router.get('/inbox', requireRole('admin', 'hr'), listInboxQuery, validate, asyncHandler(async (req, res) => {
  res.json(await leaveService.listInbox(req.query));
}));

router.patch('/requests/:id/review', requireRole('admin', 'hr'), reviewLeave, validate, asyncHandler(async (req, res) => {
  res.json({ data: await leaveService.review(req.params.id, req.user.id, req.body) });
}));

export default router;
