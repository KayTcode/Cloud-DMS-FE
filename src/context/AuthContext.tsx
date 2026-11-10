import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthUser, LoginPayload } from '@/types/auth.types';
import { getAuthClient } from '@/api/authClient';
import { setSessionExpiredHandler } from '@/api/axiosClient';
import { getMeApi } from '@/features/auth/api/authApi';
import { mapMe } from '@/features/auth/mapMe';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  completeExternalLogin: () => Promise<AuthUser | null>;
  updateUser: (partial: Partial<AuthUser>) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Xoá các key localStorage cũ từ phiên bản trước
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');

    const authClient = getAuthClient();

    // Đăng ký xử lý hết phiên
    setSessionExpiredHandler(() => setUser(null));

    // Lắng nghe sự kiện từ tab khác
    const unsubscribe = authClient.onSessionEvent(async (type) => {
      if (type === 'logout') {
        setUser(null);
      } else if (type === 'login') {
        // Tab khác đăng nhập → lấy hồ sơ mới
        try {
          const me = await getMeApi();
          setUser(mapMe(me));
        } catch {
          // Bỏ qua lỗi
        }
      }
    });

    // Bootstrap: kiểm tra cookie phiên hiện tại
    const init = async () => {
      try {
        const hasSession = await authClient.bootstrap();
        if (hasSession) {
          const me = await getMeApi();
          setUser(mapMe(me));
        }
      } catch {
        // Không có phiên hợp lệ
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (payload: LoginPayload): Promise<AuthUser> => {
    const authClient = getAuthClient();
    await authClient.login(payload.email, payload.password);
    const me = await getMeApi();
    const authUser = mapMe(me);
    setUser(authUser);
    return authUser;
  }, []);

  const completeExternalLogin = useCallback(async (): Promise<AuthUser | null> => {
    const authClient = getAuthClient();
    // Nếu chưa có token, thử bootstrap
    if (!authClient.accessToken()) {
      const ok = await authClient.bootstrap();
      if (!ok) return null;
    }
    try {
      const me = await getMeApi();
      const authUser = mapMe(me);
      setUser(authUser);
      return authUser;
    } catch {
      return null;
    }
  }, []);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...partial };
    });
  }, []);

  const logout = useCallback(async () => {
    await getAuthClient().logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        completeExternalLogin,
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
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
};
