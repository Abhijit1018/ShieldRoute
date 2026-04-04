import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, CheckCircle, Clock, Zap, Wind, Thermometer, Wifi,
  AlertOctagon, Brain, TrendingUp, Star, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApp } from '../context/AppContext';
import api, { type ClaimDTO, type ClaimsIntelligenceDTO } from '../utils/api';
import type { Claim } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TRIGGER_ICONS: Record<string, typeof Zap> = {
  HeavyRain: Wind,
  SeverePollution: Wind,
  ExtremeHeat: Thermometer,
  PlatformOutage: Wifi,
  CivilDisruption: AlertOctagon,
};

const TRIGGER_LABELS: Record<string, string> = {
  HeavyRain: 'Heavy Rain',
  SeverePollution: 'Severe Pollution',
  ExtremeHeat: 'Extreme Heat',
  PlatformOutage: 'Platform Outage',
  CivilDisruption: 'Civil Disruption',
};

const STATUS_STEP_INDEX: Record<string, number> = {
  Processing: 1, Approved: 2, Paid: 3, Rejected: -1,
};

function buildTimeline(claim: ClaimDTO) {
  const activeStep = STATUS_STEP_INDEX[claim.status] ?? 0;
  return [
    {
      label: 'Trigger Detected',
      description: `${TRIGGER_LABELS[claim.triggerType] ?? claim.triggerType} threshold crossed in ${claim.triggerEvent?.zone ?? 'your zone'}`,
      timestamp: claim.createdAt,
      isComplete: true,
    },
    {
      label: 'Claim Processing',
      description: 'Verifying trigger data · Computing payout amount',
      timestamp: activeStep >= 1 ? claim.createdAt : null,
      isComplete: activeStep >= 1,
    },
    {
      label: 'Claim Approved',
      description: 'Payout validated · Queued for UPI transfer',
      timestamp: claim.approvedAt,
      isComplete: activeStep >= 2,
    },
    {
      label: 'Payout Credited',
      description: claim.upiRef
        ? `₹${Math.round(claim.payoutAmount / 100)} credited to ${claim.upiRef}`
        : 'UPI transfer in progress',
      timestamp: claim.paidAt,
      isComplete: activeStep >= 3,
    },
  ];
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function buildClaimReason(claim: ClaimDTO): string {
  const te = claim.triggerEvent;
  if (!te) return `${TRIGGER_LABELS[claim.triggerType] ?? claim.triggerType} trigger activated in your zone.`;
  const label = TRIGGER_LABELS[claim.triggerType] ?? claim.triggerType;
  return `${label} value of ${te.value.toFixed(1)} exceeded threshold of ${te.threshold} in ${te.zone} zone at ${new Date(te.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Disruption duration: ${claim.disruptionHours.toFixed(1)}hrs.`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ClaimTimeline({ steps }: { steps: ReturnType<typeof buildTimeline> }) {
  return (
    <div className="relative mt-4 pt-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex gap-3 mb-3 last:mb-0">
          {/* Connector line */}
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
              step.isComplete
                ? 'bg-[#14B8A6] border-[#14B8A6]'
                : 'bg-transparent border-[#374151]'
            }`}>
              {step.isComplete
                ? <CheckCircle size={14} className="text-white" />
                : <span className="text-[10px] text-[#6B7280] font-bold">{i + 1}</span>
              }
            </div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 h-6 mt-1 ${step.isComplete ? 'bg-[#14B8A6]/50' : 'bg-[#1F2937]'}`} />
            )}
          </div>
          <div className="pb-2">
            <div className={`text-sm font-semibold ${step.isComplete ? 'text-[#F9FAFB]' : 'text-[#4B5563]'}`}>
              {step.label}
            </div>
            <div className="text-xs text-[#6B7280]">{step.description}</div>
            {step.timestamp && (
              <div className="text-xs text-[#14B8A6] mt-0.5">{formatTimeAgo(step.timestamp)}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ClaimCard({ claim }: { claim: ClaimDTO }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TRIGGER_ICONS[claim.triggerType] ?? Zap;
  const timeline = buildTimeline(claim);
  const isPaid = claim.status === 'Paid';
  const isProcessing = claim.status === 'Processing';

  const statusColors = {
    Processing: 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10',
    Approved: 'text-[#14B8A6] border-[#14B8A6]/30 bg-[#14B8A6]/10',
    Paid: 'text-green-400 border-green-500/30 bg-green-500/10',
    Rejected: 'text-red-400 border-red-500/30 bg-red-500/10',
  };

  return (
    <div className={`bg-[#111827] border rounded-2xl overflow-hidden transition-all duration-300 ${
      isPaid ? 'border-green-500/20' : isProcessing ? 'border-[#F59E0B]/20' : 'border-[#1F2937]'
    }`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isPaid ? 'bg-green-500/15' : isProcessing ? 'bg-[#F59E0B]/15' : 'bg-[#14B8A6]/15'
            }`}>
              <Icon size={20} className={isPaid ? 'text-green-400' : isProcessing ? 'text-[#F59E0B]' : 'text-[#14B8A6]'} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#F9FAFB] text-sm">{claim.claimNumber}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusColors[claim.status] ?? statusColors.Processing}`}>
                  {claim.status}
                </span>
                {isProcessing && (
                  <span className="flex items-center gap-1 text-xs text-[#F59E0B]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    Auto-processing
                  </span>
                )}
              </div>
              <div className="text-xs text-[#6B7280] mt-0.5">
                {TRIGGER_LABELS[claim.triggerType] ?? claim.triggerType} · {claim.disruptionHours.toFixed(1)}hrs disruption
              </div>
              <div className="text-xs text-[#4B5563] mt-0.5">{formatTimeAgo(claim.createdAt)}</div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-black text-[#14B8A6]">₹{Math.round(claim.payoutAmount / 100)}</div>
            <div className="text-xs text-[#6B7280]">Payout</div>
          </div>
        </div>

        {isPaid && claim.upiRef && (
          <div className="mt-3 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 flex items-center gap-1.5">
            <CheckCircle size={12} />
            ₹{Math.round(claim.payoutAmount / 100)} credited · UPI ref: {claim.upiRef}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-1">
          {['Triggered', 'Processing', 'Approved', 'Paid'].map((step, i) => {
            const active = STATUS_STEP_INDEX[claim.status] >= i || i === 0;
            return (
              <div key={step} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${
                  active ? (isPaid ? 'bg-green-400' : 'bg-[#14B8A6]') : 'bg-[#1F2937]'
                }`} />
                <div className={`text-[9px] mt-1 text-center ${active ? 'text-[#6B7280]' : 'text-[#374151]'}`}>{step}</div>
              </div>
            );
          })}
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-xs text-[#14B8A6] hover:text-[#0D9488] transition-colors"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Hide details' : 'View claim intelligence'}
        </button>
      </div>

      {/* Expanded: timeline + intelligence */}
      {expanded && (
        <div className="border-t border-[#1F2937] p-5 space-y-4 bg-[#0D1117]">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Brain size={13} className="text-[#14B8A6]" />
              <span className="text-xs font-bold text-[#F9FAFB]">Claim Intelligence</span>
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              {buildClaimReason(claim)}
            </p>
            <div className="mt-2 text-xs text-[#6B7280]">
              Payout: ₹{Math.round(claim.payoutAmount / 100)} — calculated from your daily coverage × disruption ratio
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={13} className="text-[#14B8A6]" />
              <span className="text-xs font-bold text-[#F9FAFB]">Processing Timeline</span>
            </div>
            <ClaimTimeline steps={timeline} />
          </div>
        </div>
      )}
    </div>
  );
}

function IntelligencePanel({ intel, loading }: { intel: ClaimsIntelligenceDTO | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 bg-[#1F2937] rounded" />
          <div className="h-3 w-2/3 bg-[#1F2937] rounded" />
          <div className="h-3 w-1/2 bg-[#1F2937] rounded" />
        </div>
      </div>
    );
  }

  if (!intel) return null;

  const riskColors = { above_avg: 'text-[#EF4444]', avg: 'text-[#F59E0B]', below_avg: 'text-green-400' };
  const riskLabels = { above_avg: 'Above Average', avg: 'Average', below_avg: 'Below Average' };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-teal">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/15 flex items-center justify-center">
          <Brain size={18} className="text-[#14B8A6]" />
        </div>
        <div>
          <h2 className="font-bold text-[#F9FAFB]">Claim Intelligence</h2>
          <p className="text-xs text-[#6B7280]">AI-powered insights from your claim history</p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        <div className="bg-[#0D1117] rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-[#14B8A6]">{intel.personalSafetyScore}</div>
          <div className="text-xs text-[#6B7280]">Safety Score /100</div>
        </div>
        <div className="bg-[#0D1117] rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-[#F9FAFB]">{intel.safeDaysStreak}</div>
          <div className="text-xs text-[#6B7280]">Safe Day Streak</div>
        </div>
        <div className="bg-[#0D1117] rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-green-400">₹{intel.totalPaidOut.toLocaleString('en-IN')}</div>
          <div className="text-xs text-[#6B7280]">Total Paid Out</div>
        </div>
        <div className="bg-[#0D1117] rounded-xl p-3 text-center">
          <div className={`text-lg font-black ${riskColors[intel.zoneRiskComparison]}`}>
            {riskLabels[intel.zoneRiskComparison]}
          </div>
          <div className="text-xs text-[#6B7280]">Zone Risk</div>
        </div>
      </div>

      {/* Safety score bar */}
      <div className="mb-5">
        <div className="flex justify-between text-xs text-[#6B7280] mb-1">
          <span>Personal Safety Score</span>
          <span className="text-[#14B8A6] font-bold">{intel.personalSafetyScore}/100</span>
        </div>
        <div className="h-2 bg-[#1F2937] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#14B8A6] to-green-400 transition-all duration-700"
            style={{ width: `${intel.personalSafetyScore}%` }}
          />
        </div>
      </div>

      {/* Predicted next claim */}
      <div className="bg-[#F59E0B]/8 border border-[#F59E0B]/20 rounded-xl p-3 mb-4">
        <div className="flex items-center gap-1.5 mb-1">
          <AlertCircle size={13} className="text-[#F59E0B]" />
          <span className="text-xs font-bold text-[#F59E0B]">Predicted Next Disruption</span>
        </div>
        <div className="text-xs text-[#9CA3AF]">
          {TRIGGER_LABELS[intel.predictedNextClaim.triggerType] ?? intel.predictedNextClaim.triggerType} —
          {' '}{Math.round(intel.predictedNextClaim.probability * 100)}% probability by{' '}
          {new Date(intel.predictedNextClaim.estimatedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* AI Insights */}
      {intel.insights.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">AI Insights</div>
          {intel.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[#9CA3AF]">
              <Star size={10} className="text-[#14B8A6] mt-0.5 shrink-0" />
              {insight}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Claims() {
  const { state, markClaimsRead, addToast } = useApp();
  const navigate = useNavigate();

  const [apiClaims, setApiClaims] = useState<ClaimDTO[]>([]);
  const [intelligence, setIntelligence] = useState<ClaimsIntelligenceDTO | null>(null);
  const [intelLoading, setIntelLoading] = useState(true);
  const [usingApi, setUsingApi] = useState(false);

  // Redirect if no policy
  useEffect(() => {
    if (!state.policy) {
      navigate('/onboard');
    }
  }, [state.policy, navigate]);

  // Mark read on mount
  useEffect(() => {
    markClaimsRead();
  }, [markClaimsRead]);

  // Try fetching from real API; fallback to context state
  useEffect(() => {
    let cancelled = false;

    const pollClaims = async () => {
      try {
        const claims = await api.getMyClaims();
        if (cancelled) return;

        setUsingApi(true);
        setApiClaims(prev => {
          const newPaid = claims.filter(c =>
            c.status === 'Paid' && !prev.find(p => p.id === c.id && p.status === 'Paid')
          );
          if (newPaid.length > 0) {
            addToast(`₹${Math.round(newPaid[0].payoutAmount / 100)} credited to your UPI!`, 'success');
          }
          return claims;
        });
      } catch {
        if (cancelled) return;
        setUsingApi(false);
      }
    };

    void pollClaims();

    const interval = setInterval(() => {
      void pollClaims();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [addToast]);

  // Fetch intelligence
  useEffect(() => {
    api.getClaimsIntelligence()
      .then(data => setIntelligence(data))
      .catch(() => {
        // Generate mock intelligence from context state
        const mockIntel: ClaimsIntelligenceDTO = {
          mostCommonTrigger: 'HeavyRain',
          avgClaimsPerWeek: 0.5,
          zoneRiskComparison: state.policy?.onboarding.zone
            ? (['Dharavi', 'Kurla', 'Dadar'].includes(state.policy.onboarding.zone) ? 'above_avg' : 'below_avg')
            : 'avg',
          predictedNextClaim: {
            triggerType: 'HeavyRain',
            probability: 0.45,
            estimatedDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          },
          safeDaysStreak: 7,
          totalPaidOut: state.claims.filter(c => c.status === 'Paid').reduce((s, c) => s + c.payoutAmount, 0),
          personalSafetyScore: Math.max(60, 100 - state.claims.length * 5),
          insights: [
            'Your coverage activates automatically when thresholds are crossed — no action needed',
            state.policy?.onboarding.zone
              ? `${state.policy.onboarding.zone} zone monitoring is active 24/7`
              : 'Zone monitoring is active 24/7',
          ],
        };
        setIntelligence(mockIntel);
      })
      .finally(() => setIntelLoading(false));
    // This fetch is intentionally one-time for initial page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build history chart data from claims
  const historyChartData = (() => {
    const weeks: Record<string, number> = {};
    const source: Array<ClaimDTO | Claim> = usingApi ? apiClaims : state.claims;

    source.forEach(c => {
      const dateStr = (c as ClaimDTO).createdAt ?? (c as Claim).timestamp?.toISOString() ?? new Date().toISOString();
      const d = new Date(dateStr);
      const weekLabel = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('en-IN', { month: 'short' })}`;
      const amount = Math.round(((c as ClaimDTO).payoutAmount ?? (c as Claim).payoutAmount) / 100);
      weeks[weekLabel] = (weeks[weekLabel] ?? 0) + amount;
    });

    return Object.entries(weeks).slice(-8).map(([week, amount]) => ({ week, amount }));
  })();

  const displayClaims = usingApi ? apiClaims : [];
  const contextClaims = state.claims;
  const showContextClaims = !usingApi && contextClaims.length > 0;

  if (!state.policy) return null;

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#F9FAFB]">Claims</h1>
            <p className="text-sm text-[#6B7280] mt-1">
              Zero-touch · Auto-processed · Instant UPI payout
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live monitoring
          </div>
        </div>

        {/* Intelligence Panel */}
        <IntelligencePanel intel={intelligence} loading={intelLoading} />

        {/* Active / Recent Claims */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-[#14B8A6]" />
            <h2 className="text-lg font-bold text-[#F9FAFB]">
              {displayClaims.length + contextClaims.length > 0
                ? 'Your Claims'
                : 'No Claims Yet'}
            </h2>
            {(displayClaims.length + contextClaims.length) > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-[#1C2537] text-[#6B7280] rounded-lg">
                {displayClaims.length + contextClaims.length} total
              </span>
            )}
          </div>

          {displayClaims.length === 0 && contextClaims.length === 0 ? (
            <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#1F2937] flex items-center justify-center">
                <CheckCircle size={32} className="text-[#374151]" />
              </div>
              <p className="font-bold text-[#6B7280]">No claims yet — you're protected</p>
              <p className="text-sm text-[#4B5563] mt-2">
                Claims are auto-initiated when disruption thresholds are crossed in your zone.
                No paperwork. No waiting.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* API-sourced claims */}
              {displayClaims.map(claim => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
              {/* Context-sourced claims (simulation mode) */}
              {showContextClaims && contextClaims.map(claim => (
                <div key={claim.id} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        claim.status === 'Paid' ? 'bg-green-500/15' : 'bg-[#F59E0B]/15'
                      }`}>
                        <Zap size={16} className={claim.status === 'Paid' ? 'text-green-400' : 'text-[#F59E0B]'} />
                      </div>
                      <div>
                        <div className="font-bold text-[#F9FAFB] text-sm">{claim.id}</div>
                        <div className="text-xs text-[#6B7280]">{claim.triggeredBy} · {claim.disruptionHours}hrs</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-[#14B8A6]">₹{claim.payoutAmount}</div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        claim.status === 'Processing' ? 'border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]' :
                        claim.status === 'Approved' ? 'border-[#14B8A6]/30 bg-[#14B8A6]/10 text-[#14B8A6]' :
                        'border-green-500/30 bg-green-500/10 text-green-400'
                      }`}>{claim.status}</span>
                    </div>
                  </div>
                  {claim.status === 'Paid' && (
                    <div className="mt-2 text-xs text-green-400">
                      ✓ ₹{claim.payoutAmount} credited to {claim.upiRef}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payout History Chart */}
        {historyChartData.length > 0 && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-[#14B8A6]" />
              <h2 className="text-lg font-bold text-[#F9FAFB]">Payout History</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  contentStyle={{ background: '#1C2537', border: '1px solid #1F2937', borderRadius: '8px', color: '#F9FAFB' }}
                  formatter={(value) => {
                    const raw = Array.isArray(value) ? value[0] : value;
                    return [`₹${Number(raw ?? 0)}`, 'Payout'];
                  }}
                />
                <Area type="monotone" dataKey="amount" name="Payout" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>
    </div>
  );
}
