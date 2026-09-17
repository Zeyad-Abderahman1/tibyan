import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { IpcResult, UserSessionDto } from '@tibyan/contracts';
import { useAuthStore } from '../features/auth/auth.state.js';

export function useAuth() {
  const storeSession = useAuthStore((state) => state.session);
  const session = storeSession ?? useAuthStore.getState().session;
  const status = useAuthStore((state) => state.status);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setStatus = useAuthStore((state) => state.setStatus);

  const queryClient = useQueryClient();

  /**
   * Fetches the authoritative session from Electron MAIN process.
   */
  const checkSession = useCallback(async (): Promise<UserSessionDto | null> => {
    setStatus('loading');
    try {
      if (typeof window !== 'undefined' && window.tibyan?.auth?.getSession) {
        const res = await window.tibyan.auth.getSession();
        if (res.success) {
          const current = useAuthStore.getState().session;
          if (res.data === null) {
            // Confirmed unauthenticated: clear any stale cache
            queryClient.clear();
            setSession(null);
          } else {
            // Identity change detection
            if (current && current.userId !== res.data.userId) {
              queryClient.clear();
            }
            setSession(res.data);
          }
          return res.data;
        } else {
          // IPC error: do not silently claim unauthenticated
          setStatus('idle');
          return null;
        }
      }
      queryClient.clear();
      setSession(null);
      return null;
    } catch {
      setStatus('idle');
      return null;
    }
  }, [setSession, setStatus, queryClient]);

  /**
   * Submits 4-digit PIN authentication to Electron MAIN process.
   */
  const login = useCallback(
    async (userId: string, pin: string): Promise<IpcResult<UserSessionDto>> => {
      setStatus('loading');
      try {
        if (!window.tibyan?.auth?.loginWithPin) {
          throw new Error('API_NOT_AVAILABLE: window.tibyan.auth is not initialized.');
        }

        const res = await window.tibyan.auth.loginWithPin({ userId, pin });
        if (res.success) {
          const current = useAuthStore.getState().session;
          if (current && current.userId !== res.data.userId) {
            queryClient.clear();
          }
          setSession(res.data);
        } else {
          setStatus('unauthenticated');
        }
        return res;
      } catch (err: any) {
        setStatus('unauthenticated');
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: err?.message || 'فشل التحقق من رمز PIN.',
          },
        };
      }
    },
    [setSession, setStatus, queryClient]
  );

  /**
   * Logs out current user, clearing authoritative MAIN session and local presentation cache.
   * Preserves session and does NOT clear cache if MAIN process logout fails.
   */
  const logout = useCallback(async (): Promise<IpcResult<void>> => {
    try {
      if (typeof window !== 'undefined' && window.tibyan?.auth?.logout) {
        const res = await window.tibyan.auth.logout();
        if (!res.success) {
          // Main logout failed: preserve session and return error to allow retry
          return res;
        }
      }

      // Authoritative Main logout confirmed: clear local presentation session and query cache
      clearSession();
      queryClient.clear();
      return { success: true, data: undefined };
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err?.message || 'فشل تسجيل الخروج.',
        },
      };
    }
  }, [clearSession, queryClient]);

  return {
    session,
    status,
    isAuthenticated: session !== null,
    checkSession,
    login,
    logout,
  };
}
