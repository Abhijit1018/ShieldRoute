import type { Zone, Platform, Plan, OnboardingData } from '../types';
import { ZONE_DATA } from '../data/mockData';

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

export function calculateRiskScore(zone: Zone, weeklyHours: number): number {
  const zd = ZONE_DATA[zone];
  const baseScore = (zd.weatherRisk + zd.strikeRisk + zd.outageRisk) / 3;
  const hoursAdj = weeklyHours > 50 ? 5 : weeklyHours < 30 ? -5 : 0;
  const score = 50 + baseScore * 0.6 + hoursAdj;
  return Math.min(85, Math.max(60, Math.round(score)));
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

  const riskScore = calculateRiskScore(zone, hours);
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
