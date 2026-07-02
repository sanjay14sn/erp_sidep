import { Response } from 'express';
import { User } from '../models/User.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { AuthRequest } from '../middleware/auth.js';

export async function listStudents(req: AuthRequest, res: Response): Promise<void> {
  const { search, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = { role: 'student', isVerified: true };

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { fullName: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { mobile: { $regex: q, $options: 'i' } },
      { college: { $regex: q, $options: 'i' } },
    ];
  }

  const [students, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(filter),
  ]);

  const studentIds = students.map((s) => s._id);
  const attempts = await QuizAttempt.find({ userId: { $in: studentIds } })
    .sort({ createdAt: -1 })
    .select('userId program score totalQuestions couponCode createdAt status');

  const latestAttemptByUser = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    const userId = attempt.userId.toString();
    if (!latestAttemptByUser.has(userId)) {
      latestAttemptByUser.set(userId, attempt);
    }
  }

  res.json({
    success: true,
    data: students.map((s) => {
      const attempt = latestAttemptByUser.get(s._id.toString());
      return {
        id: s._id.toString(),
        fullName: s.fullName,
        email: s.email,
        mobile: s.mobile,
        dob: s.dob,
        gender: s.gender,
        aadhaar: s.aadhaar,
        address: s.address,
        college: s.college,
        studentStatus: s.studentStatus,
        workStatus: s.workStatus,
        reason: s.reason,
        registeredAt: s.createdAt,
        quizAttended: !!attempt,
        quizProgram: attempt?.program ?? null,
        quizScore: attempt?.score ?? null,
        quizTotalQuestions: attempt?.totalQuestions ?? null,
        quizCouponCode: attempt?.couponCode ?? null,
        quizAttemptedAt: attempt?.createdAt ?? null,
      };
    }),
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
}

export async function deleteStudent(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findOneAndDelete({ _id: req.params.id, role: 'student' });
  if (!user) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }
  res.json({ success: true, message: 'Student deleted.' });
}

export async function getDashboardStats(_req: AuthRequest, res: Response): Promise<void> {
  const [totalStudents, totalAttempts] = await Promise.all([
    User.countDocuments({ role: 'student', isVerified: true }),
    (await import('../models/QuizAttempt.js')).QuizAttempt.countDocuments(),
  ]);

  res.json({
    success: true,
    stats: { totalStudents, totalAttempts },
  });
}
