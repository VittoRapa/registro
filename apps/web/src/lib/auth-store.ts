import { create } from 'zustand';
import { Role } from '@registro/shared';
import { apiClient } from './api-client';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  schoolId?: string | null;
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
  school?: {
    id: string;
    name: string;
    code: string;
    status: string;
  } | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  clearAuth: () => void;
  checkAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
    }
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      // Try refresh or profile
      if (storedToken) {
        set({ accessToken: storedToken });
        const me = await apiClient<AuthUser>('/auth/me');
        set({
          user: me,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }

      // Try refresh endpoint (reads httpOnly cookie)
      const refreshRes = await apiClient<{ accessToken: string; user: AuthUser }>('/auth/refresh', {
        method: 'POST',
      });
      get().setAuth(refreshRes.user, refreshRes.accessToken);
      return true;
    } catch {
      get().clearAuth();
      return false;
    }
  },

  logout: async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    } finally {
      get().clearAuth();
    }
  },
}));
