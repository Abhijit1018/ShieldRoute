import { Router, type Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../types';
import prisma from '../db/prisma';
import {
  calculateRiskScore,
  calculateWeeklyPremium,
  calculateCoveragePerDay,
  calculateMaxWeeklyClaim,
  getZoneSafetyRating,
  getRecommendedPlan,
  getZoneRiskBreakdown,
  generatePolicyNumber,
} from '../services/premiumService';

const router = Router();

const OnboardingSchema = z.object({
  name: z.string().min(2),
  platform: z.enum(['Zomato', 'Swiggy']),
  yearsActive: z.number().int().min(0).max(10),
  zone: z.enum(['Andheri', 'Bandra', 'Dadar', 'Dharavi', 'Kurla', 'Thane', 'NaviMumbai', 'Borivali']),
  weeklyHours: z.number().int().min(20).max(80),
  weeklyEarnings: z.number().int().min(1000).max(50000),
  peakHours: z.array(z.enum(['Morning', 'Afternoon', 'Evening', 'Night'])),
  selectedPlan: z.enum(['Basic', 'Standard', 'Premium']),
});

// POST /api/onboarding/assess — AI risk assessment (no plan needed yet)
router.post('/assess', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const partialSchema = OnboardingSchema.omit({ selectedPlan: true, name: true });
  const parsed = partialSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const { zone, weeklyHours, platform, weeklyEarnings } = parsed.data;

  const riskScore = calculateRiskScore(zone, weeklyHours);
  const zoneSafetyRating = getZoneSafetyRating(zone);
  const recommendedPlan = getRecommendedPlan(riskScore);
  const zoneBreakdown = getZoneRiskBreakdown(zone);

  // Preview premiums for all 3 plans
  const premiumPreview = {
    Basic:    calculateWeeklyPremium(weeklyEarnings, zone, weeklyHours, platform, riskScore, 'Basic'),
    Standard: calculateWeeklyPremium(weeklyEarnings, zone, weeklyHours, platform, riskScore, 'Standard'),
    Premium:  calculateWeeklyPremium(weeklyEarnings, zone, weeklyHours, platform, riskScore, 'Premium'),
  };

  res.json({
    success: true,
    data: {
      riskScore,
      zoneSafetyRating,
      recommendedPlan,
      zoneBreakdown,
      premiumPreview,
      coveragePerDay: Math.round(weeklyEarnings / 6),
      maxWeeklyClaim: calculateMaxWeeklyClaim(weeklyEarnings),
    },
  });
});

// POST /api/onboarding/enroll — Complete onboarding + create policy
router.post('/enroll', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = OnboardingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors[0].message });
    return;
  }

  const riderId = req.rider!.riderId;
  const { name, platform, yearsActive, zone, weeklyHours, weeklyEarnings, peakHours, selectedPlan } = parsed.data;

  const riskScore = calculateRiskScore(zone, weeklyHours);

  // Update rider profile
  const rider = await prisma.rider.update({
    where: { id: riderId },
    data: { name, platform, yearsActive, zone, weeklyHours, weeklyEarnings, peakHours, riskScore },
  });

  // Cancel any existing active policies
  await prisma.policy.updateMany({
    where: { riderId, status: 'Active' },
    data: { status: 'Expired' },
  });

  // Calculate premium and coverage
  const weeklyPremium   = calculateWeeklyPremium(weeklyEarnings, zone, weeklyHours, platform, riskScore, selectedPlan);
  const coveragePerDay  = calculateCoveragePerDay(weeklyEarnings, selectedPlan);
  const maxWeeklyClaim  = calculateMaxWeeklyClaim(weeklyEarnings);
  const renewalDate     = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const policy = await prisma.policy.create({
    data: {
      policyNumber: generatePolicyNumber(),
      riderId: rider.id,
      plan: selectedPlan,
      zone,
      weeklyPremium:  weeklyPremium * 100,  // store in paise
      coveragePerDay: coveragePerDay * 100,
      maxWeeklyClaim: maxWeeklyClaim * 100,
      renewalDate,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Policy created successfully',
    data: { rider, policy },
  });
});

export default router;
