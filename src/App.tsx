import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Claims from './pages/Claims';
import Policy from './pages/Policy';
import { getToken } from './utils/api';

function RequireAuth({ children }: { children: ReactElement }) {
  if (!getToken()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0A0E1A]">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboard" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/policy" element={<Policy />} />
            <Route path="/claims" element={<Claims />} />
            <Route
              path="/admin"
              element={(
                <RequireAuth>
                  <Admin />
                </RequireAuth>
              )}
            />
          </Routes>
          <ToastContainer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
