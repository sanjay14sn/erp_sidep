import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mailUser: required('MAIL_USER'),
  mailPassword: required('MAIL_PASSWORD'),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@erpdigital.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@123456',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
