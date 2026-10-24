import Attendance from '../models/Attendance.js';
import CompanySettings from '../models/CompanySettings.js';
import Employee from '../models/Employee.js';
import Holiday from '../models/Holiday.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveType from '../models/LeaveType.js';
import PayrollRun from '../models/PayrollRun.js';
import Payslip from '../models/Payslip.js';
import User from '../models/User.js';
import AppError from '../utils/errors.js';
import { activeWorkingDaysInMonth, currentMonthStr, isValidMonth, monthRange, workingDaysInMonth } from '../utils/monthHelpers.js';
import { calcGross, calcPerDay, calcTax, round2 } from '../utils/payrollCalc.js';
import { getLocalDateString } from '../utils/time.js';

const allowedActorRoles = ['admin', 'hr'];
const monthLocks = new Map();

async function withMonthLock(month, action) {
  const previous = monthLocks.get(month) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  monthLocks.set(month, current);
  await previous;
  try {
    return await action();
  } finally {
    release();
    if (monthLocks.get(month) === current) monthLocks.delete(month);
  }
}

function requirePayrollRole(actor, roles = allowedActorRoles) {
  if (!actor || !roles.includes(actor.role)) throw new AppError(403, 'You do not have permission to access payroll.');
}

function asDateString(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function employeeLeavingDate(employee) {
  if (employee.dateOfLeaving) return employee.dateOfLeaving;
  if (['resigned', 'terminated'].includes(employee.status)) return employee.updatedAt;
  return null;
}

function monthDates(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T12:00:00.000Z`);
  const last = new Date(`${end}T12:00:00.000Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function salaryComponents(salary = {}) {
  const basic = Number(salary.basic) || 0;
  let hra = Number(salary.hra) || 0;
  let medical = Number(salary.medical) || 0;
  const transport = Number(salary.transport) || 0;
  const other = Number(salary.other) || 0;
  if (hra + medical + transport + other === 0) {
    hra = round2(basic * 0.4);
    medical = round2(basic * 0.1);
  }
  return { basic, hra, medical, transport, other, gross: calcGross({ basic, hra, medical, transport, other }) };
}

function approvedLeaveDays(requests, activeDates, leaveTypeMap) {
  const activeDateSet = new Set(activeDates);
  const unpaid = new Set();
  const paid = new Set();
  for (const request of requests) {
    const leaveType = leaveTypeMap.get(request.leaveTypeId.toString());
    const target = leaveType?.isPaid ? paid : unpaid;
    for (const date of activeDates) {
      if (date >= request.startDate && date <= request.endDate && activeDateSet.has(date)) target.add(date);
    }
  }
  for (const date of unpaid) paid.delete(date);
  return { unpaidDates: unpaid, paidDates: paid };
}

function makePayslip(employee, month, runId, workingDays, settings, holidaySet, leaveTypeMap, leaveRequests, attendanceRecords, monthDateRange) {
  const leavingDate = employeeLeavingDate(employee);
  const activeDays = activeWorkingDaysInMonth(
    month,
    employee.dateOfJoining,
    leavingDate,
    settings.weekendDays,
    holidaySet,
  );
  if (activeDays === 0) return null;

  const activeStart = asDateString(employee.dateOfJoining) > monthDateRange.startDateStr
    ? asDateString(employee.dateOfJoining) : monthDateRange.startDateStr;
  const effectiveLeaving = leavingDate ? asDateString(leavingDate) : monthDateRange.endDateStr;
  const activeEnd = effectiveLeaving < monthDateRange.endDateStr ? effectiveLeaving : monthDateRange.endDateStr;
  const activeDates = monthDates(activeStart, activeEnd)
    .filter((date) => !settings.weekendDays.includes(new Date(`${date}T00:00:00.000Z`).getUTCDay()) && !holidaySet.has(date));
  const today = getLocalDateString();
  const elapsedDates = activeDates.filter((date) => date <= today);
  const { unpaidDates, paidDates } = approvedLeaveDays(leaveRequests, activeDates, leaveTypeMap);
  const records = attendanceRecords;
  let presentDays = 0;
  let lateDays = 0;
  let halfDays = 0;
  const explicitAbsentDates = new Set();
  let missingCheckoutDays = 0;
  const recordedDates = new Set();
  for (const record of records) {
    if (!activeDates.includes(record.date)) continue;
    recordedDates.add(record.date);
    const missingCheckout = record.status === 'missing_checkout' || (record.checkInAt && !record.checkOutAt);
    if (record.status === 'present' || record.status === 'late' || missingCheckout) presentDays += 1;
    if (record.status === 'late') lateDays += 1;
    if (missingCheckout) missingCheckoutDays += 1;
    if (record.status === 'half_day') halfDays += 1;
    if (record.status === 'absent' && record.date <= today) explicitAbsentDates.add(record.date);
  }
  const excludedLeave = new Set([...unpaidDates, ...paidDates]);
  const absentDays = elapsedDates.filter((date) => (
    !excludedLeave.has(date) && (explicitAbsentDates.has(date) || !recordedDates.has(date))
  )).length;
  const salary = salaryComponents(employee.salary);
  const proratedGross = workingDays > 0 && activeDays < workingDays
    ? round2(salary.gross * (activeDays / workingDays))
    : round2(salary.gross);
  // Use activeDays after gross proration so a partial-month day retains the same daily rate.
  const perDay = calcPerDay(proratedGross, activeDays);
  const absentAmount = round2(absentDays * perDay);
  const unpaidLeaveAmount = round2(unpaidDates.size * perDay);
  const halfDayAmount = round2(0.5 * halfDays * perDay);
  const totalDeductions = round2(absentAmount + unpaidLeaveAmount + halfDayAmount);
  const tax = calcTax(proratedGross);
  const netPay = round2(Math.max(0, proratedGross - totalDeductions - tax.monthlyTax));

  return {
    payrollRunId: runId,
    employeeId: employee._id,
    month,
    employeeSnapshot: {
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      departmentName: employee.departmentId?.name || '',
      designationName: employee.designationId?.name || '',
      dateOfJoining: employee.dateOfJoining,
      ...(leavingDate ? { dateOfLeaving: leavingDate } : {}),
    },
    salaryStructure: salary,
    attendance: {
      workingDays,
      activeDays,
      presentDays,
      lateDays,
      halfDays,
      absentDays,
      unpaidLeaveDays: unpaidDates.size,
      paidLeaveDays: paidDates.size,
      missingCheckoutDays,
    },
    earnings: { proratedGross, perDay },
    deductions: { absentAmount, unpaidLeaveAmount, halfDayAmount, totalDeductions },
    tax,
    netPay,
  };
}

async function fetchEmployeePayslips(month) {
  const range = monthRange(month);
  const [settings, holidays, leaveTypes] = await Promise.all([
    CompanySettings.getSingleton(),
    Holiday.find({ date: { $gte: range.startDate, $lte: range.endDate } }).select('date'),
    LeaveType.find({}).select('isPaid'),
  ]);
  if (!settings) throw new AppError(404, 'Company settings not found.');
  const holidaySet = new Set(holidays.map(({ date }) => asDateString(date)));
  const workingDays = workingDaysInMonth(month, settings.weekendDays, holidaySet);
  const leaveTypeMap = new Map(leaveTypes.map((leaveType) => [leaveType._id.toString(), leaveType]));
  const employees = await Employee.find({
    status: { $in: ['active', 'probation', 'resigned', 'terminated'] },
    dateOfJoining: { $lte: range.endDate },
  }).populate('departmentId', 'name').populate('designationId', 'name');
  const eligible = employees.filter((employee) => {
    const leavingDate = employeeLeavingDate(employee);
    return !leavingDate || leavingDate >= range.startDate;
  });
  const employeeIds = eligible.map((employee) => employee._id);
  const [attendance, approvedLeaves] = await Promise.all([
    Attendance.find({
      employeeId: { $in: employeeIds },
      date: { $gte: range.startDateStr, $lte: range.endDateStr },
    }).select('employeeId date status checkInAt checkOutAt'),
    LeaveRequest.find({
      employeeId: { $in: employeeIds },
      status: 'approved',
      startDate: { $lte: range.endDateStr },
      endDate: { $gte: range.startDateStr },
    }).select('employeeId leaveTypeId startDate endDate'),
  ]);
  const attendanceByEmployee = new Map();
  for (const record of attendance) {
    const key = record.employeeId.toString();
    if (!attendanceByEmployee.has(key)) attendanceByEmployee.set(key, []);
    attendanceByEmployee.get(key).push(record);
  }
  const leaveByEmployee = new Map();
  for (const request of approvedLeaves) {
    const key = request.employeeId.toString();
    if (!leaveByEmployee.has(key)) leaveByEmployee.set(key, []);
    leaveByEmployee.get(key).push(request);
  }
  return {
    settings,
    holidaySet,
    leaveTypeMap,
    employees: eligible,
    workingDays,
    range,
    attendanceByEmployee,
    leaveByEmployee,
  };
}

export const payrollService = {
  async generateOrRefreshDraft(month, actorUserId, actor) {
    requirePayrollRole(actor);
    if (!isValidMonth(month)) throw new AppError(422, 'Month must be in YYYY-MM format.');
    return withMonthLock(month, async () => {
      let run = await PayrollRun.findOne({ month });
      if (run?.status === 'finalized') throw new AppError(409, `Payroll for ${month} is finalized and locked.`);

      const data = await fetchEmployeePayslips(month);
      if (data.workingDays === 0) throw new AppError(422, 'No working days are configured for this month.');
      const runId = run?._id;
      const payslipDocs = data.employees.map((employee) => makePayslip(
        employee,
        month,
        runId,
        data.workingDays,
        data.settings,
        data.holidaySet,
        data.leaveTypeMap,
        data.leaveByEmployee.get(employee._id.toString()) || [],
        data.attendanceByEmployee.get(employee._id.toString()) || [],
        data.range,
      )).filter(Boolean);
      const totals = payslipDocs.reduce((aggregate, slip) => ({
        employees: aggregate.employees + 1,
        gross: round2(aggregate.gross + slip.earnings.proratedGross),
        deductions: round2(aggregate.deductions + slip.deductions.totalDeductions),
        tax: round2(aggregate.tax + slip.tax.monthlyTax),
        net: round2(aggregate.net + slip.netPay),
      }), { employees: 0, gross: 0, deductions: 0, tax: 0, net: 0 });

      if (!run) {
        run = await PayrollRun.create({
          month,
          status: 'draft',
          workingDays: data.workingDays,
          createdByUserId: actorUserId,
          totals,
        });
        for (const slip of payslipDocs) slip.payrollRunId = run._id;
      } else {
        await Payslip.deleteMany({ payrollRunId: run._id });
        run.workingDays = data.workingDays;
        run.totals = totals;
        await run.save();
      }
      if (payslipDocs.length) await Payslip.insertMany(payslipDocs);
      const payslips = payslipDocs.map((slip) => ({
        employeeId: slip.employeeId,
        employeeCode: slip.employeeSnapshot.employeeCode,
        netPay: slip.netPay,
      }));
      return { run, payslips, totals };
    });
  },

  async getRun(month, actor) {
    requirePayrollRole(actor);
    const run = await PayrollRun.findOne({ month });
    if (!run) throw new AppError(404, `Payroll for ${month} was not found.`);
    const payslips = await Payslip.find({ payrollRunId: run._id })
      .populate('employeeId', 'employeeCode firstName lastName')
      .sort({ 'employeeSnapshot.lastName': 1, 'employeeSnapshot.firstName': 1 });
    return { run, payslips, totals: run.totals };
  },

  async listRuns({ page = 1, limit = 20, status } = {}, actor) {
    requirePayrollRole(actor);
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      PayrollRun.find(filter).sort({ month: -1 }).skip((page - 1) * limit).limit(limit),
      PayrollRun.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async finalizeRun(month, actorUserId, actor) {
    requirePayrollRole(actor, ['admin']);
    return withMonthLock(month, async () => {
      const run = await PayrollRun.findOne({ month });
      if (!run) throw new AppError(404, `Payroll for ${month} was not found.`);
      if (run.status === 'finalized') throw new AppError(409, `Payroll for ${month} is finalized and locked.`);
      run.status = 'finalized';
      run.finalizedByUserId = actorUserId;
      run.finalizedAt = new Date();
      await run.save();
      return run;
    });
  },

  async listMyPayslips(actorUserId, { page = 1, limit = 20 } = {}) {
    const employee = await User.findById(actorUserId).select('employeeRef role isActive');
    if (!employee || !employee.isActive || employee.role !== 'employee' || !employee.employeeRef) {
      throw new AppError(403, 'An active employee profile is required.');
    }
    const finalizedRuns = await PayrollRun.find({ status: 'finalized' }).select('_id');
    const filter = { employeeId: employee.employeeRef, payrollRunId: { $in: finalizedRuns.map((run) => run._id) } };
    const [items, total] = await Promise.all([
      Payslip.find(filter).sort({ month: -1 }).skip((page - 1) * limit).limit(limit),
      Payslip.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async getMyPayslip(payslipId, actorUserId) {
    const employee = await User.findById(actorUserId).select('employeeRef role isActive');
    if (!employee || !employee.isActive || employee.role !== 'employee' || !employee.employeeRef) {
      throw new AppError(403, 'An active employee profile is required.');
    }
    const slip = await Payslip.findOne({ _id: payslipId, employeeId: employee.employeeRef });
    if (!slip) throw new AppError(404, 'Payslip not found.');
    const run = await PayrollRun.findOne({ _id: slip.payrollRunId, status: 'finalized' });
    if (!run) throw new AppError(404, 'Finalized payslip not found.');
    return { ...slip.toObject(), payrollRun: { status: run.status, finalizedAt: run.finalizedAt } };
  },

  async getPayslipForHr(payslipId, actor) {
    requirePayrollRole(actor);
    const slip = await Payslip.findById(payslipId);
    if (!slip) throw new AppError(404, 'Payslip not found.');
    return slip;
  },

  async getCompanyName() {
    const settings = await CompanySettings.getSingleton();
    if (!settings) throw new AppError(404, 'Company settings not found.');
    return settings.companyName;
  },

  async currentMonth() {
    return currentMonthStr();
  },
};
