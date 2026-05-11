import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LoginRequest, LoginResponse, UserProfile } from '../lib/api';

export type WorkspaceSection = 'dash' | 'chat' | 'kb' | 'source' | 'agent' | 'monitor' | 'users';
const workspaceSections: WorkspaceSection[] = ['dash', 'chat', 'kb', 'source', 'agent', 'monitor', 'users'];

function normalizeSection(value: unknown): WorkspaceSection {
  return typeof value === 'string' && workspaceSections.includes(value as WorkspaceSection)
    ? (value as WorkspaceSection)
    : 'dash';
}

type SessionState = {
  token: string | null;
  user: UserProfile | null;
  selectedSection: WorkspaceSection;
  credentials: LoginRequest;
  setCredential: (field: keyof LoginRequest, value: string) => void;
  setSelectedSection: (section: WorkspaceSection) => void;
  setSession: (response: LoginResponse) => void;
  setUser: (user: UserProfile) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      selectedSection: 'dash',
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
      setSelectedSection: (section) => set({ selectedSection: section }),
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
      version: 2,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<SessionState>;
        return {
          token: state.token ?? null,
          user: state.user ?? null,
          selectedSection: normalizeSection(state.selectedSection)
        };
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<SessionState>;
        return {
          ...currentState,
          ...persisted,
          selectedSection: normalizeSection(persisted.selectedSection)
        };
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        selectedSection: state.selectedSection
      })
    }
  )
);
