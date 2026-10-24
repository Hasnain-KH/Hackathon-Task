import Attendance from '../models/Attendance.js';
import AttendanceCorrection from '../models/AttendanceCorrection.js';
import CompanySettings from '../models/CompanySettings.js';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import AppError from '../utils/errors.js';
import {
  getLocalDateString, getLocalMinutes, isWeekend, localDateTime, minutesBetween, parseHHMM,
} from '../utils/time.js';

const searchRegex = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const correctionTypes = new Set([
  'fix_missing_checkin', 'fix_missing_checkout', 'mark_half_day',
  'mark_present', 'mark_on_leave', 'mark_absent',
]);

async function getEmployeeForUser(userId) {
  const user = await User.findById(userId).select('role employeeRef');
  if (!user || user.role !== 'employee' || !user.employeeRef) {
    throw new AppError(403, 'An active employee profile is required.');
  }
  return user.employeeRef;
}

async function getSettings() {
  const settings = await CompanySettings.getSingleton();
  if (!settings) throw new AppError(404, 'Company settings not found.');
  return settings;
}

function safeTime(value) {
  return getLocalMinutes(value);
}

function computeAttendanceStatus(record, settings) {
  if (!record.checkOutAt) return record.status === 'late' ? 'late' : 'present';
  record.workedMinutes = minutesBetween(record.checkInAt, record.checkOutAt);
  if (record.workedMinutes < settings.halfDayThresholdHours * 60) return 'half_day';
  return record.lateMinutes > 0 ? 'late' : 'present';
}

async function applyCorrection(correction, reviewerId) {
  const settings = await getSettings();
  if (!correctionTypes.has(correction.requestType)) throw new AppError(422, 'Unsupported correction request.');
  if (correction.requestType === 'mark_absent') {
    await Attendance.findOneAndDelete({ employeeId: correction.employeeId, date: correction.date });
    return;
  }

  let record = await Attendance.findOne({ employeeId: correction.employeeId, date: correction.date });
  const startMinutes = parseHHMM(settings.officeStart);
  const startHours = String(Math.floor(startMinutes / 60)).padStart(2, '0');
  const startMinute = String(startMinutes % 60).padStart(2, '0');
  const checkInAt = localDateTime(correction.date, `${startHours}:${startMinute}`);
  const defaultCheckOut = new Date(checkInAt.getTime() + 480 * 60000);

  if (!record) {
    record = new Attendance({
      employeeId: correction.employeeId,
      date: correction.date,
      checkInAt,
      source: 'correction',
    });
  }

  switch (correction.requestType) {
    case 'fix_missing_checkin':
      record.checkInAt = checkInAt;
      record.source = 'correction';
      break;
    case 'fix_missing_checkout':
      if (!record.checkInAt) record.checkInAt = checkInAt;
      record.checkOutAt = defaultCheckOut;
      record.source = 'correction';
      break;
    case 'mark_present':
      if (!record.checkInAt) record.checkInAt = checkInAt;
      record.status = 'present';
      record.source = 'correction';
      break;
    case 'mark_half_day':
      if (!record.checkInAt) record.checkInAt = checkInAt;
      record.status = 'half_day';
      record.source = 'correction';
      break;
    case 'mark_on_leave':
      if (!record.checkInAt) record.checkInAt = checkInAt;
      record.status = 'on_leave';
      record.source = 'correction';
      break;
    default:
      break;
  }

  const threshold = startMinutes + settings.graceMinutes;
  record.lateMinutes = Math.max(0, safeTime(record.checkInAt) - threshold);
  if (record.checkOutAt) {
    record.workedMinutes = minutesBetween(record.checkInAt, record.checkOutAt);
    if (['fix_missing_checkin', 'fix_missing_checkout', 'mark_present'].includes(correction.requestType)) {
      record.status = computeAttendanceStatus(record, settings);
    }
  } else if (correction.requestType === 'mark_present') {
    record.status = 'present';
  }
  record.corrections.push({ at: new Date(), byUserId: reviewerId, reason: correction.reason });
  await record.save();
}

