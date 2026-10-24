import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import AppError from '../utils/errors.js';

export const notificationService = {
  create(userId, payload) {
    return Notification.create({ userId, ...payload });
  },

  async createMany(userIds, payload) {
    const uniqueIds = [...new Set((userIds || []).filter(Boolean).map(String))];
    if (!uniqueIds.length) return [];
    return Notification.insertMany(uniqueIds.map((userId) => ({ userId, ...payload })));
  },

  async listMine(userId, { unreadOnly = false, page = 1, limit = 20 } = {}) {
    const filter = { userId };
    if (unreadOnly) filter.read = false;
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Notification.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  },

  async markRead(userId, notifId) {
    if (!mongoose.isValidObjectId(notifId)) throw new AppError(404, 'Notification not found.');
    const notification = await Notification.findOneAndUpdate(
      { _id: notifId, userId },
      { read: true },
      { new: true },
    );
    if (!notification) throw new AppError(404, 'Notification not found.');
    return notification;
  },

  async markAllRead(userId) {
    const result = await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    return { updated: result.modifiedCount };
  },

  unreadCount(userId) {
    return Notification.countDocuments({ userId, read: false });
  },
};
