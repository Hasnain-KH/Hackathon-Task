import { Router } from 'express';
import { body } from 'express-validator';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/errors.js';
import { signToken } from '../utils/token.js';
import validateRequest from '../utils/validateRequest.js';
import { auditService } from '../services/audit.service.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Enter a valid email.').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password is required.'),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !user.isActive || !(await user.comparePassword(req.body.password))) {
      throw new AppError(401, 'Invalid email or password.');
    }

    user.lastLoginAt = new Date();
    await user.save();
    await auditService.log(req, { action: 'LOGIN', entity: 'User', entityId: user._id, after: { lastLoginAt: user.lastLoginAt } });
    res.json({ token: signToken(user), user });
  }),
);

router.get(
  '/me',
  verifyToken,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError(401, 'Authentication required.');
    }
    res.json({ user });
  }),
);

router.post(
  '/change-password',
  verifyToken,
  [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isString()
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters.'),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user || !(await user.comparePassword(req.body.currentPassword))) {
      throw new AppError(400, 'Current password is incorrect.');
    }

    user.passwordHash = req.body.newPassword;
    user.mustChangePassword = false;
    await user.save();
    res.json({ ok: true });
  }),
);

router.post(
  '/logout',
  [body().custom((_, { req }) => !req.body || Object.keys(req.body).length === 0), validateRequest],
  (req, res) => res.json({ ok: true }),
);

export default router;
