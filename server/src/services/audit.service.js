import AuditLog from '../models/AuditLog.js';

const sensitiveKeys = new Set([
  'password', 'passwordhash', 'currentpassword', 'newpassword', 'temppassword',
  'token', 'accesstoken', 'refreshtoken', 'apikey', 'authorization', 'secret',
]);

function sanitize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value?.toObject === 'function') return sanitize(value.toObject());
  if (value?._bsontype === 'ObjectId') return value.toString();
  if (typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitiveKeys.has(key.toLowerCase().replace(/[_-]/g, '')))
      .map(([key, item]) => [key, sanitize(item)]),
  );
}

function warn(error) {
  console.warn('Audit log write failed:', error.message);
}

export const auditService = {
  async log(req, { action, entity, entityId, before, after, meta }) {
    try {
      return await AuditLog.create({
        actorUserId: req?.user?.id || null,
        actorRole: req?.user?.role || '',
        action,
        entity,
        entityId: entityId || undefined,
        before: sanitize(before),
        after: sanitize(after),
        meta: sanitize(meta),
        ip: req?.auditMeta?.ip || req?.ip || '',
        userAgent: req?.auditMeta?.userAgent || req?.headers?.['user-agent'] || '',
      });
    } catch (error) {
      warn(error);
      return null;
    }
  },

  async list({ action, entity, from, to, actorUserId, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (action) filter.action = action;
    if (entity) filter.entity = entity;
    if (actorUserId) filter.actorUserId = actorUserId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00.000Z`);
      if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
    }
    const [items, total] = await Promise.all([
      AuditLog.find(filter).populate('actorUserId', 'name email role')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },
};
