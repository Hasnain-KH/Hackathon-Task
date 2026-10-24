import { randomInt } from 'node:crypto';
import Department from '../models/Department.js';
import Designation from '../models/Designation.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import AppError from '../utils/errors.js';

const employeeWritableFields = [
  'firstName', 'lastName', 'email', 'phone', 'address', 'gender', 'dateOfBirth',
  'dateOfJoining', 'employmentType', 'status', 'departmentId', 'designationId',
  'reportingTo', 'salary',
];
const allowanceFields = ['hra', 'medical', 'transport', 'other'];
const employeeCodePattern = /^[A-Z0-9]{3,12}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const employmentTypes = ['full_time', 'part_time', 'contract', 'intern'];
const genders = ['male', 'female', 'other', 'prefer_not_to_say'];
const passwordCharacters = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
const csvHeaders = [
  'employeeCode', 'firstName', 'lastName', 'email', 'phone', 'dateOfJoining', 'employmentType',
  'departmentCode', 'designationName', 'basic', 'hra', 'medical', 'transport', 'other',
];
const searchRegex = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

function createTemporaryPassword() {
  return Array.from({ length: 10 }, () => passwordCharacters[randomInt(passwordCharacters.length)]).join('');
}

function duplicateError(error) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    const message = field === 'employeeCode'
      ? 'Employee code already exists.'
      : field === 'email'
        ? 'An employee login already exists for this email.'
        : 'Employee record conflicts with an existing record.';
    throw new AppError(409, message);
  }
  throw error;
}

function pickEmployeeFields(payload) {
  return Object.fromEntries(employeeWritableFields
    .filter((field) => Object.hasOwn(payload, field))
    .map((field) => [field, payload[field]]));
}

