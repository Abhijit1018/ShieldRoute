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

export type ClaimStatus = 'Processing' | 'Approved' | 'Paid';

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
  status: 'Active' | 'Expired';
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
  onboarding: OnboardingData | null;
  policy: Policy | null;
  claims: Claim[];
  toasts: Toast[];
}

export type AppAction =
  | { type: 'SET_ONBOARDING'; payload: OnboardingData }
  | { type: 'SET_POLICY'; payload: Policy }
  | { type: 'ADD_CLAIM'; payload: Claim }
  | { type: 'UPDATE_CLAIM'; payload: { id: string; status: ClaimStatus } }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string };
