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
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

const extractDepartmentIdFromToken = (jwtToken: string | null): string | null => {
  if (!jwtToken) return null;
  try {
    const parts = jwtToken.split('.');
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      return parsed.departmentId || parsed.DepartmentId || null;
    }
  } catch {
    // ignore decode error
  }
  return null;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as AuthUser;
        if (!parsed.departmentId && savedToken) {
          const deptFromToken = extractDepartmentIdFromToken(savedToken);
          if (deptFromToken) {
            parsed.departmentId = deptFromToken;
            localStorage.setItem(USER_KEY, JSON.stringify(parsed));
          }
        }
        return parsed;
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
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }, [token]);

  const login = async (payload: LoginPayload): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const response = await loginApi(payload);
      
      const tokenDeptId = response.accessToken ? extractDepartmentIdFromToken(response.accessToken) : null;
      const resolvedDeptId = response.departmentId || (response as any).DepartmentId || tokenDeptId || null;

      const authUser: AuthUser = {
        id: response.userId,
        email: response.email,
        fullName: response.fullName || response.email,
        role: (response.role as UserRole) || 'Employee',
        tenantId: response.tenantId,
        departmentId: resolvedDeptId,
        permissions: response.permissions || [],
      };

      setToken(response.accessToken);
      setUser(authUser);

      localStorage.setItem(TOKEN_KEY, response.accessToken);
      if (response.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(authUser));

      return authUser;
    } finally {
      setIsLoading(false);
    }
  };

  const setSession = (response: any): AuthUser => {
    const tokenDeptId = response.accessToken ? extractDepartmentIdFromToken(response.accessToken) : null;
    const resolvedDeptId = response.departmentId || response.DepartmentId || tokenDeptId || null;

    const authUser: AuthUser = {
      id: response.userId,
      email: response.email,
      fullName: response.fullName || response.email,
      role: (response.role as UserRole) || 'TenantAdmin',
      tenantId: response.tenantId,
      departmentId: resolvedDeptId,
      permissions: response.permissions || [],
    };

    setToken(response.accessToken);
    setUser(authUser);

    localStorage.setItem(TOKEN_KEY, response.accessToken);
    if (response.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(authUser));

    return authUser;
  };

  const updateUser = (partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
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
        updateUser,
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
