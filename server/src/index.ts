import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import onboardingRoutes from './routes/onboarding';
import policyRoutes from './routes/policy';
import claimsRoutes from './routes/claims';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security middleware ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// OTP endpoint gets stricter limit
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: { success: false, error: 'Too many OTP requests. Wait 1 minute.' },
});
app.use('/api/auth/send-otp', otpLimiter);

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ShieldRoute API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════╗
  ║   ShieldRoute API — Port ${PORT}     ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}         ║
  ╚════════════════════════════════════╝
  `);
});

export default app;
