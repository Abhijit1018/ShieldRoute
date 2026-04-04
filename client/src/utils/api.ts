import type {
  AuthSession,
  Claim,
  OnboardingData,
  Payment,
  Plan,
  Policy,
  TriggerStatus,
  Zone,
} from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

const TRIGGER_LABELS: Record<string, string> = {
  HeavyRain: 'Heavy Rain',
  SeverePollution: 'Severe Pollution',
  ExtremeHeat: 'Extreme Heat',
  PlatformOutage: 'Platform Outage',
  CivilDisruption: 'Civil Disruption',
};

const ZONE_BREAKDOWN: Record<Zone, { weatherRisk: number; strikeRisk: number; outageRisk: number }> = {
  Andheri: { weatherRisk: 35, strikeRisk: 15, outageRisk: 10 },
  Bandra: { weatherRisk: 25, strikeRisk: 10, outageRisk: 8 },
  Dadar: { weatherRisk: 40, strikeRisk: 25, outageRisk: 12 },
  Dharavi: { weatherRisk: 55, strikeRisk: 30, outageRisk: 15 },
  Kurla: { weatherRisk: 45, strikeRisk: 20, outageRisk: 12 },
  Thane: { weatherRisk: 30, strikeRisk: 12, outageRisk: 10 },
  NaviMumbai: { weatherRisk: 20, strikeRisk: 8, outageRisk: 8 },
  Borivali: { weatherRisk: 32, strikeRisk: 14, outageRisk: 10 },
};

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  debug_otp?: string;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  token?: string;
  body?: unknown;
  headers?: HeadersInit;
}

interface BackendRider {
  id: string;
  name: string;
  phone: string;
  platform: 'Zomato' | 'Swiggy';
  yearsActive: number;
  zone: Zone;
  weeklyHours: number;
  weeklyEarnings: number;
  peakHours: string[];
  riskScore: number;
}

interface BackendPolicy {
  id: string;
  policyNumber: string;
  plan: Plan;
  zone: Zone;
  weeklyPremium: number;
  coveragePerDay: number;
  maxWeeklyClaim: number;
  status: 'Active' | 'Expired' | 'Cancelled';
  startDate: string;
  renewalDate: string;
  rider?: BackendRider;
}

interface BackendClaim {
  id: string;
  claimNumber: string;
  triggerType: string;
  disruptionHours: number;
  payoutAmount: number;
  status: Claim['status'];
  createdAt: string;
  upiRef: string | null;
}

interface BackendPayment {
  id: string;
  amount: number;
  status: string;
  weekStart: string;
  createdAt: string;
  razorpayOrderId: string | null;
}

interface BackendLiveTrigger {
  triggerType: string;
  label: string;
  zone: Zone;
  value: number;
  threshold: number;
  unit: string;
  status: TriggerStatus;
  source: string;
  startedAt: string | null;
}

export interface AssessmentResult {
  riskScore: number;
  zoneSafetyRating: 'A' | 'B' | 'C';
  recommendedPlan: Plan;
  weatherRisk: number;
  strikeRisk: number;
  outageRisk: number;
  premiumPreview: Record<Plan, number>;
  coveragePerDay: number;
  maxWeeklyClaim: number;
}

export interface SendOtpResult {
  provider?: string;
  mockMode: boolean;
  warning?: string;
  messageId?: string;
  debugOtp?: string;
}

export interface LiveTrigger {
  triggerType: string;
  label: string;
  zone: Zone;
  value: number;
  threshold: number;
  unit: string;
  status: TriggerStatus;
  source: string;
  startedAt: string | null;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function toRupees(paise: number) {
  return Math.round(paise / 100);
}

function toInDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString('en-IN');
}

function buildUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; raw: ApiEnvelope<T> }> {
  const { token, body, headers, ...rest } = options;

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed: ApiEnvelope<T> | null = null;

  if (text) {
    try {
      parsed = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      throw new ApiError(response.status, 'Server returned an invalid response.', text);
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, parsed?.error || parsed?.message || 'Request failed', parsed);
  }

  if (!parsed || !parsed.success) {
    throw new ApiError(response.status, parsed?.error || 'Request failed', parsed);
  }

  return { data: parsed.data, raw: parsed };
}

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const { data, raw } = await apiRequest<{
    provider?: string;
    mockMode: boolean;
    warning?: string;
    messageId?: string;
  }>('/api/auth/send-otp', {
    method: 'POST',
    body: { phone },
  });

  return {
    provider: data.provider,
    mockMode: data.mockMode,
    warning: data.warning,
    messageId: data.messageId,
    debugOtp: raw.debug_otp,
  };
}

export async function verifyOtp(phone: string, otp: string): Promise<AuthSession> {
  const { data } = await apiRequest<{
    token: string;
    rider: { id: string; phone: string };
  }>('/api/auth/verify-otp', {
    method: 'POST',
    body: { phone, otp },
  });

  return {
    token: data.token,
    riderId: data.rider.id,
    phone: data.rider.phone,
  };
}

