import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { mobileApiClient } from './api-client';

export interface MobileUser {
  id: string;
  schoolId: string;
  username: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: string;
  mustChangePassword?: boolean;
}

interface AuthState {
  user: MobileUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: MobileUser | null) => void;
  loadStoredSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  saveSession: (user: MobileUser, accessToken: string, refreshToken: string) => Promise<void>;
}

export const useMobileAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  loadStoredSession: async () => {
    try {
      set({ isLoading: true });
      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (!accessToken) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return false;
      }

      const user = await mobileApiClient<MobileUser>('/users/me/profile');
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  saveSession: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    try {
      await mobileApiClient('/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
