import mongoose, { Schema, Document } from 'mongoose';

export interface IOtpVerification extends Document {
  email: string;
  otp: string;
  registrationData: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new Schema<IOtpVerification>(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    otp: { type: String, required: true },
    registrationData: { type: Schema.Types.Mixed, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true }
);

export const OtpVerification = mongoose.model<IOtpVerification>('OtpVerification', otpSchema);
