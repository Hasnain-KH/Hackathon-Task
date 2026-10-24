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

const router = Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
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

export default router;
