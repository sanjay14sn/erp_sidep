import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  mobile: string;
  dob: Date;
  gender: string;
  aadhaar: string;
  address: string;
  college: string;
  studentStatus: string;
  workStatus: string;
  reason: string;
  password?: string;
  role: 'student' | 'admin';
  isVerified: boolean;
  paymentStatus: 'unpaid' | 'pending' | 'paid';
  paymentAmount?: number;
  paymentPaidAt?: Date;
  enrolledProgram?: string;
  scholarshipCodeUsed?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    dob: { type: Date, required: true },
    gender: { type: String, required: true },
    aadhaar: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    college: { type: String, required: true },
    studentStatus: { type: String, required: true },
    workStatus: { type: String, required: true },
    reason: { type: String, required: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    isVerified: { type: Boolean, default: false },
    paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid'], default: 'unpaid' },
    paymentAmount: { type: Number },
    paymentPaidAt: { type: Date },
    enrolledProgram: { type: String },
    scholarshipCodeUsed: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
