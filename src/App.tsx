import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
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
            <Route path="/policy" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <ToastContainer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
