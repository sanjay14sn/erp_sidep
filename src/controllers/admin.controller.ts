import { Response } from 'express';
import { User } from '../models/User.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { PaymentSubmission } from '../models/PaymentSubmission.js';
import { SupportRequest } from '../models/SupportRequest.js';
import { AuthRequest } from '../middleware/auth.js';
import { hasScholarshipCode, isQuizPassed } from '../utils/quizRules.js';
import { sendPaymentApprovedEmail } from '../services/email.service.js';

export async function listStudents(req: AuthRequest, res: Response): Promise<void> {
  const { search, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(10000, Math.max(1, parseInt(limit as string, 10)));
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
  const passingAttemptByUser = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) {
    const userId = attempt.userId.toString();
    if (!latestAttemptByUser.has(userId)) {
      latestAttemptByUser.set(userId, attempt);
    }
    if (
      isQuizPassed(attempt.score, attempt.totalQuestions) &&
      hasScholarshipCode(attempt.couponCode) &&
      !passingAttemptByUser.has(userId)
    ) {
      passingAttemptByUser.set(userId, attempt);
    }
  }

  res.json({
    success: true,
    data: students.map((s) => {
      const attempt = latestAttemptByUser.get(s._id.toString());
      const passingAttempt = passingAttemptByUser.get(s._id.toString());
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
        paymentStatus: s.paymentStatus || 'unpaid',
        quizAttended: !!attempt,
        quizProgram: attempt?.program ?? null,
        quizScore: attempt?.score ?? null,
        quizTotalQuestions: attempt?.totalQuestions ?? null,
        quizCouponCode: passingAttempt?.couponCode ?? null,
        quizAttemptedAt: attempt?.createdAt ?? null,
      };
    }),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function deleteStudent(req: AuthRequest, res: Response): Promise<void> {
  const studentId = req.params.id;
  const user = await User.findOneAndDelete({ _id: studentId, role: 'student' });
  if (!user) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }
  await QuizAttempt.deleteMany({ userId: studentId });
  res.json({ success: true, message: 'Student deleted.' });
}

export async function getDashboardStats(_req: AuthRequest, res: Response): Promise<void> {
  const [totalStudents, totalAttempts, pendingPayments] = await Promise.all([
    User.countDocuments({ role: 'student', isVerified: true }),
    (await import('../models/QuizAttempt.js')).QuizAttempt.countDocuments(),
    PaymentSubmission.countDocuments({ status: 'pending' }),
  ]);

  res.json({
    success: true,
    stats: { totalStudents, totalAttempts, pendingPayments },
  });
}

export async function listPayments(req: AuthRequest, res: Response): Promise<void> {
  const { status = 'pending', page = '1', limit = '10' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};
  if (status && status !== 'all') {
    filter.status = status;
  }

  const [submissions, total] = await Promise.all([
    PaymentSubmission.find(filter)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'fullName email mobile'),
    PaymentSubmission.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: submissions.map((s) => {
      const user = s.userId as unknown as InstanceType<typeof User> | null;
      return {
        id: s._id.toString(),
        userId: user?._id?.toString() ?? s.userId.toString(),
        studentName: user?.fullName ?? s.billingName,
        studentEmail: user?.email ?? s.billingEmail,
        studentMobile: user?.mobile ?? s.mobile,
        billingName: s.billingName,
        billingEmail: s.billingEmail,
        billingAddress: s.billingAddress,
        mobile: s.mobile,
        transactionId: s.transactionId,
        amount: s.amount,
        useScholarship: s.useScholarship,
        program: s.program,
        notes: s.notes ?? null,
        screenshotUrl: s.screenshotUrl,
        status: s.status,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt ?? null,
        rejectionReason: s.rejectionReason ?? null,
      };
    }),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function approvePayment(req: AuthRequest, res: Response): Promise<void> {
  const submission = await PaymentSubmission.findById(req.params.id);
  if (!submission) {
    res.status(404).json({ success: false, message: 'Payment submission not found.' });
    return;
  }

  if (submission.status !== 'pending') {
    res.status(400).json({ success: false, message: 'This payment has already been reviewed.' });
    return;
  }

  const user = await User.findById(submission.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  const reviewedAt = new Date();
  submission.status = 'approved';
  submission.reviewedAt = reviewedAt;
  submission.reviewedBy = req.user!.userId as unknown as import('mongoose').Types.ObjectId;
  await submission.save();

  user.paymentStatus = 'paid';
  user.paymentAmount = submission.amount;
  user.paymentPaidAt = reviewedAt;
  user.enrolledProgram = submission.program;
  if (submission.useScholarship) {
    const attempts = await QuizAttempt.find({ userId: user._id }).sort({ createdAt: -1 });
    const passing = attempts.find((a) => isQuizPassed(a.score, a.totalQuestions));
    user.scholarshipCodeUsed = passing?.couponCode ?? undefined;
  }
  await user.save();

  try {
    await sendPaymentApprovedEmail({
      to: submission.billingEmail,
      studentName: submission.billingName,
      courseName: submission.program,
      amountPaid: submission.amount,
      transactionId: submission.transactionId,
      paymentDate: reviewedAt,
    });
  } catch (emailErr) {
    console.error('Failed to send payment approved email:', emailErr);
  }

  res.json({
    success: true,
    message: 'Payment approved successfully. Confirmation email sent to the student.',
  });
}

export async function rejectPayment(req: AuthRequest, res: Response): Promise<void> {
  const { reason } = req.body as { reason?: string };
  const submission = await PaymentSubmission.findById(req.params.id);
  if (!submission) {
    res.status(404).json({ success: false, message: 'Payment submission not found.' });
    return;
  }

  if (submission.status !== 'pending') {
    res.status(400).json({ success: false, message: 'This payment has already been reviewed.' });
    return;
  }

  const user = await User.findById(submission.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'Student not found.' });
    return;
  }

  submission.status = 'rejected';
  submission.reviewedAt = new Date();
  submission.reviewedBy = req.user!.userId as unknown as import('mongoose').Types.ObjectId;
  submission.rejectionReason = reason?.trim() || 'Payment proof could not be verified.';
  await submission.save();

  user.paymentStatus = 'unpaid';
  await user.save();

  res.json({
    success: true,
    message: 'Payment rejected. Student can resubmit payment proof.',
  });
}

export async function getSupportRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status = 'all', page = '1', limit = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [requests, total] = await Promise.all([
      SupportRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'fullName email mobile'),
      SupportRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: requests.map((r) => {
        const user = r.userId as unknown as InstanceType<typeof User> | null;
        return {
          id: r._id.toString(),
          userId: user?._id?.toString() ?? r.userId.toString(),
          studentName: user?.fullName ?? 'Unknown Student',
          studentEmail: user?.email ?? 'Unknown Email',
          studentMobile: user?.mobile ?? 'Unknown Mobile',
          category: r.category,
          subject: r.subject,
          message: r.message,
          status: r.status,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to retrieve support requests.' });
  }
}

export async function resolveSupportRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const request = await SupportRequest.findById(id);

    if (!request) {
      res.status(404).json({ success: false, message: 'Support request not found.' });
      return;
    }

    request.status = 'resolved';
    await request.save();

    res.json({ success: true, message: 'Support request marked as resolved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to resolve support request.' });
  }
}

