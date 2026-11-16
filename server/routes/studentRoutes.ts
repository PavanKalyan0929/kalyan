import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  collegeLogos,
  colleges,
  feePayments,
  feeStructures,
  grievanceAttachments,
  grievanceHistory,
  grievances,
  notices,
  notifications,
  privacyRequests,
  scholarships,
  studentFeeAccounts,
  studentProfiles,
  studentScholarshipTrackers,
  studentShortlists,
  users,
  verificationRequests,
} from '../../src/db/schema.ts';
import { writeAuditLog } from '../../src/db/users.ts';
import { config } from '../config.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { grievanceUpload, verificationUpload } from '../middleware/upload.ts';
import { analyzeGrievance, GRIEVANCE_CATEGORIES } from '../services/aiService.ts';
import { createNotification } from '../services/notificationService.ts';

export const studentRouter = Router();

studentRouter.use('/notifications', requireAuth);

// Notifications work for any authenticated role
studentRouter.get('/notifications', async (req, res) => {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, req.user!.id))
    .orderBy(desc(notifications.createdAt))
    .limit(40);
  res.json({ notifications: rows });
});

studentRouter.post('/notifications/:id/read', async (req, res) => {
  const id = Number(req.params.id);
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, req.user!.id)));
  res.json({ ok: true });
});

studentRouter.post('/notifications/read-all', async (req, res) => {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, req.user!.id));
  res.json({ ok: true });
});

// Student-specific endpoints
studentRouter.use('/student', requireAuth, requireRole('student'));

async function computeStudentFeeSummary(studentUserId: number) {
  const accounts = await db
    .select({
      id: studentFeeAccounts.id,
      studentUserId: studentFeeAccounts.studentUserId,
      collegeId: studentFeeAccounts.collegeId,
      feeStructureId: studentFeeAccounts.feeStructureId,
      academicYear: studentFeeAccounts.academicYear,
      tuitionFee: studentFeeAccounts.tuitionFee,
      examinationFee: studentFeeAccounts.examinationFee,
      laboratoryFee: studentFeeAccounts.laboratoryFee,
      hostelFee: studentFeeAccounts.hostelFee,
      transportFee: studentFeeAccounts.transportFee,
      otherAuthorisedFee: studentFeeAccounts.otherAuthorisedFee,
      totalApplicableFee: studentFeeAccounts.totalApplicableFee,
      dueDate: studentFeeAccounts.dueDate,
      updatedAt: studentFeeAccounts.updatedAt,
      sourceReference: feeStructures.sourceReference,
    })
    .from(studentFeeAccounts)
    .leftJoin(feeStructures, eq(feeStructures.id, studentFeeAccounts.feeStructureId))
    .where(eq(studentFeeAccounts.studentUserId, studentUserId))
    .orderBy(desc(studentFeeAccounts.academicYear));

  const payments = await db
    .select()
    .from(feePayments)
    .where(eq(feePayments.studentUserId, studentUserId))
    .orderBy(desc(feePayments.paidAt), desc(feePayments.id));

  const totalApplicable = accounts.reduce((acc, row) => acc + Number(row.totalApplicableFee || 0), 0);
  const totalPaid = payments
    .filter((p) => p.verificationStatus === 'verified_by_college' || p.verificationStatus === 'gateway_confirmed')
    .reduce((acc, row) => acc + Number(row.amount || 0), 0);
  const pendingAmount = Math.max(0, totalApplicable - totalPaid);

  return {
    hasAuthorisedFeeRecord: accounts.length > 0,
    accounts,
    payments,
    totals: {
      totalApplicable,
      totalPaid,
      pendingAmount,
    },
    paymentGatewayConfigured: config.payment.isConfigured,
  };
}