export const attendanceService = {
  async checkIn(actorUserId, { location } = {}) {
    const employeeId = await getEmployeeForUser(actorUserId);
    const date = getLocalDateString();
    if (await Attendance.exists({ employeeId, date })) {
      throw new AppError(409, 'Already checked in today.');
    }
    const settings = await getSettings();
    const now = new Date();
    const lateMinutes = Math.max(0, getLocalMinutes(now) - parseHHMM(settings.officeStart) - settings.graceMinutes);
    try {
      return await Attendance.create({
        employeeId,
        date,
        checkInAt: now,
        status: lateMinutes > 0 ? 'late' : 'present',
        lateMinutes,
        source: 'web',
        ...(location ? { location } : {}),
      });
    } catch (error) {
      if (error.code === 11000) throw new AppError(409, 'Already checked in today.');
      throw error;
    }
  },

  async checkOut(actorUserId) {
    const employeeId = await getEmployeeForUser(actorUserId);
    const date = getLocalDateString();
    const record = await Attendance.findOne({ employeeId, date });
    if (!record) throw new AppError(404, 'No check-in found for today.');
    if (record.checkOutAt) throw new AppError(409, 'Already checked out today.');
    const settings = await getSettings();
    record.checkOutAt = new Date();
    record.workedMinutes = minutesBetween(record.checkInAt, record.checkOutAt);
    record.status = computeAttendanceStatus(record, settings);
    await record.save();
    return record;
  },

  async getMyToday(actorUserId) {
    const employeeId = await getEmployeeForUser(actorUserId);
    const date = getLocalDateString();
    const record = await Attendance.findOne({ employeeId, date });
    const nextAction = !record ? 'check_in' : record.checkOutAt ? 'done' : 'check_out';
    return { record, nextAction, date };
  },

  async getMyAttendance(actorUserId, { from, to }) {
    const employeeId = await getEmployeeForUser(actorUserId);
    const date = getLocalDateString();
    const start = from || `${date.slice(0, 7)}-01`;
    const end = to || date;
    if (start > end) throw new AppError(422, 'From date must be on or before to date.');
    await this.autoFinalizeStaleRecords(date);
    const records = await Attendance.find({ employeeId, date: { $gte: start, $lte: end } }).sort({ date: -1 });
    const summary = { present: 0, late: 0, halfDay: 0, missingCheckout: 0, absent: 0, onLeave: 0 };
    for (const record of records) {
      if (record.status === 'half_day') summary.halfDay += 1;
      else if (record.status === 'missing_checkout') summary.missingCheckout += 1;
      else if (record.status === 'on_leave') summary.onLeave += 1;
      else if (record.status === 'absent') summary.absent += 1;
      else if (record.status === 'late') summary.late += 1;
      else if (record.status === 'present') summary.present += 1;
    }
    const settings = await getSettings();
    const recordsByDate = new Set(records.map((record) => record.date));
    const finalDate = end < date ? end : date;
    const cursor = new Date(`${start}T12:00:00.000Z`);
    const last = new Date(`${finalDate}T12:00:00.000Z`);
    while (cursor <= last) {
      const localDate = cursor.toISOString().slice(0, 10);
      if (!recordsByDate.has(localDate) && !isWeekend(localDate, settings.weekendDays)) summary.absent += 1;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return { records, summary, from: start, to: end };
  },

  async getBoard({ date = getLocalDateString(), departmentId, q, status, page = 1, limit = 50 }, actor) {
    if (!['admin', 'hr'].includes(actor.role)) throw new AppError(403, 'Attendance board access is restricted.');
    const today = getLocalDateString();
    await this.autoFinalizeStaleRecords(today);

    const filter = { status: { $in: ['active', 'probation'] } };
    if (departmentId) filter.departmentId = departmentId;
    if (q) {
      const expression = searchRegex(q);
      filter.$or = [{ firstName: expression }, { lastName: expression }, { employeeCode: expression }, { email: expression }];
    }
    const employees = await Employee.find(filter)
      .populate('departmentId', 'name')
      .populate('designationId', 'name')
      .sort({ lastName: 1, firstName: 1 });
    const attendance = await Attendance.find({ date, employeeId: { $in: employees.map((employee) => employee._id) } });
    const attendanceMap = new Map(attendance.map((record) => [record.employeeId.toString(), record]));
    const settings = await getSettings();
    const isFuture = date > today;
    const isToday = date === today;
    const beforeEndOfDay = isToday && getLocalMinutes(new Date()) < 24 * 60 - 1;
    const items = employees.map((employee) => {
      const record = attendanceMap.get(employee._id.toString());
      let displayStatus;
      if (record) displayStatus = record.status;
      else if (isFuture) displayStatus = 'scheduled';
      else if (isToday && beforeEndOfDay) displayStatus = 'not_checked_in';
      else displayStatus = 'absent';
      return {
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        departmentName: employee.departmentId?.name || '',
        designationName: employee.designationId?.name || '',
        status: displayStatus,
        checkInAt: record?.checkInAt || null,
        checkOutAt: record?.checkOutAt || null,
        lateMinutes: record?.lateMinutes || 0,
        workedMinutes: record?.workedMinutes || 0,
        recordId: record?._id || null,
      };
    });
    const totals = {
      present: 0, late: 0, halfDay: 0, absent: 0, missingCheckout: 0, notCheckedIn: 0,
    };
    const totalKeys = {
      present: 'present',
      late: 'late',
      half_day: 'halfDay',
      absent: 'absent',
      missing_checkout: 'missingCheckout',
      not_checked_in: 'notCheckedIn',
    };
    for (const item of items) if (totalKeys[item.status]) totals[totalKeys[item.status]] += 1;

    const filtered = status ? items.filter((item) => item.status === status) : items;
    const total = filtered.length;
    const paged = filtered.slice((page - 1) * limit, page * limit);
    return { items: paged, totals, page, pages: Math.ceil(total / limit), total, date };
  },

  async requestCorrection(actorUserId, { date, requestType, reason }) {
    const employeeId = await getEmployeeForUser(actorUserId);
    const today = getLocalDateString();
    if (date > today) throw new AppError(422, 'Correction date cannot be in the future.');
    const existing = await AttendanceCorrection.exists({ employeeId, date, status: 'pending' });
    if (existing) throw new AppError(409, 'A correction request for this date is already pending.');
    return AttendanceCorrection.create({
      employeeId,
      date,
      requestType,
      reason,
      requestedByUserId: actorUserId,
    });
  },

  async listCorrections({ status, page = 1, limit = 50 }, actor) {
    const filter = {};
    if (status) filter.status = status;
    if (actor.role === 'employee') {
      const employeeId = await getEmployeeForUser(actor.id);
      filter.employeeId = employeeId;
    } else if (!['admin', 'hr'].includes(actor.role)) {
      throw new AppError(403, 'Correction request access is restricted.');
    }
    const [items, total] = await Promise.all([
      AttendanceCorrection.find(filter)
        .populate('employeeId', 'employeeCode firstName lastName')
        .populate('requestedByUserId', 'name email')
        .populate('reviewedByUserId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AttendanceCorrection.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async reviewCorrection(correctionId, actorUserId, { decision, comment = '' }) {
    const correction = await AttendanceCorrection.findById(correctionId);
    if (!correction) throw new AppError(404, 'Correction request not found.');
    if (correction.status !== 'pending') throw new AppError(409, 'Correction request has already been reviewed.');
    if (decision === 'reject' && !comment.trim()) throw new AppError(422, 'A comment is required to reject a correction.');
    if (decision === 'approve') await applyCorrection(correction, actorUserId);
    correction.status = decision === 'approve' ? 'approved' : 'rejected';
    correction.reviewedByUserId = actorUserId;
    correction.reviewedAt = new Date();
    correction.reviewComment = comment.trim();
    await correction.save();
    return correction;
  },

  async autoFinalizeStaleRecords(today = getLocalDateString()) {
    await Attendance.updateMany(
      { date: { $lt: today }, checkInAt: { $exists: true }, checkOutAt: { $exists: false }, status: { $nin: ['absent', 'on_leave'] } },
      { $set: { status: 'missing_checkout' } },
    );
  },
};
