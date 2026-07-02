# ERP Digital Solution — Backend API

Node.js + Express + MongoDB Atlas backend for SIDEP registration, JWT auth, OTP email verification, and dashboard/quiz APIs.

## Setup

1. Copy environment file and add your MongoDB Atlas URI:

```bash
cp .env.example .env
```

2. Edit `.env`:
   - `MONGODB_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — long random secret
   - `MAIL_USER` / `MAIL_PASSWORD` — Gmail app password for OTP emails

3. Install and run:

```bash
npm install
npm run dev
```

API runs at `http://localhost:5000`

## Default Admin

On first startup (if no admin exists):
- Email: `admin@erpdigital.com`
- Password: `Admin@123456` (change in `.env`)

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Submit registration form → sends OTP email |
| POST | `/api/auth/verify-otp` | Verify OTP + set password → JWT |
| POST | `/api/auth/resend-otp` | Resend OTP |
| POST | `/api/auth/login` | Login with email/mobile + password → JWT |
| GET | `/api/auth/me` | Get current user (Bearer token) |

### Quiz (authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quiz/programs` | List programs |
| GET | `/api/quiz/programs/:name/questions` | Get quiz questions |
| POST | `/api/quiz/attempts` | Submit quiz answers |
| GET | `/api/quiz/attempts` | List attempts |
| GET | `/api/quiz/attempts/me/latest` | Student's latest attempt |

### Admin (admin JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/students` | List registered students |
| DELETE | `/api/admin/students/:id` | Delete student |
| GET | `/api/admin/stats` | Dashboard stats |
| GET/PUT | `/api/quiz/admin/questions` | Manage question bank |

## Frontend

Set in frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
```