studentRouter.get('/student/dashboard', async (req, res) => {
  const userId = req.user!.id;

  const [userRow] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      mobile: users.mobile,
      role: users.role,
      collegeId: users.collegeId,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    return res.status(403).json({
      error: 'Please complete your college-linked student registration first.',
      code: 'ONBOARDING_REQUIRED',
    });
  }

  const [[college], [approvedLogo], verificationHistory, fees, scholarshipTrackers, studentGrievances, collegeNotices, statewideNotices, userNotifications, userPrivacyRequests] =
    await Promise.all([
      db.select().from(colleges).where(eq(colleges.id, profile.collegeId)).limit(1),
      db
        .select({ id: collegeLogos.id })
        .from(collegeLogos)
        .where(and(eq(collegeLogos.collegeId, profile.collegeId), eq(collegeLogos.approvalStatus, 'approved')))
        .orderBy(desc(collegeLogos.approvedAt), desc(collegeLogos.id))
        .limit(1),
      db
        .select({
          id: verificationRequests.id,
          method: verificationRequests.method,
          evidenceOriginalName: verificationRequests.evidenceOriginalName,
          notes: verificationRequests.notes,
          status: verificationRequests.status,
          decisionReason: verificationRequests.decisionReason,
          reviewedAt: verificationRequests.reviewedAt,
          createdAt: verificationRequests.createdAt,
          reviewerName: users.fullName,
        })
        .from(verificationRequests)
        .leftJoin(users, eq(users.id, verificationRequests.reviewerUserId))
        .where(eq(verificationRequests.studentUserId, userId))
        .orderBy(desc(verificationRequests.createdAt)),
      computeStudentFeeSummary(userId),
      db
        .select({
          id: studentScholarshipTrackers.id,
          scholarshipId: studentScholarshipTrackers.scholarshipId,
          externalApplicationId: studentScholarshipTrackers.externalApplicationId,
          trackingStatus: studentScholarshipTrackers.trackingStatus,
          notes: studentScholarshipTrackers.notes,
          updatedAt: studentScholarshipTrackers.updatedAt,
          title: scholarships.title,
          category: scholarships.category,
          provider: scholarships.provider,
          deadline: scholarships.deadline,
          officialUrl: scholarships.officialUrl,
        })
        .from(studentScholarshipTrackers)
        .innerJoin(scholarships, eq(scholarships.id, studentScholarshipTrackers.scholarshipId))
        .where(eq(studentScholarshipTrackers.studentUserId, userId))
        .orderBy(desc(studentScholarshipTrackers.updatedAt)),
      db
        .select()
        .from(grievances)
        .where(eq(grievances.studentUserId, userId))
        .orderBy(desc(grievances.createdAt)),
      db
        .select()
        .from(notices)
        .where(and(eq(notices.scope, 'college'), eq(notices.collegeId, profile.collegeId)))
        .orderBy(desc(notices.publishedAt))
        .limit(10),
      db
        .select()
        .from(notices)
        .where(eq(notices.scope, 'statewide'))
        .orderBy(desc(notices.publishedAt))
        .limit(10),
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(20),
      db
        .select()
        .from(privacyRequests)
        .where(eq(privacyRequests.userId, userId))
        .orderBy(desc(privacyRequests.createdAt)),
    ]);

  res.json({
    user: userRow,
    profile,
    college: college ? { ...college, approvedLogoId: approvedLogo?.id ?? null } : null,
    verificationHistory,
    fees,
    scholarshipTrackers,
    grievances: studentGrievances,
    collegeNotices,
    statewideNotices,
    notifications: userNotifications,
    privacyRequests: userPrivacyRequests,
    smsConfigured: config.sms.isConfigured,
  });
});

studentRouter.patch('/student/profile', async (req, res) => {
  // Strictly forbid changing collegeId, enrollmentNumber, or verificationStatus
  const schema = z.object({
    fullName: z.string().trim().min(3).max(120).optional(),
    academicYear: z.string().trim().min(2).max(30).optional(),
    currentSemester: z.string().trim().min(1).max(30).optional(),
    dob: z.string().trim().max(20).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid profile data' });
  }

  const [profile] = await db
    .select({ userId: studentProfiles.userId, academicYear: studentProfiles.academicYear, currentSemester: studentProfiles.currentSemester, dob: studentProfiles.dob })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, req.user!.id))
    .limit(1);

  if (!profile) {
    return res.status(403).json({ error: 'Student profile not found. Complete onboarding first.' });
  }

  const { fullName, academicYear, currentSemester, dob } = parsed.data;

  await db.transaction(async (tx) => {
    if (fullName) {
      await tx
        .update(users)
        .set({ fullName, updatedAt: new Date() })
        .where(eq(users.id, req.user!.id));
    }
    if (academicYear || currentSemester || dob !== undefined) {
      await tx
        .update(studentProfiles)
        .set({
          academicYear: academicYear ?? profile.academicYear,
          currentSemester: currentSemester ?? profile.currentSemester,
          dob: dob !== undefined ? dob || null : profile.dob,
          updatedAt: new Date(),
        })
        .where(eq(studentProfiles.userId, req.user!.id));
    }
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'student',
    collegeId: req.user!.collegeId,
    action: 'STUDENT_PROFILE_UPDATED',
    entityType: 'student_profile',
    entityId: req.user!.id,
    ipAddress: req.ip,
  });

  res.json({ message: 'Profile updated successfully.' });
});

