import { ArrowRight, Shield, Clock, Users, TrendingUp, MapPin, Star, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ZONE_DATA, ZONE_RISK_LEVEL, ZONE_DISPLAY_NAMES, TESTIMONIALS } from '../data/mockData';
import type { Zone } from '../types';

const STATS = [
  { value: '₹2.4Cr', label: 'Paid out this month', icon: TrendingUp, color: 'text-[#14B8A6]' },
  { value: '12,400', label: 'Active riders', icon: Users, color: 'text-[#F59E0B]' },
  { value: '4 min', label: 'Avg payout time', icon: Clock, color: 'text-[#14B8A6]' },
];

const STEPS = [
  { icon: '📋', title: 'Onboard in 4 steps', desc: 'Tell us your zone, platform, and earnings in under 3 minutes.' },
  { icon: '🤖', title: 'AI Risk Assessment', desc: 'Our model analyses your micro-zone disruption history and sets your premium.' },
  { icon: '⚡', title: 'Parametric Triggers', desc: '5 real-time triggers monitor rain, AQI, heat, outages, and civil disruptions.' },
  { icon: '💸', title: 'Instant Payout', desc: 'Disruption detected → claim auto-initiated → ₹ to your UPI in minutes.' },
];

const RISK_COLORS: Record<string, { border: string; badge: string; dot: string; bg: string }> = {
  Low:      { border: 'border-green-500/30',  badge: 'bg-green-500/10 text-green-400',  dot: 'bg-green-400',  bg: 'bg-green-500/5' },
  Medium:   { border: 'border-[#F59E0B]/30',  badge: 'bg-[#F59E0B]/10 text-[#F59E0B]', dot: 'bg-[#F59E0B]', bg: 'bg-[#F59E0B]/5' },
  High:     { border: 'border-orange-500/30', badge: 'bg-orange-500/10 text-orange-400',dot: 'bg-orange-400', bg: 'bg-orange-500/5' },
  Critical: { border: 'border-[#EF4444]/30',  badge: 'bg-[#EF4444]/10 text-[#EF4444]', dot: 'bg-[#EF4444]',  bg: 'bg-[#EF4444]/5' },
};

