import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/validate.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import quizRoutes from './routes/quiz.routes.js';
import studentRoutes from './routes/student.routes.js';
import { seedOnStartup } from './utils/startupSeed.js';

const app = express();

app.use(cors({
  origin: [
    env.clientUrl,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://www.erphubtechnologies.in',
    'https://erphubtechnologies.in',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'ERP Digital Solution API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/student', studentRoutes);

app.use(errorHandler);

async function start() {
  await connectDB();
  await seedOnStartup();
  const server = app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${env.port} is already in use. On macOS, port 5000 is often taken by AirPlay — set PORT=5001 in .env`);
    } else {
      console.error('Failed to start HTTP server:', err.message);
    }
    process.exit(1);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