export async function assessOnboarding(
  token: string,
  input: {
    platform: 'Zomato' | 'Swiggy';
    yearsActive: number;
    zone: Zone;
    weeklyHours: number;
    weeklyEarnings: number;
    peakHours: OnboardingData['peakHours'];
  }
): Promise<AssessmentResult> {
  const { data } = await apiRequest<{
    riskScore: number;
    zoneSafetyRating: 'A' | 'B' | 'C';
    recommendedPlan: Plan;
    zoneBreakdown: { weatherRisk: number; strikeRisk: number; outageRisk: number };
    premiumPreview: Record<Plan, number>;
    coveragePerDay: number;
    maxWeeklyClaim: number;
  }>('/api/onboarding/assess', {
    method: 'POST',
    token,
    body: input,
  });

  return {
    riskScore: data.riskScore,
    zoneSafetyRating: data.zoneSafetyRating,
    recommendedPlan: data.recommendedPlan,
    weatherRisk: data.zoneBreakdown.weatherRisk,
    strikeRisk: data.zoneBreakdown.strikeRisk,
    outageRisk: data.zoneBreakdown.outageRisk,
    premiumPreview: data.premiumPreview,
    coveragePerDay: data.coveragePerDay,
    maxWeeklyClaim: data.maxWeeklyClaim,
  };
}

export function mapBackendPolicy(policy: BackendPolicy, riderOverride?: BackendRider): Policy {
  const rider = riderOverride || policy.rider;

  if (!rider) {
    throw new Error('Policy mapping failed: rider payload missing');
  }

  const zoneRisk = ZONE_BREAKDOWN[rider.zone];
  const zoneSafetyRating: OnboardingData['zoneSafetyRating'] =
    rider.riskScore < 65 ? 'A' : rider.riskScore <= 75 ? 'B' : 'C';

  const onboarding: OnboardingData = {
    name: rider.name || '',
    phone: rider.phone,
    platform: rider.platform,
    yearsActive: rider.yearsActive,
    zone: rider.zone,
    weeklyHours: rider.weeklyHours,
    weeklyEarnings: rider.weeklyEarnings,
    peakHours: rider.peakHours as OnboardingData['peakHours'],
    riskScore: rider.riskScore,
    zoneSafetyRating,
    recommendedPlan: policy.plan,
    weatherRisk: zoneRisk.weatherRisk,
    strikeRisk: zoneRisk.strikeRisk,
    outageRisk: zoneRisk.outageRisk,
    selectedPlan: policy.plan,
    weeklyPremium: toRupees(policy.weeklyPremium),
    coveragePerDay: toRupees(policy.coveragePerDay),
    maxWeeklyClaim: toRupees(policy.maxWeeklyClaim),
  };

  return {
    policyId: policy.policyNumber,
    status: policy.status,
    startDate: toInDate(policy.startDate),
    renewalDate: toInDate(policy.renewalDate),
    onboarding,
  };
}

function mapBackendClaim(claim: BackendClaim): Claim {
  return {
    id: claim.claimNumber || claim.id,
    triggeredBy: TRIGGER_LABELS[claim.triggerType] || claim.triggerType,
    disruptionHours: claim.disruptionHours,
    payoutAmount: toRupees(claim.payoutAmount),
    status: claim.status,
    timestamp: new Date(claim.createdAt),
    upiRef: claim.upiRef || '-',
  };
}

function mapBackendPayment(payment: BackendPayment): Payment {
  return {
    id: payment.id,
    orderId: payment.razorpayOrderId || '-',
    amount: toRupees(payment.amount),
    status: payment.status,
    weekStart: toInDate(payment.weekStart),
    createdAt: new Date(payment.createdAt).toLocaleString('en-IN'),
  };
}

export async function enrollOnboarding(
  token: string,
  input: {
    name: string;
    platform: 'Zomato' | 'Swiggy';
    yearsActive: number;
    zone: Zone;
    weeklyHours: number;
    weeklyEarnings: number;
    peakHours: OnboardingData['peakHours'];
    selectedPlan: Plan;
  }
): Promise<Policy> {
  const { data } = await apiRequest<{ rider: BackendRider; policy: BackendPolicy }>('/api/onboarding/enroll', {
    method: 'POST',
    token,
    body: input,
  });

  return mapBackendPolicy(data.policy, data.rider);
}

export async function getMyPolicy(token: string): Promise<Policy | null> {
  try {
    const { data } = await apiRequest<BackendPolicy>('/api/policy/mine', {
      method: 'GET',
      token,
    });
    return mapBackendPolicy(data);
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function renewMyPolicy(token: string): Promise<Policy> {
  const { data } = await apiRequest<BackendPolicy>('/api/policy/renew', {
    method: 'POST',
    token,
  });

  return mapBackendPolicy(data);
}

export async function getMyClaims(token: string): Promise<Claim[]> {
  try {
    const { data } = await apiRequest<BackendClaim[]>('/api/claims/mine', {
      method: 'GET',
      token,
    });

    return data.map(mapBackendClaim);
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function createPremiumOrder(token: string): Promise<{
  provider: string;
  mockMode: boolean;
  orderId: string;
  amountPaise: number;
  razorpayKeyId?: string;
}> {
  const { data } = await apiRequest<{
    provider: string;
    mockMode: boolean;
    orderId: string;
    amountPaise: number;
    razorpayKeyId?: string;
  }>('/api/payments/create-order', {
    method: 'POST',
    token,
    body: {},
  });

  return data;
}

export async function verifyPremiumPayment(
  token: string,
  input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }
): Promise<void> {
  await apiRequest('/api/payments/verify', {
    method: 'POST',
    token,
    body: input,
  });
}

export async function getMyPayments(token: string): Promise<Payment[]> {
  const { data } = await apiRequest<BackendPayment[]>('/api/payments/mine', {
    method: 'GET',
    token,
  });

  return data.map(mapBackendPayment);
}

export async function getLiveTriggers(token: string): Promise<LiveTrigger[]> {
  const { data } = await apiRequest<BackendLiveTrigger[]>('/api/triggers/live', {
    method: 'GET',
    token,
  });

  return data;
}
