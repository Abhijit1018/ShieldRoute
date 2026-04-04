import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, ClipboardList, Hourglass, IndianRupee } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ClaimStatus } from '../types';

const STATUS_STYLE: Record<ClaimStatus, { color: string; badge: string; icon: typeof Hourglass }> = {
  Processing: { color: 'text-[#F59E0B]', badge: 'bg-[#F59E0B]/10 text-[#F59E0B]', icon: Hourglass },
  Approved: { color: 'text-[#14B8A6]', badge: 'bg-[#14B8A6]/10 text-[#14B8A6]', icon: CheckCircle2 },
  Paid: { color: 'text-green-400', badge: 'bg-green-500/10 text-green-400', icon: CheckCircle2 },
};

export default function Claims() {
  const { state } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.policy) {
      navigate('/onboard');
    }
  }, [state.policy, navigate]);

  if (!state.policy) return null;

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-[#F9FAFB]">Claims</h1>
            <p className="text-[#6B7280] text-sm mt-1">Track auto-generated claims and payout status</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#1C2537] border border-[#1F2937] text-[#6B7280]">
            {state.claims.length} total
          </span>
        </div>

        {state.claims.length === 0 ? (
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-10 text-center">
            <ClipboardList size={36} className="mx-auto text-[#1F2937] mb-3" />
            <h2 className="text-lg font-bold text-[#F9FAFB]">No claims yet</h2>
            <p className="text-[#6B7280] text-sm mt-1">Claims are created automatically when a trigger is activated.</p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Clock3 size={14} />
              Go to Live Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {state.claims.map((claim) => {
              const cfg = STATUS_STYLE[claim.status];
              const StatusIcon = cfg.icon;
              const createdAt = new Date(claim.timestamp);

              return (
                <div key={claim.id} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#F9FAFB] font-bold">{claim.id}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                          <StatusIcon size={12} />
                          {claim.status}
                        </span>
                      </div>
                      <div className="text-xs text-[#6B7280]">{claim.triggeredBy} · {createdAt.toLocaleString('en-IN')}</div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className={`text-xl font-black ${cfg.color}`}>₹{claim.payoutAmount}</div>
                      <div className="text-xs text-[#6B7280]">Payout Amount</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#1F2937] text-sm">
                    <div className="bg-[#1C2537] rounded-lg px-3 py-2">
                      <div className="text-[#6B7280] text-xs">Disruption Hours</div>
                      <div className="text-[#F9FAFB] font-medium mt-0.5">{claim.disruptionHours} hrs</div>
                    </div>
                    <div className="bg-[#1C2537] rounded-lg px-3 py-2">
                      <div className="text-[#6B7280] text-xs">UPI Ref</div>
                      <div className="text-[#F9FAFB] font-medium mt-0.5">{claim.upiRef}</div>
                    </div>
                    <div className="bg-[#1C2537] rounded-lg px-3 py-2">
                      <div className="text-[#6B7280] text-xs">Claim Value</div>
                      <div className="text-[#14B8A6] font-bold mt-0.5 inline-flex items-center gap-1">
                        <IndianRupee size={12} />
                        {claim.payoutAmount}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
