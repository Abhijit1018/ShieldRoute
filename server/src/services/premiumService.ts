import type { Zone, Platform, Plan } from '../types';

const ZONE_MULTIPLIERS: Record<Zone, number> = {
  Andheri:    1.00,
  Bandra:     0.90,
  Dadar:      1.10,
  Dharavi:    1.20,
  Kurla:      1.15,
  Thane:      1.05,
  NaviMumbai: 0.95,
  Borivali:   1.00,
};

const ZONE_DATA: Record<Zone, { weatherRisk: number; strikeRisk: number; outageRisk: number; disruptionDays: number }> = {
  Andheri:    { weatherRisk: 35, strikeRisk: 15, outageRisk: 10, disruptionDays: 8  },
  Bandra:     { weatherRisk: 25, strikeRisk: 10, outageRisk: 8,  disruptionDays: 5  },
  Dadar:      { weatherRisk: 40, strikeRisk: 25, outageRisk: 12, disruptionDays: 11 },
  Dharavi:    { weatherRisk: 55, strikeRisk: 30, outageRisk: 15, disruptionDays: 14 },
  Kurla:      { weatherRisk: 45, strikeRisk: 20, outageRisk: 12, disruptionDays: 12 },
  Thane:      { weatherRisk: 30, strikeRisk: 12, outageRisk: 10, disruptionDays: 7  },
  NaviMumbai: { weatherRisk: 20, strikeRisk: 8,  outageRisk: 8,  disruptionDays: 4  },
  Borivali:   { weatherRisk: 32, strikeRisk: 14, outageRisk: 10, disruptionDays: 8  },
};

export function calculateRiskScore(zone: Zone, weeklyHours: number): number {
  const zd = ZONE_DATA[zone];
  const baseScore = (zd.weatherRisk + zd.strikeRisk + zd.outageRisk) / 3;
  const hoursAdj = weeklyHours > 50 ? 5 : weeklyHours < 30 ? -5 : 0;
  return Math.min(85, Math.max(60, Math.round(50 + baseScore * 0.6 + hoursAdj)));
}

export function calculateWeeklyPremium(
  weeklyEarnings: number,
  zone: Zone,
  weeklyHours: number,
  platform: Platform,
  riskScore: number,
  plan: Plan
): number {
  const base = weeklyEarnings * 0.018;
  const zoneMult     = ZONE_MULTIPLIERS[zone];
  const hoursMult    = weeklyHours < 30 ? 0.85 : weeklyHours <= 50 ? 1.0 : 1.1;
  const platformMult = platform === 'Swiggy' ? 1.05 : 1.0;
  const riskMult     = riskScore < 65 ? 0.9 : riskScore <= 75 ? 1.0 : 1.1;
  const planMult     = plan === 'Basic' ? 0.85 : plan === 'Standard' ? 1.0 : 1.2;

  const raw = base * zoneMult * hoursMult * platformMult * riskMult * planMult;
  const rounded = Math.round(raw / 5) * 5;
  return Math.max(49, Math.min(249, rounded));
}

export function calculateCoveragePerDay(weeklyEarnings: number, plan: Plan): number {
  const base = Math.round(weeklyEarnings / 6);
  const planRate = plan === 'Basic' ? 0.7 : plan === 'Standard' ? 0.85 : 1.0;
  return Math.round(base * planRate);
}

export function calculateMaxWeeklyClaim(weeklyEarnings: number): number {
  return Math.min(Math.round(weeklyEarnings * 0.7), 2000);
}

export function getZoneSafetyRating(zone: Zone): 'A' | 'B' | 'C' {
  const days = ZONE_DATA[zone].disruptionDays;
  return days <= 6 ? 'A' : days <= 11 ? 'B' : 'C';
}

export function getRecommendedPlan(riskScore: number): Plan {
  return riskScore < 65 ? 'Basic' : riskScore <= 75 ? 'Standard' : 'Premium';
}

export function getZoneRiskBreakdown(zone: Zone) {
  return ZONE_DATA[zone];
}

export function generatePolicyNumber(): string {
  const prefix = `SR${Math.floor(Math.random() * 90 + 10)}`;
  const suffix = Math.floor(Math.random() * 900000 + 100000);
  return `${prefix}-${suffix}`;
}

export function generateClaimNumber(): string {
  const prefix = `CL${Math.floor(Math.random() * 90 + 10)}`;
  const suffix = Math.floor(Math.random() * 900000 + 100000);
  return `${prefix}-${suffix}`;
}
