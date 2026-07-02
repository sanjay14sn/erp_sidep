import mongoose, { Schema, Document } from 'mongoose';

export interface IPasswordResetOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  createdAt: Date;
}

const passwordResetOtpSchema = new Schema<IPasswordResetOtp>(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const PasswordResetOtp = mongoose.model<IPasswordResetOtp>('PasswordResetOtp', passwordResetOtpSchema);
