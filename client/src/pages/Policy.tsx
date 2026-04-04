import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, IndianRupee, ShieldCheck, Timer, CreditCard, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  createPremiumOrder,
  getApiErrorMessage,
  renewMyPolicy,
  verifyPremiumPayment,
} from '../utils/api';
import { openRazorpayCheckout } from '../utils/razorpay';

export default function Policy() {
  const { state, refreshData, setPolicy, addToast } = useApp();
  const navigate = useNavigate();

  const [renewing, setRenewing] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (state.isHydrating) return;
    if (!state.auth) {
      navigate('/onboard');
      return;
    }

    if (!state.policy) {
      void refreshData({ silent: true });
    }
  }, [navigate, refreshData, state.auth, state.isHydrating, state.policy]);

  async function handleRenew() {
    if (!state.auth?.token) return;
    setRenewing(true);

    try {
      const renewedPolicy = await renewMyPolicy(state.auth.token);
      setPolicy(renewedPolicy);
      await refreshData({ silent: true });
      addToast('Policy renewed for the next week.', 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, 'Failed to renew policy.'), 'danger');
    } finally {
      setRenewing(false);
    }
  }

  async function handlePayPremium() {
    if (!state.auth?.token) return;
    setPaying(true);

    try {
      const order = await createPremiumOrder(state.auth.token);

      if (order.mockMode) {
        await verifyPremiumPayment(state.auth.token, {
          orderId: order.orderId,
          paymentId: `mock_pay_${Date.now()}`,
          signature: 'mock',
        });

        await refreshData({ silent: true });
        addToast('Weekly premium payment marked as paid.', 'success');
        return;
      }

      const keyId = order.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!keyId) {
        throw new Error('Razorpay key is missing. Configure RAZORPAY_KEY_ID on backend or VITE_RAZORPAY_KEY_ID on frontend.');
      }

      const payment = await openRazorpayCheckout({
        keyId,
        orderId: order.orderId,
        amountPaise: order.amountPaise,
        riderName: profile.name || undefined,
        riderPhone: profile.phone || undefined,
      });

      await verifyPremiumPayment(state.auth.token, {
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        signature: payment.signature,
      });

      await refreshData({ silent: true });
      addToast('Payment verified successfully.', 'success');
    } catch (error) {
      addToast(getApiErrorMessage(error, 'Payment failed. Please retry.'), 'danger');
    } finally {
      setPaying(false);
    }
  }

  if (state.isHydrating) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center text-[#6B7280]">
        Loading policy...
      </div>
    );
  }

  if (!state.auth) return null;

  if (!state.policy) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] py-16 px-4">
        <div className="max-w-xl mx-auto bg-[#111827] border border-[#1F2937] rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-black text-[#F9FAFB]">No active policy</h1>
          <p className="text-[#6B7280] mt-2">Finish onboarding to create your policy.</p>
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
  const { onboarding: profile } = policy;

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-[#F9FAFB]">My Policy</h1>
          <p className="text-[#6B7280] text-sm mt-1">Database-backed weekly ShieldRoute policy details</p>
        </div>

        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-teal">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="text-xs text-[#6B7280] mb-1">Policy ID</div>
              <div className="text-xl font-black text-[#F9FAFB]">{policy.policyId}</div>
              <div className="text-sm text-[#6B7280] mt-1">
                {profile.name || 'Rider'} · {profile.zone} · {profile.platform}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold">
                <ShieldCheck size={12} />
                {policy.status}
              </div>
              <div className="text-xs text-[#6B7280] mt-2">
                Plan: <span className="text-[#F9FAFB] font-medium">{profile.selectedPlan}</span>
              </div>
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

        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-[#F9FAFB]">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePayPremium}
              disabled={paying}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                paying
                  ? 'bg-[#1F2937] text-[#6B7280] cursor-not-allowed'
                  : 'bg-[#14B8A6] hover:bg-[#0D9488] text-white'
              }`}
            >
              <CreditCard size={14} />
              {paying ? 'Processing Payment...' : 'Pay This Week'}
            </button>

            <button
              onClick={handleRenew}
              disabled={renewing}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                renewing
                  ? 'bg-[#1F2937] text-[#6B7280] cursor-not-allowed'
                  : 'border border-[#1F2937] text-[#6B7280] hover:text-[#F9FAFB]'
              }`}
            >
              <RefreshCw size={14} className={renewing ? 'animate-spin' : ''} />
              {renewing ? 'Renewing...' : 'Renew Policy'}
            </button>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#F9FAFB]">Payment History</h2>
            <span className="text-xs text-[#6B7280]">{state.payments.length} records</span>
          </div>

          {state.payments.length === 0 ? (
            <p className="text-[#6B7280] text-sm mt-4">No premium payments yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {state.payments.slice(0, 6).map(payment => (
                <div
                  key={payment.id}
                  className="bg-[#1C2537] border border-[#1F2937] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-sm text-[#F9FAFB] font-medium">Week Start: {payment.weekStart}</div>
                    <div className="text-xs text-[#6B7280]">Order: {payment.orderId}</div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[#14B8A6] font-bold">₹{payment.amount}</div>
                    <div
                      className={`text-xs font-medium ${
                        payment.status === 'paid'
                          ? 'text-green-400'
                          : payment.status === 'pending'
                            ? 'text-[#F59E0B]'
                            : 'text-[#EF4444]'
                      }`}
                    >
                      {payment.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
