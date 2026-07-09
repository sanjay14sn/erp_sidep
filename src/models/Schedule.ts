import mongoose, { Schema, Document } from 'mongoose';

export interface ISchedule extends Document {
  title: string;
  description?: string;
  program?: string;
  startDate: Date;
  endDate?: Date;
  fileUrl?: string;
  fileName?: string;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    program: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    fileUrl: { type: String },
    fileName: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Schedule = mongoose.model<ISchedule>('Schedule', scheduleSchema);
