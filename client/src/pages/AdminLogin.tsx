import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole, LogIn, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isAdminAuthenticated, setAdminAuthenticated, verifyAdminCredentials } from '../utils/adminAuth';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAdminAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!verifyAdminCredentials(username, password)) {
      setError('Invalid admin credentials');
      addToast('Admin login failed. Check username/password.', 'danger');
      return;
    }

    setAdminAuthenticated(true);
    addToast('Admin login successful.', 'success');
    navigate('/admin');
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-8 card-accent-teal">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-[#14B8A6] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-[#F9FAFB]">Admin Login</h1>
            <p className="text-[#6B7280] text-sm mt-1">Access the insurer intelligence center</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-[#6B7280] mb-1.5 block">Username</label>
              <input
                className="w-full bg-[#1C2537] border border-[#1F2937] rounded-xl px-4 py-3 text-[#F9FAFB] focus:outline-none focus:border-[#14B8A6] transition-colors"
                placeholder="Enter admin username"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-sm text-[#6B7280] mb-1.5 block">Password</label>
              <input
                type="password"
                className="w-full bg-[#1C2537] border border-[#1F2937] rounded-xl px-4 py-3 text-[#F9FAFB] focus:outline-none focus:border-[#14B8A6] transition-colors"
                placeholder="Enter admin password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#14B8A6] hover:bg-[#0D9488] text-white rounded-xl font-bold transition-colors"
            >
              <LogIn size={16} />
              Login to Admin
            </button>
          </form>

          <div className="mt-6 p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl text-xs text-[#6B7280]">
            <div className="flex items-center gap-2 mb-1 text-[#F59E0B] font-bold">
              <LockKeyhole size={12} />
              Credential Source
            </div>
            <p>Uses VITE_ADMIN_USERNAME and VITE_ADMIN_PASSWORD if set, otherwise defaults to admin / admin123.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
