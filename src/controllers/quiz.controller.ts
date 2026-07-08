import { Response } from 'express';
import { Program } from '../models/Program.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';
import {
  isQuizPassed,
  MAX_QUIZ_ATTEMPTS,
  SCHOLARSHIP_PASS_PERCENT,
} from '../utils/quizRules.js';

function paramString(value: string | string[]): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return decodeURIComponent(raw);
}

function generateCouponCode(programName: string): string {
  const words = programName.toUpperCase().split(' ');
  const prefix = words.map((w) => w[0]).join('').substring(0, 3);
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 5; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${year}${randomStr}`;
}

function mapAttemptResponse(attempt: InstanceType<typeof QuizAttempt>) {
  const scorePercent = (attempt.score / attempt.totalQuestions) * 100;
  return {
    id: attempt._id.toString(),
    candidateName: attempt.candidateName,
    program: attempt.program,
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    scorePercent,
    couponCode: attempt.couponCode || null,
    generatedAt: attempt.createdAt,
    status: attempt.status,
    scholarshipEarned: isQuizPassed(attempt.score, attempt.totalQuestions),
  };
}

function buildQuizStatus(attempts: InstanceType<typeof QuizAttempt>[]) {
  const latest = attempts[0] ?? null;
  const passingAttempt = attempts.find((a) => isQuizPassed(a.score, a.totalQuestions)) ?? null;
  const attemptCount = attempts.length;
  const scholarshipEarned = !!passingAttempt;
  const canRetake = !scholarshipEarned && attemptCount < MAX_QUIZ_ATTEMPTS;

  return {
    latest,
    passingAttempt,
    attemptCount,
    maxAttempts: MAX_QUIZ_ATTEMPTS,
    canRetake,
    scholarshipEarned,
    passPercentRequired: SCHOLARSHIP_PASS_PERCENT,
  };
}

export async function listPrograms(_req: AuthRequest, res: Response): Promise<void> {
  const programs = await Program.find({ isActive: true }).select('name questions');
  res.json({
    success: true,
    data: programs.map((p) => ({
      name: p.name,
      questionCount: p.questions.length,
    })),
  });
}

export async function getProgramQuestions(req: AuthRequest, res: Response): Promise<void> {
  const programName = paramString(req.params.name);
  const program = await Program.findOne({ name: programName, isActive: true });
  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found.' });
    return;
  }

  const isAdmin = req.user?.role === 'admin';

  res.json({
    success: true,
    program: program.name,
    questions: program.questions.map((q, idx) => ({
      id: idx + 1,
      questionText: q.questionText,
      options: q.options,
      ...(isAdmin ? { correctIndex: q.correctIndex } : {}),
    })),
  });
}

export async function submitQuizAttempt(req: AuthRequest, res: Response): Promise<void> {
  const { program, answers } = req.body as {
    program: string;
    answers: Record<number, number>;
  };

  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const existingAttempts = await QuizAttempt.find({ userId: user._id }).sort({ createdAt: -1 });
  const quizStatus = buildQuizStatus(existingAttempts);

  if (quizStatus.scholarshipEarned) {
    res.status(400).json({
      success: false,
      message: 'You have already passed the assessment and received your scholarship.',
    });
    return;
  }

  if (!quizStatus.canRetake) {
    res.status(400).json({
      success: false,
      message: `Maximum quiz attempts (${MAX_QUIZ_ATTEMPTS}) reached. Scholarship requires ${SCHOLARSHIP_PASS_PERCENT}% or higher.`,
    });
    return;
  }

  const programDoc = await Program.findOne({ name: program, isActive: true });
  if (!programDoc || programDoc.questions.length !== 10) {
    res.status(400).json({ success: false, message: 'Program must have exactly 10 questions.' });
    return;
  }

  const answerEntries = Object.entries(answers).map(([k, v]) => ({
    questionIndex: parseInt(k, 10),
    selectedIndex: v,
  }));

  if (answerEntries.length < 10) {
    res.status(400).json({ success: false, message: 'Please answer all 10 questions.' });
    return;
  }

  let score = 0;
  const detailedAnswers = answerEntries.map(({ questionIndex, selectedIndex }) => {
    const q = programDoc.questions[questionIndex];
    const isCorrect = q && selectedIndex === q.correctIndex;
    if (isCorrect) score++;
    return { questionIndex, selectedIndex, isCorrect: !!isCorrect };
  });

  const scorePercent = (score / 10) * 100;
  const passed = isQuizPassed(score, 10);
  const couponCode = passed ? generateCouponCode(program) : '';

  const attempt = await QuizAttempt.create({
    userId: user._id,
    candidateName: user.fullName,
    program,
    score,
    totalQuestions: 10,
    couponCode,
    status: 'completed',
    answers: detailedAnswers,
  });

  const attemptCount = existingAttempts.length + 1;
  const scholarshipEarned = passed;
  const canRetake = !passed && attemptCount < MAX_QUIZ_ATTEMPTS;

  res.status(201).json({
    success: true,
    attempt: mapAttemptResponse(attempt),
    result: {
      correct: score,
      wrong: 10 - score,
      scorePercent,
      couponCode: couponCode || null,
      generatedTime: attempt.createdAt,
      scholarshipEarned,
      attemptCount,
      maxAttempts: MAX_QUIZ_ATTEMPTS,
      canRetake,
      passPercentRequired: SCHOLARSHIP_PASS_PERCENT,
    },
  });
}

export async function getMyLatestAttempt(req: AuthRequest, res: Response): Promise<void> {
  const attempts = await QuizAttempt.find({ userId: req.user!.userId }).sort({ createdAt: -1 });
  const status = buildQuizStatus(attempts);

  if (!status.latest) {
    res.json({
      success: true,
      attempt: null,
      passingAttempt: null,
      attemptCount: 0,
      maxAttempts: MAX_QUIZ_ATTEMPTS,
      canRetake: true,
      scholarshipEarned: false,
      passPercentRequired: SCHOLARSHIP_PASS_PERCENT,
    });
    return;
  }

  res.json({
    success: true,
    attempt: mapAttemptResponse(status.latest),
    passingAttempt: status.passingAttempt ? mapAttemptResponse(status.passingAttempt) : null,
    attemptCount: status.attemptCount,
    maxAttempts: status.maxAttempts,
    canRetake: status.canRetake,
    scholarshipEarned: status.scholarshipEarned,
    passPercentRequired: status.passPercentRequired,
  });
}

export async function listAttempts(req: AuthRequest, res: Response): Promise<void> {
  const { program, page = '1', limit = '20' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(10000, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter: Record<string, unknown> = {};
  if (program && program !== 'All') filter.program = program;

  if (req.user!.role === 'student') {
    filter.userId = req.user!.userId;
  }

  const [attempts, total] = await Promise.all([
    QuizAttempt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    QuizAttempt.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: attempts.map((a) => mapAttemptResponse(a)),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

export async function adminListPrograms(_req: AuthRequest, res: Response): Promise<void> {
  const programs = await Program.find().sort({ name: 1 });
  res.json({ success: true, data: programs });
}

export async function adminCreateProgram(req: AuthRequest, res: Response): Promise<void> {
  const { name } = req.body;
  const existing = await Program.findOne({ name: name.trim() });
  if (existing) {
    res.status(409).json({ success: false, message: 'Program already exists.' });
    return;
  }
  const program = await Program.create({ name: name.trim(), questions: [] });
  res.status(201).json({ success: true, program });
}

export async function adminAddQuestion(req: AuthRequest, res: Response): Promise<void> {
  const programName = paramString(req.params.name);
  const { questionText, options, correctIndex } = req.body;

  const program = await Program.findOne({ name: programName });
  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found.' });
    return;
  }

  program.questions.push({ questionText, options, correctIndex });
  await program.save();

  res.json({ success: true, program });
}

export async function adminDeleteQuestion(req: AuthRequest, res: Response): Promise<void> {
  const programName = paramString(req.params.name);
  const qIndex = parseInt(paramString(req.params.qIndex), 10);

  const program = await Program.findOne({ name: programName });
  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found.' });
    return;
  }

  program.questions.splice(qIndex, 1);
  await program.save();

  res.json({ success: true, program });
}

export async function adminUpdateQuestion(req: AuthRequest, res: Response): Promise<void> {
  const programName = paramString(req.params.name);
  const qIndex = parseInt(paramString(req.params.qIndex), 10);
  const { questionText, options, correctIndex } = req.body as {
    questionText: string;
    options: string[];
    correctIndex: number;
  };

  const program = await Program.findOne({ name: programName });
  if (!program) {
    res.status(404).json({ success: false, message: 'Program not found.' });
    return;
  }

  if (qIndex < 0 || qIndex >= program.questions.length) {
    res.status(404).json({ success: false, message: 'Question not found.' });
    return;
  }

  program.questions[qIndex] = {
    questionText: questionText.trim(),
    options: options.map((o: string) => o.trim()),
    correctIndex,
  };
  await program.save();

  res.json({ success: true, program });
}

export async function adminDeleteProgram(req: AuthRequest, res: Response): Promise<void> {
  const programName = paramString(req.params.name);
  await Program.findOneAndDelete({ name: programName });
  res.json({ success: true, message: 'Program deleted.' });
}

export async function adminGetAllQuestions(_req: AuthRequest, res: Response): Promise<void> {
  const programs = await Program.find({ isActive: true });
  const bank: Record<string, { id: number; questionText: string; options: string[]; correctIndex: number }[]> = {};

  programs.forEach((p) => {
    bank[p.name] = p.questions.map((q, idx) => ({
      id: idx + 1,
      questionText: q.questionText,
      options: q.options,
      correctIndex: q.correctIndex,
    }));
  });

  res.json({ success: true, data: bank });
}

export async function adminReplaceQuestions(req: AuthRequest, res: Response): Promise<void> {
  const { data } = req.body as { data: Record<string, { questionText: string; options: string[]; correctIndex: number }[]> };

  for (const [name, questions] of Object.entries(data)) {
    await Program.findOneAndUpdate(
      { name },
      { questions, isActive: true },
      { upsert: true, new: true }
    );
  }

  res.json({ success: true, message: 'Question bank updated.' });
}
