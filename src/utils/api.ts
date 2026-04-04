import type { Zone, Plan, Platform } from '../types';

const BASE = 'http://localhost:4000/api';

// ── Auth helpers ──────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('sr_token');
}

export function setToken(token: string): void {
  localStorage.setItem('sr_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('sr_token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Generic fetch helpers ─────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
  });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) throw new Error(json.error ?? 'Request failed');
  return json.data as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) throw new Error(json.error ?? 'Request failed');
  return json.data as T;
}

// ── DTO Types ─────────────────────────────────────────────────────────────────

export interface LiveZoneReadingDTO {
  zone: Zone;
  rainfall: number;
  aqi: number;
  heatIndex: number;
  platformOutageMin: number;
  civilDisruptionScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
  lastUpdated: string;
}

export interface TriggerFeedItemDTO {
  zone: Zone;
  triggerType: string;
  value: number;
  threshold: number;
  firedAt: string;
}

export interface ForecastSlotDTO {
  hour: number;
  label: string;
  rainfallProb: number;
  aqiProb: number;
  heatProb: number;
  overallRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  dominantTrigger: string;
}

export interface ZoneForecastDTO {
  zone: Zone;
  slots: ForecastSlotDTO[];
  peakRiskHour: number;
}

export interface ExplainabilityItemDTO {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  amountEffect: number;
  description: string;
}

export interface MLPremiumResultDTO {
  weeklyPremium: number;
  factors: {
    basePremium: number;
    seasonalMultiplier: number;
    seasonalAdjustment: number;
    zoneHistoryDiscount: number;
    personalSafetyScore: number;
    personalSafetyDiscount: number;
    fraudPenalty: number;
    finalPremium: number;
  };
  explanation: ExplainabilityItemDTO[];
}

export interface ClaimsIntelligenceDTO {
  mostCommonTrigger: string;
  avgClaimsPerWeek: number;
  zoneRiskComparison: 'above_avg' | 'avg' | 'below_avg';
  predictedNextClaim: {
    triggerType: string;
    probability: number;
    estimatedDate: string;
  };
  safeDaysStreak: number;
  totalPaidOut: number;
  personalSafetyScore: number;
  insights: string[];
}

export interface ClaimDTO {
  id: string;
  claimNumber: string;
  policyId: string;
  triggerType: string;
  triggerEventId: string;
  triggerEvent?: {
    zone: Zone;
    value: number;
    threshold: number;
    startedAt: string;
  };
  disruptionHours: number;
  payoutAmount: number;  // in paise
  upiRef: string | null;
  status: 'Processing' | 'Approved' | 'Paid' | 'Rejected';
  fraudScore: number;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PolicyDTO {
  id: string;
  policyNumber: string;
  riderId: string;
  plan: Plan;
  zone: Zone;
  weeklyPremium: number;    // in paise
  coveragePerDay: number;   // in paise
  maxWeeklyClaim: number;   // in paise
  status: 'Active' | 'Expired' | 'Cancelled';
  startDate: string;
  renewalDate: string;
  createdAt: string;
  rider?: {
    name: string;
    phone: string;
    platform: Platform;
    zone: Zone;
    weeklyEarnings: number;
    weeklyHours: number;
  };
  claims?: ClaimDTO[];
}

export interface AssessmentParams {
  zone: Zone;
  weeklyHours: number;
  yearsActive: number;
  platform: Platform;
  weeklyEarnings: number;
  peakHours: string[];
}

export interface AssessmentResult {
  riskScore: number;
  zoneSafetyRating: 'A' | 'B' | 'C';
  recommendedPlan: Plan;
  premiumPreview: Record<Plan, number>;
  coveragePerDay: number;
  maxWeeklyClaim: number;
  mlPremium?: MLPremiumResultDTO;
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {
  // ── Auth
  sendOtp: (phone: string) =>
    post<{ message: string; debug_otp?: string }>('/auth/send-otp', { phone }),

  verifyOtp: (phone: string, otp: string) =>
    post<{ token: string; rider: { id: string; name: string; phone: string }; isNew: boolean }>(
      '/auth/verify-otp', { phone, otp }
    ),

  // ── Onboarding / Assessment
  assess: (params: AssessmentParams) =>
    post<AssessmentResult>('/onboarding/assess', params),

  enroll: (params: AssessmentParams & { name: string; yearsActive: number; selectedPlan: Plan }) =>
    post<{ rider: unknown; policy: PolicyDTO }>('/onboarding/enroll', params),

  // ── Policy
  getMyPolicy: () => get<PolicyDTO>('/policy/mine'),
  renewPolicy: () => post<PolicyDTO>('/policy/renew', {}),

  // ── Claims
  getMyClaims: () => get<ClaimDTO[]>('/claims/mine'),
  getClaim: (id: string) => get<ClaimDTO>(`/claims/${id}`),
  getClaimsIntelligence: () => get<ClaimsIntelligenceDTO>('/claims/intelligence'),

  // ── Triggers / Live data
  getLiveTriggers: () => get<LiveZoneReadingDTO[]>('/triggers/live'),
  getLiveZoneTrigger: (zone: Zone) =>
    get<{ reading: LiveZoneReadingDTO; recentEvents: TriggerFeedItemDTO[] }>(`/triggers/live/${zone}`),
  getTriggerForecast: () => get<ZoneForecastDTO[]>('/triggers/forecast'),
  getTriggerFeed: () => get<TriggerFeedItemDTO[]>('/triggers/feed'),

  // ── Admin
  getAdminKPIs: () => get<unknown>('/admin/kpis'),
};

export default api;
