import { Router } from 'express';
import { body } from 'express-validator';
import CompanySettings from '../models/CompanySettings.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/errors.js';
import { signToken } from '../utils/token.js';
import validateRequest from '../utils/validateRequest.js';

const router = Router();

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const settings = await CompanySettings.getSingleton();
    res.json({ initialized: Boolean(settings) });
  }),
);

router.post(
  '/init',
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required.'),
    body('adminName').trim().notEmpty().withMessage('Admin name is required.'),
    body('adminEmail').trim().isEmail().withMessage('Enter a valid admin email.').normalizeEmail(),
    body('adminPassword')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Admin password must be at least 8 characters.'),
    validateRequest,
  ],
  asyncHandler(async (req, res) => {
    const { companyName, adminName, adminEmail, adminPassword } = req.body;

    if (await CompanySettings.getSingleton()) {
      throw new AppError(409, 'Company setup has already been completed.');
    }

    try {
      await CompanySettings.create({ companyName });
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError(409, 'Company setup has already been completed.');
      }
      throw error;
    }

    let admin;
    try {
      admin = await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash: adminPassword,
        role: 'admin',
        mustChangePassword: false,
      });
    } catch (error) {
      await CompanySettings.deleteOne({ _id: 'company_settings' });
      if (error.code === 11000) {
        throw new AppError(409, 'An account already exists for this email.');
      }
      throw error;
    }

    res.status(201).json({
      token: signToken(admin),
      user: { id: admin._id.toString(), name: admin.name, email: admin.email, role: admin.role },
    });
  }),
);

export default router;
