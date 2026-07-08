import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/stats', adminController.getDashboardStats);
router.get('/students', adminController.listStudents);
router.delete('/students/:id', adminController.deleteStudent);
router.get('/payments', adminController.listPayments);
router.post('/payments/:id/approve', adminController.approvePayment);
router.post('/payments/:id/reject', adminController.rejectPayment);

router.get('/support', adminController.getSupportRequests);
router.post('/support/:id/resolve', adminController.resolveSupportRequest);

export default router;