const ALL_ZONES = Object.keys(ZONE_DATA) as Zone[];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0E1A]">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#14B8A6]/8 rounded-full blur-3xl" />
          <div className="absolute top-20 right-10 w-[300px] h-[300px] bg-[#F59E0B]/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] text-sm font-medium mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
            Live in 8 Mumbai micro-zones — Phase 1 Prototype
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#F9FAFB] leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Your income,<br />
            <span className="text-[#14B8A6]">protected.</span>{' '}
            <span className="text-[#F59E0B]">Every week.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#6B7280] max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Parametric income insurance for Zomato & Swiggy delivery partners. When disruptions hit your zone — rain, strikes, outages — we pay you automatically. No claims. No paperwork.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link
              to="/onboard"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-105 glow-teal"
            >
              Get Protected Now
              <ArrowRight size={20} />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[#1F2937] hover:border-[#14B8A6]/50 text-[#6B7280] hover:text-[#F9FAFB] font-medium text-lg rounded-xl transition-all duration-200"
            >
              How it works
            </a>
          </div>
        </div>

        {/* Stat cards */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          {STATS.map((s, i) => (
            <div key={i} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-teal hover:scale-105 transition-all duration-200 text-center">
              <s.icon size={22} className={`${s.color} mx-auto mb-3`} />
              <div className={`text-3xl font-black ${s.color} mb-1`}>{s.value}</div>
              <div className="text-sm text-[#6B7280]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Zone Risk Map */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#111827]/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-sm font-medium mb-4">
              <MapPin size={14} />
              ShieldRoute's Key Differentiator
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#F9FAFB] mb-4">Hyper-Local Zone Intelligence</h2>
            <p className="text-[#6B7280] max-w-xl mx-auto">
              Mumbai isn't one city — it's 8 unique risk zones. Premiums are priced per zone per week based on real disruption history. A Bandra rider pays less than a Dharavi rider. That's fair.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {(['Low', 'Medium', 'High', 'Critical'] as const).map(level => (
              <div key={level} className="flex items-center gap-2 text-sm">
                <span className={`w-3 h-3 rounded-full ${RISK_COLORS[level].dot}`} />
                <span className="text-[#6B7280]">{level} Risk</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {ALL_ZONES.map(zone => {
              const riskLevel = ZONE_RISK_LEVEL[zone];
              const colors = RISK_COLORS[riskLevel];
              const zd = ZONE_DATA[zone];
              return (
                <div
                  key={zone}
                  className={`${colors.bg} border ${colors.border} rounded-2xl p-5 hover:scale-105 transition-all duration-200 cursor-default`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <MapPin size={14} className="text-[#6B7280] mb-1" />
                      <div className="font-bold text-[#F9FAFB] text-sm">{ZONE_DISPLAY_NAMES[zone]}</div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${colors.badge}`}>
                      {riskLevel}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B7280]">🌧 Rain Risk</span>
                      <span className="text-[#F9FAFB] font-medium">{zd.weatherRisk}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B7280]">✊ Strike Risk</span>
                      <span className="text-[#F9FAFB] font-medium">{zd.strikeRisk}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B7280]">📵 Outage Risk</span>
                      <span className="text-[#F9FAFB] font-medium">{zd.outageRisk}%</span>
                    </div>
                    <div className="flex justify-between text-xs pt-1 border-t border-white/10">
                      <span className="text-[#6B7280]">Disruption days/mo</span>
                      <span className="font-bold text-[#F59E0B]">{zd.disruptionDays}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-[#F9FAFB] mb-4">How ShieldRoute Works</h2>
            <p className="text-[#6B7280]">From signup to payout — fully automated, parametric, and transparent.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[#14B8A6]/40 to-transparent z-10" style={{ width: 'calc(100% - 2rem)' }} />
                )}
                <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-teal hover:scale-105 transition-all duration-200 h-full">
                  <div className="text-3xl mb-4">{step.icon}</div>
                  <div className="w-6 h-6 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/40 flex items-center justify-center text-[#14B8A6] text-xs font-bold mb-3">
                    {i + 1}
                  </div>
                  <h3 className="font-bold text-[#F9FAFB] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#111827]/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#F9FAFB] mb-3">Trusted by Riders Across Mumbai</h2>
            <p className="text-[#6B7280]">Real stories from delivery partners who chose ShieldRoute.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 card-accent-amber hover:scale-105 transition-all duration-200">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={14} className="text-[#F59E0B] fill-[#F59E0B]" />
                  ))}
                </div>
                <p className="text-[#F9FAFB] text-sm leading-relaxed mb-4 italic">"{t.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#14B8A6]/20 flex items-center justify-center text-[#14B8A6] font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F9FAFB]">{t.name}</div>
                    <div className="text-xs text-[#6B7280]">{t.zone} · {t.platform}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <Shield size={48} className="text-[#14B8A6] mx-auto mb-6" />
          <h2 className="text-4xl font-black text-[#F9FAFB] mb-4">Start protecting your income today</h2>
          <p className="text-[#6B7280] mb-8">As low as ₹49/week. Cancel anytime. No paperwork ever.</p>
          <Link
            to="/onboard"
            className="inline-flex items-center gap-2 px-10 py-4 bg-[#14B8A6] hover:bg-[#0D9488] text-white font-bold text-lg rounded-xl transition-all duration-200 hover:scale-105 glow-teal"
          >
            Get Started Free <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer status bar */}
      <div className="border-t border-[#1F2937] bg-[#111827] px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-[#6B7280]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />System Operational</span>
            <span>Mumbai Weather: 🌧 Light Rain (4mm/hr)</span>
            <span>Active Disruptions: <span className="text-[#F59E0B] font-medium">2</span></span>
          </div>
          <span>ShieldRoute — DEVTrails 2026 Phase 1</span>
        </div>
      </div>
    </div>
  );
}
