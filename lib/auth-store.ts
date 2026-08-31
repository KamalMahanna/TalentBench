'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/lib/types';
import { setAuthToken } from '@/lib/api-client';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => {
        if (user) setAuthToken(user.token);
        else setAuthToken(null);
        set({ user, isAuthenticated: !!user });
      },
      logout: () => {
        setAuthToken(null);
        set({ user: null, isAuthenticated: false });
      },
    }),
    { name: 'talentbench-auth' },
  ),
);
