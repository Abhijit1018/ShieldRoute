import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, RefreshCw, Zap, Wind, Thermometer, Wifi, AlertOctagon,
  CheckCircle, Clock, TrendingDown, MapPin, Activity,
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { EARNINGS_CHART_DATA } from '../data/mockData';
import api, { type LiveZoneReadingDTO, type TriggerFeedItemDTO } from '../utils/api';
import type { TriggerStatus, ClaimStatus, Claim, Zone } from '../types';

// ── Trigger definitions ───────────────────────────────────────────────────────

interface TriggerDef {
  name: string;
  key: keyof LiveZoneReadingDTO;
  icon: typeof Zap;
  unit: string;
  threshold: string;
  thresholdVal: number;
  minVal: number;
  maxVal: number;
  triggerMin: number;
  warnMin: number;
  formatVal: (v: number) => string;
}

const TRIGGER_DEFS: TriggerDef[] = [
  {
    name: 'Heavy Rain',
    key: 'rainfall',
    icon: Wind,
    unit: 'mm/hr',
    threshold: '>15mm/hr',
    thresholdVal: 15,
    minVal: 0, maxVal: 35, triggerMin: 15, warnMin: 8,
    formatVal: (v) => `${v.toFixed(1)}mm/hr`,
  },
  {
    name: 'Severe Pollution',
    key: 'aqi',
    icon: Wind,
    unit: 'AQI',
    threshold: 'AQI >300',
    thresholdVal: 300,
    minVal: 80, maxVal: 380, triggerMin: 300, warnMin: 200,
    formatVal: (v) => `AQI: ${Math.round(v)}`,
  },
  {
    name: 'Extreme Heat',
    key: 'heatIndex',
    icon: Thermometer,
    unit: '°C',
    threshold: '>42°C',
    thresholdVal: 42,
    minVal: 28, maxVal: 47, triggerMin: 42, warnMin: 38,
    formatVal: (v) => `${v.toFixed(1)}°C`,
  },
  {
    name: 'Platform Outage',
    key: 'platformOutageMin',
    icon: Wifi,
    unit: 'min',
    threshold: '>30min outage',
    thresholdVal: 30,
    minVal: 0, maxVal: 60, triggerMin: 30, warnMin: 15,
    formatVal: (v) => `${Math.round(v)}min outage`,
  },
  {
    name: 'Civil Disruption',
    key: 'civilDisruptionScore',
    icon: AlertOctagon,
    unit: '',
    threshold: 'Strike/curfew active',
    thresholdVal: 1,
    minVal: 0, maxVal: 2, triggerMin: 1, warnMin: 0.6,
    formatVal: (v) => v >= 1 ? 'Strike Active' : v >= 0.6 ? 'Reports Emerging' : 'Peaceful',
  },
];

interface TriggerState {
  value: number;
  status: TriggerStatus;
}

function getTriggerStatus(def: TriggerDef, value: number): TriggerStatus {
  if (value >= def.triggerMin) return 'TRIGGERED';
  if (value >= def.warnMin) return 'WARNING';
  return 'NORMAL';
}

