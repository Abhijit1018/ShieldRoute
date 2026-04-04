import { Router, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest, Plan, Platform, Zone } from '../types';
import prisma from '../db/prisma';
import { generatePolicyNumber, calculateWeeklyPremium, calculateCoveragePerDay, calculateMaxWeeklyClaim } from '../services/premiumService';

const router = Router();

// GET /api/policy/mine — Get rider's active policy
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const policy = await prisma.policy.findFirst({
    where: { riderId: req.rider!.riderId, status: 'Active' },
    include: {
      rider: true,
      claims: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });

  if (!policy) {
    res.status(404).json({ success: false, error: 'No active policy found' });
    return;
  }

  res.json({ success: true, data: policy });
});

// POST /api/policy/renew — Renew policy for another week
router.post('/renew', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const riderId = req.rider!.riderId;

  const current = await prisma.policy.findFirst({
    where: { riderId, status: 'Active' },
    include: { rider: true },
  });

  if (!current) {
    res.status(404).json({ success: false, error: 'No active policy to renew' });
    return;
  }

  // Expire current policy
  await prisma.policy.update({ where: { id: current.id }, data: { status: 'Expired' } });

  const rider = current.rider;
  const riskScore = rider.riskScore;
  const weeklyEarnings = rider.weeklyEarnings;
  const zone = rider.zone as Zone;
  const platform = rider.platform as Platform;
  const plan = current.plan as Plan;

  const weeklyPremium  = calculateWeeklyPremium(weeklyEarnings, zone, rider.weeklyHours, platform, riskScore, plan);
  const coveragePerDay = calculateCoveragePerDay(weeklyEarnings, plan);
  const maxWeeklyClaim = calculateMaxWeeklyClaim(weeklyEarnings);
  const renewalDate    = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const renewed = await prisma.policy.create({
    data: {
      policyNumber:   generatePolicyNumber(),
      riderId,
      plan:           current.plan,
      zone:           current.zone,
      weeklyPremium:  weeklyPremium * 100,
      coveragePerDay: coveragePerDay * 100,
      maxWeeklyClaim: maxWeeklyClaim * 100,
      renewalDate,
    },
  });

  res.json({ success: true, message: 'Policy renewed for next week', data: renewed });
});

export default router;
