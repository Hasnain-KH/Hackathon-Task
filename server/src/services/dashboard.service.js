import Attendance from '../models/Attendance.js';
import CompanySettings from '../models/CompanySettings.js';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';
import Holiday from '../models/Holiday.js';
import LeaveRequest from '../models/LeaveRequest.js';
import PayrollRun from '../models/PayrollRun.js';
import Payslip from '../models/Payslip.js';
import AppError from '../utils/errors.js';
import { getLocalDateString } from '../utils/time.js';
import { leaveService } from './leave.service.js';

function dateObject(date, end = false) {
  return new Date(`${date}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
}

function datesInRange(from, to, weekendDays, holidays) {
  const dates = [];
  const cursor = new Date(`${from}T12:00:00.000Z`);
  const last = new Date(`${to}T12:00:00.000Z`);
  while (cursor <= last) {
    const date = cursor.toISOString().slice(0, 10);
    if (!weekendDays.includes(cursor.getUTCDay()) && !holidays.has(date)) dates.push(date);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

async function settings() {
  const company = await CompanySettings.getSingleton().lean();
  if (!company) throw new AppError(404, 'Company settings not found.');
  return company;
}

async function getHolidaySet(from, to) {
  const holidays = await Holiday.find({ date: { $gte: dateObject(from), $lte: dateObject(to, true) } }).select('date').lean();
  return new Set(holidays.map(({ date }) => date.toISOString().slice(0, 10)));
}

function getLeaveDate(employee) {
  if (employee.dateOfLeaving) return new Date(employee.dateOfLeaving);
  if (['resigned', 'terminated'].includes(employee.status)) return new Date(employee.updatedAt);
  return null;
}

function isActiveOn(employee, date) {
  const dayEnd = dateObject(date, true);
  const leaveDate = getLeaveDate(employee);
  return new Date(employee.dateOfJoining) <= dayEnd && (!leaveDate || leaveDate >= dateObject(date));
}

async function employeesForDashboard(departmentId) {
  return Employee.find({
    status: { $in: ['active', 'probation', 'resigned', 'terminated'] },
    ...(departmentId ? { departmentId } : {}),
  }).populate('departmentId', 'name').lean();
}

export const dashboardService = {
  async getHeadcount({ asOfDate = getLocalDateString(), departmentId } = {}) {
    const employees = await employeesForDashboard(departmentId);
    const active = employees.filter((employee) => isActiveOn(employee, asOfDate));
    const byDepartment = new Map();
    const byStatus = { active: 0, probation: 0, resigned: 0, terminated: 0 };
    for (const employee of active) {
      byStatus[employee.status] += 1;
      const key = employee.departmentId?._id?.toString() || 'unassigned';
      const department = byDepartment.get(key) || {
        departmentId: employee.departmentId?._id || null,
        name: employee.departmentId?.name || 'Unassigned',
        count: 0,
      };
      department.count += 1;
      byDepartment.set(key, department);
    }
    return {
      total: active.length,
      byDepartment: [...byDepartment.values()].sort((left, right) => left.name.localeCompare(right.name)),
      byStatus,
    };
  },

  async getAttrition({ from, to, departmentId } = {}) {
    const exits = await Employee.countDocuments({
      status: { $in: ['resigned', 'terminated'] },
      ...(departmentId ? { departmentId } : {}),
      $or: [
        { dateOfLeaving: { $gte: dateObject(from), $lte: dateObject(to, true) } },
        { dateOfLeaving: { $exists: false }, updatedAt: { $gte: dateObject(from), $lte: dateObject(to, true) } },
      ],
    });
    const [start, end] = await Promise.all([
      this.getHeadcount({ asOfDate: from, departmentId }),
      this.getHeadcount({ asOfDate: to, departmentId }),
    ]);
    const average = (start.total + end.total) / 2;
    return { exits, avgHeadcount: average, attritionPercent: average ? Math.round((exits / average) * 1000) / 10 : null };
  },

  async getAttendanceSummary({ from, to, departmentId } = {}) {
    const company = await settings();
    const today = getLocalDateString();
    const end = to > today ? today : to;
    if (from > end) return {
      attendanceRate: null, present: 0, late: 0, halfDay: 0, missingCheckout: 0,
      absent: 0, onLeave: 0, expectedWorkingDays: 0, trend: [],
    };
    const holidays = await getHolidaySet(from, end);
    const workingDates = datesInRange(from, end, company.weekendDays || [0, 6], holidays);
    const employees = (await employeesForDashboard(departmentId))
      .filter((employee) => workingDates.some((date) => isActiveOn(employee, date)));
    const records = await Attendance.find({
      employeeId: { $in: employees.map(({ _id }) => _id) },
      date: { $gte: from, $lte: end },
    }).select('employeeId date status').lean();
    const attendanceByKey = new Map(records.map((record) => [`${record.employeeId}:${record.date}`, record.status]));
    const counts = { present: 0, late: 0, halfDay: 0, missingCheckout: 0, absent: 0, onLeave: 0 };
    let expectedWorkingDays = 0;
    const trend = [];
    for (const date of workingDates) {
      const daily = { present: 0, late: 0, halfDay: 0, missingCheckout: 0, absent: 0, onLeave: 0 };
      for (const employee of employees) {
        if (!isActiveOn(employee, date)) continue;
        expectedWorkingDays += 1;
        const status = attendanceByKey.get(`${employee._id}:${date}`);
        if (status === 'present') daily.present += 1;
        else if (status === 'late') daily.late += 1;
        else if (status === 'half_day') daily.halfDay += 1;
        else if (status === 'missing_checkout') daily.missingCheckout += 1;
        else if (status === 'on_leave') daily.onLeave += 1;
        else daily.absent += 1;
      }
      for (const key of Object.keys(counts)) counts[key] += daily[key];
      const denominator = daily.present + daily.late + daily.halfDay + daily.missingCheckout + daily.absent;
      const numerator = daily.present + daily.late + daily.missingCheckout + (daily.halfDay * 0.5);
      trend.push({ date, attendanceRate: denominator ? Math.round((numerator / denominator) * 1000) / 10 : null, ...daily });
    }
    const denominator = expectedWorkingDays - counts.onLeave;
    const numerator = counts.present + counts.late + counts.missingCheckout + (counts.halfDay * 0.5);
    return {
      attendanceRate: denominator ? Math.round((numerator / denominator) * 1000) / 10 : null,
      ...counts,
      expectedWorkingDays,
      workingDayRecords: records.length,
      trend,
    };
  },

  async getLateComers({ from, to, departmentId, limit = 5 } = {}) {
    const employeeIds = departmentId ? await Employee.find({ departmentId }).distinct('_id') : undefined;
    const attendance = await Attendance.find({
      status: 'late',
      date: { $gte: from, $lte: to },
      ...(employeeIds ? { employeeId: { $in: employeeIds } } : {}),
    }).select('employeeId lateMinutes').lean();
    const counts = new Map();
    for (const record of attendance) {
      const key = record.employeeId.toString();
      const item = counts.get(key) || { lateCount: 0, totalLateMinutes: 0 };
      item.lateCount += 1;
      item.totalLateMinutes += record.lateMinutes || 0;
      counts.set(key, item);
    }
    const employees = await Employee.find({ _id: { $in: [...counts.keys()] } })
      .select('employeeCode firstName lastName departmentId').populate('departmentId', 'name').lean();
    const items = employees.map((employee) => ({
      employeeId: employee._id,
      employeeCode: employee.employeeCode,
      name: `${employee.firstName} ${employee.lastName}`,
      departmentName: employee.departmentId?.name || '',
      ...counts.get(employee._id.toString()),
    })).sort((left, right) => right.lateCount - left.lateCount || right.totalLateMinutes - left.totalLateMinutes)
      .slice(0, Math.min(10, Math.max(1, Number(limit) || 5)));
    return { items };
  },

  async getLeaveSummary({ from, to, departmentId } = {}) {
    const employees = await Employee.find(departmentId ? { departmentId } : {})
      .select('_id departmentId').populate('departmentId', 'name').lean();
    const employeesById = new Map(employees.map((employee) => [employee._id.toString(), employee]));
    const requests = await LeaveRequest.find({
      employeeId: { $in: employees.map(({ _id }) => _id) },
      status: 'approved',
      startDate: { $lte: to },
      endDate: { $gte: from },
    }).populate('leaveTypeId', 'name code isPaid').lean();
    const byType = new Map();
    const byDepartment = new Map();
    for (const request of requests) {
      const startDate = request.startDate > from ? request.startDate : from;
      const endDate = request.endDate < to ? request.endDate : to;
      const { days } = await leaveService.preview({ from: startDate, to: endDate });
      const leaveType = request.leaveTypeId;
      const typeKey = leaveType?.code || leaveType?.name || 'unknown';
      const type = byType.get(typeKey) || {
        name: leaveType?.name || 'Unknown', code: leaveType?.code || '',
        paid: Boolean(leaveType?.isPaid), requests: 0, days: 0,
      };
      type.requests += 1;
      type.days += days;
      byType.set(typeKey, type);
      const employee = employeesById.get(request.employeeId.toString());
      const departmentName = employee?.departmentId?.name || 'Unassigned';
      const department = byDepartment.get(departmentName) || { name: departmentName, requests: 0, days: 0 };
      department.requests += 1;
      department.days += days;
      byDepartment.set(departmentName, department);
    }
    return { byType: [...byType.values()], byDepartment: [...byDepartment.values()] };
  },

  async getPayrollSummary({ from, to, departmentId } = {}) {
    const runs = await PayrollRun.find({
      status: 'finalized',
      month: { $gte: from.slice(0, 7), $lte: to.slice(0, 7) },
    }).sort({ month: 1 }).select('month totals').lean();
    const employees = departmentId ? await Employee.find({ departmentId }).distinct('_id') : null;
    const slips = await Payslip.find({
      payrollRunId: { $in: runs.map(({ _id }) => _id) },
      ...(employees ? { employeeId: { $in: employees } } : {}),
    }).select('earnings.proratedGross deductions.totalDeductions tax.monthlyTax netPay').lean();
    const totals = slips.reduce((result, slip) => ({
      employees: result.employees + 1,
      gross: result.gross + slip.earnings.proratedGross,
      deductions: result.deductions + slip.deductions.totalDeductions,
      tax: result.tax + slip.tax.monthlyTax,
      net: result.net + slip.netPay,
    }), { employees: 0, gross: 0, deductions: 0, tax: 0, net: 0 });
    for (const [key, value] of Object.entries(totals)) totals[key] = Math.round(value * 100) / 100;
    return { months: runs.map(({ month, totals: monthTotals }) => ({ month, ...monthTotals })), totals, latestFinalizedMonth: runs.at(-1)?.month || null };
  },

  async getEmployeeDashboard(employeeId) {
    if (!employeeId) throw new AppError(403, 'An employee profile is required.');
    const today = getLocalDateString();
    const monthStart = `${today.slice(0, 7)}-01`;
    const year = Number(today.slice(0, 4));
    const [records, balances] = await Promise.all([
      Attendance.find({ employeeId, date: { $gte: monthStart, $lte: today } }).select('status').lean(),
      leaveService.getBalances(employeeId, year),
    ]);
    const included = records.filter((record) => record.status !== 'on_leave');
    const attended = included.filter((record) => ['present', 'late', 'missing_checkout'].includes(record.status)).length
      + (included.filter((record) => record.status === 'half_day').length * 0.5);
    return {
      attendanceRate: included.length ? Math.round((attended / included.length) * 1000) / 10 : null,
      leaveBalances: balances.items,
      attendanceRecordsThisMonth: records.length,
    };
  },

  async getDepartmentOptions() {
    return Department.find({ isActive: true }).select('_id name').sort({ name: 1 }).lean();
  },
};