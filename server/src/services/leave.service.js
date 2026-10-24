import Attendance from '../models/Attendance.js';
import CompanySettings from '../models/CompanySettings.js';
import Employee from '../models/Employee.js';
import Holiday from '../models/Holiday.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveType from '../models/LeaveType.js';
import User from '../models/User.js';
import AppError from '../utils/errors.js';
import {
  dateRangesOverlap, eachDateInRange, isWeekendDate, todayLocalDateStr, yearOf,
} from '../utils/dateHelpers.js';

const activeStatuses = ['pending', 'approved'];
const leaveNotePrefix = 'Auto from approved leave';

async function getEmployeeForUser(userId) {
  const user = await User.findById(userId).select('role employeeRef isActive');
  if (!user || !user.isActive || user.role !== 'employee' || !user.employeeRef) {
    throw new AppError(403, 'An active employee profile is required.');
  }
  return user.employeeRef;
}

async function getSettings() {
  const settings = await CompanySettings.getSingleton();
  if (!settings) throw new AppError(404, 'Company settings not found.');
  return settings;
}

function makeDates(startDate, endDate, weekendDays, holidaySet) {
  const allDates = eachDateInRange(startDate, endDate);
  const weekends = allDates.filter((date) => isWeekendDate(date, weekendDays));
  const holidays = allDates.filter((date) => !weekends.includes(date) && holidaySet.has(date));
  const workingDates = allDates.filter((date) => !weekends.includes(date) && !holidaySet.has(date));
  return { days: workingDates.length, workingDates, weekends, holidaysInRange: holidays };
}

async function getHolidayDates(startDate, endDate) {
  const holidays = await Holiday.find({
    date: { $gte: new Date(`${startDate}T00:00:00.000Z`), $lte: new Date(`${endDate}T23:59:59.999Z`) },
  }).select('date');
  return new Set(holidays.map(({ date }) => date.toISOString().slice(0, 10)));
}

async function previewDates(startDate, endDate) {
  const settings = await getSettings();
  const holidaySet = await getHolidayDates(startDate, endDate);
  return makeDates(startDate, endDate, settings.weekendDays, holidaySet);
}

async function ensureNoOverlap(employeeId, startDate, endDate, excludeId) {
  const requests = await LeaveRequest.find({
    employeeId,
    status: { $in: activeStatuses },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  }).select('startDate endDate');
  if (requests.some((request) => dateRangesOverlap(startDate, endDate, request.startDate, request.endDate))) {
    throw new AppError(409, 'This request overlaps an existing pending or approved leave.');
  }
}

async function getBalanceForEmployee(employeeId, year) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const [leaveTypes, requests] = await Promise.all([
    LeaveType.find({ isActive: true }).sort({ name: 1 }),
    LeaveRequest.find({
      employeeId,
      status: { $in: ['approved', 'pending'] },
      startDate: { $gte: startDate, $lte: endDate },
    }).select('leaveTypeId days status'),
  ]);
  const usedByType = new Map();
  const pendingByType = new Map();
  for (const request of requests) {
    const key = request.leaveTypeId.toString();
    const totals = request.status === 'approved' ? usedByType : pendingByType;
    totals.set(key, (totals.get(key) || 0) + request.days);
  }
  return leaveTypes.map((type) => {
    const used = usedByType.get(type._id.toString()) || 0;
    const unlimited = type.quotaPerYear === 0;
    return {
      leaveTypeId: type._id,
      name: type.name,
      code: type.code,
      quotaPerYear: type.quotaPerYear,
      used,
      pending: pendingByType.get(type._id.toString()) || 0,
      remaining: unlimited ? null : Math.max(0, type.quotaPerYear - used),
      unlimited,
      isPaid: type.isPaid,
    };
  });
}

async function validateRequest(employeeId, payload, excludeId) {
  if (payload.endDate < payload.startDate) throw new AppError(422, 'End date must be on or after start date.');
  const leaveType = await LeaveType.findOne({ _id: payload.leaveTypeId, isActive: true });
  if (!leaveType) throw new AppError(422, 'Choose an active leave type.');
  const preview = await previewDates(payload.startDate, payload.endDate);
  if (preview.days < 1) throw new AppError(422, 'The selected date range contains no working days.');
  await ensureNoOverlap(employeeId, payload.startDate, payload.endDate, excludeId);
  const balance = (await getBalanceForEmployee(employeeId, yearOf(payload.startDate)))
    .find((item) => item.leaveTypeId.toString() === leaveType._id.toString());
  if (leaveType.quotaPerYear > 0 && (!balance || balance.remaining < preview.days)) {
    throw new AppError(422, 'The requested leave exceeds the available yearly balance.');
  }
  return { leaveType, preview };
}

