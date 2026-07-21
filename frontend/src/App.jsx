import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage    from './pages/LoginPage';
import SignupPage   from './pages/SignupPage';
import LiveBoardPage from './pages/LiveBoardPage';
import OfferRidePage from './pages/OfferRidePage';
import MyRidesPage  from './pages/MyRidesPage';
import SuperAdminPage from './pages/SuperAdminPage';
import { ConfigProvider } from './context/ConfigContext';
import { Toaster } from 'react-hot-toast';
import { SseManager } from './hooks/useSse';

function Footer() {
  return (
    <footer className="py-4 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
      Powered by <span className="font-semibold text-brand-600">piggyback</span>
    </footer>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <SseManager />
          <Toaster position="top-right" />
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/login"  element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected */}
              <Route path="/board" element={
                <ProtectedRoute><LiveBoardPage /></ProtectedRoute>
              } />
              <Route path="/offer-ride" element={
                <ProtectedRoute><OfferRidePage /></ProtectedRoute>
              } />
              <Route path="/my-rides" element={
                <ProtectedRoute><MyRidesPage /></ProtectedRoute>
              } />

              {/* Admin */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <SuperAdminPage />
                </ProtectedRoute>
              } />

              {/* Default */}
              <Route path="*" element={<Navigate to="/board" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
