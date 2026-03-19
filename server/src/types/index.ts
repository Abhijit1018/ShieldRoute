import type { Request } from 'express';

export type Zone = 'Andheri' | 'Bandra' | 'Dadar' | 'Dharavi' | 'Kurla' | 'Thane' | 'NaviMumbai' | 'Borivali';
export type Platform = 'Zomato' | 'Swiggy';
export type Plan = 'Basic' | 'Standard' | 'Premium';
export type TriggerType = 'HeavyRain' | 'SeverePollution' | 'ExtremeHeat' | 'PlatformOutage' | 'CivilDisruption';

export interface AuthPayload {
  riderId: string;
  phone: string;
}

export interface AuthRequest extends Request {
  rider?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
