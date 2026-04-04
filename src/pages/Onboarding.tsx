import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, CheckCircle, ChevronRight, ChevronLeft, Loader } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ZONE_DISPLAY_NAMES } from '../data/mockData';
import { buildOnboardingResult, calculatePremium, getPlanCoverage } from '../utils/premiumCalc';
import type { Platform, Zone, Plan, PeakHour, OnboardingData } from '../types';

const ZONES = Object.keys(ZONE_DISPLAY_NAMES) as Zone[];
const PEAK_HOURS: PeakHour[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
const PLANS: Plan[] = ['Basic', 'Standard', 'Premium'];

const PLAN_INFO = {
  Basic:    { triggers: 1, desc: 'Weather only',       coveragePct: '70%' },
  Standard: { triggers: 3, desc: '3 trigger types',    coveragePct: '85%' },
  Premium:  { triggers: 5, desc: 'All 5 trigger types', coveragePct: '100%' },
};

const AI_LINES = (zone: string) => [
  `Scanning zone disruption history for ${zone}...`,
  'Calculating monsoon exposure index...',
  'Evaluating platform payout patterns...',
];

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        {['Identity', 'Work Profile', 'AI Assessment', 'Enroll'].map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              i < step ? 'bg-[#14B8A6] text-white' :
              i === step ? 'bg-[#14B8A6]/20 border-2 border-[#14B8A6] text-[#14B8A6]' :
              'bg-[#1F2937] text-[#6B7280]'
            }`}>
              {i < step ? <CheckCircle size={16} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-[#14B8A6]' : 'text-[#6B7280]'}`}>{label}</span>
          </div>
        ))}
      </div>
      <div className="h-1 bg-[#1F2937] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#14B8A6] rounded-full transition-all duration-500"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    platform: 'Zomato' as Platform,
    yearsActive: 2,
    zone: 'Andheri' as Zone,
    weeklyHours: 40,
    weeklyEarnings: 7000,
    peakHours: ['Evening'] as PeakHour[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // AI step state
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLines, setAiLines] = useState<string[]>([]);
  const [aiDone, setAiDone] = useState(false);
  const [aiResult, setAiResult] = useState<Partial<OnboardingData> | null>(null);

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<Plan>('Standard');

  const { setOnboarding, setPolicy, addToast } = useApp();
  const navigate = useNavigate();

  function validate() {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.name.trim()) e.name = 'Name is required';
      if (!/^\d{10}$/.test(form.phone)) e.phone = 'Enter a valid 10-digit phone number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate()) return;
    setStep(s => s + 1);
  }

  // Run AI analysis when step becomes 2
  useEffect(() => {
    if (step !== 2) return;
    setAiProgress(0);
    setAiLines([]);
    setAiDone(false);
    setAiResult(null);

    const lines = AI_LINES(form.zone);
    let lineIdx = 0;

    const lineTimer = setInterval(() => {
      if (lineIdx < lines.length) {
        setAiLines(prev => [...prev, lines[lineIdx]]);
        lineIdx++;
      }
    }, 800);

    const progressTimer = setInterval(() => {
      setAiProgress(p => {
        if (p >= 100) { clearInterval(progressTimer); return 100; }
        return p + 3;
      });
    }, 90);

    const doneTimer = setTimeout(() => {
      clearInterval(lineTimer);
      clearInterval(progressTimer);
      setAiProgress(100);
      const result = buildOnboardingResult({ ...form });
      setAiResult(result);
      setSelectedPlan(result.recommendedPlan || 'Standard');
      setAiDone(true);
    }, 3200);

    return () => { clearInterval(lineTimer); clearInterval(progressTimer); clearTimeout(doneTimer); };
  }, [step, form]);

  function enroll() {
    if (!aiResult) return;

    const premium = calculatePremium(
      form.weeklyEarnings,
      form.zone,
      form.weeklyHours,
      form.platform,
      aiResult.riskScore!,
      selectedPlan
    );

    const coveragePerDay = getPlanCoverage(selectedPlan, aiResult.coveragePerDay!);
    const maxWeeklyClaim = aiResult.maxWeeklyClaim!;

    const data: OnboardingData = {
      ...form,
      ...(aiResult as Partial<OnboardingData>),
      selectedPlan,
      weeklyPremium: premium,
      coveragePerDay,
      maxWeeklyClaim,
    } as OnboardingData;

    setOnboarding(data);

    const now = new Date();
    const renewal = new Date(now);
    renewal.setDate(renewal.getDate() + 7);

    const policyId = `SR${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 900000 + 100000)}`;

    setPolicy({
      policyId,
      status: 'Active',
      startDate: now.toLocaleDateString('en-IN'),
      renewalDate: renewal.toLocaleDateString('en-IN'),
      onboarding: data,
    });

    addToast(`Welcome, ${form.name}! Your policy ${policyId} is now active.`, 'success');
    navigate('/dashboard');
  }

  const incomeEstimate = Math.round((form.weeklyHours / 40) * form.weeklyEarnings);

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-[#14B8A6] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-[#F9FAFB]">Get Protected with ShieldRoute</h1>
          <p className="text-[#6B7280] mt-1">Takes less than 3 minutes</p>
        </div>

        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 sm:p-8">
          <ProgressBar step={step} />

          {/* STEP 0: Identity */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in-up">
              <h2 className="text-xl font-bold text-[#F9FAFB] mb-6">Tell us about yourself</h2>

              <div>
                <label className="text-sm text-[#6B7280] mb-1.5 block">Full Name</label>
                <input
                  className="w-full bg-[#1C2537] border border-[#1F2937] rounded-xl px-4 py-3 text-[#F9FAFB] focus:outline-none focus:border-[#14B8A6] transition-colors"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
                {errors.name && <p className="text-[#EF4444] text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="text-sm text-[#6B7280] mb-1.5 block">Phone Number</label>
                <input
                  className="w-full bg-[#1C2537] border border-[#1F2937] rounded-xl px-4 py-3 text-[#F9FAFB] focus:outline-none focus:border-[#14B8A6] transition-colors"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))}
                />
                {errors.phone && <p className="text-[#EF4444] text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="text-sm text-[#6B7280] mb-1.5 block">Delivery Platform</label>
                <div className="flex gap-3">
                  {(['Zomato', 'Swiggy'] as Platform[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, platform: p }))}
                      className={`flex-1 py-3 rounded-xl border font-medium transition-all duration-200 ${
                        form.platform === p
                          ? 'border-[#14B8A6] bg-[#14B8A6]/10 text-[#14B8A6]'
                          : 'border-[#1F2937] text-[#6B7280] hover:border-[#14B8A6]/40'
                      }`}
                    >
                      {p === 'Zomato' ? '🔴' : '🟠'} {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-[#6B7280] mb-1.5 block">
                  Years Active: <span className="text-[#14B8A6] font-bold">{form.yearsActive} yr{form.yearsActive !== 1 ? 's' : ''}</span>
                </label>
                <input
                  type="range" min={0} max={10} value={form.yearsActive}
                  onChange={e => setForm(f => ({ ...f, yearsActive: +e.target.value }))}
                  className="w-full accent-[#14B8A6]"
                />
                <div className="flex justify-between text-xs text-[#6B7280] mt-1"><span>0</span><span>10 years</span></div>
              </div>
            </div>
          )}

          {/* STEP 1: Work Profile */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in-up">
              <h2 className="text-xl font-bold text-[#F9FAFB] mb-6">Your Work Profile</h2>

              <div>
                <label className="text-sm text-[#6B7280] mb-1.5 block">Primary Delivery Zone</label>
                <select
                  className="w-full bg-[#1C2537] border border-[#1F2937] rounded-xl px-4 py-3 text-[#F9FAFB] focus:outline-none focus:border-[#14B8A6] transition-colors"
                  value={form.zone}
                  onChange={e => setForm(f => ({ ...f, zone: e.target.value as Zone }))}
                >
                  {ZONES.map(z => (
                    <option key={z} value={z}>{ZONE_DISPLAY_NAMES[z]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-[#6B7280] mb-1.5 block">
                  Avg Weekly Hours: <span className="text-[#14B8A6] font-bold">{form.weeklyHours} hrs</span>
                </label>
                <input
                  type="range" min={20} max={80} value={form.weeklyHours}
                  onChange={e => setForm(f => ({ ...f, weeklyHours: +e.target.value }))}
                  className="w-full accent-[#14B8A6]"
                />
                <div className="mt-2 p-3 bg-[#1C2537] rounded-lg text-sm">
                  <span className="text-[#6B7280]">Estimated weekly income: </span>
                  <span className="text-[#14B8A6] font-bold">₹{incomeEstimate.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-[#6B7280] mb-1.5 block">Avg Weekly Earnings (₹)</label>
                <input
                  type="number"
                  className="w-full bg-[#1C2537] border border-[#1F2937] rounded-xl px-4 py-3 text-[#F9FAFB] focus:outline-none focus:border-[#14B8A6] transition-colors"
                  placeholder="e.g. 7000"
                  value={form.weeklyEarnings}
                  onChange={e => setForm(f => ({ ...f, weeklyEarnings: +e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm text-[#6B7280] mb-2 block">Peak Hours (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {PEAK_HOURS.map(h => (
                    <button
                      key={h}
                      onClick={() => setForm(f => ({
                        ...f,
                        peakHours: f.peakHours.includes(h)
                          ? f.peakHours.filter(p => p !== h)
                          : [...f.peakHours, h]
                      }))}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                        form.peakHours.includes(h)
                          ? 'bg-[#14B8A6]/10 border-[#14B8A6] text-[#14B8A6]'
                          : 'border-[#1F2937] text-[#6B7280] hover:border-[#14B8A6]/40'
                      }`}
                    >
                      {h === 'Morning' ? '🌅' : h === 'Afternoon' ? '☀️' : h === 'Evening' ? '🌆' : '🌙'} {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: AI Assessment */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              <h2 className="text-xl font-bold text-[#F9FAFB] mb-6">AI Risk Assessment</h2>

              {!aiDone ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-4 border-[#1F2937] flex items-center justify-center">
                        <Loader size={32} className="text-[#14B8A6] spin-slow" />
                      </div>
                      <div
                        className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#14B8A6] spin-slow"
                        style={{ animationDuration: '1s' }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-[#6B7280] mb-1.5">
                      <span>Analysing profile...</span>
                      <span>{aiProgress}%</span>
                    </div>
                    <div className="h-2 bg-[#1F2937] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#14B8A6] rounded-full transition-all duration-300"
                        style={{ width: `${aiProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {aiLines.map((line, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm animate-fade-in-up">
                        <CheckCircle size={14} className="text-[#14B8A6] shrink-0" />
                        <span className="text-[#6B7280]">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : aiResult && (
                <div className="space-y-5">
                  {/* Risk Score */}
                  <div className="bg-[#1C2537] rounded-2xl p-5 border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[#6B7280] text-sm font-medium">Risk Score</span>
                      <span className={`text-xs px-2 py-1 rounded-lg font-bold ${
                        aiResult.riskScore! < 65 ? 'bg-green-500/10 text-green-400' :
                        aiResult.riskScore! <= 75 ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                        'bg-[#EF4444]/10 text-[#EF4444]'
                      }`}>
                        Zone Safety: {aiResult.zoneSafetyRating}
                      </span>
                    </div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className={`text-5xl font-black ${
                        aiResult.riskScore! < 65 ? 'text-green-400' :
                        aiResult.riskScore! <= 75 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                      }`}>{aiResult.riskScore}</span>
                      <span className="text-[#6B7280] text-sm mb-2">/ 100</span>
                    </div>
                    <div className="h-2 bg-[#0A0E1A] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          aiResult.riskScore! < 65 ? 'bg-green-400' :
                          aiResult.riskScore! <= 75 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
                        }`}
                        style={{ width: `${aiResult.riskScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Risk breakdown */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Weather Risk', value: aiResult.weatherRisk, color: 'text-blue-400' },
                      { label: 'Strike Risk', value: aiResult.strikeRisk, color: 'text-[#F59E0B]' },
                      { label: 'Outage Risk', value: aiResult.outageRisk, color: 'text-[#EF4444]' },
                    ].map(item => (
                      <div key={item.label} className="bg-[#1C2537] rounded-xl p-4 text-center border border-[#1F2937]">
                        <div className={`text-2xl font-black ${item.color}`}>{item.value}%</div>
                        <div className="text-xs text-[#6B7280] mt-1">{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-xl">
                    <CheckCircle size={16} className="text-[#14B8A6]" />
                    <span className="text-sm text-[#14B8A6] font-medium">
                      Recommended Plan: <strong>{aiResult.recommendedPlan}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Enroll */}
          {step === 3 && aiResult && (
            <div className="animate-fade-in-up space-y-6">
              <h2 className="text-xl font-bold text-[#F9FAFB] mb-2">Choose Your Plan</h2>
              <p className="text-sm text-[#6B7280] mb-6">Select the coverage level that fits your needs.</p>

              <div className="grid gap-4">
                {PLANS.map(plan => {
                  const premium = calculatePremium(
                    form.weeklyEarnings, form.zone, form.weeklyHours, form.platform,
                    aiResult.riskScore!, plan
                  );
                  const covDay = getPlanCoverage(plan, aiResult.coveragePerDay!);
                  const isRec = plan === aiResult.recommendedPlan;
                  const isSelected = plan === selectedPlan;

                  return (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative text-left p-5 rounded-2xl border transition-all duration-200 ${
                        isSelected
                          ? 'border-[#14B8A6] bg-[#14B8A6]/10'
                          : 'border-[#1F2937] bg-[#1C2537] hover:border-[#14B8A6]/40'
                      }`}
                    >
                      {isRec && (
                        <span className="absolute top-3 right-3 text-xs bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 px-2 py-0.5 rounded-full font-medium">
                          Recommended
                        </span>
                      )}
                      <div className="flex items-start justify-between pr-24">
                        <div>
                          <div className="font-bold text-[#F9FAFB] text-lg">{plan}</div>
                          <div className="text-sm text-[#6B7280] mt-1">
                            {PLAN_INFO[plan].desc} · {PLAN_INFO[plan].coveragePct} coverage
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-[#14B8A6]">₹{premium}</div>
                          <div className="text-xs text-[#6B7280]">per week</div>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-4 text-xs">
                        <div><span className="text-[#6B7280]">Coverage/day: </span><span className="text-[#F9FAFB] font-medium">₹{covDay}</span></div>
                        <div><span className="text-[#6B7280]">Weekly cap: </span><span className="text-[#F9FAFB] font-medium">₹{aiResult.maxWeeklyClaim}</span></div>
                        <div><span className="text-[#6B7280]">Triggers: </span><span className="text-[#F9FAFB] font-medium">{PLAN_INFO[plan].triggers}</span></div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={enroll}
                className="w-full py-4 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-[1.02] glow-teal flex items-center justify-center gap-2"
              >
                <Shield size={20} />
                Enroll Now — Activate Protection
              </button>
            </div>
          )}

          {/* Navigation buttons */}
          {step < 3 && (
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 px-5 py-3 border border-[#1F2937] text-[#6B7280] hover:text-[#F9FAFB] rounded-xl transition-all duration-200"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <button
                onClick={next}
                disabled={step === 2 && !aiDone}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 font-bold rounded-xl transition-all duration-200 ${
                  step === 2 && !aiDone
                    ? 'bg-[#1F2937] text-[#6B7280] cursor-not-allowed'
                    : 'bg-[#14B8A6] hover:bg-[#0D9488] text-white hover:scale-[1.02]'
                }`}
              >
                {step === 2 ? (aiDone ? 'Continue to Enroll' : 'Analysing...') : 'Continue'}
                {(step !== 2 || aiDone) && <ChevronRight size={16} />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
