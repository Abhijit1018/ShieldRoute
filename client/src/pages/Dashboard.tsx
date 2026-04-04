import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  RefreshCw,
  Zap,
  Wind,
  Thermometer,
  Wifi,
  AlertOctagon,
  CheckCircle,
  Clock,
  TrendingDown,
  IndianRupee,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { EARNINGS_CHART_DATA } from '../data/mockData';
import { getApiErrorMessage, getLiveTriggers, type LiveTrigger } from '../utils/api';
import type { TriggerStatus, ClaimStatus } from '../types';

type TriggerCode = 'HeavyRain' | 'SeverePollution' | 'ExtremeHeat' | 'PlatformOutage' | 'CivilDisruption';

interface TriggerCardMeta {
  label: string;
  icon: typeof Zap;
  thresholdLabel: string;
  formatValue: (value: number) => string;
}

const TRIGGER_ORDER: TriggerCode[] = [
  'HeavyRain',
  'SeverePollution',
  'ExtremeHeat',
  'PlatformOutage',
  'CivilDisruption',
];

const TRIGGER_META: Record<TriggerCode, TriggerCardMeta> = {
  HeavyRain: {
    label: 'Heavy Rain',
    icon: Wind,
    thresholdLabel: '>15mm/hr',
    formatValue: value => `${value.toFixed(1)}mm/hr`,
  },
  SeverePollution: {
    label: 'Severe Pollution',
    icon: Wind,
    thresholdLabel: 'AQI >300',
    formatValue: value => `AQI: ${Math.round(value)}`,
  },
  ExtremeHeat: {
    label: 'Extreme Heat',
    icon: Thermometer,
    thresholdLabel: '>42°C',
    formatValue: value => `${value.toFixed(1)}°C`,
  },
  PlatformOutage: {
    label: 'Platform Outage',
    icon: Wifi,
    thresholdLabel: '>30min outage',
    formatValue: value => `${Math.round(value)}min outage`,
  },
  CivilDisruption: {
    label: 'Civil Disruption',
    icon: AlertOctagon,
    thresholdLabel: 'Strike/curfew active',
    formatValue: value => (value >= 1 ? 'Strike Active' : value >= 0.6 ? 'Reports Emerging' : 'Peaceful'),
  },
};

const STATUS_CONFIG: Record<TriggerStatus, { dot: string; text: string; border: string; bg: string; label: string; glow: string }> = {
  NORMAL: {
    dot: 'bg-green-400',
    text: 'text-green-400',
    border: 'border-green-500/20',
    bg: 'bg-green-500/5',
    label: 'NORMAL',
    glow: '',
  },
  WARNING: {
    dot: 'bg-[#F59E0B]',
    text: 'text-[#F59E0B]',
    border: 'border-[#F59E0B]/40',
    bg: 'bg-[#F59E0B]/5',
    label: 'WARNING',
    glow: 'glow-amber',
  },
  TRIGGERED: {
    dot: 'bg-[#EF4444]',
    text: 'text-[#EF4444]',
    border: 'border-[#EF4444]/50',
    bg: 'bg-[#EF4444]/8',
    label: 'TRIGGERED',
    glow: 'glow-red',
  },
};

const CLAIM_STATUS_CONFIG: Record<ClaimStatus, { color: string; icon: typeof CheckCircle }> = {
  Processing: { color: 'text-[#F59E0B]', icon: Clock },
  Approved: { color: 'text-[#14B8A6]', icon: CheckCircle },
  Paid: { color: 'text-green-400', icon: CheckCircle },
  Rejected: { color: 'text-[#EF4444]', icon: AlertOctagon },
};