function csvParse(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (quoted) throw new AppError(422, 'CSV contains an unterminated quoted field.');
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function dateValue(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function validateCsvRows(csvText) {
  let rawRows;
  try {
    rawRows = csvParse(csvText);
  } catch (error) {
    return { total: 0, valid: 0, invalid: 1, rows: [{ rowNumber: 1, errors: [{ field: 'csv', message: error.message }], data: null }] };
  }

  if (rawRows.length < 2) {
    return {
      total: 0,
      valid: 0,
      invalid: 1,
      rows: [{ rowNumber: 1, errors: [{ field: 'csv', message: 'CSV must include a header and at least one employee row.' }], data: null }],
    };
  }

  const headers = rawRows[0].map((value) => value.trim().replace(/^\uFEFF/, ''));
  const missingHeaders = csvHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return {
      total: 0,
      valid: 0,
      invalid: 1,
      rows: [{ rowNumber: 1, errors: missingHeaders.map((field) => ({ field, message: `Missing required header: ${field}.` })), data: null }],
    };
  }

  const seenCodes = new Set();
  const seenEmails = new Set();
  const candidates = rawRows.slice(1).map((values, rowIndex) => {
    const source = Object.fromEntries(headers.map((header, index) => [header, (values[index] || '').trim()]));
    const errors = [];
    const addError = (field, message) => errors.push({ field, message });
    const employeeCode = source.employeeCode.toUpperCase();
    const email = source.email.toLowerCase();

    if (!employeeCodePattern.test(employeeCode)) addError('employeeCode', 'Use 3-12 alphanumeric characters.');
    if (!source.firstName) addError('firstName', 'First name is required.');
    if (!source.lastName) addError('lastName', 'Last name is required.');
    if (!emailPattern.test(email)) addError('email', 'Enter a valid email.');
    const joiningDate = dateValue(source.dateOfJoining);
    if (!source.dateOfJoining || !/^\d{4}-\d{2}-\d{2}$/.test(source.dateOfJoining) || !joiningDate || joiningDate.toISOString().slice(0, 10) !== source.dateOfJoining) {
      addError('dateOfJoining', 'Use a valid date in YYYY-MM-DD format.');
    }
    if (!employmentTypes.includes(source.employmentType)) addError('employmentType', 'Employment type is invalid.');
    for (const field of ['basic', ...allowanceFields]) {
      const value = Number(source[field]);
      if (source[field] === '' || !Number.isFinite(value) || value < (field === 'basic' ? 1 : 0)) {
        addError(field, field === 'basic' ? 'Basic salary must be at least 1.' : 'Allowance must be zero or greater.');
      }
    }
    if (seenCodes.has(employeeCode)) addError('employeeCode', 'Duplicate employee code in this CSV.');
    if (seenEmails.has(email)) addError('email', 'Duplicate email in this CSV.');
    seenCodes.add(employeeCode);
    seenEmails.add(email);

    return {
      rowNumber: rowIndex + 2,
      errors,
      source,
      data: {
        employeeCode,
        firstName: source.firstName,
        lastName: source.lastName,
        email,
        phone: source.phone,
        dateOfJoining: source.dateOfJoining,
        employmentType: source.employmentType,
        departmentCode: source.departmentCode.toUpperCase(),
        designationName: source.designationName,
        salary: Object.fromEntries(['basic', ...allowanceFields].map((field) => [field, Number(source[field])])),
      },
    };
  });

  const codes = candidates.map((candidate) => candidate.data.employeeCode);
  const emails = candidates.map((candidate) => candidate.data.email);
  const departmentCodes = [...new Set(candidates.map((candidate) => candidate.data.departmentCode))];
  const designationNames = [...new Set(candidates.map((candidate) => candidate.data.designationName))];
  const designationNameExpressions = designationNames.map((name) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));
  const [existingEmployees, existingUsers, departments, designations] = await Promise.all([
    Employee.find({ $or: [{ employeeCode: { $in: codes } }, { email: { $in: emails } }] }).select('employeeCode email'),
    User.find({ email: { $in: emails } }).select('email'),
    Department.find({ code: { $in: departmentCodes }, isActive: true }).select('_id code'),
    Designation.find({ name: { $in: designationNameExpressions }, isActive: true }).populate('departmentId', 'code').select('name departmentId'),
  ]);
  const departmentMap = new Map(departments.map((department) => [department.code, department]));
  const designationMap = new Map(designations.map((designation) => [`${designation.name.toLowerCase()}|${designation.departmentId?.code}`, designation]));
  const existingCodeSet = new Set(existingEmployees.map((employee) => employee.employeeCode));
  const existingEmailSet = new Set([
    ...existingEmployees.map((employee) => employee.email.toLowerCase()),
    ...existingUsers.map((user) => user.email.toLowerCase()),
  ]);

  for (const candidate of candidates) {
    if (existingCodeSet.has(candidate.data.employeeCode)) {
      candidate.errors.push({ field: 'employeeCode', message: 'Employee code already exists.' });
    }
    if (existingEmailSet.has(candidate.data.email)) {
      candidate.errors.push({ field: 'email', message: 'Email is already used by an account or employee.' });
    }
    const department = departmentMap.get(candidate.data.departmentCode);
    if (!department) {
      candidate.errors.push({ field: 'departmentCode', message: 'Active department code was not found.' });
    }
    if (!candidate.data.designationName) {
      candidate.errors.push({ field: 'designationName', message: 'Designation name is required.' });
    } else if (department && !designationMap.has(`${candidate.data.designationName.toLowerCase()}|${candidate.data.departmentCode}`)) {
      candidate.errors.push({ field: 'designationName', message: 'Active designation was not found for this department.' });
    }
    candidate.data.departmentId = department?._id;
    candidate.data.designationId = designationMap.get(`${candidate.data.designationName.toLowerCase()}|${candidate.data.departmentCode}`)?._id;
  }

  const rows = candidates.map(({ rowNumber, errors, data }) => ({ rowNumber, errors, data }));
  const valid = rows.filter((row) => row.errors.length === 0).length;
  return { total: candidates.length, valid, invalid: candidates.length - valid, rows };
}

