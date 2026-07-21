import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const stored = localStorage.getItem('piggyback_user');
  const [user, setUser] = useState(stored ? JSON.parse(stored) : null);

  const loginSuccess = useCallback((token, role, email) => {
    localStorage.setItem('piggyback_token', token);
    const userData = { email, role };
    localStorage.setItem('piggyback_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('piggyback_token');
    localStorage.removeItem('piggyback_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loginSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
