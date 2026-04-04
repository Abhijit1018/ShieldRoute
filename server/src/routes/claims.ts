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

// GET /api/claims/intelligence — ML-driven insights for the authenticated rider
router.get('/intelligence', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const riderId = req.rider!.riderId;

  const policy = await prisma.policy.findFirst({
    where: { riderId, status: 'Active' },
    include: { rider: true },
  });

  if (!policy) {
    res.status(404).json({ success: false, error: 'No active policy' });
    return;
  }

  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const allClaims = await prisma.claim.findMany({
    where: { policyId: policy.id, createdAt: { gte: eightWeeksAgo } },
    orderBy: { createdAt: 'desc' },
  });

  const paidClaims = allClaims.filter(c => c.status === 'Paid');
  const totalPaidOut = paidClaims.reduce((sum, c) => sum + c.payoutAmount, 0);
  const avgClaimsPerWeek = Math.round((paidClaims.length / 8) * 10) / 10;

  // Most common trigger
  const triggerCounts: Record<string, number> = {};
  for (const c of allClaims) {
    triggerCounts[c.triggerType] = (triggerCounts[c.triggerType] ?? 0) + 1;
  }
  const mostCommonTrigger = Object.entries(triggerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'None';

  // Safe days streak (days since last claim)
  const lastClaim = paidClaims[0];
  const safeDaysStreak = lastClaim
    ? Math.floor((Date.now() - lastClaim.createdAt.getTime()) / 86400000)
    : 30;

  // Personal safety score
  const personalSafetyScore = Math.max(0, Math.min(100, 100 - paidClaims.length * 5));

  // Zone risk comparison (simple heuristic)
  const highRiskZones = ['Dharavi', 'Kurla', 'Dadar'];
  const lowRiskZones = ['NaviMumbai', 'Bandra'];
  const zoneRiskComparison: 'above_avg' | 'avg' | 'below_avg' =
    highRiskZones.includes(policy.zone) ? 'above_avg' :
    lowRiskZones.includes(policy.zone) ? 'below_avg' : 'avg';

  // Predicted next claim (probabilistic)
  const TRIGGER_PROB: Record<string, number> = {
    HeavyRain: 0.45, SeverePollution: 0.20, ExtremeHeat: 0.15,
    PlatformOutage: 0.12, CivilDisruption: 0.08,
  };
  const topTrigger = mostCommonTrigger !== 'None' ? mostCommonTrigger : 'HeavyRain';
  const estimatedDays = Math.round(7 / (avgClaimsPerWeek || 0.5));
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + estimatedDays);

  // AI-generated insight strings
  const insights: string[] = [];
  if (safeDaysStreak >= 7) {
    insights.push(`${safeDaysStreak} consecutive safe days — your safety score is improving`);
  }
  if (zoneRiskComparison === 'above_avg') {
    insights.push(`${policy.zone} zone has above-average disruption history — consider upgrading to Premium plan for full coverage`);
  }
  if (zoneRiskComparison === 'below_avg') {
    insights.push(`${policy.zone} is one of Mumbai's safest zones — you qualify for our zone safety discount`);
  }
  if (avgClaimsPerWeek > 1) {
    insights.push('Your claim frequency is higher than average — ensure you\'re working during low-risk hours');
  }
  if (personalSafetyScore >= 80) {
    insights.push(`Safety score of ${personalSafetyScore}/100 qualifies you for a loyalty discount on renewal`);
  }
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) {
    insights.push('Mumbai monsoon season active — Heavy Rain triggers are significantly more frequent in your zone');
  }

  res.json({
    success: true,
    data: {
      mostCommonTrigger,
      avgClaimsPerWeek,
      zoneRiskComparison,
      predictedNextClaim: {
        triggerType: topTrigger,
        probability: TRIGGER_PROB[topTrigger] ?? 0.3,
        estimatedDate: estimatedDate.toISOString(),
      },
      safeDaysStreak,
      totalPaidOut: Math.round(totalPaidOut / 100), // convert paise to ₹
      personalSafetyScore,
      insights,
    },
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
