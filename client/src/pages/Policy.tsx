import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, IndianRupee, ShieldCheck, Timer } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Policy() {
  const { state } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!state.policy) {
      navigate('/onboard');
    }
  }, [state.policy, navigate]);

  if (!state.policy) return null;

  const { policy } = state;
  const { onboarding: profile } = policy;

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-[#F9FAFB]">My Policy</h1>
          <p className="text-[#6B7280] text-sm mt-1">Your weekly ShieldRoute protection details</p>
        </div>

        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-teal">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="text-xs text-[#6B7280] mb-1">Policy ID</div>
              <div className="text-xl font-black text-[#F9FAFB]">{policy.policyId}</div>
              <div className="text-sm text-[#6B7280] mt-1">
                {profile.name} · {profile.zone} · {profile.platform}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold">
                <ShieldCheck size={12} />
                {policy.status}
              </div>
              <div className="text-xs text-[#6B7280] mt-2">Plan: <span className="text-[#F9FAFB] font-medium">{profile.selectedPlan}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-[#1C2537] border border-[#1F2937] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#14B8A6] mb-2">
                <IndianRupee size={14} />
                <span className="text-xs font-medium">Weekly Premium</span>
              </div>
              <div className="text-2xl font-black text-[#14B8A6]">₹{profile.weeklyPremium}</div>
            </div>

            <div className="bg-[#1C2537] border border-[#1F2937] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#F59E0B] mb-2">
                <Timer size={14} />
                <span className="text-xs font-medium">Coverage Per Day</span>
              </div>
              <div className="text-2xl font-black text-[#F59E0B]">₹{profile.coveragePerDay}</div>
            </div>

            <div className="bg-[#1C2537] border border-[#1F2937] rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#EF4444] mb-2">
                <CalendarDays size={14} />
                <span className="text-xs font-medium">Weekly Claim Cap</span>
              </div>
              <div className="text-2xl font-black text-[#EF4444]">₹{profile.maxWeeklyClaim}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
            <div className="bg-[#1C2537] rounded-xl p-4 border border-[#1F2937]">
              <div className="text-[#6B7280]">Policy Start</div>
              <div className="text-[#F9FAFB] font-medium mt-1">{policy.startDate}</div>
            </div>
            <div className="bg-[#1C2537] rounded-xl p-4 border border-[#1F2937]">
              <div className="text-[#6B7280]">Next Renewal</div>
              <div className="text-[#F9FAFB] font-medium mt-1">{policy.renewalDate}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2.5 bg-[#14B8A6] hover:bg-[#0D9488] text-white rounded-xl text-sm font-bold transition-colors"
          >
            Open Dashboard
          </Link>
          <Link
            to="/claims"
            className="px-4 py-2.5 border border-[#1F2937] text-[#6B7280] hover:text-[#F9FAFB] rounded-xl text-sm font-medium transition-colors"
          >
            View Claims
          </Link>
        </div>
      </div>
    </div>
  );
}
