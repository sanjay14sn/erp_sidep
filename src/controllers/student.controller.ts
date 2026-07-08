import { Response } from 'express';
import { User } from '../models/User.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { PaymentSubmission } from '../models/PaymentSubmission.js';
import { SupportRequest } from '../models/SupportRequest.js';
import { AuthRequest } from '../middleware/auth.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';
import {
  getProgramModules,
  STANDARD_FEE,
  SCHOLARSHIP_FEE,
  SCHOLARSHIP_VALIDITY_MS,
} from '../utils/programModules.js';
import { hasScholarshipCode, isQuizPassed } from '../utils/quizRules.js';
import {
  sendPaymentSubmittedEmail,
} from '../services/email.service.js';

function getScholarshipState(attempt: InstanceType<typeof QuizAttempt> | null) {
  if (!attempt || !hasScholarshipCode(attempt.couponCode) || !isQuizPassed(attempt.score, attempt.totalQuestions)) {
    return { active: false, code: null as string | null, expiresAt: null as Date | null };
  }

  const expiresAt = new Date(attempt.createdAt.getTime() + SCHOLARSHIP_VALIDITY_MS);
  const active = expiresAt.getTime() > Date.now();

  return {
    active,
    code: attempt.couponCode,
    expiresAt,
  };
}

async function getPassingAttempt(userId: InstanceType<typeof User>['_id']) {
  const attempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 });
  return attempts.find((a) => isQuizPassed(a.score, a.totalQuestions)) ?? null;
}

async function getLatestPaymentSubmission(userId: InstanceType<typeof User>['_id']) {
  return PaymentSubmission.findOne({ userId }).sort({ submittedAt: -1 });
}

function mapPaymentSubmission(submission: InstanceType<typeof PaymentSubmission> | null) {
  if (!submission) return null;
  return {
    status: submission.status,
    submittedAt: submission.submittedAt,
    billingName: submission.billingName,
    billingEmail: submission.billingEmail,
    billingAddress: submission.billingAddress,
    transactionId: submission.transactionId,
    amount: submission.amount,
    useScholarship: submission.useScholarship,
    rejectionReason: submission.rejectionReason ?? null,
    screenshotUrl: submission.screenshotUrl,
    program: submission.program,
  };
}

export async function getStudentProgress(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const latestAttempt = await QuizAttempt.findOne({ userId: user._id }).sort({ createdAt: -1 });
  const passingAttempt = await getPassingAttempt(user._id);
  const scholarship = getScholarshipState(passingAttempt);
  const enrolledProgram = user.enrolledProgram || passingAttempt?.program || latestAttempt?.program || null;
  const isPaid = user.paymentStatus === 'paid';
  const latestSubmission = await getLatestPaymentSubmission(user._id);

  res.json({
    success: true,
    progress: {
      paymentStatus: user.paymentStatus,
      paymentAmount: user.paymentAmount ?? null,
      paymentPaidAt: user.paymentPaidAt ?? null,
      enrolledProgram,
      scholarshipCodeUsed: user.scholarshipCodeUsed ?? null,
      quizCompleted: !!latestAttempt,
      quizProgram: latestAttempt?.program ?? null,
      quizScore: latestAttempt?.score ?? null,
      scholarship,
      pricing: {
        standard: STANDARD_FEE,
        scholarship: SCHOLARSHIP_FEE,
        applicable: isPaid
          ? (user.paymentAmount ?? STANDARD_FEE)
          : scholarship.active
            ? SCHOLARSHIP_FEE
            : STANDARD_FEE,
      },
      modules: getProgramModules(enrolledProgram),
      certificationEligible: isPaid && !!latestAttempt,
      modulesUnlocked: isPaid,
      paymentSubmission: mapPaymentSubmission(latestSubmission),
    },
  });
}