async function createEmployeeRecord(payload, actorUserId) {
  const department = await Department.findOne({ _id: payload.departmentId, isActive: true });
  const designation = await Designation.findOne({
    _id: payload.designationId,
    departmentId: payload.departmentId,
    isActive: true,
  });
  if (!department) throw new AppError(422, 'Select an active department.');
  if (!designation) throw new AppError(422, 'Select an active designation belonging to the department.');

  const email = payload.email.toLowerCase();
  if (await User.exists({ email }) || await Employee.exists({ email })) {
    throw new AppError(409, 'Email is already used by an account or employee.');
  }
  if (await Employee.exists({ employeeCode: payload.employeeCode.toUpperCase() })) {
    throw new AppError(409, 'Employee code already exists.');
  }

  const employeeData = pickEmployeeFields({ ...payload, employeeCode: payload.employeeCode.toUpperCase(), email });
  employeeData.createdBy = actorUserId;
  let employee;
  let user;
  try {
    employee = await Employee.create(employeeData);
    const password = payload.tempPassword || createTemporaryPassword();
    user = await User.create({
      name: `${employee.firstName} ${employee.lastName}`,
      email,
      passwordHash: password,
      role: 'employee',
      mustChangePassword: true,
      employeeRef: employee._id,
      isActive: true,
    });
    employee.userRef = user._id;
    await employee.save();
    return { employee, tempPassword: password };
  } catch (error) {
    if (user) await User.deleteOne({ _id: user._id });
    if (employee) await Employee.deleteOne({ _id: employee._id });
    duplicateError(error);
  }
}

function populateEmployee(query) {
  return query.populate('departmentId', 'name code').populate('designationId', 'name level').populate('reportingTo', 'employeeCode firstName lastName');
}

