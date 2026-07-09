import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { scheduleFileUpload } from '../middleware/upload.js';
import * as adminController from '../controllers/admin.controller.js';
import * as scheduleController from '../controllers/schedule.controller.js';

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

router.get('/schedule', scheduleController.listAdminSchedules);
router.post(
  '/schedule',
  (req, res, next) => {
    scheduleFileUpload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message || 'File upload failed.' });
        return;
      }
      next();
    });
  },
  scheduleController.uploadSchedule
);
router.delete('/schedule/:id', scheduleController.deleteSchedule);

export default router;
