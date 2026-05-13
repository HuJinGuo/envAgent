import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginRequest, LoginResponse, UserProfile } from '../lib/api';

type SessionState = {
  token: string | null;
  user: UserProfile | null;
  credentials: LoginRequest;
  setCredential: (field: keyof LoginRequest, value: string) => void;
  setSession: (response: LoginResponse) => void;
  setUser: (user: UserProfile) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      credentials: {
        username: 'admin',
        password: 'Env@123456'
      },
      setCredential: (field, value) =>
        set((state) => ({
          credentials: {
            ...state.credentials,
            [field]: value
          }
        })),
      setSession: (response) =>
        set({
          token: response.token,
          user: response.user
        }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({
          token: null,
          user: null
        })
    }),
    {
      name: 'env-agent-session',
      version: 3,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<SessionState>;
        return {
          token: state.token ?? null,
          user: state.user ?? null
        };
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<SessionState>;
        return {
          ...currentState,
          ...persisted
        };
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user
      })
    }
  )
);
