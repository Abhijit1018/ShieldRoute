export type Platform = 'Zomato' | 'Swiggy';

export type Zone =
  | 'Andheri'
  | 'Bandra'
  | 'Dadar'
  | 'Dharavi'
  | 'Kurla'
  | 'Thane'
  | 'NaviMumbai'
  | 'Borivali';

export type Plan = 'Basic' | 'Standard' | 'Premium';

export type PeakHour = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export type TriggerStatus = 'NORMAL' | 'WARNING' | 'TRIGGERED';

export type ClaimStatus = 'Processing' | 'Approved' | 'Paid' | 'Rejected';

export interface AuthSession {
  token: string;
  riderId: string;
  phone: string;
}

export interface OnboardingData {
  // Step 1
  name: string;
  phone: string;
  platform: Platform;
  yearsActive: number;
  // Step 2
  zone: Zone;
  weeklyHours: number;
  weeklyEarnings: number;
  peakHours: PeakHour[];
  // Step 3 (AI result)
  riskScore: number;
  zoneSafetyRating: 'A' | 'B' | 'C';
  recommendedPlan: Plan;
  weatherRisk: number;
  strikeRisk: number;
  outageRisk: number;
  // Step 4
  selectedPlan: Plan;
  weeklyPremium: number;
  coveragePerDay: number;
  maxWeeklyClaim: number;
}

export interface Policy {
  policyId: string;
  status: 'Active' | 'Expired' | 'Cancelled';
  startDate: string;
  renewalDate: string;
  onboarding: OnboardingData;
}

export interface Claim {
  id: string;
  triggeredBy: string;
  disruptionHours: number;
  payoutAmount: number;
  status: ClaimStatus;
  timestamp: Date;
  upiRef: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  weekStart: string;
  createdAt: string;
}

export interface TriggerState {
  name: string;
  status: TriggerStatus;
  value: string;
  threshold: string;
  icon: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

export interface AppState {
  auth: AuthSession | null;
  onboarding: OnboardingData | null;
  policy: Policy | null;
  claims: Claim[];
  payments: Payment[];
  toasts: Toast[];
  isHydrating: boolean;
}

export type AppAction =
  | { type: 'SET_AUTH'; payload: AuthSession }
  | { type: 'CLEAR_AUTH' }
  | { type: 'SET_HYDRATING'; payload: boolean }
  | { type: 'SET_ONBOARDING'; payload: OnboardingData }
  | { type: 'SET_POLICY'; payload: Policy | null }
  | { type: 'SET_CLAIMS'; payload: Claim[] }
  | { type: 'ADD_CLAIM'; payload: Claim }
  | { type: 'UPDATE_CLAIM'; payload: { id: string; status: ClaimStatus } }
  | { type: 'SET_PAYMENTS'; payload: Payment[] }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string };
