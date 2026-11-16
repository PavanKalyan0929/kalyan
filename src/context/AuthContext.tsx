import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, setApiTokenGetter } from '../lib/api.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

export type UserRole = 'student' | 'college_admin' | 'state_admin';

export interface SessionUser {
  id: number;
  uid: string;
  fullName: string;
  email: string;
  mobile: string;
  role: UserRole;
  collegeId: number | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface SessionCollege {
  id: number;
  name: string;
  institutionCode: string | null;
  district: string;
  category: string;
  management: string;
  verificationStatus: string;
}

export interface StudentProfileSummary {
  userId: number;
  enrollmentNumber: string;
  collegeId: number;
  course: string;
  department: string;
  academicYear: string;
  admissionYear: number;
  currentSemester: string;
  verificationStatus: string;
  verificationMethod: string | null;
  officialCollegeEmail: string | null;
  mobileOtpVerified: boolean;
}

interface AuthContextValue {
  loading: boolean;
  firebaseUser: FirebaseUser | null;
  user: SessionUser | null;
  college: SessionCollege | null;
  studentProfile: StudentProfileSummary | null;
  needsStudentOnboarding: boolean;
  unreadNotifications: number;
  needsStateAdminBootstrap: boolean;
  signInWithGoogle: () => Promise<void>;
  refreshAuth: () => Promise<SessionUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [college, setCollege] = useState<SessionCollege | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfileSummary | null>(null);
  const [needsStudentOnboarding, setNeedsStudentOnboarding] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [needsStateAdminBootstrap, setNeedsStateAdminBootstrap] = useState(false);

  const syncWithBackend = useCallback(async (fbUser: FirebaseUser | null): Promise<SessionUser | null> => {
    setApiTokenGetter(async () => (fbUser ? fbUser.getIdToken() : null));
    try {
      const [meRes, setupRes] = await Promise.all([
        apiFetch<{
          user: SessionUser | null;
          college?: SessionCollege | null;
          studentProfile?: StudentProfileSummary | null;
          needsStudentOnboarding?: boolean;
          unreadNotifications?: number;
        }>('/api/auth/me'),
        apiFetch<{ needsStateAdminBootstrap: boolean }>('/api/setup/status'),
      ]);
      setUser(meRes.user || null);
      setCollege(meRes.college || null);
      setStudentProfile(meRes.studentProfile || null);
      setNeedsStudentOnboarding(Boolean(meRes.needsStudentOnboarding));
      setUnreadNotifications(meRes.unreadNotifications || 0);
      setNeedsStateAdminBootstrap(Boolean(setupRes.needsStateAdminBootstrap));
      return meRes.user || null;
    } catch {
      setUser(null);
      setCollege(null);
      setStudentProfile(null);
      setNeedsStudentOnboarding(false);
      setUnreadNotifications(0);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      void syncWithBackend(fbUser);
    });
    return () => unsubscribe();
  }, [syncWithBackend]);

  const refreshAuth = useCallback(async () => {
    return syncWithBackend(auth.currentUser);
  }, [syncWithBackend]);

  const signInWithGoogle = useCallback(async () => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    setFirebaseUser(credential.user);
    await syncWithBackend(credential.user);
  }, [syncWithBackend]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setUser(null);
    setCollege(null);
    setStudentProfile(null);
    setNeedsStudentOnboarding(false);
    setUnreadNotifications(0);
    setApiTokenGetter(async () => null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        loading,
        firebaseUser,
        user,
        college,
        studentProfile,
        needsStudentOnboarding,
        unreadNotifications,
        needsStateAdminBootstrap,
        signInWithGoogle,
        refreshAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
