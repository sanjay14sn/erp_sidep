import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.mailUser,
    pass: env.mailPassword,
  },
});

export async function sendOtpEmail(to: string, otp: string, fullName: string): Promise<void> {
  await transporter.sendMail({
    from: `"ERP Digital Solution - SIDEP" <${env.mailUser}>`,
    to,
    subject: 'Your SIDEP Registration OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #0f172a;">SIDEP Registration Verification</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Your One-Time Password (OTP) for completing SIDEP registration is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FFB800;">${otp}</p>
        <p>This OTP expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color: #64748b; font-size: 13px;">ERP Digital Solution — Social Initiative & Digital Empowerment Program</p>
      </div>
    `,
  });
}

interface CredentialsEmailPayload {
  to: string;
  fullName: string;
  email: string;
  mobile: string;
  password: string;
}

export async function sendCredentialsEmail({
  to,
  fullName,
  email,
  mobile,
  password,
}: CredentialsEmailPayload): Promise<void> {
  const loginUrl = `${env.clientUrl}/login`;

  await transporter.sendMail({
    from: `"ERP Digital Solution - SIDEP" <${env.mailUser}>`,
    to,
    subject: 'Your SIDEP Portal Login Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Registration Completed Successfully</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Your SIDEP candidate account has been created. Use the login credentials below to access the ERP Digital Portal:</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0;">
          <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Email ID:</strong> ${email}</p>
          <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>Mobile Number:</strong> ${mobile}</p>
          <p style="margin: 0; font-size: 14px;"><strong>Password:</strong> ${password}</p>
        </div>

        <p style="font-size: 14px;">You can log in using your <strong>email</strong> or <strong>mobile number</strong> along with the password above.</p>

        <p style="margin: 28px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700;">
            Go to Login Portal
          </a>
        </p>

        <p style="color: #b45309; font-size: 13px;">For your security, please change your password after your first login and do not share these credentials with anyone.</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">ERP Digital Solution — Social Initiative & Digital Empowerment Program</p>
      </div>
    `,
  });
}

export async function sendPasswordResetOtpEmail(to: string, otp: string, fullName: string): Promise<void> {
  await transporter.sendMail({
    from: `"ERP Digital Solution - SIDEP" <${env.mailUser}>`,
    to,
    subject: 'Your SIDEP Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #0f172a;">Password Reset Request</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>We received a request to reset your SIDEP portal password. Your One-Time Password (OTP) is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FFB800;">${otp}</p>
        <p>This OTP expires in <strong>10 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        <p style="color: #64748b; font-size: 13px;">ERP Digital Solution — Social Initiative & Digital Empowerment Program</p>
      </div>
    `,
  });
}

export async function sendPasswordResetConfirmationEmail(to: string, fullName: string): Promise<void> {
  const loginUrl = `${env.clientUrl}/login`;

  await transporter.sendMail({
    from: `"ERP Digital Solution - SIDEP" <${env.mailUser}>`,
    to,
    subject: 'Your SIDEP Password Was Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
        <h2 style="color: #0f172a;">Password Reset Successful</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Your SIDEP portal password has been updated successfully. You can now sign in with your new password.</p>
        <p style="margin: 28px 0;">
          <a href="${loginUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700;">
            Go to Login Portal
          </a>
        </p>
        <p style="color: #b45309; font-size: 13px;">If you did not make this change, please contact support immediately.</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">ERP Digital Solution — Social Initiative & Digital Empowerment Program</p>
      </div>
    `,
  });
}
