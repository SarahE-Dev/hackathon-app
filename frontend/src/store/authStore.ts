import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

// Role type matching backend (lowercase)
export type UserRole = 'admin' | 'proctor' | 'grader' | 'judge' | 'fellow';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{
    role: UserRole;
    organizationId?: string;
    cohortId?: string;
  }>;
  lastLogin?: Date;
  isActive: boolean;
  emailVerified: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, firstName: string, lastName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;

  // Role checking utilities
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  isAdmin: () => boolean;
  isProctor: () => boolean;
  isJudge: () => boolean;
  isFellow: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(email, password);
          // Backend returns { success: true, data: { user, tokens } }
          const userData = response.data?.user || response.user;
          const token = response.data?.tokens?.accessToken || response.accessToken;
          const refreshToken = response.data?.tokens?.refreshToken || response.refreshToken;

          // Store tokens in localStorage for API interceptor
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', token);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
          }

          set({
            user: userData,
            accessToken: token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (email: string, firstName: string, lastName: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.register({ email, firstName, lastName, password });
          // Backend returns { success: true, data: { user, tokens } }
          const userData = response.data?.user || response.user;
          const token = response.data?.tokens?.accessToken || response.accessToken;
          const refreshToken = response.data?.tokens?.refreshToken || response.refreshToken;

          // Store tokens in localStorage for API interceptor
          if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', token);
            if (refreshToken) {
              localStorage.setItem('refreshToken', refreshToken);
            }
          }

          set({
            user: userData,
            accessToken: token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await authAPI.logout();
          // Clear localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          // Even if API call fails, clear local state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
          }
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      getCurrentUser: async () => {
        const token = get().accessToken;
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await authAPI.getCurrentUser();
          set({
            user: response,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
      setUser: (user: User | null) => set({ user }),
      setAccessToken: (token: string | null) => set({ accessToken: token }),

      // Role checking utilities
      hasRole: (role: UserRole) => {
        const { user } = get();
        if (!user || !user.roles) return false;
        return user.roles.some((r) => r.role === role);
      },

      hasAnyRole: (roles: UserRole[]) => {
        const { user } = get();
        if (!user || !user.roles) return false;
        return user.roles.some((r) => roles.includes(r.role));
      },

      isAdmin: () => {
        return get().hasRole('admin');
      },

      isProctor: () => {
        return get().hasRole('proctor');
      },

      isJudge: () => {
        return get().hasRole('judge');
      },

      isFellow: () => {
        return get().hasRole('fellow');
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
