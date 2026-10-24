import Department from '../models/Department.js';
import { dashboardService } from '../services/dashboard.service.js';
import { employeeService } from '../services/employee.service.js';
import { leaveService } from '../services/leave.service.js';
import AppError from '../utils/errors.js';
import { resolveDateRange } from '../utils/dateRange.js';
import { getLocalDateString } from '../utils/time.js';
import { monthRange } from '../utils/monthHelpers.js';

function requireManager(user) {
  if (!['admin', 'hr'].includes(user.role)) throw new AppError(403, 'Not permitted.');
}

function requireAdmin(user) {
  if (user.role !== 'admin') throw new AppError(403, 'Not permitted.');
}

function requireEmployee(user) {
  if (user.role !== 'employee' || !user.employeeId) throw new AppError(403, 'Not permitted.');
}

async function resolveDepartmentId(value) {
  if (!value) return undefined;
  if (/^[a-f\d]{24}$/i.test(value)) return value;
  const department = await Department.findOne({ name: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
    .select('_id').lean();
  if (!department) throw new AppError(422, 'Department was not found.');
  return department._id.toString();
}

function objectSchema(properties, required = []) {
  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

const dateField = { type: 'string', description: 'Optional YYYY-MM-DD date.' };
const departmentField = { type: 'string', description: 'Optional department ObjectId or exact department name.' };

export function getToolDefinitions(user) {
  const tools = [];
  if (['admin', 'hr'].includes(user.role)) {
    tools.push(
      { type: 'function', function: { name: 'get_headcount', description: 'Get current or as-of-date employee headcount and department breakdown. If a department is named, pass its exact name in departmentId; the server resolves the name.', parameters: objectSchema({ departmentId: departmentField, asOfDate: dateField }) } },
      { type: 'function', function: { name: 'get_attendance_summary', description: 'Get attendance rate and counts for a date range; defaults to the last 30 days. For "this month", provide the first day of the current month through today. Resolve any named department by passing its exact name as departmentId.', parameters: objectSchema({ from: dateField, to: dateField, departmentId: departmentField }) } },
      { type: 'function', function: { name: 'get_late_comers', description: 'Get employees with the most late arrivals and their late counts; defaults to the last 30 days. For "this month", provide the first day of the current month through today. Resolve any named department by passing its exact name as departmentId.', parameters: objectSchema({ from: dateField, to: dateField, departmentId: departmentField, limit: { type: 'integer', minimum: 1, maximum: 10 } }) } },
      { type: 'function', function: { name: 'get_leave_summary', description: 'Get approved leave totals by type and department for a date range.', parameters: objectSchema({ from: dateField, to: dateField, departmentId: departmentField }) } },
    );
  }
  if (user.role === 'employee') {
    tools.push({
      type: 'function',
      function: {
        name: 'get_my_leave_balance',
        description: 'Get the current employee’s own leave balance, used and pending days. Never use for another person.',
        parameters: objectSchema({}),
      },
    });
  }
  if (user.role === 'admin') {
    tools.push({
      type: 'function',
      function: {
        name: 'get_payroll_summary',
        description: 'Get finalized payroll aggregate totals. Never return individual salary data.',
        parameters: objectSchema({ month: { type: 'string', description: 'Optional YYYY-MM month.' } }),
      },
    });
  }
  if (['admin', 'hr'].includes(user.role)) {
    tools.push({
      type: 'function',
      function: {
        name: 'search_employees',
        description: 'Search the employee directory by name, code, or email. Returns only names, employee codes, departments, and IDs needed for dashboard filtering; no salary or sensitive profile data.',
        parameters: objectSchema({ q: { type: 'string', minLength: 1, maxLength: 100 }, limit: { type: 'integer', minimum: 1, maximum: 10 } }, ['q']),
      },
    });
  }
  return tools;
}

export function getToolHandlers() {
  return {
    async get_headcount(args, user) {
      requireManager(user);
      const departmentId = await resolveDepartmentId(args.departmentId);
      return dashboardService.getHeadcount({ asOfDate: args.asOfDate, departmentId });
    },
    async get_attendance_summary(args, user) {
      requireManager(user);
      const range = resolveDateRange(args);
      const departmentId = await resolveDepartmentId(args.departmentId);
      return dashboardService.getAttendanceSummary({ ...range, departmentId });
    },
    async get_late_comers(args, user) {
      requireManager(user);
      const range = resolveDateRange(args);
      const departmentId = await resolveDepartmentId(args.departmentId);
      return dashboardService.getLateComers({ ...range, departmentId, limit: Math.min(10, Math.max(1, Number(args.limit) || 5)) });
    },
    async get_leave_summary(args, user) {
      requireManager(user);
      const range = resolveDateRange(args);
      const departmentId = await resolveDepartmentId(args.departmentId);
      return dashboardService.getLeaveSummary({ ...range, departmentId });
    },
    async get_my_leave_balance(_args, user) {
      requireEmployee(user);
      const year = Number(getLocalDateString().slice(0, 4));
      return leaveService.getBalances(user.employeeId, year);
    },
    async get_payroll_summary(args, user) {
      requireAdmin(user);
      const month = args.month || getLocalDateString().slice(0, 7);
      if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new AppError(422, 'Month must use YYYY-MM format.');
      const { startDateStr, endDateStr } = monthRange(month);
      return dashboardService.getPayrollSummary({ from: startDateStr, to: endDateStr });
    },
    async search_employees(args, user) {
      requireManager(user);
      const result = await employeeService.listEmployees({
        q: args.q,
        page: 1,
        limit: Math.min(10, Math.max(1, Number(args.limit) || 10)),
        actor: { role: user.role, id: user.id, employeeId: user.employeeId },
      });
      return result.items.map((employee) => ({
        id: employee._id?.toString() || employee.id,
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        departmentId: employee.departmentId?._id?.toString() || employee.departmentId?.toString(),
        departmentName: employee.departmentId?.name || '',
      }));
    },
  };
}
