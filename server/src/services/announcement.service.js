import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import { auditService } from './audit.service.js';
import { notificationService } from './notification.service.js';
import AppError from '../utils/errors.js';

function warn(error) {
  console.warn('Announcement notification failed:', error.message);
}

export const announcementService = {
  async create(payload, actorUserId, req) {
    const announcement = await Announcement.create({ ...payload, postedByUserId: actorUserId });
    await auditService.log(req, { action: 'CREATE', entity: 'Announcement', entityId: announcement._id, after: announcement });
    try {
      const audienceRoles = announcement.audience === 'all' ? ['admin', 'hr', 'employee'] : [announcement.audience];
      const users = await User.find({ role: { $in: audienceRoles }, isActive: true }).select('_id role');
      await Promise.all(['admin', 'hr', 'employee'].map((role) => notificationService.createMany(
        users.filter((user) => user.role === role).map(({ _id }) => _id),
        {
          type: 'announcement',
          title: announcement.title,
          body: announcement.body,
          link: `/${role}/announcements`,
          meta: { announcementId: announcement._id },
        },
      )));
    } catch (error) {
      warn(error);
    }
    return announcement;
  },

  async listFor(userRole, { page = 1, limit = 20 } = {}) {
    const filter = { audience: { $in: ['all', userRole] } };
    const [items, total] = await Promise.all([
      Announcement.find(filter).populate('postedByUserId', 'name').sort({ pinned: -1, createdAt: -1 })
        .skip((page - 1) * limit).limit(limit),
      Announcement.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async remove(id, req) {
    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) throw new AppError(404, 'Announcement not found.');
    await auditService.log(req, { action: 'DELETE', entity: 'Announcement', entityId: announcement._id, before: announcement });
    return announcement;
  },
};
