import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { payrollService } from '../services/payroll.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import streamPayslipPdf from '../utils/payslipPdf.js';
import { idParam, listQuery, monthParam } from '../validators/payroll.validators.js';
import PayrollRun from '../models/PayrollRun.js';
import Payslip from '../models/Payslip.js';
import Employee from '../models/Employee.js';
import { auditService } from '../services/audit.service.js';
import { notificationService } from '../services/notification.service.js';

const router = Router();
const payrollManagers = [verifyToken, requireRole('admin', 'hr')];
const adminOnly = [verifyToken, requireRole('admin')];
const employeeOnly = [verifyToken, requireRole('employee')];

router.post('/runs/:month/generate', ...payrollManagers, monthParam, validate, asyncHandler(async (req, res) => {
  res.json({ data: await payrollService.generateOrRefreshDraft(req.params.month, req.user.id, req.user) });
}));

router.get('/runs/:month', ...payrollManagers, monthParam, validate, asyncHandler(async (req, res) => {
  res.json({ data: await payrollService.getRun(req.params.month, req.user) });
}));

router.get('/runs', ...payrollManagers, listQuery, validate, asyncHandler(async (req, res) => {
  res.json(await payrollService.listRuns(req.query, req.user));
}));

router.post('/runs/:month/finalize', ...adminOnly, monthParam, validate, asyncHandler(async (req, res) => {
  const before = await PayrollRun.findOne({ month: req.params.month });
  const run = await payrollService.finalizeRun(req.params.month, req.user.id, req.user);
  await auditService.log(req, { action: 'FINALIZE', entity: 'PayrollRun', entityId: run._id, before, after: run });
  try {
    const payslips = await Payslip.find({ payrollRunId: run._id }).select('employeeId');
    const employees = await Employee.find({ _id: { $in: payslips.map(({ employeeId }) => employeeId) } }).select('userRef');
    await notificationService.createMany(employees.map(({ userRef }) => userRef), {
      type: 'payslip_finalized',
      title: `Payslip for ${run.month} is ready`,
      body: 'Your finalized payslip is now available.',
      link: '/employee/payslips',
      meta: { month: run.month },
    });
  } catch (error) {
    console.warn('Payslip notification failed:', error.message);
  }
  res.json({ data: run });
}));

router.get('/payslips/me', ...employeeOnly, listQuery, validate, asyncHandler(async (req, res) => {
  res.json(await payrollService.listMyPayslips(req.user.id, req.query));
}));

router.get('/payslips/me/:id/pdf', ...employeeOnly, idParam, validate, asyncHandler(async (req, res) => {
  const payslip = await payrollService.getMyPayslip(req.params.id, req.user.id);
  const companyName = await payrollService.getCompanyName();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.employeeSnapshot.employeeCode}-${payslip.month}.pdf"`);
  streamPayslipPdf(res, payslip, companyName);
}));

router.get('/payslips/me/:id', ...employeeOnly, idParam, validate, asyncHandler(async (req, res) => {
  res.json({ data: await payrollService.getMyPayslip(req.params.id, req.user.id) });
}));

router.get('/payslips/:id/pdf', ...payrollManagers, idParam, validate, asyncHandler(async (req, res) => {
  const payslip = await payrollService.getPayslipForHr(req.params.id, req.user);
  const companyName = await payrollService.getCompanyName();
  const parent = await PayrollRun.findById(payslip.payrollRunId).select('status finalizedAt');
  const document = { ...payslip.toObject(), payrollRun: parent };
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.employeeSnapshot.employeeCode}-${payslip.month}.pdf"`);
  streamPayslipPdf(res, document, companyName);
}));

router.get('/payslips/:id', ...payrollManagers, idParam, validate, asyncHandler(async (req, res) => {
  res.json({ data: await payrollService.getPayslipForHr(req.params.id, req.user) });
}));

export default router;
