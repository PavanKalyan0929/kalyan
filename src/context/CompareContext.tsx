import React, { createContext, useCallback, useContext, useState } from 'react';
import { useShortlist } from './ShortlistContext.tsx';

export interface CompareCollegeSummary {
  id: number;
  name: string;
  institutionCode: string | null;
  category: string;
  management: string;
  district: string;
  affiliatedUniversity: string;
  verificationStatus: string;
  approvedLogoId: number | null;
}

interface CompareContextValue {
  compareList: CompareCollegeSummary[];
  isCompared: (collegeId: number) => boolean;
  toggleCompare: (college: CompareCollegeSummary) => void;
  removeCompare: (collegeId: number) => void;
  clearCompare: () => void;
  compareModalOpen: boolean;
  setCompareModalOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'ash_compare_list_v1';

const CompareContext = createContext<CompareContextValue | null>(null);

function readStoredCompareList(): CompareCollegeSummary[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useShortlist();
  const [compareList, setCompareList] = useState<CompareCollegeSummary[]>(() => readStoredCompareList());
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const persist = useCallback((next: CompareCollegeSummary[]) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota issues
    }
  }, []);

  const isCompared = useCallback(
    (collegeId: number) => compareList.some((c) => c.id === collegeId),
    [compareList]
  );

  const toggleCompare = useCallback(
    (college: CompareCollegeSummary) => {
      setCompareList((prev) => {
        const exists = prev.some((c) => c.id === college.id);
        if (exists) {
          const next = prev.filter((c) => c.id !== college.id);
          persist(next);
          showToast(`Removed ${college.institutionCode || college.name} from comparison.`, 'success');
          return next;
        }
        if (prev.length >= 3) {
          showToast('You can compare up to 3 institutions at a time.', 'error');
          return prev;
        }
        const next = [...prev, college];
        persist(next);
        showToast(`Added ${college.institutionCode || college.name} to comparison matrix.`, 'success');
        return next;
      });
    },
    [persist, showToast]
  );

  const removeCompare = useCallback(
    (collegeId: number) => {
      setCompareList((prev) => {
        const next = prev.filter((c) => c.id !== collegeId);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const clearCompare = useCallback(() => {
    setCompareList([]);
    setCompareModalOpen(false);
    persist([]);
  }, [persist]);

  return (
    <CompareContext.Provider
      value={{
        compareList,
        isCompared,
        toggleCompare,
        removeCompare,
        clearCompare,
        compareModalOpen,
        setCompareModalOpen,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error('useCompare must be used inside CompareProvider');
  }
  return ctx;
}
