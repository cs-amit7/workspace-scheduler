import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, demoLogin as apiDemoLogin, logout as apiLogout } from '../api/auth.js';

export const AuthContext = createContext(null);

function extractUserData(res) {
  if (!res) return null;
  if (res.data && res.data.user) return res.data.user;
  if (res.data !== undefined) return res.data;
  return res;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await getMe();
      const userData = extractUserData(res);
      setUser(userData);
      return userData;
    } catch (err) {
      if (err?.status === 401) {
        setUser(null);
        return null;
      }
      throw err;
    }
  }, []);

  const loginDemo = useCallback(async (params) => {
    const res = await apiDemoLogin(params);
    const userData = extractUserData(res);
    setUser(userData);
    return res;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialUser() {
      try {
        const res = await getMe();
        if (active) {
          const userData = extractUserData(res);
          setUser(userData);
        }
      } catch (err) {
        if (active) {
          // A 401 means logged out, not an error
          if (err?.status === 401) {
            setUser(null);
          } else {
            console.error('Failed to load user session', err);
            setUser(null);
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitialUser();

    return () => {
      active = false;
    };
  }, []);

  const value = {
    user,
    loading,
    loginDemo,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