export const employeeService = {
  createEmployee: createEmployeeRecord,

  async listEmployees({ q, departmentId, designationId, status, employmentType, page = 1, limit = 20, actor }) {
    const filter = {};
    if (actor.role === 'employee') {
      if (!actor.employeeId) return { items: [], total: 0, page, pages: 0 };
      filter._id = actor.employeeId;
    }
    if (q) {
      const expression = searchRegex(q);
      filter.$or = [{ firstName: expression }, { lastName: expression }, { email: expression }, { employeeCode: expression }];
    }
    if (departmentId) filter.departmentId = departmentId;
    if (designationId) filter.designationId = designationId;
    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;
    const [items, total] = await Promise.all([
      populateEmployee(Employee.find(filter)).sort({ lastName: 1, firstName: 1 }).skip((page - 1) * limit).limit(limit),
      Employee.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async getEmployeeById(id, actor) {
    if (actor.role === 'employee' && id !== actor.employeeId) {
      throw new AppError(403, 'You may only view your own employee profile.');
    }
    const employee = await populateEmployee(Employee.findById(id));
    if (!employee) throw new AppError(404, 'Employee not found.');
    return employee;
  },

  async getSelfProfile(actor) {
    if (!actor.employeeId) throw new AppError(404, 'Employee profile not found.');
    return this.getEmployeeById(actor.employeeId, actor);
  },

  async updateEmployee(id, patch, actor) {
    let employee;
    if (actor.role === 'employee') {
      if (id !== actor.employeeId) throw new AppError(403, 'You may only update your own profile.');
      const disallowed = Object.keys(patch).filter((key) => !['phone', 'address'].includes(key));
      if (disallowed.length) throw new AppError(403, 'Employees may only update phone and address.');
      employee = await Employee.findById(id);
      if (!employee) throw new AppError(404, 'Employee not found.');
      for (const key of ['phone', 'address']) if (Object.hasOwn(patch, key)) employee[key] = patch[key];
      await employee.save();
      return this.getEmployeeById(id, actor);
    }

    if (Object.hasOwn(patch, 'employeeCode') || Object.hasOwn(patch, 'userRef') || Object.hasOwn(patch, 'createdBy')) {
      throw new AppError(422, 'Employee code and account links cannot be changed.');
    }
    employee = await Employee.findById(id);
    if (!employee) throw new AppError(404, 'Employee not found.');

    const sanitizedPatch = pickEmployeeFields(patch);
    if (sanitizedPatch.departmentId || sanitizedPatch.designationId) {
      const departmentId = sanitizedPatch.departmentId || employee.departmentId;
      const designationId = sanitizedPatch.designationId || employee.designationId;
      const [department, designation] = await Promise.all([
        Department.findOne({ _id: departmentId, isActive: true }),
        Designation.findOne({ _id: designationId, departmentId, isActive: true }),
      ]);
      if (!department) throw new AppError(422, 'Select an active department.');
      if (!designation) throw new AppError(422, 'Select an active designation belonging to the department.');
    }
    if (sanitizedPatch.email) {
      const email = sanitizedPatch.email.toLowerCase();
      const emailConflict = await Promise.all([
        Employee.exists({ email, _id: { $ne: employee._id } }),
        User.exists({ email, _id: { $ne: employee.userRef } }),
      ]);
      if (emailConflict.some(Boolean)) throw new AppError(409, 'Email is already used by an account or employee.');
      sanitizedPatch.email = email;
    }
    if (sanitizedPatch.salary) {
      sanitizedPatch.salary = { ...employee.salary.toObject(), ...sanitizedPatch.salary };
    }
    const previousEmail = employee.email;
    let linkedUserEmailUpdated = false;
    try {
      if (sanitizedPatch.email && employee.userRef) {
        const linkedUser = await User.findByIdAndUpdate(
          employee.userRef,
          { email: sanitizedPatch.email },
          { new: true, runValidators: true },
        );
        if (!linkedUser) throw new AppError(404, 'Employee login account not found.');
        linkedUserEmailUpdated = true;
      }
      Object.assign(employee, sanitizedPatch);
      await employee.save();
      if (employee.status === 'terminated' && employee.userRef) {
        await User.findByIdAndUpdate(employee.userRef, { isActive: false });
      }
    } catch (error) {
      if (linkedUserEmailUpdated) await User.findByIdAndUpdate(employee.userRef, { email: previousEmail });
      duplicateError(error);
    }
    return this.getEmployeeById(id, actor);
  },

  async softDeleteEmployee(id) {
    const employee = await Employee.findById(id);
    if (!employee) throw new AppError(404, 'Employee not found.');
    employee.status = 'terminated';
    await employee.save();
    if (employee.userRef) await User.findByIdAndUpdate(employee.userRef, { isActive: false });
    return employee;
  },

  async csvDryRun(csvText) {
    return validateCsvRows(csvText);
  },

  async csvCommit(csvText, actorUserId) {
    const report = await validateCsvRows(csvText);
    if (report.invalid > 0) {
      const error = new AppError(422, 'CSV contains invalid rows. Review the dry-run report.');
      error.report = report;
      throw error;
    }
    const created = [];
    const tempPasswords = [];
    try {
      for (const row of report.rows) {
        const payload = {
          ...row.data,
          dateOfJoining: new Date(`${row.data.dateOfJoining}T00:00:00.000Z`),
        };
        const result = await createEmployeeRecord(payload, actorUserId);
        created.push({ employeeId: result.employee._id, userId: result.employee.userRef });
        tempPasswords.push({ employeeCode: result.employee.employeeCode, tempPassword: result.tempPassword });
      }
    } catch (error) {
      for (const record of created) {
        await User.deleteOne({ _id: record.userId });
        await Employee.deleteOne({ _id: record.employeeId });
      }
      throw error;
    }
    return { created: created.length, tempPasswords };
  },

  async csvExport(filters) {
    const { items } = await this.listEmployees({ ...filters, page: 1, limit: 10000, actor: { role: 'hr' } });
    const headers = [
      'employeeCode', 'firstName', 'lastName', 'email', 'phone', 'dateOfJoining', 'employmentType',
      'departmentCode', 'designationName', 'basic', ...allowanceFields,
    ];
    const lines = items.map((employee) => [
      employee.employeeCode,
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.phone,
      employee.dateOfJoining.toISOString().slice(0, 10),
      employee.employmentType,
      employee.departmentId?.code || '',
      employee.designationId?.name || '',
      employee.salary.basic,
      ...allowanceFields.map((field) => employee.salary[field]),
    ].map(csvEscape).join(','));
    return [headers.join(','), ...lines].join('\r\n');
  },
};

export { csvHeaders };
