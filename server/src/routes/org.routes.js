import { Router } from 'express';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import { orgService } from '../services/org.service.js';
import {
  companySettingsUpdate, departmentCreate, departmentList, departmentUpdate,
  designationCreate, designationList, designationUpdate, holidayCreate,
  holidayList, holidayUpdate, leaveTypeCreate, leaveTypeList, leaveTypeUpdate, orgIdParam,
} from '../validators/org.validators.js';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Holiday from '../models/Holiday.js';
import LeaveType from '../models/LeaveType.js';
import { auditService } from '../services/audit.service.js';

const router = Router();
const admin = [verifyToken, requireRole('admin')];
const adminAndHr = [verifyToken, requireRole('admin', 'hr')];
const allRoles = [verifyToken, requireRole('admin', 'hr', 'employee')];
const sendData = (handler) => asyncHandler(async (req, res) => res.json({ data: await handler(req) }));
const sendList = (handler) => asyncHandler(async (req, res) => res.json(await handler(req)));
const auditedMutation = (entity, action, loadBefore, run) => asyncHandler(async (req, res) => {
  const before = loadBefore ? await loadBefore(req) : null;
  const data = await run(req);
  await auditService.log(req, { action, entity, entityId: data?._id, before, after: data });
  res.json({ data });
});

router.get('/company', ...allRoles, sendData(() => orgService.getCompanySettings()));
router.patch('/company', ...admin, companySettingsUpdate, validate,
  auditedMutation('CompanySettings', 'UPDATE', () => orgService.getCompanySettings(), (req) => orgService.updateCompanySettings(req.body)));

router.get('/departments', ...adminAndHr, departmentList, validate, sendList((req) => orgService.listDepartments(req.query)));
router.post('/departments', ...admin, departmentCreate, validate,
  auditedMutation('Department', 'CREATE', null, (req) => orgService.createDepartment(req.body)));
router.patch('/departments/:id', ...admin, departmentUpdate, validate,
  auditedMutation('Department', 'UPDATE', (req) => Department.findById(req.params.id), (req) => orgService.updateDepartment(req.params.id, req.body)));
router.delete('/departments/:id', ...admin, orgIdParam, validate, asyncHandler(async (req, res) => {
  const before = await Department.findById(req.params.id);
  const data = await orgService.deactivateDepartment(req.params.id);
  await auditService.log(req, { action: 'DELETE', entity: 'Department', entityId: data._id, before, after: data });
  res.json({ data });
}));

router.get('/designations', ...adminAndHr, designationList, validate, sendList((req) => orgService.listDesignations(req.query)));
router.post('/designations', ...admin, designationCreate, validate,
  auditedMutation('Designation', 'CREATE', null, (req) => orgService.createDesignation(req.body)));
router.patch('/designations/:id', ...admin, designationUpdate, validate,
  auditedMutation('Designation', 'UPDATE', (req) => Designation.findById(req.params.id), (req) => orgService.updateDesignation(req.params.id, req.body)));
router.delete('/designations/:id', ...admin, orgIdParam, validate, asyncHandler(async (req, res) => {
  const before = await Designation.findById(req.params.id);
  const data = await orgService.deactivateDesignation(req.params.id);
  await auditService.log(req, { action: 'DELETE', entity: 'Designation', entityId: data._id, before, after: data });
  res.json({ data });
}));

router.get('/leave-types', ...allRoles, leaveTypeList, validate, sendList((req) => orgService.listLeaveTypes(req.query)));
router.post('/leave-types', ...admin, leaveTypeCreate, validate,
  auditedMutation('LeaveType', 'CREATE', null, (req) => orgService.createLeaveType(req.body)));
router.patch('/leave-types/:id', ...admin, leaveTypeUpdate, validate,
  auditedMutation('LeaveType', 'UPDATE', (req) => LeaveType.findById(req.params.id), (req) => orgService.updateLeaveType(req.params.id, req.body)));
router.delete('/leave-types/:id', ...admin, orgIdParam, validate, asyncHandler(async (req, res) => {
  const before = await LeaveType.findById(req.params.id);
  const data = await orgService.deactivateLeaveType(req.params.id);
  await auditService.log(req, { action: 'DELETE', entity: 'LeaveType', entityId: data._id, before, after: data });
  res.json({ data });
}));

router.get('/holidays', ...allRoles, holidayList, validate, sendList((req) => orgService.listHolidays(req.query)));
router.post('/holidays', ...admin, holidayCreate, validate,
  auditedMutation('Holiday', 'CREATE', null, (req) => orgService.createHoliday(req.body)));
router.patch('/holidays/:id', ...admin, holidayUpdate, validate,
  auditedMutation('Holiday', 'UPDATE', (req) => Holiday.findById(req.params.id), (req) => orgService.updateHoliday(req.params.id, req.body)));
router.delete('/holidays/:id', ...admin, orgIdParam, validate, asyncHandler(async (req, res) => {
  const before = await Holiday.findById(req.params.id);
  const data = await orgService.deleteHoliday(req.params.id);
  await auditService.log(req, { action: 'DELETE', entity: 'Holiday', entityId: data._id, before, after: null });
  res.json({ data });
}));

export default router;
