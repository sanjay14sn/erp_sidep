import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuizAttempt extends Document {
  userId: Types.ObjectId;
  candidateName: string;
  program: string;
  score: number;
  totalQuestions: number;
  couponCode: string;
  status: string;
  answers: { questionIndex: number; selectedIndex: number; isCorrect: boolean }[];
  createdAt: Date;
  updatedAt: Date;
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateName: { type: String, required: true },
    program: { type: String, required: true, index: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    couponCode: { type: String, default: '' },
    status: { type: String, default: 'completed' },
    answers: [
      {
        questionIndex: Number,
        selectedIndex: Number,
        isCorrect: Boolean,
      },
    ],
  },
  { timestamps: true }
);

export const QuizAttempt = mongoose.model<IQuizAttempt>('QuizAttempt', quizAttemptSchema);
