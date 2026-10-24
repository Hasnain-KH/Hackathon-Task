import CompanySettings from '../models/CompanySettings.js';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Holiday from '../models/Holiday.js';
import LeaveType from '../models/LeaveType.js';
import AppError from '../utils/errors.js';

function handleDuplicate(error, resource) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    throw new AppError(409, `${resource} with this ${field || 'value'} already exists.`);
  }
  throw error;
}

async function saveUnique(operation, resource) {
  try {
    return await operation();
  } catch (error) {
    handleDuplicate(error, resource);
  }
}

function listResult(items, total, page, limit) {
  return { items, total, page, pages: Math.ceil(total / limit) };
}

function searchExpression(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

async function findAndUpdate(Model, id, patch, resource) {
  const result = await saveUnique(
    () => Model.findByIdAndUpdate(id, patch, { new: true, runValidators: true }),
    resource,
  );
  if (!result) throw new AppError(404, `${resource} not found.`);
  return result;
}

export const orgService = {
  async getCompanySettings() {
    const settings = await CompanySettings.getSingleton();
    if (!settings) throw new AppError(404, 'Company settings not found.');
    return settings;
  },

  async updateCompanySettings(patch) {
    const allowed = [
      'companyName', 'officeStart', 'graceMinutes', 'halfDayThresholdHours', 'weekendDays',
      'officeLat', 'officeLng', 'officeRadiusMeters',
    ];
    const settings = await CompanySettings.getSingleton();
    if (!settings) throw new AppError(404, 'Company settings not found.');
    for (const key of allowed) {
      if (Object.hasOwn(patch, key)) settings[key] = patch[key];
    }
    await settings.save();
    return settings;
  },

  async listDepartments({ q = '', page = 1, limit = 100, isActive }) {
    const filter = {};
    if (q) filter.$or = [{ name: searchExpression(q) }, { code: searchExpression(q) }];
    if (isActive !== undefined) filter.isActive = isActive;
    const [items, total] = await Promise.all([
      Department.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
      Department.countDocuments(filter),
    ]);
    return listResult(items, total, page, limit);
  },
  createDepartment(data) {
    return saveUnique(() => Department.create(data), 'Department');
  },
  updateDepartment(id, data) {
    return findAndUpdate(Department, id, data, 'Department');
  },
  async deactivateDepartment(id) {
    const department = await Department.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!department) throw new AppError(404, 'Department not found.');
    return department;
  },

  async listDesignations({ departmentId, q = '', page = 1, limit = 100 }) {
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;
    if (q) filter.name = searchExpression(q);
    const [items, total] = await Promise.all([
      Designation.find(filter).populate('departmentId', 'name code').sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
      Designation.countDocuments(filter),
    ]);
    return listResult(items, total, page, limit);
  },
  createDesignation(data) {
    return saveUnique(async () => {
      if (!(await Department.exists({ _id: data.departmentId }))) throw new AppError(404, 'Department not found.');
      return Designation.create(data);
    }, 'Designation');
  },
  updateDesignation(id, data) {
    return (async () => {
      if (data.departmentId && !(await Department.exists({ _id: data.departmentId }))) {
        throw new AppError(404, 'Department not found.');
      }
      return findAndUpdate(Designation, id, data, 'Designation');
    })();
  },
  async deactivateDesignation(id) {
    const result = await Designation.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!result) throw new AppError(404, 'Designation not found.');
    return result;
  },

  async listLeaveTypes({ q = '', page = 1, limit = 100 }) {
    const filter = q ? { $or: [{ name: searchExpression(q) }, { code: searchExpression(q) }] } : {};
    const [items, total] = await Promise.all([
      LeaveType.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
      LeaveType.countDocuments(filter),
    ]);
    return listResult(items, total, page, limit);
  },
  createLeaveType(data) {
    return saveUnique(() => LeaveType.create(data), 'Leave type');
  },
  updateLeaveType(id, data) {
    return findAndUpdate(LeaveType, id, data, 'Leave type');
  },
  async deactivateLeaveType(id) {
    const result = await LeaveType.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!result) throw new AppError(404, 'Leave type not found.');
    return result;
  },

  async listHolidays({ year, page = 1, limit = 100 }) {
    const filter = {};
    if (year) {
      filter.date = { $gte: new Date(`${year}-01-01T00:00:00.000Z`), $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`) };
    }
    const [items, total] = await Promise.all([
      Holiday.find(filter).sort({ date: 1 }).skip((page - 1) * limit).limit(limit),
      Holiday.countDocuments(filter),
    ]);
    return listResult(items, total, page, limit);
  },
  createHoliday(data) {
    return saveUnique(() => Holiday.create({ ...data, date: new Date(`${data.date.slice(0, 10)}T00:00:00.000Z`) }), 'Holiday');
  },
  updateHoliday(id, data) {
    const patch = { ...data };
    if (patch.date) patch.date = new Date(`${patch.date.slice(0, 10)}T00:00:00.000Z`);
    return findAndUpdate(Holiday, id, patch, 'Holiday');
  },
  async deleteHoliday(id) {
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) throw new AppError(404, 'Holiday not found.');
    return holiday;
  },
};
