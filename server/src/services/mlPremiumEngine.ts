import type { Zone, Platform, Plan } from '../types';
import {
  calculateWeeklyPremium,
  calculateRiskScore,
} from './premiumService';
import prisma from '../db/prisma';
import type { Prisma } from '@prisma/client';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ExplainabilityItem {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  amountEffect: number;  // +/- rupees (negative = cheaper for rider)
  description: string;
}

export interface PremiumFactors {
  basePremium: number;
  seasonalMultiplier: number;
  seasonalAdjustment: number;
  zoneHistoryDiscount: number;
  personalSafetyScore: number;
  personalSafetyDiscount: number;
  fraudPenalty: number;
  finalPremium: number;
}

export interface MLPremiumResult {
  weeklyPremium: number;
  factors: PremiumFactors;
  explanation: ExplainabilityItem[];
}

// ── Season logic ──────────────────────────────────────────────────────────────

function getSeasonalMultiplier(): { multiplier: number; name: string; description: string } {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 9) {
    return { multiplier: 1.3, name: 'Monsoon Season', description: 'Active monsoon season (Jun–Sep) — elevated rain & flooding risk' };
  }
  if (month >= 4 && month <= 5) {
    return { multiplier: 1.1, name: 'Summer Heat', description: 'Peak summer (Apr–May) — extreme heat index risk elevated' };
  }
  if (month === 10) {
    return { multiplier: 1.1, name: 'Post-Monsoon', description: 'Post-monsoon (Oct) — elevated AQI from Diwali season' };
  }
  return { multiplier: 1.0, name: 'Standard Season', description: 'Normal weather period — no seasonal adjustment' };
}

// ── Zone history discount ─────────────────────────────────────────────────────
// Query last 4 weeks of ZoneRiskSnapshot to assess disruption frequency

async function getZoneHistoryDiscount(zone: Zone): Promise<{ discount: number; disruptionDays: number; weeksCounted: number }> {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  try {
    const snapshots = await prisma.zoneRiskSnapshot.findMany({
      where: { zone, weekStart: { gte: fourWeeksAgo } },
      orderBy: { weekStart: 'desc' },
      take: 4,
    });

    if (snapshots.length === 0) {
      // No history — use static zone data as proxy
      const staticDisruption: Record<Zone, number> = {
        NaviMumbai: 4, Bandra: 5, Thane: 7, Andheri: 8,
        Borivali: 8, Dadar: 11, Kurla: 12, Dharavi: 14,
      };
      const days = staticDisruption[zone];
      return { discount: computeDiscountFromDays(days), disruptionDays: days, weeksCounted: 0 };
    }

    const totalDisruptionDays = snapshots.reduce((sum: number, s) => sum + s.disruptionDays, 0);
    const avgDisruptionDays = totalDisruptionDays / snapshots.length;

    return {
      discount: computeDiscountFromDays(avgDisruptionDays),
      disruptionDays: Math.round(avgDisruptionDays),
      weeksCounted: snapshots.length,
    };
  } catch {
    return { discount: 0, disruptionDays: 0, weeksCounted: 0 };
  }
}

function computeDiscountFromDays(avgDays: number): number {
  // Lower disruption days → bigger discount (₹ off weekly premium)
  if (avgDays <= 3)  return -15;
  if (avgDays <= 5)  return -12;
  if (avgDays <= 7)  return -8;
  if (avgDays <= 10) return -4;
  if (avgDays <= 12) return -2;
  return 0; // High-risk zones get no discount
}

// ── Personal safety score ─────────────────────────────────────────────────────