async function markApprovedAttendance(request) {
  const today = todayLocalDateStr();
  const holidaySet = await getHolidayDates(request.startDate, request.endDate);
  const settings = await getSettings();
  const dates = makeDates(request.startDate, request.endDate, settings.weekendDays, holidaySet)
    .workingDates.filter((date) => date <= today);
  for (const date of dates) {
    const current = await Attendance.findOne({ employeeId: request.employeeId, date });
    if (current?.checkInAt) continue;
    if (current) {
      current.status = 'on_leave';
      current.source = 'correction';
      current.notes = `${leaveNotePrefix} (${request._id})`;
      await current.save();
    } else {
      await Attendance.create({
        employeeId: request.employeeId,
        date,
        status: 'on_leave',
        source: 'correction',
        notes: `${leaveNotePrefix} (${request._id})`,
      });
    }
  }
}

async function removeApprovedAttendance(request) {
  await Attendance.deleteMany({
    employeeId: request.employeeId,
    date: { $gte: todayLocalDateStr(), $lte: request.endDate },
    status: 'on_leave',
    notes: { $regex: `^${leaveNotePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(${request._id}\\)$` },
  });
}

export const leaveService = {
  async preview({ from, to }) {
    return previewDates(from, to);
  },

  async getBalances(employeeId, year) {
    const employee = await Employee.exists({ _id: employeeId });
    if (!employee) throw new AppError(404, 'Employee not found.');
    return { year, items: await getBalanceForEmployee(employeeId, year) };
  },

  async getMyBalances(userId, year) {
    return this.getBalances(await getEmployeeForUser(userId), year);
  },

  async apply(userId, payload) {
    const employeeId = await getEmployeeForUser(userId);
    const { leaveType, preview } = await validateRequest(employeeId, payload);
    return LeaveRequest.create({
      employeeId,
      leaveTypeId: leaveType._id,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days: preview.days,
      reason: payload.reason.trim(),
    });
  },

  async listMine(userId, { status, from, to, page = 1, limit = 20 } = {}) {
    const employeeId = await getEmployeeForUser(userId);
    const filter = { employeeId };
    if (status) filter.status = status;
    if (from) filter.endDate = { $gte: from };
    if (to) filter.startDate = { ...(filter.startDate || {}), $lte: to };
    const [items, total] = await Promise.all([
      LeaveRequest.find(filter).populate('leaveTypeId', 'name code isPaid')
        .sort({ appliedAt: -1 }).skip((page - 1) * limit).limit(limit),
      LeaveRequest.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async listEmployeeRequests(employeeId, { page = 1, limit = 50 } = {}) {
    const [items, total] = await Promise.all([
      LeaveRequest.find({ employeeId })
        .populate('leaveTypeId', 'name code isPaid')
        .populate('reviewedByUserId', 'name')
        .sort({ appliedAt: -1 }).skip((page - 1) * limit).limit(limit),
      LeaveRequest.countDocuments({ employeeId }),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async listInbox({ status = 'pending', employeeId, leaveTypeId, q, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;
    if (leaveTypeId) filter.leaveTypeId = leaveTypeId;
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = await Employee.find({
        $or: [
          { firstName: new RegExp(escaped, 'i') },
          { lastName: new RegExp(escaped, 'i') },
          { employeeCode: new RegExp(escaped, 'i') },
          { email: new RegExp(escaped, 'i') },
        ],
      }).select('_id');
      filter.employeeId = { $in: matches.map(({ _id }) => _id) };
    }
    const [items, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate({
          path: 'employeeId',
          select: 'employeeCode firstName lastName email departmentId',
          populate: { path: 'departmentId', select: 'name' },
        })
        .populate('leaveTypeId', 'name code isPaid')
        .populate('reviewedByUserId', 'name')
        .sort({ appliedAt: -1 }).skip((page - 1) * limit).limit(limit),
      LeaveRequest.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async cancel(userId, requestId) {
    const employeeId = await getEmployeeForUser(userId);
    const request = await LeaveRequest.findOne({ _id: requestId, employeeId });
    if (!request) throw new AppError(404, 'Leave request not found.');
    if (!['pending', 'approved'].includes(request.status)) {
      throw new AppError(409, 'Only pending or approved requests can be cancelled.');
    }
    if (request.status === 'approved' && request.startDate <= todayLocalDateStr()) {
      throw new AppError(422, 'Approved leave can only be cancelled before its start date.');
    }
    if (request.status === 'approved') await removeApprovedAttendance(request);
    request.status = 'cancelled';
    await request.save();
    return request;
  },

  async review(requestId, reviewerId, { decision, comment = '' }) {
    const request = await LeaveRequest.findById(requestId);
    if (!request) throw new AppError(404, 'Leave request not found.');
    if (request.status !== 'pending') throw new AppError(409, 'This leave request has already been reviewed.');
    if (decision === 'reject' && !comment.trim()) throw new AppError(422, 'A comment is required to reject a request.');
    if (decision === 'approve') {
      const { preview } = await validateRequest(request.employeeId, request, request._id);
      request.days = preview.days;
      await markApprovedAttendance(request);
    }
    request.status = decision === 'approve' ? 'approved' : 'rejected';
    request.reviewedByUserId = reviewerId;
    request.reviewedAt = new Date();
    request.reviewComment = comment.trim();
    await request.save();
    return request;
  },

  async getEmployeeBalances(employeeId, year) {
    return this.getBalances(employeeId, year);
  },
};
