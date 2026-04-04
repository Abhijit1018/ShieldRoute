import type { Zone, TriggerType } from '../types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ZoneReading {
  zone: Zone;
  rainfall: number;           // mm/hr, threshold 15
  aqi: number;                // PM2.5 AQI, threshold 300
  heatIndex: number;          // °C, threshold 42
  platformOutageMin: number;  // minutes, threshold 30
  civilDisruptionScore: number; // 0–2, threshold 1
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  lastUpdated: string;
}

export interface RecentTriggerEvent {
  zone: Zone;
  triggerType: TriggerType;
  value: number;
  threshold: number;
  firedAt: Date;
}

// ── Module-level state (single-process safe) ──────────────────────────────────

export const currentReadings: Map<Zone, ZoneReading> = new Map();
export const recentTriggerEvents: RecentTriggerEvent[] = [];

const velocityGuard: Map<string, { count: number; windowStart: number }> = new Map();
let monitorInterval: ReturnType<typeof setInterval> | null = null;

// ── Deterministic noise (djb2-inspired LCG) ───────────────────────────────────
// Returns a stable float in [0, 1) for the same (zone, trigger, timeSlot).
// timeSlot = Math.floor(Date.now() / 30_000) — changes every 30 seconds.

function deterministicNoise(zone: string, trigger: string, slot: number): number {
  const key = `${zone}${trigger}${slot}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return (hash % 10000) / 10000;
}

// ── Mock API functions ────────────────────────────────────────────────────────

const ZONE_RAIN_BASE: Record<Zone, number> = {
  Dharavi:    12,   // Near threshold — realistic monsoon zone
  Kurla:      10,
  Dadar:       8,
  Andheri:     6,
  Thane:       5,
  Borivali:    5,
  Bandra:      4,
  NaviMumbai:  3,
};

const ZONE_AQI_BASE: Record<Zone, number> = {
  Dharavi:    210, Kurla: 185, Dadar: 165, Andheri: 145,
  Thane: 125, Borivali: 135, Bandra: 105, NaviMumbai: 90,
};

const ZONE_HEAT_BASE: Record<Zone, number> = {
  Dharavi: 36, Kurla: 35, Dadar: 35, Andheri: 34,
  Thane: 33, Borivali: 33, Bandra: 32, NaviMumbai: 32,
};

// Zones more prone to civil disruption (based on historical data)
const ZONE_CIVIL_BASE: Record<Zone, number> = {
  Dadar: 0.25, Dharavi: 0.20, Kurla: 0.18, Andheri: 0.10,
  Thane: 0.08, Borivali: 0.08, Bandra: 0.05, NaviMumbai: 0.05,
};

function getSeasonMultipliers(): { rain: number; heat: number; aqi: number } {
  const month = new Date().getMonth() + 1; // 1–12
  if (month >= 6 && month <= 9) return { rain: 1.3, heat: 0.9, aqi: 0.85 }; // monsoon
  if (month >= 4 && month <= 5) return { rain: 0.7, heat: 1.15, aqi: 1.1 }; // summer
  if (month === 10) return { rain: 0.8, heat: 1.0, aqi: 1.4 }; // Diwali smog
  return { rain: 0.9, heat: 1.0, aqi: 1.0 };
}

function mockOpenWeatherMap(zone: Zone, slot: number): number {
  const base = ZONE_RAIN_BASE[zone];
  const season = getSeasonMultipliers();
  const noise = deterministicNoise(zone, 'rain', slot);
  const secondaryNoise = deterministicNoise(zone, 'rain2', slot);

  if (noise > 0.87) {
    // Spike: heavy downpour
    return base * season.rain + 10 + secondaryNoise * 12;
  }
  if (noise > 0.70) {
    // Warning: elevated rain
    return base * season.rain + 3 + secondaryNoise * 6;
  }
  // Normal fluctuation
  return base * season.rain * (0.3 + noise * 0.5);
}

function mockCPCBAQI(zone: Zone, slot: number): number {
  const base = ZONE_AQI_BASE[zone];
  const season = getSeasonMultipliers();
  const noise = deterministicNoise(zone, 'aqi', slot);

  if (noise > 0.90) {
    return base * season.aqi + 100 + deterministicNoise(zone, 'aqi2', slot) * 80;
  }
  if (noise > 0.75) {
    return base * season.aqi + 40 + deterministicNoise(zone, 'aqi2', slot) * 50;
  }
  return base * season.aqi * (0.7 + noise * 0.3);
}

function mockIMDHeatIndex(zone: Zone, slot: number): number {
  const base = ZONE_HEAT_BASE[zone];
  const season = getSeasonMultipliers();
  const noise = deterministicNoise(zone, 'heat', slot);

  if (noise > 0.92) {
    return base * season.heat + 8 + deterministicNoise(zone, 'heat2', slot) * 5;
  }
  if (noise > 0.80) {
    return base * season.heat + 3 + deterministicNoise(zone, 'heat2', slot) * 4;
  }
  return base * season.heat * (0.9 + noise * 0.1);
}

function mockPlatformStatus(zone: Zone, slot: number): number {
  // Platform outages are semi-random, not zone-specific
  const noise = deterministicNoise(zone, 'outage', slot);
  if (noise > 0.93) return 30 + deterministicNoise(zone, 'outage2', slot) * 30;
  if (noise > 0.82) return 10 + deterministicNoise(zone, 'outage2', slot) * 19;
  return noise * 9;
}

function mockCivilDisruption(zone: Zone, slot: number): number {
  const base = ZONE_CIVIL_BASE[zone];
  const noise = deterministicNoise(zone, 'civil', slot);

  if (noise > 0.94) {
    return 1.0 + deterministicNoise(zone, 'civil2', slot) * 1.0; // Active 1.0–2.0
  }
  if (noise > 0.80) {
    return 0.5 + noise * 0.5; // Reports emerging 0.6–0.99
  }
  return base * noise * 2;
}

// ── Risk level computation ────────────────────────────────────────────────────

function computeRiskLevel(reading: Omit<ZoneReading, 'riskLevel' | 'lastUpdated' | 'zone'>): ZoneReading['riskLevel'] {
  const scores = [
    reading.rainfall / 15,
    reading.aqi / 300,
    reading.heatIndex / 42,
    reading.platformOutageMin / 30,
    reading.civilDisruptionScore / 1,
  ];
  const max = Math.max(...scores);
  if (max >= 1.0) return 'Critical';
  if (max >= 0.8) return 'High';
  if (max >= 0.5) return 'Medium';
  return 'Low';
}

// ── Velocity guard (anti-gaming) ──────────────────────────────────────────────

function velocityGuardAllows(zone: Zone, triggerType: TriggerType): boolean {
  const key = `${zone}:${triggerType}`;
  const now = Date.now();
  const entry = velocityGuard.get(key);

  if (!entry || now - entry.windowStart > 10 * 60 * 1000) {
    velocityGuard.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count < 2) {
    entry.count++;
    return true;
  }
  // Blocked — too many fires in this window
  console.log(`[TriggerMonitor] Velocity guard blocked: ${zone}:${triggerType}`);
  return false;
}

// ── Internal trigger fire ─────────────────────────────────────────────────────

async function fireTrigger(
  zone: Zone,
  triggerType: TriggerType,
  value: number,
  threshold: number
): Promise<void> {
  const disruptionHours = 2 + Math.random() * 4;

  try {
    const response = await fetch('http://localhost:4000/api/claims/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone,
        triggerType,
        value,
        threshold,
        disruptionHours: Math.round(disruptionHours * 10) / 10,
        source: 'monitor',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error(`[TriggerMonitor] Trigger fire failed: ${JSON.stringify(err)}`);
      return;
    }

    const result = await response.json() as { data?: { claimsCreated: number } };
    const count = result.data?.claimsCreated ?? 0;
    console.log(`[TriggerMonitor] Fired ${triggerType} in ${zone} — ${count} claims created`);
  } catch (err) {
    // Server may not be ready on first boot — swallow silently
    console.error(`[TriggerMonitor] HTTP error firing trigger: ${(err as Error).message}`);
  }

  // Track recent events (cap at 20)
  recentTriggerEvents.unshift({ zone, triggerType, value, threshold, firedAt: new Date() });
  if (recentTriggerEvents.length > 20) recentTriggerEvents.pop();
}

// ── Main poll cycle ───────────────────────────────────────────────────────────

const ZONES: Zone[] = ['Andheri', 'Bandra', 'Dadar', 'Dharavi', 'Kurla', 'Thane', 'NaviMumbai', 'Borivali'];

const THRESHOLDS: Record<TriggerType, number> = {
  HeavyRain:       15,
  SeverePollution: 300,
  ExtremeHeat:     42,
  PlatformOutage:  30,
  CivilDisruption: 1,
};

async function runPollCycle(): Promise<void> {
  const slot = Math.floor(Date.now() / 30_000);

  for (const zone of ZONES) {
    const rainfall = mockOpenWeatherMap(zone, slot);
    const aqi = mockCPCBAQI(zone, slot);
    const heatIndex = mockIMDHeatIndex(zone, slot);
    const platformOutageMin = mockPlatformStatus(zone, slot);
    const civilDisruptionScore = mockCivilDisruption(zone, slot);

    const partial = { rainfall, aqi, heatIndex, platformOutageMin, civilDisruptionScore };
    const riskLevel = computeRiskLevel(partial);

    currentReadings.set(zone, {
      zone,
      ...partial,
      riskLevel,
      lastUpdated: new Date().toISOString(),
    });

    // Threshold checks
    const checks: Array<{ type: TriggerType; value: number }> = [
      { type: 'HeavyRain',        value: rainfall },
      { type: 'SeverePollution',  value: aqi },
      { type: 'ExtremeHeat',      value: heatIndex },
      { type: 'PlatformOutage',   value: platformOutageMin },
      { type: 'CivilDisruption',  value: civilDisruptionScore },
    ];

    for (const { type, value } of checks) {
      if (value >= THRESHOLDS[type] && velocityGuardAllows(zone, type)) {
        await fireTrigger(zone, type, value, THRESHOLDS[type]);
      }
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startTriggerMonitor(): void {
  if (monitorInterval) return; // already running

  // Seed initial readings synchronously (no triggers on first load)
  const slot = Math.floor(Date.now() / 30_000);
  for (const zone of ZONES) {
    const rainfall = mockOpenWeatherMap(zone, slot);
    const aqi = mockCPCBAQI(zone, slot);
    const heatIndex = mockIMDHeatIndex(zone, slot);
    const platformOutageMin = mockPlatformStatus(zone, slot);
    const civilDisruptionScore = mockCivilDisruption(zone, slot);
    const partial = { rainfall, aqi, heatIndex, platformOutageMin, civilDisruptionScore };
    currentReadings.set(zone, {
      zone, ...partial,
      riskLevel: computeRiskLevel(partial),
      lastUpdated: new Date().toISOString(),
    });
  }

  // Poll every 30 seconds
  monitorInterval = setInterval(() => {
    runPollCycle().catch(err =>
      console.error('[TriggerMonitor] Poll cycle error:', err)
    );
  }, 30_000);

  console.log('[TriggerMonitor] Started — polling every 30s, initial readings seeded.');
}

export function stopTriggerMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('[TriggerMonitor] Stopped.');
  }
}
