import type { Zone } from '../types';

export const ZONE_DATA: Record<Zone, {
  weatherRisk: number;
  strikeRisk: number;
  outageRisk: number;
  disruptionDays: number;
  multiplier: number;
}> = {
  Andheri:   { weatherRisk: 35, strikeRisk: 15, outageRisk: 10, disruptionDays: 8,  multiplier: 1.00 },
  Bandra:    { weatherRisk: 25, strikeRisk: 10, outageRisk: 8,  disruptionDays: 5,  multiplier: 0.90 },
  Dadar:     { weatherRisk: 40, strikeRisk: 25, outageRisk: 12, disruptionDays: 11, multiplier: 1.10 },
  Dharavi:   { weatherRisk: 55, strikeRisk: 30, outageRisk: 15, disruptionDays: 14, multiplier: 1.20 },
  Kurla:     { weatherRisk: 45, strikeRisk: 20, outageRisk: 12, disruptionDays: 12, multiplier: 1.15 },
  Thane:     { weatherRisk: 30, strikeRisk: 12, outageRisk: 10, disruptionDays: 7,  multiplier: 1.05 },
  NaviMumbai:{ weatherRisk: 20, strikeRisk: 8,  outageRisk: 8,  disruptionDays: 4,  multiplier: 0.95 },
  Borivali:  { weatherRisk: 32, strikeRisk: 14, outageRisk: 10, disruptionDays: 8,  multiplier: 1.00 },
};

export const ZONE_RISK_LEVEL: Record<Zone, 'Low' | 'Medium' | 'High' | 'Critical'> = {
  NaviMumbai: 'Low',
  Bandra:     'Low',
  Thane:      'Medium',
  Andheri:    'Medium',
  Borivali:   'Medium',
  Dadar:      'High',
  Kurla:      'High',
  Dharavi:    'Critical',
};

export const ZONE_DISPLAY_NAMES: Record<Zone, string> = {
  Andheri:    'Andheri',
  Bandra:     'Bandra',
  Dadar:      'Dadar',
  Dharavi:    'Dharavi',
  Kurla:      'Kurla',
  Thane:      'Thane',
  NaviMumbai: 'Navi Mumbai',
  Borivali:   'Borivali',
};

export const ADMIN_ZONE_STATS: Record<Zone, { activePolicies: number; claimsWeek: number; disruptionProb: number }> = {
  Andheri:    { activePolicies: 234, claimsWeek: 18, disruptionProb: 38 },
  Bandra:     { activePolicies: 189, claimsWeek: 9,  disruptionProb: 22 },
  Dadar:      { activePolicies: 156, claimsWeek: 27, disruptionProb: 55 },
  Dharavi:    { activePolicies: 198, claimsWeek: 41, disruptionProb: 72 },
  Kurla:      { activePolicies: 143, claimsWeek: 33, disruptionProb: 60 },
  Thane:      { activePolicies: 112, claimsWeek: 14, disruptionProb: 31 },
  NaviMumbai: { activePolicies: 97,  claimsWeek: 6,  disruptionProb: 18 },
  Borivali:   { activePolicies: 118, claimsWeek: 16, disruptionProb: 35 },
};

export const TESTIMONIALS = [
  {
    name: 'Ramesh Kale',
    zone: 'Dharavi',
    platform: 'Zomato',
    quote: 'Last monsoon I lost 4 days of income. ShieldRoute paid ₹1,400 in 4 minutes. Life-changing for my family.',
    rating: 5,
  },
  {
    name: 'Priya Nair',
    zone: 'Bandra',
    platform: 'Swiggy',
    quote: 'The zone-based pricing is fair. I pay less because Bandra has fewer disruptions. Very transparent system.',
    rating: 5,
  },
  {
    name: 'Suresh Patil',
    zone: 'Kurla',
    platform: 'Zomato',
    quote: 'When the AQI shot up during Diwali, I got an automatic claim alert. No paperwork, no calls, just money.',
    rating: 5,
  },
];

export const EARNINGS_CHART_DATA = [
  { day: 'Mon', potentialLoss: 1200, covered: 900 },
  { day: 'Tue', potentialLoss: 800,  covered: 800 },
  { day: 'Wed', potentialLoss: 1800, covered: 1400 },
  { day: 'Thu', potentialLoss: 600,  covered: 600 },
  { day: 'Fri', potentialLoss: 2200, covered: 1800 },
  { day: 'Sat', potentialLoss: 900,  covered: 900 },
  { day: 'Sun', potentialLoss: 1500, covered: 1200 },
];

export const FORECAST_DATA = [
  { day: 'Thu', probability: 42 },
  { day: 'Fri', probability: 58 },
  { day: 'Sat', probability: 75 },
  { day: 'Sun', probability: 81 },
  { day: 'Mon', probability: 67 },
  { day: 'Tue', probability: 45 },
  { day: 'Wed', probability: 33 },
];

export const PNL_DATA = [
  { week: 'Week 1 (Mar)', premiums: 48200, claims: 11400, surplus: 36800 },
  { week: 'Week 2 (Mar)', premiums: 51800, claims: 14200, surplus: 37600 },
  { week: 'Week 3 (Mar)', premiums: 46900, claims: 9800,  surplus: 37100 },
  { week: 'Week 4 (Mar)', premiums: 37450, claims: 11800, surplus: 25650 },
];

export const FRAUD_FLAGS = [
  {
    id: 'CL09-482910',
    flag: 'GPS coordinates outside claimed zone',
    riskScore: 87,
    zone: 'Andheri',
    amount: 1200,
    detail: 'Rider claimed disruption in Andheri zone, but GPS data shows location in Pune (209km away) during the claim period. High probability of fraudulent claim.',
  },
  {
    id: 'CL11-773421',
    flag: '3 claims in 24 hours (threshold: 1)',
    riskScore: 92,
    zone: 'Dharavi',
    amount: 3600,
    detail: 'Rider filed 3 separate disruption claims within a 24-hour window. Our policy allows maximum 1 claim per 24 hours. Pattern matches known fraud behavior.',
  },
  {
    id: 'CL07-219834',
    flag: 'Claim filed 2min after disruption end',
    riskScore: 74,
    zone: 'Kurla',
    amount: 800,
    detail: 'Disruption trigger ended at 14:32. Claim was submitted at 14:34 — statistically improbable response time. May indicate pre-knowledge of trigger conditions.',
  },
];