studentRouter.post('/student/verification/submit', verificationUpload.single('evidence'), async (req, res) => {
  const method = typeof req.body?.method === 'string' ? req.body.method : 'evidence_upload';
  const officialCollegeEmail =
    typeof req.body?.officialCollegeEmail === 'string' ? req.body.officialCollegeEmail.trim().toLowerCase() : '';
  const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 500) : '';

  if (!['official_college_email', 'evidence_upload', 'manual_review'].includes(method)) {
    return res.status(400).json({ error: 'Invalid verification method.' });
  }

  const [profile] = await db
    .select({ collegeId: studentProfiles.collegeId, enrollmentNumber: studentProfiles.enrollmentNumber })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, req.user!.id))
    .limit(1);

  if (!profile) {
    return res.status(403).json({ error: 'Student profile not found. Complete onboarding first.' });
  }

  const [college] = await db
    .select({
      id: colleges.id,
      name: colleges.name,
      officialEmailDomain: colleges.officialEmailDomain,
    })
    .from(colleges)
    .where(eq(colleges.id, profile.collegeId))
    .limit(1);

  if (!college) {
    return res.status(404).json({ error: 'Associated college not found.' });
  }

  if (method === 'official_college_email') {
    if (!officialCollegeEmail || !officialCollegeEmail.includes('@')) {
      return res.status(400).json({ error: 'Enter a valid official college email address.' });
    }
    if (!college.officialEmailDomain) {
      return res.status(400).json({
        error: `${college.name} does not have a registered official email domain on file. Please upload your student ID or bonafide proof for staff verification.`,
      });
    }
    const domain = officialCollegeEmail.split('@')[1]?.toLowerCase() || '';
    const allowedDomain = college.officialEmailDomain.toLowerCase();
    if (domain !== allowedDomain && !domain.endsWith(`.${allowedDomain}`)) {
      return res.status(400).json({
        error: `Email domain must match official domain (${college.officialEmailDomain}). Note: Email verification alone does not bypass staff enrolment verification.`,
      });
    }
  }

  if (method === 'evidence_upload' && !req.file) {
    return res.status(400).json({
      error: 'Please attach a valid ID card, admission letter, or bonafide document (JPG, PNG, WebP, or PDF up to 5 MB).',
    });
  }

  const inserted = await db.transaction(async (tx) => {
    const [reqRow] = await tx
      .insert(verificationRequests)
      .values({
        studentUserId: req.user!.id,
        collegeId: profile.collegeId,
        method,
        evidenceFilePath: req.file ? req.file.path : null,
        evidenceOriginalName: req.file ? req.file.originalname : null,
        evidenceMimeType: req.file ? req.file.mimetype : null,
        notes: notes || (method === 'official_college_email' ? `Submitted official email: ${officialCollegeEmail}` : null),
        status: 'Pending',
      })
      .returning({ id: verificationRequests.id });

    // Email check records email match metadata but explicitly stays College verification pending until human staff / ERP confirms enrolment
    await tx
      .update(studentProfiles)
      .set({
        ...(method === 'official_college_email' ? { officialCollegeEmail } : {}),
        verificationMethod: method,
        verificationStatus: 'College verification pending',
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.userId, req.user!.id));

    return reqRow;
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'student',
    collegeId: profile.collegeId,
    action: 'VERIFICATION_SUBMITTED',
    entityType: 'verification_request',
    entityId: inserted.id,
    details: { method },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    requestId: inserted.id,
    status: 'College verification pending',
    message:
      'Verification request submitted for College Administrator review. Email verification alone is never treated as proof of enrolment.',
  });
});

