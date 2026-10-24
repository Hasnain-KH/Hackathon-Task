import { Router } from 'express';
import authRoutes from './auth.routes.js';
import attendanceRoutes from './attendance.routes.js';
import employeeRoutes from './employee.routes.js';
import orgRoutes from './org.routes.js';
import setupRoutes from './setup.routes.js';
import usersRoutes from './users.routes.js';
import leaveRoutes from './leave.routes.js';
import payrollRoutes from './payroll.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import aiRoutes from './ai.routes.js';
import announcementsRoutes from './announcements.routes.js';
import notificationsRoutes from './notifications.routes.js';
import auditRoutes from './audit.routes.js';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ ok: connected, database: connected ? 'connected' : 'disconnected', ts: Date.now() });
});
router.use('/setup', setupRoutes);
router.use('/auth', authRoutes);
router.use(orgRoutes);
router.use('/users', usersRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);
router.use('/announcements', announcementsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/audit', auditRoutes);

export default router;
