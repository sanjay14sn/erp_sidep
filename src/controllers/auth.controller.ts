import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { OtpVerification } from '../models/OtpVerification.js';
import { sendOtpEmail, sendCredentialsEmail, sendPasswordResetOtpEmail, sendPasswordResetConfirmationEmail } from '../services/email.service.js';
import { generateOtp, getOtpExpiry } from '../services/otp.service.js';
import { PasswordResetOtp } from '../models/PasswordResetOtp.js';
import { signToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';

export async function register(req: AuthRequest, res: Response): Promise<void> {
  const {
    fullName, email, mobile, dob, gender, aadhaar,
    address, college, studentStatus, workStatus, reason,
  } = req.body;

  const cleanEmail = email.toLowerCase().trim();
  const cleanMobile = mobile.trim();
  const cleanAadhaar = aadhaar.replace(/\s+/g, '');

  const existing = await User.findOne({
    $or: [{ email: cleanEmail }, { mobile: cleanMobile }, { aadhaar: cleanAadhaar }],
  });

  if (existing?.isVerified) {
    res.status(409).json({ success: false, message: 'An account with this email, mobile, or Aadhaar already exists.' });
    return;
  }

  if (existing && !existing.isVerified) {
    await User.deleteOne({ _id: existing._id });
  }

  const otp = generateOtp();
  const registrationData = {
    fullName: fullName.trim(),
    email: cleanEmail,
    mobile: cleanMobile,
    dob: new Date(dob),
    gender,
    aadhaar: cleanAadhaar,
    address: address.trim(),
    college: college.trim(),
    studentStatus,
    workStatus,
    reason: reason.trim(),
  };

  await OtpVerification.deleteMany({ email: cleanEmail });
  await OtpVerification.create({
    email: cleanEmail,
    otp,
    registrationData,
    expiresAt: getOtpExpiry(),
  });

  await sendOtpEmail(cleanEmail, otp, fullName.trim());

  res.status(200).json({
    success: true,
    message: 'OTP sent to your email. Please verify to complete registration.',
    email: cleanEmail,
  });
}

export async function resendOtp(req: AuthRequest, res: Response): Promise<void> {
  const { email } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const pending = await OtpVerification.findOne({ email: cleanEmail }).sort({ createdAt: -1 });
  if (!pending) {
    res.status(404).json({ success: false, message: 'No pending registration found. Please register again.' });
    return;
  }

  const otp = generateOtp();
  pending.otp = otp;
  pending.expiresAt = getOtpExpiry();
  await pending.save();

  const data = pending.registrationData as { fullName: string };
  await sendOtpEmail(cleanEmail, otp, data.fullName);

  res.json({ success: true, message: 'OTP resent successfully.' });
}

export async function verifyOtp(req: AuthRequest, res: Response): Promise<void> {
  const { email, otp, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const pending = await OtpVerification.findOne({ email: cleanEmail, otp }).sort({ createdAt: -1 });
  if (!pending) {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    return;
  }

  if (pending.expiresAt < new Date()) {
    await OtpVerification.deleteOne({ _id: pending._id });
    res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    return;
  }

  const data = pending.registrationData as Record<string, unknown>;
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    ...data,
    password: hashedPassword,
    role: 'student',
    isVerified: true,
  });

  await OtpVerification.deleteMany({ email: cleanEmail });

  try {
    await sendCredentialsEmail({
      to: user.email,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      password,
    });
  } catch (emailErr) {
    console.error('Failed to send login credentials email:', emailErr);
  }

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  res.status(201).json({
    success: true,
    message: 'Registration completed successfully. Login credentials have been sent to your email.',
    token,
    user: formatUser(user),
  });
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { username, password } = req.body;
  const identifier = username.trim().toLowerCase();

  const user = await User.findOne({
    $or: [{ email: identifier }, { mobile: username.trim() }],
    isVerified: true,
  }).select('+password');

  if (!user || !user.password) {
    res.status(401).json({ success: false, message: 'Invalid email/mobile or password.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ success: false, message: 'Invalid email/mobile or password.' });
    return;
  }

  const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });

  res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: formatUser(user),
  });
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  const user = await User.findById(req.user!.userId);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }
  res.json({ success: true, user: formatUser(user) });
}

async function findVerifiedUserByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes('@');

  return User.findOne({
    ...(isEmail ? { email: trimmed.toLowerCase() } : { mobile: trimmed }),
    isVerified: true,
  });
}

export async function forgotPassword(req: AuthRequest, res: Response): Promise<void> {
  const { identifier } = req.body as { identifier: string };

  const user = await findVerifiedUserByIdentifier(identifier);
  if (!user) {
    res.status(404).json({ success: false, message: 'No verified account found with this email or mobile number.' });
    return;
  }

  const otp = generateOtp();
  await PasswordResetOtp.deleteMany({ email: user.email });
  await PasswordResetOtp.create({
    email: user.email,
    otp,
    expiresAt: getOtpExpiry(),
  });

  await sendPasswordResetOtpEmail(user.email, otp, user.fullName);

  res.json({
    success: true,
    message: 'Password reset OTP sent to your registered email.',
    email: user.email,
  });
}

export async function resendForgotPasswordOtp(req: AuthRequest, res: Response): Promise<void> {
  const { email } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: cleanEmail, isVerified: true });
  if (!user) {
    res.status(404).json({ success: false, message: 'No verified account found for this email.' });
    return;
  }

  const pending = await PasswordResetOtp.findOne({ email: cleanEmail }).sort({ createdAt: -1 });
  if (!pending) {
    res.status(404).json({ success: false, message: 'No active password reset request found. Please start again.' });
    return;
  }

  const otp = generateOtp();
  pending.otp = otp;
  pending.expiresAt = getOtpExpiry();
  await pending.save();

  await sendPasswordResetOtpEmail(cleanEmail, otp, user.fullName);

  res.json({ success: true, message: 'Password reset OTP resent successfully.' });
}

export async function resetPassword(req: AuthRequest, res: Response): Promise<void> {
  const { email, otp, password } = req.body;
  const cleanEmail = email.toLowerCase().trim();

  const pending = await PasswordResetOtp.findOne({ email: cleanEmail, otp }).sort({ createdAt: -1 });
  if (!pending) {
    res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    return;
  }

  if (pending.expiresAt < new Date()) {
    await PasswordResetOtp.deleteOne({ _id: pending._id });
    res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    return;
  }

  const user = await User.findOne({ email: cleanEmail, isVerified: true }).select('+password');
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  user.password = await bcrypt.hash(password, 12);
  await user.save();
  await PasswordResetOtp.deleteMany({ email: cleanEmail });

  try {
    await sendPasswordResetConfirmationEmail(user.email, user.fullName);
  } catch (emailErr) {
    console.error('Failed to send password reset confirmation email:', emailErr);
  }

  res.json({
    success: true,
    message: 'Password reset successfully. You can now log in with your new password.',
  });
}

function formatUser(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    dob: user.dob,
    gender: user.gender,
    aadhaar: user.aadhaar,
    address: user.address,
    college: user.college,
    studentStatus: user.studentStatus,
    workStatus: user.workStatus,
    reason: user.reason,
    role: user.role,
    registeredAt: user.createdAt,
  };
}