studentRouter.get('/student/fees/statement', async (req, res) => {
  const [studentRow] = await db
    .select({
      fullName: users.fullName,
      email: users.email,
      enrollmentNumber: studentProfiles.enrollmentNumber,
      course: studentProfiles.course,
      department: studentProfiles.department,
      academicYear: studentProfiles.academicYear,
      collegeName: colleges.name,
      institutionCode: colleges.institutionCode,
      district: colleges.district,
    })
    .from(users)
    .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .innerJoin(colleges, eq(colleges.id, studentProfiles.collegeId))
    .where(eq(users.id, req.user!.id))
    .limit(1);

  if (!studentRow) {
    return res.status(403).json({ error: 'Student profile not found.' });
  }

  const summary = await computeStudentFeeSummary(req.user!.id);

  res.json({
    generatedAt: new Date().toISOString(),
    student: studentRow,
    ...summary,
  });
});

studentRouter.post('/student/fees/pay', (_req, res) => {
  if (!config.payment.isConfigured) {
    return res.status(503).json({
      error:
        'Online payment gateway is not configured on this deployment. Please make payments via your college’s authorised bank challan/NEFT counter; your College Administrator will issue a verified receipt.',
      paymentGatewayConfigured: false,
    });
  }
  return res.status(501).json({
    error: 'Payment gateway adapter requires signed webhook verification (/api/payments/webhook) before marking any fee paid.',
  });
});

