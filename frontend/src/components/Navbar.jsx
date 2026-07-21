import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { API_BASE_URL } from '../api/axios';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        pathname === to
          ? 'bg-brand-600/20 text-brand-700'
          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/90 backdrop-blur-md">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/board" className="flex items-center gap-2 group">
          {config?.logoFilename ? (
            <img 
              src={`${API_BASE_URL}/api/public/logos/${config.logoFilename}`} 
              alt="Company Logo" 
              className="h-8 object-contain"
            />
          ) : (
            <>
              <span className="text-xl">🚗🏍️</span>
              <span className="font-bold text-base text-slate-900 group-hover:text-brand-600 transition-colors">
                pooling
              </span>
            </>
          )}
        </Link>

        {/* Nav Links */}
        {user && (
          <div className="flex items-center gap-1">
            {navLink('/board', 'Live Board')}
            {navLink('/offer-ride', 'Offer Ride')}
            {navLink('/my-rides', 'My Rides')}
            {user.role === 'ROLE_SUPER_USER' && navLink('/admin', 'Admin')}
          </div>
        )}

        {/* Right */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden sm:block text-xs text-slate-500 font-medium">{user.email}</span>
              <button onClick={handleLogout} className="btn-secondary text-xs px-3 py-1.5">
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn-primary text-xs px-3 py-1.5">Sign In</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