export async function submitPayment(req: AuthRequest, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, message: 'Payment screenshot is required.' });
    return;
  }

  const {
    billingName,
    billingEmail,
    billingAddress,
    mobile = '',
    transactionId,
    useScholarship = 'false',
    amount,
    notes = '',
  } = req.body as Record<string, string>;

  if (!billingName?.trim() || !billingEmail?.trim() || !billingAddress?.trim() || !transactionId?.trim()) {
    res.status(400).json({ success: false, message: 'Name, email, billing address, and transaction ID are required.' });
    return;
  }

  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  if (user.paymentStatus === 'paid') {
    res.status(400).json({ success: false, message: 'Payment already completed.' });
    return;
  }

  if (user.paymentStatus === 'pending') {
    res.status(400).json({ success: false, message: 'A payment submission is already under review.' });
    return;
  }

  const latestAttempt = await QuizAttempt.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!latestAttempt) {
    res.status(400).json({
      success: false,
      message: 'Complete the skills assessment before submitting payment.',
    });
    return;
  }

  const passingAttempt = await getPassingAttempt(user._id);
  const scholarship = getScholarshipState(passingAttempt);
  const wantsScholarship = String(useScholarship) === 'true';
  const program = passingAttempt?.program || latestAttempt.program;
  let parsedAmount = Number(amount);

  if (wantsScholarship) {
    if (!scholarship.active || !scholarship.code) {
      res.status(400).json({
        success: false,
        message: 'Scholarship is not active. Please pay the standard fee.',
      });
      return;
    }
    parsedAmount = SCHOLARSHIP_FEE;
  } else {
    parsedAmount = STANDARD_FEE;
  }

  if (!parsedAmount || Number.isNaN(parsedAmount)) {
    res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    return;
  }

  let screenshotUrl = '';
  try {
    screenshotUrl = await uploadToCloudinary(file.path);
  } catch (cloudinaryErr) {
    res.status(500).json({
      success: false,
      message: cloudinaryErr instanceof Error ? cloudinaryErr.message : 'Failed to upload screenshot to cloud storage.',
    });
    return;
  }
  const submittedAt = new Date();

  const submission = await PaymentSubmission.create({
    userId: user._id,
    billingName: billingName.trim(),
    billingEmail: billingEmail.trim(),
    billingAddress: billingAddress.trim(),
    mobile: String(mobile).trim(),
    transactionId: transactionId.trim(),
    amount: parsedAmount,
    useScholarship: wantsScholarship,
    program,
    notes: notes?.trim() || undefined,
    screenshotUrl,
    status: 'pending',
    submittedAt,
  });

  user.paymentStatus = 'pending';
  await user.save();

  try {
    await sendPaymentSubmittedEmail({
      to: billingEmail.trim(),
      studentName: billingName.trim(),
      courseName: program,
      amountPaid: parsedAmount,
      transactionId: transactionId.trim(),
      paymentDate: submittedAt,
    });
  } catch (emailErr) {
    console.error('Failed to send payment submitted email:', emailErr);
  }

  res.json({
    success: true,
    message: 'Payment proof submitted successfully. Our team will verify it shortly.',
    submission: mapPaymentSubmission(submission),
  });
}

export async function confirmPayment(req: AuthRequest, res: Response): Promise<void> {
  const { useScholarship } = req.body as { useScholarship?: boolean };

  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  if (user.paymentStatus === 'paid') {
    res.status(400).json({ success: false, message: 'Payment already completed.' });
    return;
  }

  const latestAttempt = await QuizAttempt.findOne({ userId: user._id }).sort({ createdAt: -1 });
  if (!latestAttempt) {
    res.status(400).json({
      success: false,
      message: 'Complete the skills assessment before proceeding to payment.',
    });
    return;
  }

  const passingAttempt = await getPassingAttempt(user._id);
  const scholarship = getScholarshipState(passingAttempt);
  let amount = STANDARD_FEE;
  let scholarshipCodeUsed: string | undefined;

  if (useScholarship) {
    if (!scholarship.active || !scholarship.code) {
      res.status(400).json({
        success: false,
        message: 'Your scholarship code is invalid or has expired. Standard fee applies.',
      });
      return;
    }
    amount = SCHOLARSHIP_FEE;
    scholarshipCodeUsed = scholarship.code;
  }

  user.paymentStatus = 'paid';
  user.paymentAmount = amount;
  user.paymentPaidAt = new Date();
  user.enrolledProgram = passingAttempt?.program || latestAttempt.program;
  user.scholarshipCodeUsed = scholarshipCodeUsed;
  await user.save();

  res.json({
    success: true,
    message: 'Payment completed successfully. Certification and modules are now unlocked.',
    payment: {
      amount,
      paidAt: user.paymentPaidAt,
      enrolledProgram: user.enrolledProgram,
      scholarshipApplied: !!scholarshipCodeUsed,
    },
  });
}

export async function getSupportRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const requests = await SupportRequest.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to retrieve support requests.' });
  }
}

export async function submitSupportRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { category, subject, message } = req.body as { category?: string; subject?: string; message?: string };

    if (!category?.trim() || !subject?.trim() || !message?.trim()) {
      res.status(400).json({ success: false, message: 'Category, subject, and message are required.' });
      return;
    }

    const supportRequest = await SupportRequest.create({
      userId,
      category: category.trim(),
      subject: subject.trim(),
      message: message.trim(),
      status: 'pending',
    });

    res.status(201).json({ success: true, message: 'Support request submitted successfully.', data: supportRequest });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to submit support request.' });
  }
}