const STATUS_CONFIG = {
  NORMAL:    { dot: 'bg-green-400', text: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5',  label: 'NORMAL',    glow: '' },
  WARNING:   { dot: 'bg-[#F59E0B]', text: 'text-[#F59E0B]', border: 'border-[#F59E0B]/40', bg: 'bg-[#F59E0B]/5', label: 'WARNING',   glow: 'glow-amber' },
  TRIGGERED: { dot: 'bg-[#EF4444]', text: 'text-[#EF4444]', border: 'border-[#EF4444]/50', bg: 'bg-[#EF4444]/8', label: 'TRIGGERED', glow: 'glow-red' },
};

const CLAIM_STATUS_CONFIG: Record<ClaimStatus, { color: string; icon: typeof CheckCircle }> = {
  Processing: { color: 'text-[#F59E0B]', icon: Clock },
  Approved:   { color: 'text-[#14B8A6]', icon: CheckCircle },
  Paid:       { color: 'text-green-400', icon: CheckCircle },
  Rejected:   { color: 'text-[#EF4444]', icon: CheckCircle },
};

const RISK_LEVEL_COLORS = {
  Low:      'text-green-400 bg-green-500/10 border-green-500/20',
  Medium:   'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20',
  High:     'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20',
  Critical: 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/40',
};

const TRIGGER_TYPE_LABELS: Record<string, string> = {
  HeavyRain: '🌧', SeverePollution: '💨', ExtremeHeat: '🌡',
  PlatformOutage: '📵', CivilDisruption: '⚠️',
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function genId(prefix: string) {
  return `${prefix}${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 900000 + 100000)}`;
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { state, addClaim, updateClaim, addToast, setLiveReadings, setTriggerFeed } = useApp();
  const navigate = useNavigate();

  const [triggers, setTriggers] = useState<TriggerState[]>(
    TRIGGER_DEFS.map(def => ({
      value: def.minVal + (def.maxVal - def.minVal) * 0.3,
      status: 'NORMAL' as TriggerStatus,
    }))
  );
  const [zoneReading, setZoneReading] = useState<LiveZoneReadingDTO | null>(null);
  const [feedItems, setFeedItems] = useState<TriggerFeedItemDTO[]>([]);
  const [usingRealApi, setUsingRealApi] = useState(false);

  const triggeredTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!state.policy) {
      navigate('/onboard');
      return;
    }
  }, [state.policy, navigate]);

  // Try real API polling every 30s; fallback to simulation
  useEffect(() => {
    const zone = state.policy?.onboarding.zone as Zone | undefined;

    const fetchLive = async () => {
      try {
        const [liveAll, feed] = await Promise.all([
          api.getLiveTriggers(),
          api.getTriggerFeed(),
        ]);

        setUsingRealApi(true);
        setLiveReadings(liveAll);
        setTriggerFeed(feed);
        setFeedItems(feed.slice(0, 5));

        if (zone) {
          const zoneData = liveAll.find(r => r.zone === zone);
          if (zoneData) {
            setZoneReading(zoneData);
            // Sync gauges with real values
            const newTriggers = TRIGGER_DEFS.map(def => {
              const val = zoneData[def.key] as number;
              return { value: val, status: getTriggerStatus(def, val) };
            });
            setTriggers(newTriggers);

            // Fire toast + claim simulation for triggered states
            newTriggers.forEach((t, i) => {
              if (t.status === 'TRIGGERED' && !triggeredTimers.current.has(i)) {
                const def = TRIGGER_DEFS[i];
                addToast(`⚠️ ${def.name} trigger activated! Auto-claim initiated.`, 'danger');
              }
            });
          }
        }
      } catch {
        setUsingRealApi(false);
      }
    };

    fetchLive();
    const interval = setInterval(fetchLive, 30_000);
    return () => clearInterval(interval);
  }, [state.policy, addToast, setLiveReadings, setTriggerFeed]);

  // Fallback: simulate trigger changes every 15s when API unavailable
  useEffect(() => {
    if (usingRealApi) return;

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * TRIGGER_DEFS.length);
      const def = TRIGGER_DEFS[idx];
      const roll = Math.random();
      let newValue: number;

      if (roll < 0.15) {
        newValue = def.triggerMin + Math.random() * (def.maxVal - def.triggerMin);
      } else if (roll < 0.7) {
        newValue = def.warnMin + Math.random() * (def.triggerMin - def.warnMin - 0.01);
      } else {
        newValue = def.minVal + Math.random() * (def.warnMin - def.minVal);
      }

      const newStatus = getTriggerStatus(def, newValue);

      setTriggers(prev => {
        const updated = [...prev];
        updated[idx] = { value: newValue, status: newStatus };
        return updated;
      });

      if (newStatus === 'TRIGGERED') {
        addToast(`⚠️ ${def.name} triggered — auto-claim initiated.`, 'danger');

        if (!triggeredTimers.current.has(idx)) {
          const timer = setTimeout(() => {
            const hours = 2 + Math.random() * 4;
            const coveragePerDay = state.policy?.onboarding.coveragePerDay ?? 1000;
            const payout = Math.round(coveragePerDay * (hours / 8));

            const claim: Claim = {
              id: genId('CL'),
              triggeredBy: def.name,
              disruptionHours: Math.round(hours * 10) / 10,
              payoutAmount: payout,
              status: 'Processing',
              timestamp: new Date(),
              upiRef: `${Math.floor(Math.random() * 9000 + 1000)}@upi`,
            };

            addClaim(claim);
            addToast(`Claim ${claim.id} — ₹${payout} payout processing.`, 'warning');

            setTimeout(() => {
              updateClaim(claim.id, 'Approved');
              addToast(`Claim approved! ₹${payout} queued for UPI transfer.`, 'success');
            }, 5000);
            setTimeout(() => {
              updateClaim(claim.id, 'Paid');
              addToast(`₹${payout} credited via UPI ✓`, 'success');
            }, 10000);

            triggeredTimers.current.delete(idx);
          }, 10000);
          triggeredTimers.current.set(idx, timer);
        }
      } else if (newStatus === 'WARNING') {
        addToast(`⚡ ${def.name} approaching threshold — monitoring.`, 'warning');
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [usingRealApi, state.policy, addClaim, addToast, updateClaim]);

  if (!state.policy) return null;

  const { policy } = state;
  const { onboarding: ob } = policy;
  const zoneRiskLevel = zoneReading?.riskLevel ?? 'Low';

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Policy Card */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-teal">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#14B8A6] rounded-xl flex items-center justify-center shrink-0">
                <Shield size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-lg font-black text-[#F9FAFB]">{policy.policyId}</span>
                  <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Active
                  </span>
                </div>
                <div className="text-sm text-[#6B7280]">
                  {ob.name} · {ob.zone} · {ob.platform}
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
              <span>Plan: <span className="text-[#F9FAFB] font-medium">{ob.selectedPlan}</span></span>
              <span>Started: <span className="text-[#F9FAFB] font-medium">{policy.startDate}</span></span>
              <span>Renews: <span className="text-[#F59E0B] font-medium">{policy.renewalDate}</span></span>
            </div>
            <Link to="/policy" className="flex items-center gap-1.5 text-sm text-[#14B8A6] hover:text-[#0D9488] font-medium transition-colors">
              <RefreshCw size={14} />
              Manage Policy
            </Link>
          </div>
        </div>

        {/* Zone Risk + Monitor header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Zap size={18} className="text-[#14B8A6]" />
            <h2 className="text-lg font-bold text-[#F9FAFB]">Live Disruption Monitor</h2>
            <span className="text-xs text-[#6B7280]">
              {usingRealApi ? 'Updates every 30s via live API' : 'Simulation mode'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Zone risk badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${RISK_LEVEL_COLORS[zoneRiskLevel]}`}>
              <MapPin size={11} />
              {ob.zone}: {zoneRiskLevel} Risk
            </div>
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>

        {/* Trigger Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {TRIGGER_DEFS.map((def, i) => {
            const trig = triggers[i];
            const cfg = STATUS_CONFIG[trig.status];
            const Icon = def.icon;
            return (
              <div
                key={def.name}
                className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5 transition-all duration-500 ${cfg.glow}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon size={18} className={cfg.text} />
                  <span className={`flex items-center gap-1 text-xs font-bold ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${trig.status !== 'NORMAL' ? 'animate-pulse' : ''}`} />
                    {cfg.label}
                  </span>
                </div>
                <div className="font-bold text-[#F9FAFB] text-sm mb-1">{def.name}</div>
                <div className={`text-xl font-black ${cfg.text} mb-2`}>{def.formatVal(trig.value)}</div>
                <div className="text-xs text-[#6B7280]">Threshold: {def.threshold}</div>
                {/* Mini progress bar */}
                <div className="mt-2 h-1 bg-[#1F2937] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      trig.status === 'TRIGGERED' ? 'bg-[#EF4444]' :
                      trig.status === 'WARNING' ? 'bg-[#F59E0B]' : 'bg-[#14B8A6]'
                    }`}
                    style={{ width: `${Math.min(100, ((trig.value - def.minVal) / (def.maxVal - def.minVal)) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Trigger Feed */}
        {(feedItems.length > 0) && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-[#14B8A6]" />
              <h3 className="font-bold text-[#F9FAFB]">Recent Trigger Events</h3>
              <span className="text-xs text-[#6B7280] ml-auto">Last 5 across all zones</span>
            </div>
            <div className="space-y-2">
              {feedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[#1F2937] last:border-0">
                  <span className="text-base">{TRIGGER_TYPE_LABELS[item.triggerType] ?? '⚡'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#F9FAFB]">{item.zone}</span>
                      <span className="text-xs text-[#6B7280]">{item.triggerType.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-xs text-[#EF4444]">{item.value.toFixed(1)} ≥ {item.threshold}</span>
                    </div>
                  </div>
                  <span className="text-xs text-[#4B5563] shrink-0">{formatTimeAgo(item.firedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Earnings Protection Chart */}
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
                contentStyle={{ background: '#1C2537', border: '1px solid #1F2937', borderRadius: '8px', color: '#F9FAFB' }}
                formatter={(value) => {
                  const raw = Array.isArray(value) ? value[0] : value;
                  return [`₹${Number(raw ?? 0)}`, ''];
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="potentialLoss" name="Potential Loss" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="covered" name="ShieldRoute Covers" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.2} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Claims Section — quick view */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-red">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-[#EF4444]" />
            <h2 className="text-lg font-bold text-[#F9FAFB]">Claims</h2>
            <span className="ml-auto text-xs px-2 py-1 bg-[#1C2537] text-[#6B7280] rounded-lg">
              {state.claims.length} total
            </span>
            <Link to="/claims" className="text-xs text-[#14B8A6] hover:text-[#0D9488] font-medium ml-2 transition-colors">
              View all →
            </Link>
          </div>

          {state.claims.length === 0 ? (
            <div className="text-center py-12 text-[#6B7280]">
              <CheckCircle size={40} className="mx-auto mb-3 text-[#1F2937]" />
              <p className="font-medium">No claims yet</p>
              <p className="text-sm mt-1">Claims are auto-initiated when triggers are activated.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.claims.slice(0, 4).map(claim => {
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
                            {claim.triggeredBy} · {claim.disruptionHours}hrs
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-black text-[#14B8A6]">₹{claim.payoutAmount}</div>
                          <div className="text-xs text-[#6B7280]">Payout</div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          claim.status === 'Processing' ? 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]' :
                          claim.status === 'Approved' ? 'border-[#14B8A6]/30 bg-[#14B8A6]/10 text-[#14B8A6]' :
                          'border-green-500/30 bg-green-500/10 text-green-400'
                        }`}>
                          {claim.status}
                        </span>
                      </div>
                    </div>
                    {claim.status === 'Paid' && (
                      <div className="mt-2 text-xs text-green-400">
                        ✓ ₹{claim.payoutAmount} credited · {claim.upiRef}
                      </div>
                    )}
                  </div>
                );
              })}
              {state.claims.length > 4 && (
                <Link to="/claims" className="block text-center text-xs text-[#14B8A6] hover:text-[#0D9488] py-2 transition-colors">
                  View {state.claims.length - 4} more claims →
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
