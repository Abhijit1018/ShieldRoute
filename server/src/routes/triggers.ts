import { Router } from 'express';
import type { Zone } from '../types';
import {
  currentReadings,
  recentTriggerEvents,
  type ZoneReading,
} from '../services/triggerMonitor';

const router = Router();

// Helper: compute overall risk level for a zone reading
function getZoneRiskSummary(reading: ZoneReading): string {
  const messages: string[] = [];
  if (reading.rainfall >= 15)        messages.push(`Heavy rain ${reading.rainfall.toFixed(1)}mm/hr`);
  else if (reading.rainfall >= 8)    messages.push(`Elevated rain ${reading.rainfall.toFixed(1)}mm/hr`);
  if (reading.aqi >= 300)            messages.push(`Severe AQI ${Math.round(reading.aqi)}`);
  else if (reading.aqi >= 200)       messages.push(`Moderate AQI ${Math.round(reading.aqi)}`);
  if (reading.heatIndex >= 42)       messages.push(`Extreme heat ${reading.heatIndex.toFixed(1)}°C`);
  if (reading.platformOutageMin >= 30) messages.push(`Platform outage ${Math.round(reading.platformOutageMin)}min`);
  if (reading.civilDisruptionScore >= 1) messages.push('Civil disruption active');
  return messages.length > 0 ? messages.join(' · ') : 'All conditions normal';
}

// GET /api/triggers/live
// Returns current sensor readings for all 8 zones (public — no auth required)
router.get('/live', (_req, res) => {
  const data = Array.from(currentReadings.values()).map(reading => ({
    ...reading,
    summary: getZoneRiskSummary(reading),
  }));

  // If monitor hasn't populated yet, return empty with explanation
  if (data.length === 0) {
    res.json({
      success: true,
      data: [],
      message: 'Monitor initializing — check back in a few seconds',
    });
    return;
  }

  res.json({ success: true, data });
});

// GET /api/triggers/live/:zone
// Returns readings for a specific zone + last 5 trigger events for that zone
router.get('/live/:zone', (req, res) => {
  const zone = req.params.zone as Zone;
  const reading = currentReadings.get(zone);

  if (!reading) {
    res.status(404).json({ success: false, error: `No data for zone: ${zone}` });
    return;
  }

  const recentEvents = recentTriggerEvents
    .filter(e => e.zone === zone)
    .slice(0, 5);

  res.json({
    success: true,
    data: {
      reading: { ...reading, summary: getZoneRiskSummary(reading) },
      recentEvents,
    },
  });
});

// GET /api/triggers/forecast
// Returns 24-hour disruption probability forecast per zone
// Uses the same deterministic noise as triggerMonitor for consistency
router.get('/forecast', (_req, res) => {
  const forecast = generate24HourForecast();
  res.json({ success: true, data: forecast });
});

// GET /api/triggers/feed
// Returns the last 20 trigger events across all zones (for the live feed panel)
router.get('/feed', (_req, res) => {
  res.json({ success: true, data: recentTriggerEvents });
});

// ── 24-hour forecast generator ────────────────────────────────────────────────

interface ForecastSlot {
  hour: number;
  label: string;        // e.g. "14:00"
  rainfallProb: number; // 0–100
  aqiProb: number;
  heatProb: number;
  overallRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  dominantTrigger: string;
}

interface ZoneForecast {
  zone: Zone;
  slots: ForecastSlot[];
  peakRiskHour: number;
}

function deterministicForecastNoise(zone: string, hour: number, type: string): number {
  const key = `forecast:${zone}:${hour}:${type}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
    hash = hash >>> 0;
  }
  return (hash % 10000) / 10000;
}

// Zone base probabilities
const ZONE_RAIN_PROB_BASE: Record<Zone, number> = {
  Dharavi: 55, Kurla: 45, Dadar: 40, Andheri: 32,
  Thane: 28, Borivali: 28, Bandra: 22, NaviMumbai: 18,
};

function generate24HourForecast(): ZoneForecast[] {
  const ZONES: Zone[] = ['Andheri', 'Bandra', 'Dadar', 'Dharavi', 'Kurla', 'Thane', 'NaviMumbai', 'Borivali'];
  const currentHour = new Date().getHours();
  const month = new Date().getMonth() + 1;
  const isMonsoon = month >= 6 && month <= 9;
  const isSummer = month >= 4 && month <= 5;

  return ZONES.map(zone => {
    const slots: ForecastSlot[] = [];
    let peakRiskHour = currentHour;
    let peakRisk = 0;

    for (let h = 0; h < 24; h++) {
      const hour = (currentHour + h) % 24;

      // Time-of-day probability modifiers
      const isAfternoon = hour >= 14 && hour <= 18; // peak heat/rain time
      const isEvening = hour >= 18 && hour <= 21;   // peak traffic/disruption

      const rainNoise = deterministicForecastNoise(zone, hour, 'rain');
      const aqiNoise = deterministicForecastNoise(zone, hour, 'aqi');
      const heatNoise = deterministicForecastNoise(zone, hour, 'heat');

      const baseRainProb = ZONE_RAIN_PROB_BASE[zone];
      const monsoonBoost = isMonsoon ? 20 : 0;
      const afternoonBoost = isAfternoon ? 15 : 0;

      const rainfallProb = Math.min(95, Math.round(
        baseRainProb + monsoonBoost + afternoonBoost + rainNoise * 20
      ));

      const aqiProb = Math.min(90, Math.round(
        (isSummer ? 35 : 20) + (isEvening ? 10 : 0) + aqiNoise * 25
      ));

      const heatProb = Math.min(85, Math.round(
        (isSummer ? 45 : 20) + (isAfternoon ? 20 : 0) + heatNoise * 15
      ));

      // Overall risk level
      const maxProb = Math.max(rainfallProb, aqiProb, heatProb);
      let overallRisk: ForecastSlot['overallRisk'] = 'Low';
      if (maxProb >= 80) overallRisk = 'Critical';
      else if (maxProb >= 60) overallRisk = 'High';
      else if (maxProb >= 35) overallRisk = 'Medium';

      // Dominant trigger
      let dominantTrigger = 'No significant risk';
      if (rainfallProb >= aqiProb && rainfallProb >= heatProb && rainfallProb >= 35) {
        dominantTrigger = `Rain (${rainfallProb}%)`;
      } else if (aqiProb >= heatProb && aqiProb >= 35) {
        dominantTrigger = `Pollution (${aqiProb}%)`;
      } else if (heatProb >= 35) {
        dominantTrigger = `Heat (${heatProb}%)`;
      }

      const riskScore = rainfallProb * 0.5 + aqiProb * 0.25 + heatProb * 0.25;
      if (riskScore > peakRisk) {
        peakRisk = riskScore;
        peakRiskHour = hour;
      }

      slots.push({
        hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        rainfallProb,
        aqiProb,
        heatProb,
        overallRisk,
        dominantTrigger,
      });
    }

    return { zone, slots, peakRiskHour };
  });
}

export default router;
