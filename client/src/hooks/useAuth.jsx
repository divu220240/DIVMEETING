import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, signupUser } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('clickToken'));
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('clickAuth');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        localStorage.removeItem('clickAuth');
        localStorage.removeItem('clickToken');
        setToken(null);
      }
    }
    setReady(true);
  }, []);

  const saveUser = (payload) => {
    setUser(payload.user);
    setToken(payload.token);
    localStorage.setItem('clickAuth', JSON.stringify(payload.user));
    localStorage.setItem('clickToken', payload.token);
  };

  const logout = () => {
    localStorage.removeItem('clickAuth');
    localStorage.removeItem('clickToken');
    setUser(null);
    setToken(null);
    navigate('/login');
  };

  const signIn = async (values) => {
    const payload = await loginUser(values);
    saveUser(payload);
    return payload;
  };

  const signUp = async (values) => {
    const payload = await signupUser(values);
    saveUser(payload);
    return payload;
  };

  const value = useMemo(
    () => ({ user, signIn, signUp, logout, token, ready }),
    [user, token, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
