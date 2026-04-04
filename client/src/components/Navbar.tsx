import { Activity, ClipboardList, Home, LayoutDashboard, LogIn, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { isAdminAuthenticated } from '../utils/adminAuth';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: Activity },
  { to: '/policy', label: 'My Policy', icon: LayoutDashboard },
  { to: '/claims', label: 'Claims', icon: ClipboardList },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const adminAuthed = isAdminAuthenticated();
  const adminPath = adminAuthed ? '/admin' : '/admin-login';
  const adminLabel = adminAuthed ? 'Admin Panel' : 'Admin Login';

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
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === to
                    ? 'bg-[#14B8A6]/10 text-[#14B8A6]'
                    : 'text-[#6B7280] hover:text-[#F9FAFB] hover:bg-[#1F2937]'
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>

          {/* Right side — live status */}
          <div className="flex items-center gap-3">
            <Link
              to={adminPath}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#14B8A6]/30 text-xs text-[#14B8A6] hover:bg-[#14B8A6]/10 transition-colors"
            >
              <LogIn size={13} />
              {adminLabel}
            </Link>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#111827] border border-[#1F2937] text-xs">
              <span>🌧</span>
              <span className="text-[#6B7280]">Mumbai:</span>
              <span className="text-[#F9FAFB] font-medium">Light Rain</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-[#F59E0B] font-medium">Dharavi ⚠️</span>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden gap-1 pb-2 overflow-x-auto">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                pathname === to
                  ? 'bg-[#14B8A6]/10 text-[#14B8A6]'
                  : 'text-[#6B7280] hover:text-[#F9FAFB]'
              }`}
            >
              <Icon size={13} />
              {label}
            </Link>
          ))}
          <Link
            to={adminPath}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              pathname === '/admin' || pathname === '/admin-login'
                ? 'bg-[#14B8A6]/10 text-[#14B8A6]'
                : 'text-[#6B7280] hover:text-[#F9FAFB]'
            }`}
          >
            <LogIn size={13} />
            {adminLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}
