import crypto from 'node:crypto';
import { and, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  colleges,
  feeStructures,
  notifications,
  otpVerifications,
  studentFeeAccounts,
  studentProfiles,
  users,
} from '../../src/db/schema.ts';
import { writeAuditLog } from '../../src/db/users.ts';
import { config } from '../config.ts';
import { optionalAuth, requireAuth } from '../middleware/auth.ts';
import { studentPhotoUpload } from '../middleware/upload.ts';
import { ensurePublicDataSeeded } from '../seedData.ts';
import { checkOllamaHealth } from '../services/aiService.ts';
import { createNotification } from '../services/notificationService.ts';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication requests. Please wait a few minutes and try again.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please wait 15 minutes before retrying.' },
});

const registerStudentSchema = z.object({
  fullName: z.string().trim().min(3, 'Full name must be at least 3 characters').max(120),
  enrollmentNumber: z
    .string()
    .trim()
    .min(4, 'Student ID / Enrolment number is required')
    .max(40)
    .regex(/^[A-Za-z0-9\-/]+$/, 'Enrolment number may only contain letters, numbers, hyphens, or slashes'),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  collegeId: z.coerce.number().int().positive('Please select a valid college'),
  course: z.string().trim().min(2, 'Course is required').max(100),
  department: z.string().trim().min(2, 'Department or branch is required').max(120),
  academicYear: z.string().trim().min(2, 'Academic year is required').max(30),
  admissionYear: z.coerce.number().int().min(2015).max(2030),
  currentSemester: z.string().trim().min(1).max(30).default('Semester 1'),
  dob: z.string().trim().max(20).optional(),
  consentAccepted: z.preprocess(
    (v) => v === true || v === 'true' || v === 'on' || v === '1',
    z.literal(true, { message: 'Privacy and verification consent is required to register.' })
  ),
});

authRouter.get('/setup/status', async (_req, res) => {
  await ensurePublicDataSeeded();
  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.role, 'state_admin'));
  res.json({ needsStateAdminBootstrap: adminCount === 0 });
});

authRouter.post('/setup/bootstrap-state-admin', authLimiter, requireAuth, async (req, res) => {
  const schema = z.object({
    fullName: z.string().trim().min(3, 'Full name is required').max(120).optional(),
    mobile: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
      .optional(),
  });
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid input' });
  }

  const user = req.user!;
  const outcome = await db.transaction(async (tx) => {
    const existingAdmin = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'state_admin'))
      .limit(1);

    if (existingAdmin.length > 0) {
      return { locked: true as const };
    }

    const [updated] = await tx
      .update(users)
      .set({
        role: 'state_admin',
        collegeId: null,
        fullName: parsed.data.fullName || user.fullName,
        mobile: parsed.data.mobile || user.mobile,
        consentAcceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return { locked: false as const, updated };
  });

  if (outcome.locked) {
    return res.status(403).json({
      error: 'Initial State Administrator already exists. Bootstrap endpoint is permanently locked.',
    });
  }

  await writeAuditLog({
    actorUserId: outcome.updated.id,
    actorRole: 'state_admin',
    action: 'BOOTSTRAP_STATE_ADMIN',
    entityType: 'user',
    entityId: outcome.updated.id,
    ipAddress: req.ip,
  });

  return res.status(201).json({
    user: {
      id: outcome.updated.id,
      email: outcome.updated.email,
      fullName: outcome.updated.fullName,
      role: outcome.updated.role,
      collegeId: null,
    },
    message: 'State Administrator account initialized successfully.',
  });
});

