import { create } from 'zustand';
import type { UserSessionDto } from '@tibyan/contracts';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  session: UserSessionDto | null;
  status: AuthStatus;
  setSession: (session: UserSessionDto | null) => void;
  clearSession: () => void;
  setStatus: (status: AuthStatus) => void;
}

/**
 * Presentation-only Zustand store for cached authenticated session state.
 *
 * NOTE: The Electron MAIN process is the sole authoritative source of truth.
 * This client store acts strictly as a reactive presentation cache.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  status: 'idle',
  setSession: (session) =>
    set({
      session,
      status: session ? 'authenticated' : 'unauthenticated',
    }),
  clearSession: () =>
    set({
      session: null,
      status: 'unauthenticated',
    }),
  setStatus: (status) => set({ status }),
}));
