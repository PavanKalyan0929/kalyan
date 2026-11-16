import { and, eq } from 'drizzle-orm';
import { db } from '../../src/db/index.ts';
import { notifications, users } from '../../src/db/schema.ts';
import { config } from '../config.ts';

export type NotificationType =
  | 'grievance_update'
  | 'fee_reminder'
  | 'scholarship_deadline'
  | 'college_announcement'
  | 'state_notice'
  | 'verification_update'
  | 'security_alert';

export async function createNotification(params: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  linkPath?: string;
}) {
  // Honest delivery status: never pretend email or SMS was delivered if provider is unconfigured
  const emailDeliveryStatus = config.smtp.isConfigured ? 'queued_not_implemented' : 'not_configured';
  const smsDeliveryStatus = config.sms.isConfigured ? 'queued_not_implemented' : 'not_configured';

  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    linkPath: params.linkPath ?? '/dashboard',
    isRead: false,
    emailDeliveryStatus,
    smsDeliveryStatus,
  });
}

export async function notifyCollegeStudents(
  collegeId: number,
  params: {
    type: 'college_announcement' | 'fee_reminder';
    title: string;
    message: string;
    linkPath?: string;
  }
) {
  const students = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, 'student'), eq(users.collegeId, collegeId), eq(users.isActive, true)));

  if (students.length === 0) return 0;

  const emailDeliveryStatus = config.smtp.isConfigured ? 'queued_not_implemented' : 'not_configured';
  const smsDeliveryStatus = config.sms.isConfigured ? 'queued_not_implemented' : 'not_configured';

  await db.insert(notifications).values(
    students.map((s) => ({
      userId: s.id,
      type: params.type,
      title: params.title,
      message: params.message,
      linkPath: params.linkPath ?? '/dashboard',
      isRead: false,
      emailDeliveryStatus,
      smsDeliveryStatus,
    }))
  );

  return students.length;
}
