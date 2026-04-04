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

export type TriggerType =
  | 'HeavyRain'
  | 'SeverePollution'
  | 'ExtremeHeat'
  | 'PlatformOutage'
  | 'CivilDisruption';

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

export interface ClaimTimelineStep {
  label: string;
  description: string;
  timestamp: string | null;
  isComplete: boolean;
}

export interface ClaimIntelligence {
  triggerValue: number;
  triggerThreshold: number;
  zone: string;
  reason: string;
  policyPlan: string;
}

export interface Claim {
  id: string;
  claimNumber?: string;
  triggeredBy: string;
  triggerType?: TriggerType;
  disruptionHours: number;
  payoutAmount: number;
  status: ClaimStatus;
  timestamp: Date;
  upiRef: string;
  intelligence?: ClaimIntelligence;
  timeline?: ClaimTimelineStep[];
}

export interface TriggerState {
  name: string;
  status: TriggerStatus;
  value: string;
  threshold: string;
  icon: string;
}

export interface LiveZoneReading {
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

export interface TriggerFeedItem {
  zone: Zone;
  triggerType: string;
  value: number;
  threshold: number;
  firedAt: string;
}

export interface ExplainabilityItem {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  amountEffect: number;
  description: string;
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
  liveZoneReadings: LiveZoneReading[];
  triggerFeed: TriggerFeedItem[];
  unreadClaimCount: number;
}

export type AppAction =
  | { type: 'SET_ONBOARDING'; payload: OnboardingData }
  | { type: 'SET_POLICY'; payload: Policy }
  | { type: 'ADD_CLAIM'; payload: Claim }
  | { type: 'SET_CLAIMS'; payload: Claim[] }
  | { type: 'UPDATE_CLAIM'; payload: { id: string; status: ClaimStatus } }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_LIVE_READINGS'; payload: LiveZoneReading[] }
  | { type: 'SET_TRIGGER_FEED'; payload: TriggerFeedItem[] }
  | { type: 'MARK_CLAIMS_READ' };
