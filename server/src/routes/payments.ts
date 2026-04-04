import { Router, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../types';
import prisma from '../db/prisma';
import { createPremiumOrder, verifyPremiumPayment } from '../services/paymentService';

const router = Router();

const CreateOrderSchema = z.object({
  amountPaise: z.number().int().positive().optional(),
});

const VerifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1).optional(),
  signature: z.string().min(1).optional(),
});

// POST /api/payments/create-order — Create premium payment order
router.post('/create-order', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = CreateOrderSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const policy = await prisma.policy.findFirst({
    where: { riderId: req.rider!.riderId, status: 'Active' },
  });

  if (!policy) {
    res.status(404).json({ success: false, error: 'No active policy found' });
    return;
  }

  const amountPaise = parsed.data.amountPaise || policy.weeklyPremium;
  const receipt = `sr_${policy.id.slice(-8)}_${Date.now().toString().slice(-6)}`;

  const order = await createPremiumOrder({
    amountPaise,
    receipt,
    notes: {
      policyId: policy.id,
      riderId: req.rider!.riderId,
      purpose: 'weekly_premium',
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paymentRecord = await prisma.premiumPayment.create({
    data: {
      policyId: policy.id,
      amount: amountPaise,
      razorpayOrderId: order.orderId,
      status: 'pending',
      weekStart: today,
    },
  });

  res.json({
    success: true,
    message: order.mockMode ? 'Mock payment order created' : 'Razorpay order created',
    data: {
      provider: order.provider,
      mockMode: order.mockMode,
      paymentRecordId: paymentRecord.id,
      orderId: order.orderId,
      amountPaise: order.amountPaise,
      currency: order.currency,
      razorpayKeyId: order.keyId,
    },
  });
});

// POST /api/payments/verify — Verify payment signature and mark payment as paid
router.post('/verify', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = VerifyPaymentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { orderId, paymentId, signature } = parsed.data;

  const payment = await prisma.premiumPayment.findFirst({
    where: { razorpayOrderId: orderId },
    include: { policy: true },
  });

  if (!payment || payment.policy.riderId !== req.rider!.riderId) {
    res.status(404).json({ success: false, error: 'Payment order not found' });
    return;
  }

  const verification = verifyPremiumPayment({ orderId, paymentId, signature });

  if (!verification.valid) {
    res.status(400).json({ success: false, error: 'Payment verification failed' });
    return;
  }

  const updated = await prisma.premiumPayment.update({
    where: { id: payment.id },
    data: {
      status: 'paid',
      razorpayPaymentId: verification.paymentId,
    },
  });

  res.json({
    success: true,
    message: verification.mockMode ? 'Mock payment marked as paid' : 'Payment verified successfully',
    data: {
      provider: verification.provider,
      mockMode: verification.mockMode,
      payment: updated,
    },
  });
});

// GET /api/payments/mine — Get rider payment history
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const payments = await prisma.premiumPayment.findMany({
    where: {
      policy: {
        riderId: req.rider!.riderId,
      },
    },
    include: { policy: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json({ success: true, data: payments });
});

export default router;
