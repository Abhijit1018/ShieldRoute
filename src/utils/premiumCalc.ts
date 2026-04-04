import type { Zone, Platform, Plan, OnboardingData, PeakHour } from '../types';
import { ZONE_DATA } from '../data/mockData';

const PEAK_HOUR_WEIGHTS: Record<PeakHour, number> = {
  Morning: -1,
  Afternoon: 0,
  Evening: 2,
  Night: 3,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculatePremium(
  weeklyEarnings: number,
  zone: Zone,
  weeklyHours: number,
  platform: Platform,
  riskScore: number,
  plan: Plan
): number {
  const base = weeklyEarnings * 0.018;

  const zoneMult = ZONE_DATA[zone].multiplier;

  const hoursMult = weeklyHours < 30 ? 0.85 : weeklyHours <= 50 ? 1.0 : 1.1;

  const platformMult = platform === 'Swiggy' ? 1.05 : 1.0;

  const riskMult = riskScore < 65 ? 0.9 : riskScore <= 75 ? 1.0 : 1.1;

  const planMult = plan === 'Basic' ? 0.85 : plan === 'Standard' ? 1.0 : 1.2;

  const raw = base * zoneMult * hoursMult * platformMult * riskMult * planMult;

  const rounded = Math.round(raw / 5) * 5;
  return Math.max(49, Math.min(249, rounded));
}

export function calculateRiskScore(
  zone: Zone,
  weeklyHours: number,
  profile?: {
    yearsActive?: number;
    platform?: Platform;
    weeklyEarnings?: number;
    peakHours?: PeakHour[];
  }
): number {
  const zd = ZONE_DATA[zone];
  const yearsActive = profile?.yearsActive ?? 0;
  const platform = profile?.platform ?? 'Zomato';
  const weeklyEarnings = profile?.weeklyEarnings ?? 7000;
  const peakHours: PeakHour[] = profile?.peakHours?.length ? profile.peakHours : ['Evening'];

  const zoneBase = (zd.weatherRisk + zd.strikeRisk + zd.outageRisk) / 3;
  const peakExposure = peakHours.reduce((sum, h) => sum + PEAK_HOUR_WEIGHTS[h], 0) / peakHours.length;

  const score =
    50 +
    zoneBase * 0.55 +
    (weeklyHours - 40) * 0.22 +
    -Math.min(8, yearsActive * 1.4) +
    (platform === 'Swiggy' ? 1.5 : 0) +
    clamp((weeklyEarnings - 7000) / 2500, -2, 3) +
    peakExposure * 1.1 +
    (weeklyHours > 55 && peakHours.includes('Night') ? 2 : 0);

  return clamp(Math.round(score), 58, 90);
}

export function getZoneSafetyRating(zone: Zone): 'A' | 'B' | 'C' {
  const days = ZONE_DATA[zone].disruptionDays;
  if (days <= 6) return 'A';
  if (days <= 11) return 'B';
  return 'C';
}

export function getRecommendedPlan(riskScore: number): Plan {
  if (riskScore < 65) return 'Basic';
  if (riskScore <= 75) return 'Standard';
  return 'Premium';
}

export function buildOnboardingResult(data: Partial<OnboardingData>): Partial<OnboardingData> {
  const zone = data.zone!;
  const earnings = data.weeklyEarnings || 5000;
  const hours = data.weeklyHours || 40;
  const platform = data.platform || 'Zomato';
  const peakHours: PeakHour[] = data.peakHours && data.peakHours.length > 0 ? data.peakHours : ['Evening'];

  const riskScore = calculateRiskScore(zone, hours, {
    yearsActive: data.yearsActive ?? 0,
    platform,
    weeklyEarnings: earnings,
    peakHours,
  });
  const zoneSafetyRating = getZoneSafetyRating(zone);
  const recommendedPlan = getRecommendedPlan(riskScore);

  const coveragePerDay = Math.round(earnings / 6);
  const maxWeeklyClaim = Math.min(Math.round(earnings * 0.7), 2000);

  const weeklyPremium = calculatePremium(earnings, zone, hours, platform, riskScore, recommendedPlan);

  const zd = ZONE_DATA[zone];

  return {
    riskScore,
    zoneSafetyRating,
    recommendedPlan,
    selectedPlan: recommendedPlan,
    weatherRisk: zd.weatherRisk,
    strikeRisk: zd.strikeRisk,
    outageRisk: zd.outageRisk,
    weeklyPremium,
    coveragePerDay,
    maxWeeklyClaim,
  };
}

export function getPlanCoverage(plan: Plan, coveragePerDay: number): number {
  const mult = plan === 'Basic' ? 0.7 : plan === 'Standard' ? 0.85 : 1.0;
  return Math.round(coveragePerDay * mult);
}
