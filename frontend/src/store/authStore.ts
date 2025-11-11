import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Array<{
    role: 'Admin' | 'Proctor' | 'Grader' | 'Judge' | 'Applicant';
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
  hasRole: (role: 'Admin' | 'Proctor' | 'Grader' | 'Judge' | 'Applicant') => boolean;
  hasAnyRole: (roles: Array<'Admin' | 'Proctor' | 'Grader' | 'Judge' | 'Applicant'>) => boolean;
  isAdmin: () => boolean;
  isProctor: () => boolean;
  isJudge: () => boolean;
  isApplicant: () => boolean;
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
          set({
            user: response.user,
            accessToken: response.accessToken,
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
          set({
            user: response.user,
            accessToken: response.accessToken,
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
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
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
      hasRole: (role: 'Admin' | 'Proctor' | 'Grader' | 'Judge' | 'Applicant') => {
        const { user } = get();
        if (!user || !user.roles) return false;
        return user.roles.some((r) => r.role === role);
      },

      hasAnyRole: (roles: Array<'Admin' | 'Proctor' | 'Grader' | 'Judge' | 'Applicant'>) => {
        const { user } = get();
        if (!user || !user.roles) return false;
        return user.roles.some((r) => roles.includes(r.role));
      },

      isAdmin: () => {
        return get().hasRole('Admin');
      },

      isProctor: () => {
        return get().hasRole('Proctor');
      },

      isJudge: () => {
        return get().hasRole('Judge');
      },

      isApplicant: () => {
        return get().hasRole('Applicant');
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
