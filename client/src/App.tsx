import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Policy from './pages/Policy';
import Claims from './pages/Claims';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';

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
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={(
                <ProtectedAdminRoute>
                  <Admin />
                </ProtectedAdminRoute>
              )}
            />
          </Routes>
          <ToastContainer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
