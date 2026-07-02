import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post(
  '/register',
  [
    body('fullName').trim().isLength({ min: 3 }),
    body('email').isEmail().normalizeEmail(),
    body('mobile').matches(/^\d{10}$/),
    body('dob').isISO8601(),
    body('gender').notEmpty(),
    body('aadhaar').matches(/^\d{12}$/),
    body('address').trim().notEmpty(),
    body('college').trim().notEmpty(),
    body('studentStatus').notEmpty(),
    body('workStatus').notEmpty(),
    body('reason').trim().isLength({ min: 10 }),
  ],
  validate,
  authController.register
);

router.post(
  '/verify-otp',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').matches(/^\d{6}$/),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  authController.verifyOtp
);

router.post(
  '/resend-otp',
  [body('email').isEmail().normalizeEmail()],
  validate,
  authController.resendOtp
);

router.post(
  '/login',
  [
    body('username').trim().notEmpty(),
    body('password').notEmpty(),
  ],
  validate,
  authController.login
);

router.post(
  '/forgot-password',
  [body('identifier').trim().notEmpty()],
  validate,
  authController.forgotPassword
);

router.post(
  '/resend-forgot-password-otp',
  [body('email').isEmail().normalizeEmail()],
  validate,
  authController.resendForgotPasswordOtp
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').matches(/^\d{6}$/),
    body('password').isLength({ min: 6 }),
  ],
  validate,
  authController.resetPassword
);

router.get('/me', authenticate, authController.getMe);

export default router;
