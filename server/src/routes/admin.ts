import { Router, type Request, type Response } from 'express';
import prisma from '../db/prisma';

const router = Router();

// GET /api/admin/kpis — Dashboard KPIs
router.get('/kpis', async (_req: Request, res: Response): Promise<void> => {
  const [totalPolicies, weekClaims, triggerEvents] = await Promise.all([
    prisma.policy.count({ where: { status: 'Active' } }),
    prisma.claim.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: 'Paid',
      },
      select: { payoutAmount: true },
    }),
    prisma.triggerEvent.count({ where: { isActive: true } }),
  ]);

  const weeklyClaimsPaid = weekClaims.reduce((sum, c) => sum + c.payoutAmount, 0) / 100;

  // Estimate weekly premiums collected
  const activePolicies = await prisma.policy.findMany({
    where: { status: 'Active' },
    select: { weeklyPremium: true },
  });
  const weeklyPremiums = activePolicies.reduce((sum, p) => sum + p.weeklyPremium, 0) / 100;

  const lossRatio = weeklyPremiums > 0
    ? Math.round((weeklyClaimsPaid / weeklyPremiums) * 1000) / 10
    : 0;

  res.json({
    success: true,
    data: {
      totalActivePolicies: totalPolicies,
      weeklyPremiumsCollected: Math.round(weeklyPremiums),
      weeklyClaimsPaid: Math.round(weeklyClaimsPaid),
      lossRatio,
      activeDisruptions: triggerEvents,
    },
  });
});

// GET /api/admin/zones — Zone-level breakdown
router.get('/zones', async (_req: Request, res: Response): Promise<void> => {
  const zones = ['Andheri', 'Bandra', 'Dadar', 'Dharavi', 'Kurla', 'Thane', 'NaviMumbai', 'Borivali'];

  const zoneData = await Promise.all(
    zones.map(async (zone) => {
      const [activePolicies, weekClaims] = await Promise.all([
        prisma.policy.count({ where: { zone: zone as any, status: 'Active' } }),
        prisma.claim.count({
          where: {
            policy: { zone: zone as any },
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);
      return { zone, activePolicies, claimsThisWeek: weekClaims };
    })
  );

  res.json({ success: true, data: zoneData });
});

// GET /api/admin/claims — All claims with fraud signals
router.get('/claims', async (_req: Request, res: Response): Promise<void> => {
  const claims = await prisma.claim.findMany({
    include: {
      policy: { include: { rider: true } },
      triggerEvent: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const flagged = claims.filter(c => c.fraudScore > 60);

  res.json({ success: true, data: { all: claims, flagged } });
});

// GET /api/admin/triggers — Active trigger events
router.get('/triggers', async (_req: Request, res: Response): Promise<void> => {
  const events = await prisma.triggerEvent.findMany({
    where: { isActive: true },
    orderBy: { startedAt: 'desc' },
  });
  res.json({ success: true, data: events });
});

export default router;
