import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, LoginPayload, UserRole } from '@/types/auth.types';
import { loginApi } from '@/features/auth/api/authApi';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  setSession: (response: any) => AuthUser;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'access_token';
const USER_KEY = 'auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        return JSON.parse(savedUser) as AuthUser;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // If token exists but user doesn't or vice versa, sync or clean up
    if (!token) {
      setUser(null);
      localStorage.removeItem(USER_KEY);
    }
  }, [token]);

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const response = await loginApi(payload);
      
      const authUser: AuthUser = {
        id: response.userId,
        email: response.email,
        fullName: response.fullName || response.email,
        role: (response.role as UserRole) || 'Employee',
        tenantId: response.tenantId,
        permissions: response.permissions || [],
      };

      setToken(response.accessToken);
      setUser(authUser);

      localStorage.setItem(TOKEN_KEY, response.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(authUser));

      return authUser;
    } finally {
      setIsLoading(false);
    }
  };

  const setSession = (response: any): AuthUser => {
    const authUser: AuthUser = {
      id: response.userId,
      email: response.email,
      fullName: response.fullName || response.email,
      role: (response.role as UserRole) || 'TenantAdmin',
      tenantId: response.tenantId,
      permissions: response.permissions || [],
    };

    setToken(response.accessToken);
    setUser(authUser);

    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));

    return authUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        setSession,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