studentRouter.post('/student/scholarships/:id/track', async (req, res) => {
  const scholarshipId = Number(req.params.id);
  const schema = z.object({
    trackingStatus: z.enum([
      'Bookmarked',
      'Applied on Official Portal',
      'Under Verification',
      'Sanctioned',
      'Disbursed',
      'Issue Reported',
    ]),
    externalApplicationId: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(400).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid tracker input' });
  }

  const [scholarship] = await db
    .select({ id: scholarships.id })
    .from(scholarships)
    .where(eq(scholarships.id, scholarshipId))
    .limit(1);
  if (!scholarship) {
    return res.status(404).json({ error: 'Scholarship scheme not found.' });
  }

  await db
    .insert(studentScholarshipTrackers)
    .values({
      studentUserId: req.user!.id,
      scholarshipId,
      externalApplicationId: parsed.data.externalApplicationId || null,
      trackingStatus: parsed.data.trackingStatus,
      notes: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [studentScholarshipTrackers.studentUserId, studentScholarshipTrackers.scholarshipId],
      set: {
        externalApplicationId: parsed.data.externalApplicationId || null,
        trackingStatus: parsed.data.trackingStatus,
        notes: parsed.data.notes || null,
        updatedAt: new Date(),
      },
    });

  res.json({
    message:
      'Personal scholarship tracking updated. Reminder: Official scholarship submission must be completed on the linked government/provider portal.',
  });
});

studentRouter.get('/student/grievances', async (req, res) => {
  const rows = await db
    .select()
    .from(grievances)
    .where(eq(grievances.studentUserId, req.user!.id))
    .orderBy(desc(grievances.createdAt));
  res.json({ grievances: rows });
});

studentRouter.post('/student/grievances', grievanceUpload.array('attachments', 3), async (req, res) => {
  const schema = z.object({
    category: z.enum(GRIEVANCE_CATEGORIES),
    subject: z.string().trim().min(5, 'Subject must be at least 5 characters').max(160),
    description: z.string().trim().min(20, 'Please explain the problem in at least 20 characters').max(3000),
    contactPhone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit contact mobile number'),
    contactEmail: z.string().trim().email('Enter a valid contact email address'),
    consentAccepted: z.preprocess(
      (v) => v === undefined || v === true || v === 'true' || v === 'on' || v === '1',
      z.literal(true)
    ),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid grievance input' });
  }

  const [profile] = await db
    .select({ collegeId: studentProfiles.collegeId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, req.user!.id))
    .limit(1);

  if (!profile) {
    return res.status(403).json({ error: 'Student profile is required before submitting a grievance.' });
  }

  const analysis = await analyzeGrievance({
    studentUserId: req.user!.id,
    collegeId: profile.collegeId,
    category: parsed.data.category,
    subject: parsed.data.subject,
    description: parsed.data.description,
  });

  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const referenceNumber = `ASH-GRV-${year}-${suffix}`;
  const files = (req.files as Express.Multer.File[]) || [];

  const created = await db.transaction(async (tx) => {
    const [grv] = await tx
      .insert(grievances)
      .values({
        referenceNumber,
        studentUserId: req.user!.id,
        collegeId: profile.collegeId,
        category: parsed.data.category,
        subject: parsed.data.subject,
        description: parsed.data.description,
        contactPhone: parsed.data.contactPhone,
        contactEmail: parsed.data.contactEmail,
        status: 'Submitted',
        aiSuggestedCategory: analysis.suggestedCategory,
        aiSummary: analysis.summary,
        aiUrgency: analysis.urgency,
        aiMissingInfo: analysis.missingInfo,
        aiPossibleDuplicateRef: analysis.possibleDuplicateRef,
        aiDraftResponse: analysis.draftResponse,
        aiProviderUsed: analysis.providerUsed,
        consentAccepted: true,
      })
      .returning({ id: grievances.id });

    if (files.length > 0) {
      await tx.insert(grievanceAttachments).values(
        files.map((file) => ({
          grievanceId: grv.id,
          filePath: file.path,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: req.user!.id,
        }))
      );
    }

    await tx.insert(grievanceHistory).values({
      grievanceId: grv.id,
      actorUserId: req.user!.id,
      actorRole: 'student',
      previousStatus: null,
      newStatus: 'Submitted',
      comment: 'Complaint submitted by student for college grievance officer review.',
      isInternal: false,
    });

    return grv;
  });

  await createNotification({
    userId: req.user!.id,
    type: 'grievance_update',
    title: `Grievance Registered: ${referenceNumber}`,
    message: `Your grievance "${parsed.data.subject}" has been logged with status Submitted.`,
    linkPath: '/services',
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'student',
    collegeId: profile.collegeId,
    action: 'GRIEVANCE_SUBMITTED',
    entityType: 'grievance',
    entityId: created.id,
    details: { referenceNumber, category: parsed.data.category },
    ipAddress: req.ip,
  });

  return res.status(201).json({
    id: created.id,
    referenceNumber,
    status: 'Submitted',
    analysis,
  });
});

studentRouter.get('/student/grievances/:id', async (req, res) => {
  const id = Number(req.params.id);
  const [grievance] = await db
    .select()
    .from(grievances)
    .where(and(eq(grievances.id, id), eq(grievances.studentUserId, req.user!.id)))
    .limit(1);

  if (!grievance) {
    return res.status(404).json({ error: 'Grievance not found.' });
  }

  const [attachments, history] = await Promise.all([
    db
      .select({
        id: grievanceAttachments.id,
        originalName: grievanceAttachments.originalName,
        mimeType: grievanceAttachments.mimeType,
        fileSize: grievanceAttachments.fileSize,
        createdAt: grievanceAttachments.createdAt,
      })
      .from(grievanceAttachments)
      .where(eq(grievanceAttachments.grievanceId, id)),
    db
      .select({
        id: grievanceHistory.id,
        actorRole: grievanceHistory.actorRole,
        previousStatus: grievanceHistory.previousStatus,
        newStatus: grievanceHistory.newStatus,
        comment: grievanceHistory.comment,
        createdAt: grievanceHistory.createdAt,
        actorName: users.fullName,
      })
      .from(grievanceHistory)
      .innerJoin(users, eq(users.id, grievanceHistory.actorUserId))
      .where(and(eq(grievanceHistory.grievanceId, id), eq(grievanceHistory.isInternal, false)))
      .orderBy(grievanceHistory.createdAt),
  ]);

  res.json({ grievance, attachments, history });
});

studentRouter.post('/student/grievances/:id/evidence', grievanceUpload.array('attachments', 3), async (req, res) => {
  const id = Number(req.params.id);
  const [grievance] = await db
    .select({ id: grievances.id, status: grievances.status, collegeId: grievances.collegeId })
    .from(grievances)
    .where(and(eq(grievances.id, id), eq(grievances.studentUserId, req.user!.id)))
    .limit(1);

  if (!grievance) {
    return res.status(404).json({ error: 'Grievance not found.' });
  }

  const files = (req.files as Express.Multer.File[]) || [];
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
  if (files.length === 0 && !note) {
    return res.status(400).json({ error: 'Please upload a supporting file or provide an update note.' });
  }

  await db.transaction(async (tx) => {
    if (files.length > 0) {
      await tx.insert(grievanceAttachments).values(
        files.map((file) => ({
          grievanceId: id,
          filePath: file.path,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: req.user!.id,
        }))
      );
    }

    const nextStatus =
      grievance.status === 'Additional information requested' ? 'Under review' : grievance.status;

    await tx
      .update(grievances)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(grievances.id, id));

    await tx.insert(grievanceHistory).values({
      grievanceId: id,
      actorUserId: req.user!.id,
      actorRole: 'student',
      previousStatus: grievance.status,
      newStatus: nextStatus,
      comment: note || `Uploaded ${files.length} additional evidence file(s).`,
      isInternal: false,
    });
  });

  res.status(201).json({ message: 'Additional evidence submitted to grievance timeline.' });
});

studentRouter.post('/student/grievances/:id/feedback', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    feedback: z.string().trim().min(5, 'Feedback must be at least 5 characters').max(600),
    reopen: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid feedback' });
  }

  const [grievance] = await db
    .select({ id: grievances.id, status: grievances.status, collegeId: grievances.collegeId })
    .from(grievances)
    .where(and(eq(grievances.id, id), eq(grievances.studentUserId, req.user!.id)))
    .limit(1);

  if (!grievance) {
    return res.status(404).json({ error: 'Grievance not found.' });
  }

  const nextStatus = parsed.data.reopen ? 'Reopened' : grievance.status;

  await db.transaction(async (tx) => {
    await tx
      .update(grievances)
      .set({
        studentFeedback: parsed.data.feedback,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, id));

    await tx.insert(grievanceHistory).values({
      grievanceId: id,
      actorUserId: req.user!.id,
      actorRole: 'student',
      previousStatus: grievance.status,
      newStatus: nextStatus,
      comment: `Student Feedback${parsed.data.reopen ? ' (Reopened)' : ''}: ${parsed.data.feedback}`,
      isInternal: false,
    });
  });

  res.json({ message: parsed.data.reopen ? 'Grievance reopened for officer follow-up.' : 'Feedback recorded.', status: nextStatus });
});

