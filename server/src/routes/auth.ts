import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import prisma from '../db/prisma';
import { sendOtpCode } from '../services/otpService';

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

  const delivery = await sendOtpCode(phone, code);
  const isDev = process.env.NODE_ENV === 'development';
  const exposeDebugOtp = isDev || delivery.mocked;

  res.json({
    success: true,
    message: delivery.mocked ? 'OTP generated in mock mode' : 'OTP sent successfully',
    data: {
      provider: delivery.provider,
      mockMode: delivery.mocked,
      messageId: delivery.messageId,
      warning: delivery.warning,
    },
    ...(exposeDebugOtp && { debug_otp: code }),
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

  const signOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };

  const token = jwt.sign(
    { riderId: rider.id, phone: rider.phone },
    process.env.JWT_SECRET!,
    signOptions
  );

  res.json({
    success: true,
    data: { token, rider, isNew },
  });
});

export default router;
