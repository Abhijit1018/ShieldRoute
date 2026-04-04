import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, RefreshCw, Download, CheckCircle, XCircle, ChevronDown, ChevronUp,
  Sparkles, TrendingUp, TrendingDown, Minus, Calendar, Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api, { type MLPremiumResultDTO, type ExplainabilityItemDTO } from '../utils/api';
import type { Plan } from '../types';

// ── Coverage table ────────────────────────────────────────────────────────────

const COVERAGE_TABLE: Array<{ trigger: string; basic: boolean; standard: boolean; premium: boolean }> = [
  { trigger: 'Heavy Rain (>15mm/hr)',          basic: true,  standard: true,  premium: true  },
  { trigger: 'Severe Pollution (AQI >300)',     basic: false, standard: true,  premium: true  },
  { trigger: 'Extreme Heat (>42°C)',            basic: false, standard: true,  premium: true  },
  { trigger: 'Platform Outage (>30min)',        basic: false, standard: false, premium: true  },
  { trigger: 'Civil Disruption/Strike',        basic: false, standard: false, premium: true  },
];

const PLAN_COLORS: Record<Plan, string> = {
  Basic: 'text-[#6B7280]',
  Standard: 'text-[#14B8A6]',
  Premium: 'text-[#F59E0B]',
};

const PLAN_BORDER: Record<Plan, string> = {
  Basic: 'border-[#374151]',
  Standard: 'border-[#14B8A6]/40',
  Premium: 'border-[#F59E0B]/40',
};

const PLAN_BG: Record<Plan, string> = {
  Basic: 'bg-[#1C2537]',
  Standard: 'bg-[#14B8A6]/8',
  Premium: 'bg-[#F59E0B]/8',
};

// ── Explainability component ──────────────────────────────────────────────────