studentRouter.post('/student/grievances/:id/escalate', async (req, res) => {
  const id = Number(req.params.id);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (reason.length < 10) {
    return res.status(400).json({ error: 'Please explain why escalation is requested (minimum 10 characters).' });
  }

  const [grievance] = await db
    .select({
      id: grievances.id,
      status: grievances.status,
      collegeId: grievances.collegeId,
      referenceNumber: grievances.referenceNumber,
    })
    .from(grievances)
    .where(and(eq(grievances.id, id), eq(grievances.studentUserId, req.user!.id)))
    .limit(1);

  if (!grievance) {
    return res.status(404).json({ error: 'Grievance not found.' });
  }
  if (['Resolved', 'Closed', 'Escalated'].includes(grievance.status)) {
    return res.status(400).json({ error: `Cannot escalate a grievance currently marked ${grievance.status}.` });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(grievances)
      .set({
        status: 'Escalated',
        escalatedToState: true,
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, id));

    await tx.insert(grievanceHistory).values({
      grievanceId: id,
      actorUserId: req.user!.id,
      actorRole: 'student',
      previousStatus: grievance.status,
      newStatus: 'Escalated',
      comment: `Escalated to State Administration by student: ${reason}`,
      isInternal: false,
    });
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'student',
    collegeId: grievance.collegeId,
    action: 'GRIEVANCE_ESCALATED',
    entityType: 'grievance',
    entityId: id,
    details: { referenceNumber: grievance.referenceNumber },
    ipAddress: req.ip,
  });

  res.json({ message: 'Grievance escalated to State Higher Education Desk.', status: 'Escalated' });
});

