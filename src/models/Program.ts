import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
}

export interface IProgram extends Document {
  name: string;
  questions: IQuestion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
  {
    questionText: { type: String, required: true },
    options: { type: [String], required: true, validate: [(v: string[]) => v.length === 4, 'Each question must have 4 options'] },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
  },
  { _id: false }
);

const programSchema = new Schema<IProgram>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    questions: { type: [questionSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Program = mongoose.model<IProgram>('Program', programSchema);
