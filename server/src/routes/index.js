import { Router } from 'express';
import authRoutes from './auth.routes.js';
import attendanceRoutes from './attendance.routes.js';
import employeeRoutes from './employee.routes.js';
import orgRoutes from './org.routes.js';
import setupRoutes from './setup.routes.js';
import usersRoutes from './users.routes.js';

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

export default router;
