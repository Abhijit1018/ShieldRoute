import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Shield, AlertTriangle, TrendingUp, Users, DollarSign, Activity, LogOut, X } from 'lucide-react';
import { ZONE_DATA, ZONE_RISK_LEVEL, ZONE_DISPLAY_NAMES, ADMIN_ZONE_STATS, FORECAST_DATA, PNL_DATA, FRAUD_FLAGS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { setAdminAuthenticated } from '../utils/adminAuth';
import type { Zone } from '../types';

const ALL_ZONES = Object.keys(ZONE_DATA) as Zone[];

const RISK_COLORS = {
  Low:      { border: 'border-green-500/30', badge: 'bg-green-500/10 text-green-400', bar: '#22C55E' },
  Medium:   { border: 'border-[#F59E0B]/30', badge: 'bg-[#F59E0B]/10 text-[#F59E0B]',  bar: '#F59E0B' },
  High:     { border: 'border-orange-500/30', badge: 'bg-orange-500/10 text-orange-400', bar: '#F97316' },
  Critical: { border: 'border-[#EF4444]/30', badge: 'bg-[#EF4444]/10 text-[#EF4444]',  bar: '#EF4444' },
};

const FORECAST_BAR_COLOR = (pct: number) =>
  pct > 70 ? '#EF4444' : pct > 50 ? '#F59E0B' : '#14B8A6';

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-[#14B8A6] font-mono font-bold text-xl">
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
}

interface FraudModalProps {
  flag: typeof FRAUD_FLAGS[number];
  onClose: () => void;
}

function FraudModal({ flag, onClose }: FraudModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass bg-[#111827] border border-[#1F2937] rounded-2xl p-6 max-w-md w-full animate-fade-in-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-[#6B7280] mb-1">Claim ID</div>
            <div className="font-black text-[#F9FAFB]">{flag.id}</div>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#F9FAFB] transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl">
            <div className="text-xs text-[#6B7280] mb-0.5">Flag Reason</div>
            <div className="text-sm text-[#EF4444] font-medium">{flag.flag}</div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[#1C2537] rounded-xl p-3">
              <div className="text-2xl font-black text-[#EF4444]">{flag.riskScore}</div>
              <div className="text-xs text-[#6B7280]">Risk Score</div>
            </div>
            <div className="bg-[#1C2537] rounded-xl p-3">
              <div className="text-lg font-black text-[#F9FAFB]">₹{flag.amount}</div>
              <div className="text-xs text-[#6B7280]">Claim Amt</div>
            </div>
            <div className="bg-[#1C2537] rounded-xl p-3">
              <div className="text-lg font-black text-[#F9FAFB]">{flag.zone}</div>
              <div className="text-xs text-[#6B7280]">Zone</div>
            </div>
          </div>
          <div className="p-3 bg-[#1C2537] rounded-xl">
            <div className="text-xs text-[#6B7280] mb-1">Analyst Notes</div>
            <p className="text-sm text-[#F9FAFB] leading-relaxed">{flag.detail}</p>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 py-2.5 bg-[#EF4444] hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-colors">
              Reject Claim
            </button>
            <button className="flex-1 py-2.5 border border-[#1F2937] text-[#6B7280] hover:text-[#F9FAFB] rounded-xl font-medium text-sm transition-colors">
              Escalate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [fraudModal, setFraudModal] = useState<typeof FRAUD_FLAGS[number] | null>(null);

  const highRiskDay = FORECAST_DATA.find(d => d.probability > 70);

  function handleLogout() {
    setAdminAuthenticated(false);
    addToast('Admin logged out.', 'info');
    navigate('/admin-login');
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#F9FAFB]">Insurer Intelligence Center</h1>
            <p className="text-[#6B7280] text-sm mt-0.5">ShieldRoute — Mumbai Operations Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] px-4 py-2 rounded-xl">
              <Activity size={14} className="text-[#14B8A6]" />
              <LiveClock />
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/10 text-xs font-medium transition-colors"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Policies', value: '1,247', icon: Users, color: 'text-[#14B8A6]', border: 'card-accent-teal' },
            { label: 'Weekly Premiums', value: '₹1,84,350', icon: DollarSign, color: 'text-[#F59E0B]', border: 'card-accent-amber' },
            { label: 'Claims Paid (Week)', value: '₹47,200', icon: TrendingUp, color: 'text-[#14B8A6]', border: 'card-accent-teal' },
            { label: 'Loss Ratio', value: '25.6%', icon: Activity, color: 'text-green-400', border: 'card-accent-teal' },
          ].map((kpi, i) => (
            <div key={i} className={`bg-[#111827] border border-[#1F2937] rounded-2xl p-5 ${kpi.border} hover:scale-[1.02] transition-all duration-200`}>
              <div className="flex items-center justify-between mb-3">
                <kpi.icon size={18} className={kpi.color} />
              </div>
              <div className={`text-3xl font-black ${kpi.color}`}>{kpi.value}</div>
              <div className="text-sm text-[#6B7280] mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Zone Risk Heatmap */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={18} className="text-[#14B8A6]" />
              <h2 className="font-bold text-[#F9FAFB]">Zone Risk Heatmap</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ALL_ZONES.map(zone => {
                const riskLevel = ZONE_RISK_LEVEL[zone];
                const colors = RISK_COLORS[riskLevel];
                const stats = ADMIN_ZONE_STATS[zone];
                return (
                  <div key={zone} className={`border ${colors.border} bg-[#1C2537] rounded-xl p-4 hover:scale-[1.02] transition-all duration-200`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[#F9FAFB] text-sm">{ZONE_DISPLAY_NAMES[zone]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${colors.badge}`}>{riskLevel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs text-[#6B7280]">
                      <span>Policies: <span className="text-[#F9FAFB] font-medium">{stats.activePolicies}</span></span>
                      <span>Claims: <span className="text-[#F9FAFB] font-medium">{stats.claimsWeek}</span></span>
                      <span className="col-span-2">Next-week disruption: <span className="text-[#F59E0B] font-bold">{stats.disruptionProb}%</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Predictive Analytics */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-[#F59E0B]" />
              <h2 className="font-bold text-[#F9FAFB]">Next 7 Days Risk Forecast</h2>
            </div>

            {highRiskDay && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-sm">
                <AlertTriangle size={14} className="text-[#EF4444] shrink-0" />
                <span className="text-[#EF4444] font-medium">
                  High Risk Alert: {highRiskDay.day} — {highRiskDay.probability}% disruption probability
                </span>
              </div>
            )}

            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={FORECAST_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#1C2537', border: '1px solid #1F2937', borderRadius: '8px', color: '#F9FAFB' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${v ?? 0}%`, 'Disruption Prob.']}
                />
                <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
                  {FORECAST_DATA.map((entry, index) => (
                    <Cell key={index} fill={FORECAST_BAR_COLOR(entry.probability)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl text-sm">
              <span className="text-[#F59E0B] font-bold">💡 Recommendation:</span>
              <span className="text-[#F9FAFB] ml-1">Consider increasing Dharavi zone premium by 8% this week based on forecast.</span>
            </div>
          </div>
        </div>

        {/* Fraud Detection + P&L */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Fraud Detection */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-red">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle size={18} className="text-[#EF4444]" />
              <h2 className="font-bold text-[#F9FAFB]">AI Fraud Signals</h2>
              <span className="ml-auto text-xs bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 px-2 py-0.5 rounded-full font-bold">
                {FRAUD_FLAGS.length} Flagged
              </span>
            </div>
            <div className="space-y-3">
              {FRAUD_FLAGS.map(flag => (
                <div key={flag.id} className="bg-[#1C2537] border border-[#1F2937] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[#F9FAFB] text-sm">{flag.id}</span>
                        <span className="text-xs bg-[#EF4444]/10 text-[#EF4444] px-2 py-0.5 rounded-full">
                          Score: {flag.riskScore}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7280] line-clamp-2">{flag.flag}</p>
                    </div>
                    <button
                      onClick={() => setFraudModal(flag)}
                      className="shrink-0 text-xs px-3 py-1.5 border border-[#14B8A6]/30 text-[#14B8A6] hover:bg-[#14B8A6]/10 rounded-lg font-medium transition-colors"
                    >
                      Review
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1F2937]">
                    <span className="text-xs text-[#6B7280]">Claim: ₹{flag.amount} · Zone: {flag.zone}</span>
                    <span className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full">Under Review</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* P&L Summary */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-teal">
            <div className="flex items-center gap-2 mb-5">
              <DollarSign size={18} className="text-[#14B8A6]" />
              <h2 className="font-bold text-[#F9FAFB]">Weekly P&L Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1F2937]">
                    <th className="text-left text-xs text-[#6B7280] pb-3 pr-4">Period</th>
                    <th className="text-right text-xs text-[#6B7280] pb-3 pr-4">Premiums</th>
                    <th className="text-right text-xs text-[#6B7280] pb-3 pr-4">Claims</th>
                    <th className="text-right text-xs text-[#6B7280] pb-3">Net Surplus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {PNL_DATA.map((row, i) => (
                    <tr key={i} className="hover:bg-[#1C2537] transition-colors">
                      <td className="py-3 pr-4 text-[#F9FAFB] font-medium text-xs">{row.week}</td>
                      <td className="py-3 pr-4 text-right text-[#14B8A6] font-bold">₹{row.premiums.toLocaleString('en-IN')}</td>
                      <td className="py-3 pr-4 text-right text-[#EF4444] font-bold">₹{row.claims.toLocaleString('en-IN')}</td>
                      <td className="py-3 text-right text-green-400 font-bold">₹{row.surplus.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[#14B8A6]/20 font-black">
                    <td className="pt-3 text-[#F9FAFB] text-xs">Total</td>
                    <td className="pt-3 pr-4 text-right text-[#14B8A6]">
                      ₹{PNL_DATA.reduce((a, r) => a + r.premiums, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="pt-3 pr-4 text-right text-[#EF4444]">
                      ₹{PNL_DATA.reduce((a, r) => a + r.claims, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="pt-3 text-right text-green-400">
                      ₹{PNL_DATA.reduce((a, r) => a + r.surplus, 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Loss ratio bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#6B7280]">Combined Loss Ratio</span>
                <span className="text-green-400 font-bold">25.6% — Healthy</span>
              </div>
              <div className="h-3 bg-[#1F2937] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#14B8A6] to-green-400 rounded-full" style={{ width: '25.6%' }} />
              </div>
              <div className="flex justify-between text-xs mt-1 text-[#6B7280]">
                <span>0%</span>
                <span className="text-[#F59E0B]">70% (break-even)</span>
                <span>100%</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {fraudModal && <FraudModal flag={fraudModal} onClose={() => setFraudModal(null)} />}
    </div>
  );
}
