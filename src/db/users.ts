import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { auditLogs, users } from './schema.ts';

export type UserRole = 'student' | 'college_admin' | 'state_admin';

export interface ResolvedUser {
  id: number;
  uid: string;
  email: string;
  fullName: string;
  mobile: string;
  role: UserRole;
  collegeId: number | null;
  emailVerified: boolean;
  isActive: boolean;
}

/**
 * Resolves an authenticated Firebase user in PostgreSQL via UID,
 * or links a pre-provisioned college_admin email record on first Google Sign-In,
 * or inserts a new student account ready for college-linked registration.
 */
export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  fullName?: string | null;
  emailVerified?: boolean;
}): Promise<ResolvedUser> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const displayName = (params.fullName || normalizedEmail.split('@')[0] || 'ASH User').trim().slice(0, 120);

  // 1. Check by Firebase UID first
  const byUid = await db.select().from(users).where(eq(users.uid, params.uid)).limit(1);
  if (byUid.length > 0) {
    const existing = byUid[0];
    const [updated] = await db
      .update(users)
      .set({
        email: normalizedEmail,
        emailVerified: existing.emailVerified || Boolean(params.emailVerified),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();

    return {
      id: updated.id,
      uid: updated.uid,
      email: updated.email,
      fullName: updated.fullName,
      mobile: updated.mobile,
      role: updated.role as UserRole,
      collegeId: updated.collegeId,
      emailVerified: updated.emailVerified,
      isActive: updated.isActive,
    };
  }

  // 2. Check if a State Admin pre-provisioned this email (e.g. pending college_admin)
  const byEmail = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (byEmail.length > 0) {
    const existing = byEmail[0];
    const [linked] = await db
      .update(users)
      .set({
        uid: params.uid,
        emailVerified: existing.emailVerified || Boolean(params.emailVerified),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();

    return {
      id: linked.id,
      uid: linked.uid,
      email: linked.email,
      fullName: linked.fullName,
      mobile: linked.mobile,
      role: linked.role as UserRole,
      collegeId: linked.collegeId,
      emailVerified: linked.emailVerified,
      isActive: linked.isActive,
    };
  }

  // 3. Upsert new student shell user (still requires college-linked onboarding before accessing Student Portal)
  const [created] = await db
    .insert(users)
    .values({
      uid: params.uid,
      email: normalizedEmail,
      fullName: displayName,
      mobile: '',
      role: 'student',
      collegeId: null,
      emailVerified: Boolean(params.emailVerified),
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email: normalizedEmail,
        emailVerified: Boolean(params.emailVerified),
        updatedAt: new Date(),
      },
    })
    .returning();

  return {
    id: created.id,
    uid: created.uid,
    email: created.email,
    fullName: created.fullName,
    mobile: created.mobile,
    role: created.role as UserRole,
    collegeId: created.collegeId,
    emailVerified: created.emailVerified,
    isActive: created.isActive,
  };
}

export async function writeAuditLog(entry: {
  actorUserId?: number | null;
  actorRole?: string | null;
  collegeId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  await db.insert(auditLogs).values({
    actorUserId: entry.actorUserId ?? null,
    actorRole: entry.actorRole ?? null,
    collegeId: entry.collegeId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId !== undefined && entry.entityId !== null ? String(entry.entityId) : null,
    detailsJson: entry.details ? JSON.stringify(entry.details) : null,
    ipAddress: entry.ipAddress ?? null,
  });
}
