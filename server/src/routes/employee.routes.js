import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { employeeService } from '../services/employee.service.js';
import {
  createEmployee, employeeId, employeeList, importEmployees, selfUpdate, updateEmployee,
} from '../validators/employee.validators.js';

const router = Router();
const actorFor = (user) => ({
  id: user.id,
  role: user.role,
  employeeId: user.employeeRef,
});

router.use(verifyToken);

router.get(
  '/me',
  requireRole('employee'),
  asyncHandler(async (req, res) => {
    res.json({ data: await employeeService.getSelfProfile(actorFor(req.user)) });
  }),
);

router.patch(
  '/me',
  requireRole('employee'),
  selfUpdate,
  validate,
  asyncHandler(async (req, res) => {
    const employee = await employeeService.getSelfProfile(actorFor(req.user));
    const updated = await employeeService.updateEmployee(employee._id.toString(), req.body, actorFor(req.user));
    res.json({ data: updated });
  }),
);

router.get(
  '/export',
  requireRole('hr'),
  employeeList,
  validate,
  asyncHandler(async (req, res) => {
    const csv = await employeeService.csvExport(req.query);
    res
      .type('text/csv')
      .set('Content-Disposition', 'attachment; filename="employees.csv"')
      .send(csv);
  }),
);

router.post(
  '/import',
  requireRole('hr'),
  importEmployees,
  validate,
  asyncHandler(async (req, res) => {
    if (req.body.dryRun) {
      return res.json({ data: await employeeService.csvDryRun(req.body.csv) });
    }
    return res.status(201).json({ data: await employeeService.csvCommit(req.body.csv, req.user.id) });
  }),
);

router.post(
  '/',
  requireRole('hr'),
  createEmployee,
  validate,
  asyncHandler(async (req, res) => {
    const result = await employeeService.createEmployee(req.body, req.user.id);
    res.status(201).json({ employee: result.employee, tempPassword: result.tempPassword });
  }),
);

router.get(
  '/',
  employeeList,
  validate,
  asyncHandler(async (req, res) => {
    const result = await employeeService.listEmployees({ ...req.query, actor: actorFor(req.user) });
    res.json(result);
  }),
);

router.get(
  '/:id',
  employeeId,
  validate,
  asyncHandler(async (req, res) => {
    const employee = await employeeService.getEmployeeById(req.params.id, actorFor(req.user));
    res.json({ data: employee });
  }),
);

router.patch(
  '/:id',
  employeeId,
  updateEmployee,
  validate,
  asyncHandler(async (req, res) => {
    const employee = await employeeService.updateEmployee(req.params.id, req.body, actorFor(req.user));
    res.json({ data: employee });
  }),
);

router.delete(
  '/:id',
  requireRole('hr'),
  employeeId,
  validate,
  asyncHandler(async (req, res) => {
    res.json({ data: await employeeService.softDeleteEmployee(req.params.id) });
  }),
);

export default router;
