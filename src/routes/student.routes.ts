import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { paymentScreenshotUpload } from '../middleware/upload.js';
import * as studentController from '../controllers/student.controller.js';

const router = Router();

router.use(authenticate);

router.get('/progress', studentController.getStudentProgress);
router.post(
  '/payment/confirm',
  studentController.confirmPayment
);
router.post(
  '/payment/submit',
  (req, res, next) => {
    paymentScreenshotUpload.single('screenshot')(req, res, (err) => {
      if (err) {
        res.status(400).json({ success: false, message: err.message || 'File upload failed.' });
        return;
      }
      next();
    });
  },
  studentController.submitPayment
);

router.get('/support', studentController.getSupportRequests);
router.post('/support', studentController.submitSupportRequest);

export default router;