async function getPersonalSafetyData(riderId: string): Promise<{
  score: number;
  discount: number;
  claimCount: number;
  safeDays: number;
}> {
  try {
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const policy = await prisma.policy.findFirst({
      where: { riderId, status: 'Active' },
      include: {
        claims: {
          where: { createdAt: { gte: eightWeeksAgo } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const claims = policy?.claims ?? [];
    const paidClaims = claims.filter(c => c.status === 'Paid');

    // Score: starts at 100, -5 per claim
    const score = Math.max(0, Math.min(100, 100 - paidClaims.length * 5));

    // Safe days: days since last claim (or since policy start)
    const lastClaim = paidClaims[0];
    const safeDays = lastClaim
      ? Math.floor((Date.now() - lastClaim.createdAt.getTime()) / 86400000)
      : 30;

    return {
      score,
      discount: computePersonalDiscount(score),
      claimCount: paidClaims.length,
      safeDays,
    };
  } catch {
    return { score: 80, discount: -5, claimCount: 0, safeDays: 30 };
  }
}

function computePersonalDiscount(score: number): number {
  if (score >= 90) return -10;
  if (score >= 75) return -5;
  if (score >= 60) return 0;
  if (score >= 40) return +5;  // slight penalty — high claim frequency
  return +10; // high claim frequency penalty
}

// ── Fraud penalty ─────────────────────────────────────────────────────────────

async function getFraudPenalty(riderId: string): Promise<{ penalty: number; reason: string }> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentClaims = await prisma.claim.findMany({
      where: {
        policy: { riderId },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { fraudScore: true, fraudFlags: true },
    });

    const highFraudClaims = recentClaims.filter(c => c.fraudScore > 60);
    if (highFraudClaims.length >= 2) {
      return { penalty: 20, reason: 'Multiple high-fraud-score claims in last 30 days' };
    }
    if (highFraudClaims.length === 1) {
      return { penalty: 10, reason: 'One high-fraud-score claim in last 30 days' };
    }
    return { penalty: 0, reason: '' };
  } catch {
    return { penalty: 0, reason: '' };
  }
}

// ── Zone migration detection ──────────────────────────────────────────────────

export async function detectZoneMigration(riderId: string, newZone: Zone): Promise<boolean> {
  try {
    const rider = await prisma.rider.findUnique({ where: { id: riderId }, select: { zone: true } });
    return rider?.zone !== newZone;
  } catch {
    return false;
  }
}

// ── Main ML premium calculation ───────────────────────────────────────────────

export async function calculateMLPremium(
  riderId: string | null,
  zone: Zone,
  weeklyEarnings: number,
  weeklyHours: number,
  platform: Platform,
  plan: Plan
): Promise<MLPremiumResult> {
  // 1. Base premium (Phase 1 formula)
  const riskScore = calculateRiskScore(zone, weeklyHours, {
    platform,
    weeklyEarnings,
  });
  const basePremium = calculateWeeklyPremium(weeklyEarnings, zone, weeklyHours, platform, riskScore, plan);

  // 2. Seasonal adjustment
  const season = getSeasonalMultiplier();
  const seasonalAdjustment = Math.round(basePremium * (season.multiplier - 1));

  // 3. Zone history discount
  const zoneHistory = await getZoneHistoryDiscount(zone);

  // 4. Personal safety (requires riderId)
  const personal = riderId
    ? await getPersonalSafetyData(riderId)
    : { score: 80, discount: -5, claimCount: 0, safeDays: 30 };

  // 5. Fraud penalty
  const fraud = riderId
    ? await getFraudPenalty(riderId)
    : { penalty: 0, reason: '' };

  // 6. Assemble final premium
  const rawFinal = basePremium + seasonalAdjustment + zoneHistory.discount + personal.discount + fraud.penalty;
  const finalPremium = Math.round(Math.max(49, Math.min(299, rawFinal)) / 5) * 5;

  const factors: PremiumFactors = {
    basePremium,
    seasonalMultiplier: season.multiplier,
    seasonalAdjustment,
    zoneHistoryDiscount: zoneHistory.discount,
    personalSafetyScore: personal.score,
    personalSafetyDiscount: personal.discount,
    fraudPenalty: fraud.penalty,
    finalPremium,
  };

  // 7. Build explainability
  const explanation = buildExplanation(
    basePremium, season, zoneHistory, personal, fraud, zone, plan
  );

  return { weeklyPremium: finalPremium, factors, explanation };
}

function buildExplanation(
  base: number,
  season: { multiplier: number; name: string; description: string },
  zoneHistory: { discount: number; disruptionDays: number; weeksCounted: number },
  personal: { score: number; discount: number; claimCount: number; safeDays: number },
  fraud: { penalty: number; reason: string },
  zone: Zone,
  plan: Plan
): ExplainabilityItem[] {
  const items: ExplainabilityItem[] = [];

  // Base
  items.push({
    factor: 'Base Premium',
    impact: 'neutral',
    amountEffect: 0,
    description: `Calculated from your zone (${zone}), earnings, hours, platform, and ${plan} plan — ₹${base}/week`,
  });

  // Seasonal
  if (season.multiplier !== 1.0) {
    const adj = Math.round(base * (season.multiplier - 1));
    items.push({
      factor: season.name,
      impact: 'negative',
      amountEffect: adj,
      description: `${season.description} → +₹${adj} adjustment`,
    });
  } else {
    items.push({
      factor: 'Seasonal Adjustment',
      impact: 'neutral',
      amountEffect: 0,
      description: 'Current season has no premium adjustment',
    });
  }

  // Zone history
  if (zoneHistory.discount < 0) {
    const label = zoneHistory.weeksCounted > 0
      ? `Based on ${zoneHistory.weeksCounted}-week zone history (avg ${zoneHistory.disruptionDays} disruption days/week)`
      : `Based on zone historical data (${zoneHistory.disruptionDays} avg disruption days/week)`;
    items.push({
      factor: 'Zone Safety Discount',
      impact: 'positive',
      amountEffect: zoneHistory.discount,
      description: `${label} → ₹${Math.abs(zoneHistory.discount)} discount applied`,
    });
  } else {
    items.push({
      factor: 'Zone History',
      impact: 'neutral',
      amountEffect: 0,
      description: `Zone ${zone} has elevated disruption history — no discount available`,
    });
  }

  // Personal safety
  if (personal.discount < 0) {
    items.push({
      factor: 'Personal Safety Score',
      impact: 'positive',
      amountEffect: personal.discount,
      description: `Safety score ${personal.score}/100 · ${personal.safeDays} days since last claim → ₹${Math.abs(personal.discount)} loyalty discount`,
    });
  } else if (personal.discount > 0) {
    items.push({
      factor: 'Claim Frequency Adjustment',
      impact: 'negative',
      amountEffect: personal.discount,
      description: `${personal.claimCount} claims in last 8 weeks reduces your safety score (${personal.score}/100) → +₹${personal.discount} adjustment`,
    });
  } else {
    items.push({
      factor: 'Personal Safety Score',
      impact: 'neutral',
      amountEffect: 0,
      description: `Safety score ${personal.score}/100 — standard rate applies`,
    });
  }

  // Fraud penalty
  if (fraud.penalty > 0) {
    items.push({
      factor: 'Risk Review Adjustment',
      impact: 'negative',
      amountEffect: fraud.penalty,
      description: `${fraud.reason} → +₹${fraud.penalty} risk adjustment`,
    });
  }

  return items;
}

// ── Persist ML snapshot ───────────────────────────────────────────────────────

export async function persistMLSnapshot(
  riderId: string,
  zone: Zone,
  result: MLPremiumResult
): Promise<void> {
  try {
    await prisma.mLPremiumSnapshot.create({
      data: {
        riderId,
        zone,
        weeklyPremium: result.weeklyPremium * 100, // store in paise
        baseAmount: result.factors.basePremium * 100,
        seasonalAdj: result.factors.seasonalAdjustment * 100,
        zoneDiscount: result.factors.zoneHistoryDiscount * 100,
        personalDiscount: result.factors.personalSafetyDiscount * 100,
        fraudPenalty: result.factors.fraudPenalty * 100,
        explanation: result.explanation as unknown as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Non-critical — schema migration may not have run yet
  }
}

