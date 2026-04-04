import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../db/prisma';

const router = Router();

const SendOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
});

const VerifyOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/),
  otp: z.string().length(6),
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  const parsed = SendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { phone } = parsed.data;

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate old codes for this phone
  await prisma.otpCode.updateMany({
    where: { phone, used: false },
    data: { used: true },
  });

  // Save new OTP
  await prisma.otpCode.create({
    data: { phone, code, expiresAt },
  });

  // TODO Phase 2: Send SMS via MSG91
  // In development, return code directly (remove in production)
  const isDev = process.env.NODE_ENV === 'development';

  res.json({
    success: true,
    message: 'OTP sent successfully',
    ...(isDev && { debug_otp: code }), // remove in production
  });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response): Promise<void> => {
  const parsed = VerifyOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { phone, otp } = parsed.data;

  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      phone,
      code: otp,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!otpRecord) {
    res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    return;
  }

  // Mark OTP as used
  await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

  // Find or create rider record
  let rider = await prisma.rider.findUnique({ where: { phone } });

  const isNew = !rider;

  if (!rider) {
    // Placeholder until onboarding is completed
    rider = await prisma.rider.create({
      data: {
        phone,
        name: '',
        platform: 'Zomato',
        yearsActive: 0,
        zone: 'Andheri',
        weeklyHours: 40,
        weeklyEarnings: 5000,
        peakHours: [],
        riskScore: 0,
      },
    });
  }

  const token = jwt.sign(
    { riderId: rider.id, phone: rider.phone },
    process.env.JWT_SECRET!,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );

  res.json({
    success: true,
    data: { token, rider, isNew },
  });
});

export default router;
