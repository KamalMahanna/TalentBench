'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/lib/types';
import { setAuthToken } from '@/lib/api-client';

const DEMO_RECRUITER: AuthUser = {
  id: 'demo-recruiter-id',
  email: 'recruiter@talentbench.io',
  name: 'Alex Morgan',
  avatar_url: 'https://i.pravatar.cc/150?u=recruiter',
  org_id: 'demo-org-id',
  token: 'demo-token',
};

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setHasHydrated: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: DEMO_RECRUITER,
      isAuthenticated: true,
      hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => set({ hasHydrated }),
      setUser: (user) => {
        if (user) {
          setAuthToken(user.token);
          set({ user, isAuthenticated: true });
        } else {
          setAuthToken(null);
          set({ user: null, isAuthenticated: false });
        }
      },
      logout: () => {
        setAuthToken(null);
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'talentbench-auth',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
          if (state.user?.token) {
            setAuthToken(state.user.token);
          }
        }
      },
    },
  ),
);

// Immediately set auth token on module evaluation if token exists in storage
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem('talentbench-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state?.user?.token) {
        setAuthToken(parsed.state.user.token);
      }
    }
  } catch {
    // ignore
  }
}
