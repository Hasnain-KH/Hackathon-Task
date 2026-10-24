import { Router } from 'express';
import { body } from 'express-validator';
import User from '../models/User.js';
import { requireRole, verifyToken } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/errors.js';
import { hrUserCreate, resetPassword, userIdParam, userList } from '../validators/org.validators.js';

const router = Router();
router.use(verifyToken, requireRole('admin'));

router.post(
  '/hr',
  hrUserCreate,
  validate,
  asyncHandler(async (req, res) => {
    try {
      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        passwordHash: req.body.tempPassword,
        role: 'hr',
        mustChangePassword: true,
        isActive: true,
      });
      res.status(201).json({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: true,
      });
    } catch (error) {
      if (error.code === 11000) throw new AppError(409, 'An account already exists for this email.');
      throw error;
    }
  }),
);

router.get(
  '/',
  userList,
  validate,
  asyncHandler(async (req, res) => {
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const filter = { role: req.query.role || { $in: ['hr', 'employee'] } };
    if (req.query.q) {
      const expression = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: expression }, { email: expression }];
    }
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive;

    const [items, total] = await Promise.all([
      User.find(filter).select('-passwordHash').sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  }),
);

router.patch(
  '/:id/toggle-active',
  userIdParam,
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, 'User not found.');
    if (user.role === 'admin') throw new AppError(403, 'Administrator accounts cannot be changed here.');
    user.isActive = !user.isActive;
    await user.save();
    res.json({ data: user });
  }),
);

router.patch(
  '/:id/reset-password',
  resetPassword,
  validate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, 'User not found.');
    if (user.role === 'admin') throw new AppError(403, 'Administrator passwords cannot be reset here.');
    user.passwordHash = req.body.tempPassword;
    user.mustChangePassword = true;
    await user.save();
    res.json({ data: { id: user._id.toString(), mustChangePassword: true } });
  }),
);

export default router;
