import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as quizController from '../controllers/quiz.controller.js';

const router = Router();

router.get('/programs', authenticate, quizController.listPrograms);
router.get('/programs/:name/questions', authenticate, quizController.getProgramQuestions);

router.post(
  '/attempts',
  authenticate,
  [
    body('program').notEmpty(),
    body('answers').isObject(),
  ],
  validate,
  quizController.submitQuizAttempt
);

router.get('/attempts', authenticate, quizController.listAttempts);
router.get('/attempts/me/latest', authenticate, quizController.getMyLatestAttempt);

router.get('/admin/programs', authenticate, requireAdmin, quizController.adminListPrograms);
router.post('/admin/programs', authenticate, requireAdmin, [body('name').trim().notEmpty()], validate, quizController.adminCreateProgram);
router.delete('/admin/programs/:name', authenticate, requireAdmin, quizController.adminDeleteProgram);
router.post('/admin/programs/:name/questions', authenticate, requireAdmin, quizController.adminAddQuestion);
router.put('/admin/programs/:name/questions/:qIndex', authenticate, requireAdmin, quizController.adminUpdateQuestion);
router.delete('/admin/programs/:name/questions/:qIndex', authenticate, requireAdmin, quizController.adminDeleteQuestion);
router.get('/admin/questions', authenticate, requireAdmin, quizController.adminGetAllQuestions);
router.put('/admin/questions', authenticate, requireAdmin, quizController.adminReplaceQuestions);

export default router;