// DPDP Privacy Export & Deletion Requests
studentRouter.get('/student/privacy/export', async (req, res) => {
  const userId = req.user!.id;
  const [[userRow], [profile], verifications, fees, studentGrievances, trackers] = await Promise.all([
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        mobile: users.mobile,
        role: users.role,
        collegeId: users.collegeId,
        consentAcceptedAt: users.consentAcceptedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1),
    db.select().from(verificationRequests).where(eq(verificationRequests.studentUserId, userId)),
    computeStudentFeeSummary(userId),
    db.select().from(grievances).where(eq(grievances.studentUserId, userId)),
    db.select().from(studentScholarshipTrackers).where(eq(studentScholarshipTrackers.studentUserId, userId)),
  ]);

  await writeAuditLog({
    actorUserId: userId,
    actorRole: 'student',
    collegeId: req.user!.collegeId,
    action: 'STUDENT_DATA_EXPORTED',
    entityType: 'user',
    entityId: userId,
    ipAddress: req.ip,
  });

  res.json({
    exportedAt: new Date().toISOString(),
    user: userRow,
    profile,
    verificationRequests: verifications,
    fees,
    grievances: studentGrievances,
    scholarshipTrackers: trackers,
  });
});

studentRouter.post('/student/privacy/request', async (req, res) => {
  const schema = z.object({
    requestType: z.enum(['data_export', 'account_deletion']),
    reason: z.string().trim().min(5).max(500).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid privacy request' });
  }

  const [created] = await db
    .insert(privacyRequests)
    .values({
      userId: req.user!.id,
      requestType: parsed.data.requestType,
      reason: parsed.data.reason || null,
      status: 'Submitted',
    })
    .returning();

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'student',
    collegeId: req.user!.collegeId,
    action: 'PRIVACY_REQUEST_SUBMITTED',
    entityType: 'privacy_request',
    entityId: created.id,
    details: { requestType: parsed.data.requestType },
    ipAddress: req.ip,
  });

  res.status(201).json({
    id: created.id,
    message:
      parsed.data.requestType === 'account_deletion'
        ? 'Account deletion request logged for Data Governance / State Administrator review (financial & audit retention rules apply).'
        : 'Data export request logged.',
  });
});

// Student Shortlists
studentRouter.get('/student/shortlists', async (req, res) => {
  const rows = await db
    .select({
      collegeId: colleges.id,
      name: colleges.name,
      institutionCode: colleges.institutionCode,
      category: colleges.category,
      management: colleges.management,
      district: colleges.district,
      affiliatedUniversity: colleges.affiliatedUniversity,
      verificationStatus: colleges.verificationStatus,
      savedAt: studentShortlists.createdAt,
    })
    .from(studentShortlists)
    .innerJoin(colleges, eq(colleges.id, studentShortlists.collegeId))
    .where(and(eq(studentShortlists.userId, req.user!.id), eq(colleges.isActive, true)))
    .orderBy(desc(studentShortlists.createdAt));

  res.json({
    collegeIds: rows.map((r) => r.collegeId),
    colleges: rows,
  });
});

studentRouter.post('/student/shortlists/:collegeId', async (req, res) => {
  const collegeId = Number(req.params.collegeId);
  if (!Number.isInteger(collegeId) || collegeId <= 0) {
    return res.status(400).json({ error: 'Invalid college ID' });
  }

  const [college] = await db
    .select({ id: colleges.id, name: colleges.name })
    .from(colleges)
    .where(and(eq(colleges.id, collegeId), eq(colleges.isActive, true)))
    .limit(1);

  if (!college) {
    return res.status(404).json({ error: 'College record not found' });
  }

  const [existing] = await db
    .select({ id: studentShortlists.id })
    .from(studentShortlists)
    .where(and(eq(studentShortlists.userId, req.user!.id), eq(studentShortlists.collegeId, collegeId)))
    .limit(1);

  let saved = false;
  if (existing) {
    await db.delete(studentShortlists).where(eq(studentShortlists.id, existing.id));
  } else {
    await db.insert(studentShortlists).values({ userId: req.user!.id, collegeId });
    saved = true;
  }

  const allSaved = await db
    .select({ collegeId: studentShortlists.collegeId })
    .from(studentShortlists)
    .where(eq(studentShortlists.userId, req.user!.id))
    .orderBy(desc(studentShortlists.createdAt));

  res.json({
    saved,
    collegeIds: allSaved.map((r) => r.collegeId),
    message: saved ? `Saved ${college.name} to your shortlist.` : `Removed ${college.name} from your shortlist.`,
  });
});
