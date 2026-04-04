import { Router, type Response } from 'express';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest, TriggerType } from '../types';
import prisma from '../db/prisma';

const router = Router();

type TriggerStatus = 'NORMAL' | 'WARNING' | 'TRIGGERED';

const TRIGGER_META: Record<TriggerType, { label: string; unit: string; defaultThreshold: number; baselineValue: number }> = {
  HeavyRain: { label: 'Heavy Rain', unit: 'mm/hr', defaultThreshold: 15, baselineValue: 3.5 },
  SeverePollution: { label: 'Severe Pollution', unit: 'AQI', defaultThreshold: 300, baselineValue: 140 },
  ExtremeHeat: { label: 'Extreme Heat', unit: '°C', defaultThreshold: 42, baselineValue: 33 },
  PlatformOutage: { label: 'Platform Outage', unit: 'min', defaultThreshold: 30, baselineValue: 5 },
  CivilDisruption: { label: 'Civil Disruption', unit: 'score', defaultThreshold: 1, baselineValue: 0 },
};

function getStatus(value: number, threshold: number): TriggerStatus {
  if (value >= threshold) return 'TRIGGERED';
  if (value >= threshold * 0.7) return 'WARNING';
  return 'NORMAL';
}

// GET /api/triggers/live — Current trigger snapshot for authenticated rider zone
router.get('/live', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const rider = await prisma.rider.findUnique({
    where: { id: req.rider!.riderId },
    select: { zone: true },
  });

  if (!rider) {
    res.status(404).json({ success: false, error: 'Rider not found' });
    return;
  }

  const activeEvents = await prisma.triggerEvent.findMany({
    where: { zone: rider.zone, isActive: true },
    orderBy: { startedAt: 'desc' },
  });

  const latestByType = new Map<TriggerType, (typeof activeEvents)[number]>();
  for (const event of activeEvents) {
    if (!latestByType.has(event.triggerType as TriggerType)) {
      latestByType.set(event.triggerType as TriggerType, event);
    }
  }

  const data = (Object.keys(TRIGGER_META) as TriggerType[]).map((triggerType) => {
    const meta = TRIGGER_META[triggerType];
    const event = latestByType.get(triggerType);

    const value = event ? Number(event.value) : meta.baselineValue;
    const threshold = event ? Number(event.threshold) : meta.defaultThreshold;

    return {
      triggerType,
      label: meta.label,
      zone: rider.zone,
      value,
      threshold,
      unit: meta.unit,
      status: getStatus(value, threshold),
      source: event?.source || 'baseline',
      startedAt: event?.startedAt || null,
    };
  });

  res.json({ success: true, data });
});

export default router;
