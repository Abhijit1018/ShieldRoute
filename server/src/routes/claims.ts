import { Router, type Response, type Request } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../types';
import prisma from '../db/prisma';
import { generateClaimNumber } from '../services/premiumService';

const router = Router();

// GET /api/claims/mine — Rider's claim history
router.get('/mine', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const policy = await prisma.policy.findFirst({
    where: { riderId: req.rider!.riderId, status: 'Active' },
  });

  if (!policy) {
    res.status(404).json({ success: false, error: 'No active policy' });
    return;
  }

  const claims = await prisma.claim.findMany({
    where: { policyId: policy.id },
    include: { triggerEvent: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: claims });
});

// POST /api/claims/trigger — Called by the trigger monitor service when a threshold is crossed
// (internal service-to-service, not called by the rider)
const TriggerClaimSchema = z.object({
  zone: z.enum(['Andheri', 'Bandra', 'Dadar', 'Dharavi', 'Kurla', 'Thane', 'NaviMumbai', 'Borivali']),
  triggerType: z.enum(['HeavyRain', 'SeverePollution', 'ExtremeHeat', 'PlatformOutage', 'CivilDisruption']),
  value: z.number(),
  threshold: z.number(),
  disruptionHours: z.number().default(4),
  source: z.string().default('api'),
});

router.post('/trigger', async (req: Request, res: Response): Promise<void> => {
  const parsed = TriggerClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { zone, triggerType, value, threshold, disruptionHours, source } = parsed.data;

  // Create trigger event
  const triggerEvent = await prisma.triggerEvent.create({
    data: { zone, triggerType, value, threshold, source },
  });

  // Find all active policies in this zone
  const PLAN_COVERAGE_RATE = { Basic: 0.7, Standard: 0.85, Premium: 1.0 };
  const PLAN_TRIGGERS: Record<string, string[]> = {
    Basic:    ['HeavyRain'],
    Standard: ['HeavyRain', 'SeverePollution', 'ExtremeHeat'],
    Premium:  ['HeavyRain', 'SeverePollution', 'ExtremeHeat', 'PlatformOutage', 'CivilDisruption'],
  };

  const policies = await prisma.policy.findMany({
    where: { zone, status: 'Active' },
    include: { rider: true },
  });

  const claimsCreated = [];

  for (const policy of policies) {
    // Check if this plan covers this trigger type
    if (!PLAN_TRIGGERS[policy.plan].includes(triggerType)) continue;

    // Avoid duplicate claims for same trigger event + policy
    const existing = await prisma.claim.findFirst({
      where: { policyId: policy.id, triggerEventId: triggerEvent.id },
    });
    if (existing) continue;

    const coverageRate = PLAN_COVERAGE_RATE[policy.plan as keyof typeof PLAN_COVERAGE_RATE];
    const payoutAmount = Math.round((policy.coveragePerDay / 100) * coverageRate * (disruptionHours / 8) * 100);

    // Cap at maxWeeklyClaim
    const cappedPayout = Math.min(payoutAmount, policy.maxWeeklyClaim);

    const claim = await prisma.claim.create({
      data: {
        claimNumber: generateClaimNumber(),
        policyId: policy.id,
        triggerType,
        triggerEventId: triggerEvent.id,
        disruptionHours,
        payoutAmount: cappedPayout,
        status: 'Processing',
      },
    });

    claimsCreated.push(claim);

    // Auto-approve after 5 seconds (Phase 1 simulation)
    // Phase 2: replace with actual UPI payout + webhook confirmation
    setTimeout(async () => {
      await prisma.claim.update({
        where: { id: claim.id },
        data: { status: 'Approved', approvedAt: new Date() },
      });

      setTimeout(async () => {
        await prisma.claim.update({
          where: { id: claim.id },
          data: {
            status: 'Paid',
            paidAt: new Date(),
            upiRef: `${Math.floor(Math.random() * 9000 + 1000)}@upi`,
          },
        });
      }, 5000);
    }, 5000);
  }

  res.json({
    success: true,
    message: `Trigger event created. ${claimsCreated.length} claims initiated.`,
    data: { triggerEvent, claimsCreated: claimsCreated.length },
  });
});

// GET /api/claims/:id — Get single claim
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const claim = await prisma.claim.findUnique({
    where: { id: req.params.id },
    include: { triggerEvent: true, policy: { include: { rider: true } } },
  });

  if (!claim || claim.policy.riderId !== req.rider!.riderId) {
    res.status(404).json({ success: false, error: 'Claim not found' });
    return;
  }

  res.json({ success: true, data: claim });
});

export default router;
