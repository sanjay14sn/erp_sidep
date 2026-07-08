import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupportRequest extends Document {
  userId: Types.ObjectId;
  category: string;
  subject: string;
  message: string;
  status: 'pending' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const supportRequestSchema = new Schema<ISupportRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

export const SupportRequest = mongoose.model<ISupportRequest>(
  'SupportRequest',
  supportRequestSchema
);
