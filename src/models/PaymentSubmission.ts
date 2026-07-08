import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPaymentSubmission extends Document {
  userId: Types.ObjectId;
  billingName: string;
  billingEmail: string;
  billingAddress: string;
  mobile: string;
  transactionId: string;
  amount: number;
  useScholarship: boolean;
  program: string;
  notes?: string;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
}

const paymentSubmissionSchema = new Schema<IPaymentSubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    billingName: { type: String, required: true, trim: true },
    billingEmail: { type: String, required: true, trim: true, lowercase: true },
    billingAddress: { type: String, required: true, trim: true },
    mobile: { type: String, default: '', trim: true },
    transactionId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    useScholarship: { type: Boolean, default: false },
    program: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    screenshotUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
  },
  { timestamps: true }
);

export const PaymentSubmission = mongoose.model<IPaymentSubmission>(
  'PaymentSubmission',
  paymentSubmissionSchema
);
