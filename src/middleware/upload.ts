import multer from 'multer';
import path from 'path';
import fs from 'fs';

const paymentsDir = path.join(process.cwd(), 'uploads', 'payments');
const schedulesDir = path.join(process.cwd(), 'uploads', 'schedules');
fs.mkdirSync(paymentsDir, { recursive: true });
fs.mkdirSync(schedulesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, paymentsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, WEBP, GIF, or PDF files are allowed.'));
  }
}

export const paymentScreenshotUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

const scheduleStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, schedulesDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

export const scheduleFileUpload = multer({
  storage: scheduleStorage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 },
});
