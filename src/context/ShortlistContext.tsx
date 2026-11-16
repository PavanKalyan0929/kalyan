import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ToastNotification, type ToastMessage } from '../components/ToastNotification.tsx';
import { apiFetch } from '../lib/api.ts';
import { useAuth } from './AuthContext.tsx';

const GUEST_STORAGE_KEY = 'ash_guest_shortlist_v1';

interface ShortlistContextValue {
  savedIds: number[];
  isSaved: (collegeId: number) => boolean;
  toggleSave: (collegeId: number, collegeName?: string) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

const ShortlistContext = createContext<ShortlistContextValue | null>(null);

function readGuestShortlist(): number[] {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n) && n > 0) : [];
  } catch {
    return [];
  }
}

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const { user, needsStudentOnboarding } = useAuth();
  const [savedIds, setSavedIds] = useState<number[]>(() => readGuestShortlist());
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const isAuthenticatedStudent = Boolean(user && user.role === 'student' && !needsStudentOnboarding);

  useEffect(() => {
    if (!isAuthenticatedStudent) {
      setSavedIds(readGuestShortlist());
      return;
    }

    let active = true;
    apiFetch<{ collegeIds: number[] }>('/api/student/shortlists')
      .then((res) => {
        if (active && Array.isArray(res.collegeIds)) {
          setSavedIds(res.collegeIds);
        }
      })
      .catch(() => {
        // Keep current list on transient error
      });

    return () => {
      active = false;
    };
  }, [isAuthenticatedStudent, user?.id]);

  const isSaved = useCallback((collegeId: number) => savedIds.includes(collegeId), [savedIds]);

  const toggleSave = useCallback(
    async (collegeId: number, collegeName?: string) => {
      if (isAuthenticatedStudent) {
        try {
          const res = await apiFetch<{ saved: boolean; collegeIds: number[]; message: string }>(
            `/api/student/shortlists/${collegeId}`,
            { method: 'POST' }
          );
          setSavedIds(res.collegeIds);
          showToast(res.message, 'success');
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Unable to update shortlist.', 'error');
        }
        return;
      }

      setSavedIds((prev) => {
        const exists = prev.includes(collegeId);
        const next = exists ? prev.filter((id) => id !== collegeId) : [collegeId, ...prev];
        try {
          localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota issues
        }
        const label = collegeName || 'institution';
        showToast(
          exists ? `Removed ${label} from your shortlist.` : `Saved ${label} to your shortlist.`,
          'success'
        );
        return next;
      });
    },
    [isAuthenticatedStudent, showToast]
  );

  return (
    <ShortlistContext.Provider value={{ savedIds, isSaved, toggleSave, showToast }}>
      {children}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </ShortlistContext.Provider>
  );
}

export function useShortlist() {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error('useShortlist must be used inside ShortlistProvider');
  return ctx;
}
