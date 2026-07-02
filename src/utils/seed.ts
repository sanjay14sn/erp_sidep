import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Program } from '../models/Program.js';
import { env } from '../config/env.js';
import { defaultQuestionBank } from './defaultQuestions.js';

async function seed() {
  await connectDB();

  const programCount = await Program.countDocuments();
  if (programCount === 0) {
    for (const [name, questions] of Object.entries(defaultQuestionBank)) {
      await Program.create({
        name,
        questions: questions.map((q) => ({
          questionText: q.questionText,
          options: q.options,
          correctIndex: q.correctIndex,
        })),
      });
    }
    console.log(`Seeded ${Object.keys(defaultQuestionBank).length} programs`);
  }

  const adminExists = await User.findOne({ email: env.adminEmail, role: 'admin' });
  if (!adminExists) {
    const hashed = await bcrypt.hash(env.adminPassword, 12);
    await User.create({
      fullName: 'System Admin',
      email: env.adminEmail,
      mobile: '9999999999',
      dob: new Date('1990-01-01'),
      gender: 'Other',
      aadhaar: '999999999999',
      address: 'Admin Office',
      college: 'ERP Digital Solution',
      studentStatus: 'Passed Out',
      workStatus: 'Working',
      reason: 'System administrator account',
      password: hashed,
      role: 'admin',
      isVerified: true,
    });
    console.log(`Admin user created: ${env.adminEmail}`);
  }

  console.log('Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
