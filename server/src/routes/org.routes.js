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

const router = Router();
const admin = [verifyToken, requireRole('admin')];
const adminAndHr = [verifyToken, requireRole('admin', 'hr')];
const allRoles = [verifyToken, requireRole('admin', 'hr', 'employee')];
const sendData = (handler) => asyncHandler(async (req, res) => res.json({ data: await handler(req) }));
const sendList = (handler) => asyncHandler(async (req, res) => res.json(await handler(req)));

router.get('/company', ...allRoles, sendData(() => orgService.getCompanySettings()));
router.patch('/company', ...admin, companySettingsUpdate, validate, sendData((req) => orgService.updateCompanySettings(req.body)));

router.get('/departments', ...adminAndHr, departmentList, validate, sendList((req) => orgService.listDepartments(req.query)));
router.post('/departments', ...admin, departmentCreate, validate, sendData((req) => orgService.createDepartment(req.body)));
router.patch('/departments/:id', ...admin, departmentUpdate, validate, sendData((req) => orgService.updateDepartment(req.params.id, req.body)));
router.delete('/departments/:id', ...admin, orgIdParam, validate, asyncHandler(async (req, res) => {
  res.json({ data: await orgService.deactivateDepartment(req.params.id) });
}));

router.get('/designations', ...adminAndHr, designationList, validate, sendList((req) => orgService.listDesignations(req.query)));
router.post('/designations', ...admin, designationCreate, validate, sendData((req) => orgService.createDesignation(req.body)));
router.patch('/designations/:id', ...admin, designationUpdate, validate, sendData((req) => orgService.updateDesignation(req.params.id, req.body)));
router.delete('/designations/:id', ...admin, orgIdParam, validate, asyncHandler(async (req, res) => {
  res.json({ data: await orgService.deactivateDesignation(req.params.id) });
}));

router.get('/leave-types', ...adminAndHr, leaveTypeList, validate, sendList((req) => orgService.listLeaveTypes(req.query)));
router.post('/leave-types', ...admin, leaveTypeCreate, validate, sendData((req) => orgService.createLeaveType(req.body)));
router.patch('/leave-types/:id', ...admin, leaveTypeUpdate, validate, sendData((req) => orgService.updateLeaveType(req.params.id, req.body)));
router.delete('/leave-types/:id', ...admin, orgIdParam, validate, asyncHandler(async (req, res) => {
  res.json({ data: await orgService.deactivateLeaveType(req.params.id) });
}));

router.get('/holidays', ...allRoles, holidayList, validate, sendList((req) => orgService.listHolidays(req.query)));
router.post('/holidays', ...admin, holidayCreate, validate, sendData((req) => orgService.createHoliday(req.body)));
router.patch('/holidays/:id', ...admin, holidayUpdate, validate, sendData((req) => orgService.updateHoliday(req.params.id, req.body)));
router.delete('/holidays/:id', ...admin, orgIdParam, validate, asyncHandler(async (req, res) => {
  res.json({ data: await orgService.deleteHoliday(req.params.id) });
}));

export default router;