export default function Dashboard() {
  const { state, refreshData, addToast } = useApp();
  const navigate = useNavigate();

  const [refreshing, setRefreshing] = useState(false);
  const [liveTriggers, setLiveTriggers] = useState<LiveTrigger[]>([]);

  const syncLiveTriggers = useCallback(async (silent = false) => {
    if (!state.auth?.token) return;

    try {
      const triggers = await getLiveTriggers(state.auth.token);
      setLiveTriggers(triggers);
    } catch (error) {
      if (!silent) {
        addToast(getApiErrorMessage(error, 'Unable to refresh live triggers.'), 'warning');
      }
    }
  }, [addToast, state.auth?.token]);

  useEffect(() => {
    if (state.isHydrating) return;
    if (!state.auth) {
      navigate('/onboard');
      return;
    }

    void refreshData({ silent: true });
    void syncLiveTriggers(true);
  }, [navigate, refreshData, state.auth, state.isHydrating, syncLiveTriggers]);

  useEffect(() => {
    if (!state.auth?.token) return;

    const dataInterval = setInterval(() => {
      void refreshData({ silent: true });
    }, 25000);

    const triggerInterval = setInterval(() => {
      void syncLiveTriggers(true);
    }, 12000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(triggerInterval);
    };
  }, [refreshData, state.auth?.token, syncLiveTriggers]);

  const triggerMap = useMemo(
    () => new Map(liveTriggers.map(trigger => [trigger.triggerType, trigger])),
    [liveTriggers]
  );

  const paidTotal = useMemo(
    () => state.payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0),
    [state.payments]
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      refreshData(),
      syncLiveTriggers(),
    ]);
    addToast('Dashboard synced with server.', 'success');
    setRefreshing(false);
  }

  if (state.isHydrating) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center text-[#6B7280]">
        Loading your policy...
      </div>
    );
  }

  if (!state.auth) return null;

  if (!state.policy) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] py-16 px-4">
        <div className="max-w-xl mx-auto bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center">
          <Shield size={38} className="text-[#14B8A6] mx-auto mb-4" />
          <h1 className="text-2xl font-black text-[#F9FAFB]">No active policy yet</h1>
          <p className="text-[#6B7280] mt-2">Complete onboarding to activate your first weekly policy.</p>
          <Link
            to="/onboard"
            className="inline-flex mt-6 px-5 py-3 bg-[#14B8A6] hover:bg-[#0D9488] text-white rounded-xl font-bold"
          >
            Start Onboarding
          </Link>
        </div>
      </div>
    );
  }

  const { policy } = state;
  const { onboarding: ob } = policy;

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-teal">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#14B8A6] rounded-xl flex items-center justify-center shrink-0">
                <Shield size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-black text-[#F9FAFB]">{policy.policyId}</span>
                  <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {policy.status}
                  </span>
                </div>
                <div className="text-sm text-[#6B7280]">
                  {ob.name || 'Rider'} · {ob.zone} · {ob.platform}
                </div>
              </div>
            </div>

            <div className="flex gap-6 text-center">
              <div>
                <div className="text-2xl font-black text-[#14B8A6]">₹{ob.weeklyPremium}</div>
                <div className="text-xs text-[#6B7280]">Weekly Premium</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#F9FAFB]">₹{ob.coveragePerDay}</div>
                <div className="text-xs text-[#6B7280]">Coverage/Day</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#F59E0B]">₹{ob.maxWeeklyClaim}</div>
                <div className="text-xs text-[#6B7280]">Weekly Cap</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-4 text-xs text-[#6B7280]">
              <span>
                Plan: <span className="text-[#F9FAFB] font-medium">{ob.selectedPlan}</span>
              </span>
              <span>
                Started: <span className="text-[#F9FAFB] font-medium">{policy.startDate}</span>
              </span>
              <span>
                Renews: <span className="text-[#F59E0B] font-medium">{policy.renewalDate}</span>
              </span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                refreshing ? 'text-[#6B7280] cursor-not-allowed' : 'text-[#14B8A6] hover:text-[#0D9488]'
              }`}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Sync from Server'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 card-accent-amber">
            <div className="text-xs text-[#6B7280]">Paid Claims</div>
            <div className="mt-1 text-3xl font-black text-[#14B8A6]">{state.claims.filter(c => c.status === 'Paid').length}</div>
          </div>
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 card-accent-red">
            <div className="text-xs text-[#6B7280]">Total Claims</div>
            <div className="mt-1 text-3xl font-black text-[#F59E0B]">{state.claims.length}</div>
          </div>
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 card-accent-teal">
            <div className="text-xs text-[#6B7280]">Premiums Paid</div>
            <div className="mt-1 text-3xl font-black text-[#F9FAFB] inline-flex items-center gap-1">
              <IndianRupee size={22} />
              {paidTotal}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={18} className="text-[#14B8A6]" />
            <h2 className="text-lg font-bold text-[#F9FAFB]">Live Disruption Monitor</h2>
            <span className="text-xs text-[#6B7280] ml-2">API updates every 12s</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {TRIGGER_ORDER.map(triggerType => {
              const meta = TRIGGER_META[triggerType];
              const trigger = triggerMap.get(triggerType);
              const status = (trigger?.status || 'NORMAL') as TriggerStatus;
              const cfg = STATUS_CONFIG[status];
              const Icon = meta.icon;

              return (
                <div
                  key={triggerType}
                  className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5 transition-all duration-500 ${cfg.glow}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Icon size={18} className={cfg.text} />
                    <span className={`flex items-center gap-1 text-xs font-bold ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status !== 'NORMAL' ? 'animate-pulse' : ''}`} />
                      {cfg.label}
                    </span>
                  </div>
                  <div className="font-bold text-[#F9FAFB] text-sm mb-1">{meta.label}</div>
                  <div className={`text-xl font-black ${cfg.text} mb-2`}>
                    {trigger ? meta.formatValue(trigger.value) : '--'}
                  </div>
                  <div className="text-xs text-[#6B7280]">Threshold: {meta.thresholdLabel}</div>
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    {trigger?.source && trigger.source !== 'baseline' ? `Source: ${trigger.source}` : 'No active alert'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-amber">
          <div className="flex items-center gap-2 mb-6">
            <TrendingDown size={18} className="text-[#F59E0B]" />
            <h2 className="text-lg font-bold text-[#F9FAFB]">Earnings Protection — Last 7 Days</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={EARNINGS_CHART_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{
                  background: '#1C2537',
                  border: '1px solid #1F2937',
                  borderRadius: '8px',
                  color: '#F9FAFB',
                }}
                formatter={v => [`₹${v ?? 0}`, '']}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="potentialLoss"
                name="Potential Loss"
                stroke="#EF4444"
                fill="#EF4444"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="covered"
                name="ShieldRoute Covers"
                stroke="#14B8A6"
                fill="#14B8A6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-red">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-[#EF4444]" />
            <h2 className="text-lg font-bold text-[#F9FAFB]">Claims (From Database)</h2>
            <span className="ml-auto text-xs px-2 py-1 bg-[#1C2537] text-[#6B7280] rounded-lg">
              {state.claims.length} total
            </span>
          </div>

          {state.claims.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              <CheckCircle size={40} className="mx-auto mb-3 text-[#1F2937]" />
              <p className="font-medium">No claims yet</p>
              <p className="text-sm mt-1">New claims appear here when backend triggers create them.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.claims.map(claim => {
                const cfg = CLAIM_STATUS_CONFIG[claim.status];
                const Icon = cfg.icon;

                return (
                  <div key={claim.id} className="bg-[#1C2537] border border-[#1F2937] rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={cfg.color} />
                        <div>
                          <div className="font-bold text-[#F9FAFB] text-sm">{claim.id}</div>
                          <div className="text-xs text-[#6B7280]">
                            Triggered by: {claim.triggeredBy} · {claim.disruptionHours}hrs estimated
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-black text-[#14B8A6]">₹{claim.payoutAmount}</div>
                          <div className="text-xs text-[#6B7280]">Payout</div>
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            claim.status === 'Processing'
                              ? 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]'
                              : claim.status === 'Approved'
                                ? 'border-[#14B8A6]/30 bg-[#14B8A6]/10 text-[#14B8A6]'
                                : claim.status === 'Rejected'
                                  ? 'border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]'
                                  : 'border-green-500/30 bg-green-500/10 text-green-400'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>
                    </div>
                    {claim.status === 'Paid' && (
                      <div className="mt-2 text-xs text-green-400 font-medium">
                        ✓ ₹{claim.payoutAmount} credited to UPI: {claim.upiRef}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