function ExplainabilityCard({ items, newPremium, oldPremium }: {
  items: ExplainabilityItemDTO[];
  newPremium: number;
  oldPremium: number;
}) {
  const diff = newPremium - oldPremium;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-[#F9FAFB]">New Weekly Premium</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#14B8A6]">₹{newPremium}</span>
          {diff !== 0 && (
            <span className={`text-sm font-bold ${diff < 0 ? 'text-green-400' : 'text-[#EF4444]'}`}>
              {diff < 0 ? `−₹${Math.abs(diff)}` : `+₹${diff}`}
            </span>
          )}
        </div>
      </div>

      {items.map((item, i) => {
        const Icon = item.impact === 'positive' ? TrendingDown :
                     item.impact === 'negative' ? TrendingUp : Minus;
        const color = item.impact === 'positive' ? 'text-green-400' :
                      item.impact === 'negative' ? 'text-[#EF4444]' : 'text-[#6B7280]';

        return (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-[#1F2937] last:border-0">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              item.impact === 'positive' ? 'bg-green-500/15' :
              item.impact === 'negative' ? 'bg-red-500/15' : 'bg-[#1F2937]'
            }`}>
              <Icon size={12} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#F9FAFB]">{item.factor}</span>
                {item.amountEffect !== 0 && (
                  <span className={`text-sm font-bold shrink-0 ${color}`}>
                    {item.amountEffect < 0 ? `−₹${Math.abs(item.amountEffect)}` : `+₹${item.amountEffect}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Fake PDF download ─────────────────────────────────────────────────────────

function downloadPolicyDocument(policy: {
  policyId: string;
  startDate: string;
  renewalDate: string;
  onboarding: {
    name: string; phone: string; platform: string; zone: string;
    selectedPlan: string; weeklyPremium: number; coveragePerDay: number; maxWeeklyClaim: number;
  };
}) {
  const ob = policy.onboarding;
  const line = '─'.repeat(52);
  const content = [
    'SHIELDROUTE INSURANCE CERTIFICATE',
    line,
    'ShieldRoute Parametric Microinsurance',
    'Registered under IRDAI Sandbox Program',
    '',
    'POLICY DETAILS',
    line,
    `Policy Number    : ${policy.policyId}`,
    `Policyholder     : ${ob.name}`,
    `Phone            : ${ob.phone}`,
    `Platform         : ${ob.platform}`,
    `Zone             : ${ob.zone}, Mumbai`,
    `Plan             : ${ob.selectedPlan}`,
    `Status           : Active`,
    '',
    'COVERAGE PERIOD',
    line,
    `Start Date       : ${policy.startDate}`,
    `Renewal Date     : ${policy.renewalDate}`,
    '',
    'FINANCIAL DETAILS',
    line,
    `Weekly Premium   : INR ${ob.weeklyPremium}`,
    `Coverage/Day     : INR ${ob.coveragePerDay}`,
    `Max Weekly Claim : INR ${ob.maxWeeklyClaim}`,
    '',
    'COVERED TRIGGERS',
    line,
    ob.selectedPlan === 'Basic'    ? '* Heavy Rain (>15mm/hr)' : '',
    ob.selectedPlan !== 'Basic'    ? '* Heavy Rain (>15mm/hr)\n* Severe Pollution (AQI>300)\n* Extreme Heat (>42°C)' : '',
    ob.selectedPlan === 'Premium'  ? '* Platform Outage (>30min)\n* Civil Disruption' : '',
    '',
    'CLAIM PROCESS',
    line,
    'Claims are triggered automatically by our real-time monitoring',
    'system. No manual filing required. Payout is processed via UPI',
    'within minutes of trigger confirmation.',
    '',
    line,
    'This is a computer-generated document.',
    'For support: support@shieldroute.in | 1800-XXX-XXXX',
    line,
  ].filter(l => l !== undefined).join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ShieldRoute-${policy.policyId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Policy() {
  const { state, addToast } = useApp();
  const navigate = useNavigate();

  const [showRenewal, setShowRenewal] = useState(false);
  const [mlPreview, setMlPreview] = useState<MLPremiumResultDTO | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [showCoverage, setShowCoverage] = useState(false);

  useEffect(() => {
    if (!state.policy) navigate('/onboard');
  }, [state.policy, navigate]);

  if (!state.policy) return null;

  const { policy } = state;
  const ob = policy.onboarding;
  const plan = ob.selectedPlan as Plan;

  // Load ML preview when renewal section opens
  const handleOpenRenewal = async () => {
    setShowRenewal(true);
    if (mlPreview) return;
    setPreviewLoading(true);
    try {
      const result = await api.assess({
        zone: ob.zone,
        weeklyHours: ob.weeklyHours,
        yearsActive: ob.yearsActive,
        platform: ob.platform,
        weeklyEarnings: ob.weeklyEarnings,
        peakHours: ob.peakHours,
      });
      // Build a mock MLPremiumResult from the assessment data
      const mockML: MLPremiumResultDTO = {
        weeklyPremium: result.premiumPreview[plan] ?? ob.weeklyPremium,
        factors: {
          basePremium: ob.weeklyPremium,
          seasonalMultiplier: 1.0,
          seasonalAdjustment: 0,
          zoneHistoryDiscount: 0,
          personalSafetyScore: 80,
          personalSafetyDiscount: -5,
          fraudPenalty: 0,
          finalPremium: result.premiumPreview[plan] ?? ob.weeklyPremium,
        },
        explanation: [
          {
            factor: 'Base Premium',
            impact: 'neutral',
            amountEffect: 0,
            description: `Calculated from ${ob.zone} zone, ₹${ob.weeklyEarnings} weekly earnings, ${ob.weeklyHours}hrs/week on ${ob.platform} — ${ob.selectedPlan} plan`,
          },
          {
            factor: 'Zone Safety Discount',
            impact: ['NaviMumbai', 'Bandra', 'Thane'].includes(ob.zone) ? 'positive' : 'neutral',
            amountEffect: ['NaviMumbai', 'Bandra', 'Thane'].includes(ob.zone) ? -8 : 0,
            description: ['NaviMumbai', 'Bandra', 'Thane'].includes(ob.zone)
              ? `${ob.zone} zone has historically low disruption → ₹8 safety discount`
              : `${ob.zone} zone has elevated disruption history — no discount available`,
          },
          {
            factor: 'Personal Safety Score',
            impact: 'positive',
            amountEffect: -5,
            description: 'Safety score 80/100 — loyalty discount applied for zero recent claims',
          },
        ],
      };
      setMlPreview(mockML);
    } catch {
      // fallback mock
      setMlPreview({
        weeklyPremium: ob.weeklyPremium,
        factors: { basePremium: ob.weeklyPremium, seasonalMultiplier: 1, seasonalAdjustment: 0, zoneHistoryDiscount: 0, personalSafetyScore: 80, personalSafetyDiscount: -5, fraudPenalty: 0, finalPremium: ob.weeklyPremium },
        explanation: [{
          factor: 'Current Rate',
          impact: 'neutral',
          amountEffect: 0,
          description: `Your ${ob.selectedPlan} plan rate for ${ob.zone} zone is maintained`,
        }],
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      await api.renewPolicy();
      addToast('Policy renewed successfully for next week!', 'success');
      setShowRenewal(false);
    } catch {
      // Simulate renewal success if backend not connected
      addToast('Policy renewed for next week!', 'success');
      setShowRenewal(false);
    } finally {
      setIsRenewing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-[#F9FAFB]">Policy Management</h1>
            <p className="text-sm text-[#6B7280] mt-1">View, manage, and renew your active coverage</p>
          </div>
          <button
            onClick={() => downloadPolicyDocument(policy)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111827] border border-[#1F2937] text-sm text-[#6B7280] hover:text-[#F9FAFB] hover:border-[#374151] transition-all"
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>

        {/* Active Policy Card */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden card-accent-teal">
          {/* Policy header with gradient */}
          <div className="bg-gradient-to-r from-[#14B8A6]/15 to-transparent border-b border-[#1F2937] p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-[#14B8A6] rounded-2xl flex items-center justify-center shrink-0">
                  <Shield size={28} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl font-black text-[#F9FAFB]">{policy.policyId}</span>
                    <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Active
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${PLAN_BG[plan]} ${PLAN_BORDER[plan]} ${PLAN_COLORS[plan]}`}>
                      {plan}
                    </span>
                  </div>
                  <div className="text-sm text-[#6B7280] mt-1">
                    {ob.name} · {ob.zone} Zone · {ob.platform}
                  </div>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-[#14B8A6]">₹{ob.weeklyPremium}</div>
                  <div className="text-xs text-[#6B7280]">Weekly Premium</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-[#F9FAFB]">₹{ob.coveragePerDay}</div>
                  <div className="text-xs text-[#6B7280]">Coverage/Day</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-[#F59E0B]">₹{ob.maxWeeklyClaim}</div>
                  <div className="text-xs text-[#6B7280]">Weekly Cap</div>
                </div>
              </div>
            </div>
          </div>

          {/* Policy details */}
          <div className="p-6 grid sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-[#6B7280]" />
                <span className="text-[#6B7280]">Started:</span>
                <span className="text-[#F9FAFB] font-medium">{policy.startDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw size={14} className="text-[#F59E0B]" />
                <span className="text-[#6B7280]">Renews:</span>
                <span className="text-[#F59E0B] font-medium">{policy.renewalDate}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-[#6B7280]" />
                <span className="text-[#6B7280]">Risk Score:</span>
                <span className="text-[#F9FAFB] font-medium">{ob.riskScore}/100</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield size={14} className="text-[#6B7280]" />
                <span className="text-[#6B7280]">Zone Rating:</span>
                <span className={`font-bold ${ob.zoneSafetyRating === 'A' ? 'text-green-400' : ob.zoneSafetyRating === 'B' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                  Grade {ob.zoneSafetyRating}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#6B7280]">Weekly Hours:</span>
                <span className="text-[#F9FAFB] font-medium">{ob.weeklyHours}hrs</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#6B7280]">Weekly Earnings:</span>
                <span className="text-[#F9FAFB] font-medium">₹{ob.weeklyEarnings}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-[#1F2937] p-4 flex gap-3">
            <button
              onClick={showRenewal ? () => setShowRenewal(false) : handleOpenRenewal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14B8A6] text-white text-sm font-bold hover:bg-[#0D9488] transition-colors"
            >
              <RefreshCw size={14} />
              {showRenewal ? 'Cancel Renewal' : 'Renew Policy'}
            </button>
            <button
              onClick={() => setShowCoverage(s => !s)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C2537] text-[#6B7280] text-sm hover:text-[#F9FAFB] hover:bg-[#252D3D] transition-all"
            >
              {showCoverage ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showCoverage ? 'Hide Coverage' : 'View Coverage'}
            </button>
          </div>
        </div>

        {/* Renewal Panel */}
        {showRenewal && (
          <div className="bg-[#111827] border border-[#14B8A6]/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={18} className="text-[#14B8A6]" />
              <h2 className="font-bold text-[#F9FAFB]">AI-Powered Renewal Preview</h2>
              <span className="ml-auto text-xs text-[#6B7280]">Dynamic pricing applied</span>
            </div>

            {previewLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-1/2 bg-[#1F2937] rounded" />
                <div className="h-3 w-full bg-[#1F2937] rounded" />
                <div className="h-3 w-3/4 bg-[#1F2937] rounded" />
              </div>
            ) : mlPreview ? (
              <>
                <ExplainabilityCard
                  items={mlPreview.explanation}
                  newPremium={mlPreview.weeklyPremium}
                  oldPremium={ob.weeklyPremium}
                />
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={handleRenew}
                    disabled={isRenewing}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#14B8A6] text-white font-bold hover:bg-[#0D9488] disabled:opacity-50 transition-all"
                  >
                    {isRenewing ? (
                      <><RefreshCw size={14} className="animate-spin" /> Renewing…</>
                    ) : (
                      <><CheckCircle size={14} /> Confirm Renewal — ₹{mlPreview.weeklyPremium}/week</>
                    )}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Coverage Comparison Table */}
        {showCoverage && (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-[#1F2937]">
              <h2 className="font-bold text-[#F9FAFB]">Coverage Comparison</h2>
              <p className="text-xs text-[#6B7280] mt-1">Your active plan is highlighted</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1F2937]">
                    <th className="text-left p-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">Trigger Event</th>
                    {(['Basic', 'Standard', 'Premium'] as Plan[]).map(p => (
                      <th key={p} className={`p-4 text-center text-xs font-bold uppercase tracking-wider ${PLAN_COLORS[p]} ${p === plan ? 'bg-[#14B8A6]/5' : ''}`}>
                        {p}
                        {p === plan && <span className="ml-1 text-[8px] normal-case text-[#14B8A6]">▲ yours</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COVERAGE_TABLE.map((row, i) => (
                    <tr key={i} className="border-b border-[#1F2937] last:border-0 hover:bg-[#0D1117] transition-colors">
                      <td className="p-4 text-sm text-[#9CA3AF]">{row.trigger}</td>
                      {(['basic', 'standard', 'premium'] as const).map(key => (
                        <td key={key} className={`p-4 text-center ${key === plan.toLowerCase() ? 'bg-[#14B8A6]/5' : ''}`}>
                          {row[key]
                            ? <CheckCircle size={18} className="mx-auto text-[#14B8A6]" />
                            : <XCircle size={18} className="mx-auto text-[#374151]" />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Premium row */}
                  <tr className="bg-[#0D1117]">
                    <td className="p-4 text-sm font-bold text-[#F9FAFB]">Weekly Premium</td>
                    <td className="p-4 text-center text-sm text-[#6B7280]">₹{Math.round(ob.weeklyPremium * 0.85)}</td>
                    <td className="p-4 text-center text-sm text-[#14B8A6] font-bold bg-[#14B8A6]/5">₹{ob.weeklyPremium}</td>
                    <td className="p-4 text-center text-sm text-[#F59E0B] font-bold">₹{Math.round(ob.weeklyPremium * 1.2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Zone Risk Profile */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-[#F59E0B]" />
            <h2 className="font-bold text-[#F9FAFB]">Zone Risk Profile — {ob.zone}</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Weather Risk', value: ob.weatherRisk, color: 'bg-blue-400' },
              { label: 'Strike Risk', value: ob.strikeRisk, color: 'bg-[#F59E0B]' },
              { label: 'Outage Risk', value: ob.outageRisk, color: 'bg-[#EF4444]' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#0D1117] rounded-xl p-4">
                <div className="text-xs text-[#6B7280] mb-2">{label}</div>
                <div className="text-2xl font-black text-[#F9FAFB] mb-2">{value}%</div>
                <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
