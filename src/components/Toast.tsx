import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

const CONFIG = {
  success: { icon: CheckCircle, border: 'border-[#14B8A6]', icon_color: 'text-[#14B8A6]', bg: 'bg-[#14B8A6]/10' },
  warning: { icon: AlertTriangle, border: 'border-[#F59E0B]', icon_color: 'text-[#F59E0B]', bg: 'bg-[#F59E0B]/10' },
  danger:  { icon: XCircle, border: 'border-[#EF4444]', icon_color: 'text-[#EF4444]', bg: 'bg-[#EF4444]/10' },
  info:    { icon: Info, border: 'border-blue-500', icon_color: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export default function ToastContainer() {
  const { state, dispatch } = useApp();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {state.toasts.map(toast => {
        const cfg = CONFIG[toast.type];
        const Icon = cfg.icon;
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto animate-slide-in-right flex items-start gap-3 px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg} bg-[#111827] shadow-2xl max-w-sm`}
          >
            <Icon size={18} className={`${cfg.icon_color} mt-0.5 shrink-0`} />
            <p className="text-sm text-[#F9FAFB] flex-1">{toast.message}</p>
            <button
              onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id })}
              className="text-[#6B7280] hover:text-[#F9FAFB] transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
