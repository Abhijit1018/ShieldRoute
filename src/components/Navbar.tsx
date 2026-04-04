import { Shield, Home, LayoutDashboard, Settings, Bell, FileText } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getToken } from '../utils/api';

const NAV_LINKS = [
  { to: '/',          label: 'Home',      icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/policy',    label: 'Policy',    icon: FileText },
  { to: '/claims',    label: 'Claims',    icon: Bell },
  { to: '/admin',     label: 'Admin',     icon: Settings },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { state } = useApp();
  const isAuthenticated = Boolean(getToken());
  const navLinks = isAuthenticated ? NAV_LINKS : NAV_LINKS.filter((link) => link.to !== '/admin');

  const unread = state.unreadClaimCount;

  // Derive current zone + live risk from state
  const riderZone = state.policy?.onboarding.zone;
  const zoneReading = riderZone
    ? state.liveZoneReadings.find(r => r.zone === riderZone)
    : null;

  const alertZone = state.triggerFeed.length > 0
    ? state.triggerFeed[0].zone
    : null;

  const weatherIcon =
    zoneReading?.rainfall
      ? (zoneReading.rainfall >= 15 ? '⛈' : zoneReading.rainfall >= 8 ? '🌧' : '🌤')
      : '🌤';

  const weatherLabel =
    zoneReading?.rainfall
      ? (zoneReading.rainfall >= 15 ? 'Heavy Rain' : zoneReading.rainfall >= 8 ? 'Light Rain' : 'Clear')
      : 'Mumbai';

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#1F2937] bg-[#0A0E1A]/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-[#14B8A6] rounded-lg flex items-center justify-center group-hover:bg-[#0D9488] transition-colors duration-200">
              <Shield size={18} className="text-white" />
            </div>
            <span className="text-[#F9FAFB] font-bold text-lg tracking-tight">
              Shield<span className="text-[#14B8A6]">Route</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === to
                    ? 'bg-[#14B8A6]/10 text-[#14B8A6]'
                    : 'text-[#6B7280] hover:text-[#F9FAFB] hover:bg-[#1F2937]'
                }`}
              >
                <Icon size={15} />
                {label}
                {/* Notification badge for Claims */}
                {to === '/claims' && unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full text-white text-[9px] flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Right side — live status */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1F2937] text-xs">
              <span>{weatherIcon}</span>
              <span className="text-[#6B7280]">Mumbai:</span>
              <span className="text-[#F9FAFB] font-medium">{weatherLabel}</span>
            </div>
            {alertZone ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
                <span className="text-[#EF4444] font-medium">{alertZone} ⚠️</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-green-400 font-medium">All Clear</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden gap-1 pb-2 overflow-x-auto">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                pathname === to
                  ? 'bg-[#14B8A6]/10 text-[#14B8A6]'
                  : 'text-[#6B7280] hover:text-[#F9FAFB]'
              }`}
            >
              <Icon size={13} />
              {label}
              {to === '/claims' && unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#EF4444] rounded-full text-white text-[8px] flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