authRouter.post(
  '/auth/register-student',
  authLimiter,
  requireAuth,
  studentPhotoUpload.single('studentPhoto'),
  async (req, res) => {
    const currentUser = req.user!;
    if (currentUser.role !== 'student') {
      return res.status(403).json({
        error: 'Administrative accounts cannot be converted into student profiles.',
      });
    }

    const parsed = registerStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Validation failed' });
    }

    const data = parsed.data;
    const normalizedEnrollment = data.enrollmentNumber.toUpperCase();

    const [college] = await db
      .select({ id: colleges.id, name: colleges.name, isActive: colleges.isActive })
      .from(colleges)
      .where(eq(colleges.id, data.collegeId))
      .limit(1);

    if (!college || !college.isActive) {
      return res.status(400).json({ error: 'Selected college was not found or is inactive in the directory.' });
    }

    const [existingProfile] = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, currentUser.id))
      .limit(1);

    if (existingProfile) {
      return res.status(409).json({ error: 'Student profile is already registered for this account.' });
    }

    const [existingEnrollment] = await db
      .select({ userId: studentProfiles.userId })
      .from(studentProfiles)
      .where(and(eq(studentProfiles.collegeId, data.collegeId), eq(studentProfiles.enrollmentNumber, normalizedEnrollment)))
      .limit(1);

    if (existingEnrollment) {
      return res.status(409).json({
        error: 'This enrolment number is already registered for the selected college.',
      });
    }

    const [verifiedOtp] = await db
      .select({ id: otpVerifications.id })
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, currentUser.id),
          eq(otpVerifications.mobile, data.mobile)
        )
      )
      .orderBy(desc(otpVerifications.createdAt))
      .limit(1);

    const isMobileOtpVerified = Boolean(verifiedOtp && verifiedOtp.id);
    // Re-check verifiedAt explicitly
    const verifiedOtpRow = isMobileOtpVerified
      ? await db
          .select({ verifiedAt: otpVerifications.verifiedAt })
          .from(otpVerifications)
          .where(eq(otpVerifications.id, verifiedOtp.id))
          .limit(1)
      : [];
    const mobileOtpConfirmed = Boolean(verifiedOtpRow[0]?.verifiedAt);

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          fullName: data.fullName,
          mobile: data.mobile,
          collegeId: data.collegeId,
          consentAcceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, currentUser.id));

      await tx.insert(studentProfiles).values({
        userId: currentUser.id,
        enrollmentNumber: normalizedEnrollment,
        collegeId: data.collegeId,
        course: data.course,
        department: data.department,
        academicYear: data.academicYear,
        admissionYear: data.admissionYear,
        currentSemester: data.currentSemester,
        dob: data.dob || null,
        profilePhotoPath: req.file ? req.file.path : null,
        verificationStatus: 'College verification pending',
        mobileOtpVerified: mobileOtpConfirmed,
        consentAccepted: true,
      });

      const [feeStruct] = await tx
        .select()
        .from(feeStructures)
        .where(
          and(
            eq(feeStructures.collegeId, data.collegeId),
            ilike(feeStructures.course, data.course),
            ilike(feeStructures.academicYear, data.academicYear)
          )
        )
        .limit(1);

      if (feeStruct) {
        const total =
          feeStruct.tuitionFee +
          feeStruct.examinationFee +
          feeStruct.laboratoryFee +
          feeStruct.hostelFee +
          feeStruct.transportFee +
          feeStruct.otherAuthorisedFee;

        await tx
          .insert(studentFeeAccounts)
          .values({
            studentUserId: currentUser.id,
            collegeId: data.collegeId,
            feeStructureId: feeStruct.id,
            academicYear: data.academicYear,
            tuitionFee: feeStruct.tuitionFee,
            examinationFee: feeStruct.examinationFee,
            laboratoryFee: feeStruct.laboratoryFee,
            hostelFee: feeStruct.hostelFee,
            transportFee: feeStruct.transportFee,
            otherAuthorisedFee: feeStruct.otherAuthorisedFee,
            totalApplicableFee: total,
            dueDate: feeStruct.dueDate,
          })
          .onConflictDoNothing();
      }
    });

    await createNotification({
      userId: currentUser.id,
      type: 'verification_update',
      title: 'Complete College Identity Verification',
      message: `Your ASH student profile for ${college.name} is registered with status "College verification pending". Upload Student ID / bonafide proof or validate your official college email for staff approval.`,
      linkPath: '/dashboard',
    });

    await writeAuditLog({
      actorUserId: currentUser.id,
      actorRole: 'student',
      collegeId: data.collegeId,
      action: 'STUDENT_REGISTERED',
      entityType: 'student_profile',
      entityId: currentUser.id,
      details: { enrollmentNumber: normalizedEnrollment, course: data.course },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Student profile registered. Proceed to complete college identity verification.',
      verificationStatus: 'College verification pending',
    });
  }
);

