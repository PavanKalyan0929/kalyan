import type { NextFunction, Request, Response } from 'express';
import { getOrCreateUser, type UserRole } from '../../src/db/users.ts';
import { adminAuth } from '../../src/lib/firebase-admin.ts';

export type { UserRole };

export interface AuthUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  mobile: string;
  role: UserRole;
  collegeId: number | null;
  emailVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface DecodedFirebaseIdentity {
  uid: string;
  email?: string;
  name?: string;
  email_verified?: boolean;
}

type TokenVerifier = (token: string) => Promise<DecodedFirebaseIdentity>;

let customTestVerifier: TokenVerifier | null = null;

export function setTokenVerifierForTesting(verifier: TokenVerifier | null) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test token verifier may only be configured when NODE_ENV=test.');
  }
  customTestVerifier = verifier;
}

async function verifyIdToken(token: string): Promise<DecodedFirebaseIdentity> {
  if (process.env.NODE_ENV === 'test' && customTestVerifier) {
    return customTestVerifier(token);
  }
  const decoded = await adminAuth.verifyIdToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name,
    email_verified: decoded.email_verified,
  };
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }
  return null;
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) return next();

  try {
    const decoded = await verifyIdToken(token);
    if (!decoded.uid || !decoded.email) {
      return next();
    }
    const dbUser = await getOrCreateUser({
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.name,
      emailVerified: decoded.email_verified,
    });
    if (dbUser.isActive) {
      req.user = {
        id: dbUser.id,
        uid: dbUser.uid,
        email: dbUser.email,
        fullName: dbUser.fullName,
        mobile: dbUser.mobile,
        role: dbUser.role,
        collegeId: dbUser.collegeId,
        emailVerified: dbUser.emailVerified,
      };
    }
  } catch {
    // Invalid or expired Firebase token treated as unauthenticated
  }
  return next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in with Google.' });
  }

  try {
    const decoded = await verifyIdToken(token);
    if (!decoded.uid || !decoded.email) {
      return res.status(401).json({ error: 'Invalid Firebase identity token.' });
    }
    const dbUser = await getOrCreateUser({
      uid: decoded.uid,
      email: decoded.email,
      fullName: decoded.name,
      emailVerified: decoded.email_verified,
    });
    if (!dbUser.isActive) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact your administrator.' });
    }
    req.user = {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      fullName: dbUser.fullName,
      mobile: dbUser.mobile,
      role: dbUser.role,
      collegeId: dbUser.collegeId,
      emailVerified: dbUser.emailVerified,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired or is invalid. Please sign in again.' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    return next();
  };
}

export function assertCollegeTenantAccess(user: AuthUser, targetCollegeId: number | null | undefined): boolean {
  if (user.role === 'state_admin') return true;
  if (!user.collegeId || !targetCollegeId) return false;
  return Number(user.collegeId) === Number(targetCollegeId);
}