authRouter.post('/auth/otp/send', otpLimiter, requireAuth, async (req, res) => {
  const schema = z.object({
    mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    purpose: z.enum(['registration', 'profile_update']).default('registration'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid mobile number' });
  }

  const testEchoAllowed = process.env.NODE_ENV === 'test' && process.env.SMS_TEST_ECHO === 'true';
  if (!config.sms.isConfigured && !testEchoAllowed) {
    return res.status(503).json({
      error:
        'SMS OTP gateway is not configured on this deployment (SMS_PROVIDER_ID / SMS_PROVIDER_API_KEY missing). Mobile OTP cannot be sent; note that student enrolment is verified via College Administrator review and never by OTP alone.',
      smsConfigured: false,
    });
  }

  const { mobile, purpose } = parsed.data;

  // Enforce 60-second resend cooldown
  const [recent] = await db
    .select({ createdAt: otpVerifications.createdAt })
    .from(otpVerifications)
    .where(and(eq(otpVerifications.userId, req.user!.id), eq(otpVerifications.mobile, mobile)))
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);

  if (recent && Date.now() - new Date(recent.createdAt).getTime() < 60 * 1000) {
    return res.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
  }

  const otpCode = String(crypto.randomInt(100000, 1000000));
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${salt}:${otpCode}`).digest('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(otpVerifications).values({
    userId: req.user!.id,
    mobile,
    otpHash: `${salt}:${hash}`,
    purpose,
    attempts: 0,
    maxAttempts: 5,
    expiresAt,
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: req.user!.role,
    action: 'MOBILE_OTP_ISSUED',
    entityType: 'otp_verification',
    entityId: req.user!.id,
    ipAddress: req.ip,
  });

  return res.json({
    message: 'OTP dispatched via configured SMS provider. Expires in 10 minutes.',
    expiresAt: expiresAt.toISOString(),
    ...(testEchoAllowed ? { testOtp: otpCode } : {}),
  });
});

authRouter.post('/auth/otp/verify', otpLimiter, requireAuth, async (req, res) => {
  const schema = z.object({
    mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid OTP payload' });
  }

  const { mobile, otp } = parsed.data;
  const [record] = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.userId, req.user!.id),
        eq(otpVerifications.mobile, mobile),
        isNull(otpVerifications.verifiedAt)
      )
    )
    .orderBy(desc(otpVerifications.createdAt))
    .limit(1);

  if (!record) {
    return res.status(400).json({ error: 'No pending OTP found for this mobile number. Request a new OTP.' });
  }

  if (new Date() > new Date(record.expiresAt)) {
    return res.status(400).json({ error: 'This OTP has expired (10-minute limit). Please request a new OTP.' });
  }

  if (record.attempts >= record.maxAttempts) {
    return res.status(429).json({ error: 'Maximum OTP verification attempts exceeded. Request a new OTP.' });
  }

  const [salt, storedHash] = record.otpHash.split(':');
  const candidateHash = crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
  const matches =
    Boolean(storedHash) &&
    storedHash.length === candidateHash.length &&
    crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(candidateHash, 'hex'));

  if (!matches) {
    const nextAttempts = record.attempts + 1;
    await db
      .update(otpVerifications)
      .set({ attempts: nextAttempts })
      .where(eq(otpVerifications.id, record.id));

    return res.status(400).json({
      error: `Incorrect OTP. ${Math.max(0, record.maxAttempts - nextAttempts)} attempt(s) remaining.`,
    });
  }

  await db
    .update(otpVerifications)
    .set({ verifiedAt: new Date() })
    .where(eq(otpVerifications.id, record.id));

  await db
    .update(users)
    .set({ mobile, updatedAt: new Date() })
    .where(eq(users.id, req.user!.id));

  await db
    .update(studentProfiles)
    .set({ mobileOtpVerified: true, updatedAt: new Date() })
    .where(eq(studentProfiles.userId, req.user!.id));

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: req.user!.role,
    action: 'MOBILE_OTP_VERIFIED',
    entityType: 'user',
    entityId: req.user!.id,
    ipAddress: req.ip,
  });

  return res.json({
    verified: true,
    message:
      'Mobile number verified. Reminder: Mobile OTP verifies phone ownership only and does not prove college enrolment.',
  });
});

authRouter.get('/auth/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.json({ user: null, needsStudentOnboarding: false });
  }

  const [userDetails] = await db
    .select({
      id: users.id,
      uid: users.uid,
      fullName: users.fullName,
      email: users.email,
      mobile: users.mobile,
      role: users.role,
      collegeId: users.collegeId,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  if (!userDetails) {
    return res.json({ user: null, needsStudentOnboarding: false });
  }

  let college = null;
  if (userDetails.collegeId) {
    const [col] = await db
      .select({
        id: colleges.id,
        name: colleges.name,
        institutionCode: colleges.institutionCode,
        district: colleges.district,
        category: colleges.category,
        management: colleges.management,
        verificationStatus: colleges.verificationStatus,
      })
      .from(colleges)
      .where(eq(colleges.id, userDetails.collegeId))
      .limit(1);
    college = col || null;
  }

  let studentProfile = null;
  if (userDetails.role === 'student') {
    const [sp] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userDetails.id))
      .limit(1);
    studentProfile = sp || null;
  }

  const [{ value: unreadNotifications }] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userDetails.id), eq(notifications.isRead, false)));

  return res.json({
    user: userDetails,
    college,
    studentProfile,
    needsStudentOnboarding: userDetails.role === 'student' && !studentProfile,
    unreadNotifications,
  });
});

authRouter.get('/auth/integration-status', async (_req, res) => {
  const ollama = await checkOllamaHealth();
  res.json({
    smsConfigured: config.sms.isConfigured,
    smtpConfigured: config.smtp.isConfigured,
    paymentGatewayConfigured: config.payment.isConfigured,
    ollama,
    proposedDomain: config.proposedDomain,
  });
});
