import { and, count, desc, eq, ilike, inArray, notInArray, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  collegeCorrectionRequests,
  collegeIntegrations,
  collegeLogos,
  collegePhotos,
  colleges,
  feePayments,
  feeStructures,
  grievanceAttachments,
  grievanceHistory,
  grievances,
  notices,
  posters,
  studentFeeAccounts,
  studentProfiles,
  users,
  verificationRequests,
} from '../../src/db/schema.ts';
import { writeAuditLog } from '../../src/db/users.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { collegeLogoUpload, collegePhotoUpload, posterImageUpload } from '../middleware/upload.ts';
import { GRIEVANCE_STATUSES } from '../services/aiService.ts';
import { createNotification, notifyCollegeStudents } from '../services/notificationService.ts';

export const collegeAdminRouter = Router();

collegeAdminRouter.use('/college-admin', requireAuth, requireRole('college_admin'), (req, res, next) => {
  if (!req.user?.collegeId) {
    return res.status(403).json({ error: 'No college assignment found for this College Administrator account.' });
  }
  return next();
});

collegeAdminRouter.get('/college-admin/dashboard', async (req, res) => {
  const collegeId = req.user!.collegeId!;

  const [
    [college],
    [{ value: totalStudents }],
    [{ value: verifiedStudents }],
    [{ value: pendingVerifications }],
    [{ value: openGrievances }],
    [{ value: totalCollectedFees }],
    [{ value: totalAssessedFees }],
  ] = await Promise.all([
    db.select().from(colleges).where(eq(colleges.id, collegeId)).limit(1),
    db.select({ value: count() }).from(studentProfiles).where(eq(studentProfiles.collegeId, collegeId)),
    db
      .select({ value: count() })
      .from(studentProfiles)
      .where(and(eq(studentProfiles.collegeId, collegeId), eq(studentProfiles.verificationStatus, 'Verified'))),
    db
      .select({ value: count() })
      .from(verificationRequests)
      .where(and(eq(verificationRequests.collegeId, collegeId), eq(verificationRequests.status, 'Pending'))),
    db
      .select({ value: count() })
      .from(grievances)
      .where(and(eq(grievances.collegeId, collegeId), notInArray(grievances.status, ['Resolved', 'Closed']))),
    db
      .select({ value: sql<number>`coalesce(sum(${feePayments.amount}), 0)::double precision` })
      .from(feePayments)
      .where(
        and(
          eq(feePayments.collegeId, collegeId),
          inArray(feePayments.verificationStatus, ['verified_by_college', 'gateway_confirmed'])
        )
      ),
    db
      .select({ value: sql<number>`coalesce(sum(${studentFeeAccounts.totalApplicableFee}), 0)::double precision` })
      .from(studentFeeAccounts)
      .where(eq(studentFeeAccounts.collegeId, collegeId)),
  ]);

  res.json({
    college: college || null,
    metrics: {
      totalStudents,
      verifiedStudents,
      pendingVerifications,
      openGrievances,
      totalAssessedFees,
      totalCollectedFees,
      totalPendingFees: Math.max(0, totalAssessedFees - totalCollectedFees),
    },
  });
});

collegeAdminRouter.get('/college-admin/students', async (req, res) => {
  const collegeId = req.user!.collegeId!;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';

  const conditions = [eq(studentProfiles.collegeId, collegeId)];
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        ilike(users.fullName, term),
        ilike(studentProfiles.enrollmentNumber, term),
        ilike(users.email, term)
      )!
    );
  }
  if (status) {
    conditions.push(eq(studentProfiles.verificationStatus, status));
  }

  const students = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      mobile: users.mobile,
      createdAt: users.createdAt,
      enrollmentNumber: studentProfiles.enrollmentNumber,
      course: studentProfiles.course,
      department: studentProfiles.department,
      academicYear: studentProfiles.academicYear,
      admissionYear: studentProfiles.admissionYear,
      currentSemester: studentProfiles.currentSemester,
      verificationStatus: studentProfiles.verificationStatus,
      verificationMethod: studentProfiles.verificationMethod,
      officialCollegeEmail: studentProfiles.officialCollegeEmail,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .where(and(...conditions))
    .orderBy(desc(users.createdAt));

  res.json({ students });
});

collegeAdminRouter.post('/college-admin/students/verify-roster', async (req, res) => {
  const collegeId = req.user!.collegeId!;
  const schema = z.object({
    enrollmentNumbers: z.array(z.string().trim().min(3).max(40)).min(1).max(500),
    verificationReference: z.string().trim().min(3).max(150),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid roster verification payload' });
  }

  const normalized = Array.from(new Set(parsed.data.enrollmentNumbers.map((e) => e.toUpperCase())));
  const matched = await db
    .select({ userId: studentProfiles.userId, enrollmentNumber: studentProfiles.enrollmentNumber })
    .from(studentProfiles)
    .where(and(eq(studentProfiles.collegeId, collegeId), inArray(studentProfiles.enrollmentNumber, normalized)));

  if (matched.length > 0) {
    await db
      .update(studentProfiles)
      .set({
        verificationStatus: 'Verified',
        verificationMethod: 'erp_roster_batch',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(studentProfiles.collegeId, collegeId),
          inArray(
            studentProfiles.userId,
            matched.map((m) => m.userId)
          )
        )
      );
  }

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'college_admin',
    collegeId,
    action: 'COLLEGE_ROSTER_BATCH_VERIFIED',
    entityType: 'student_profile',
    details: {
      submittedCount: normalized.length,
      verifiedCount: matched.length,
      reference: parsed.data.verificationReference,
    },
    ipAddress: req.ip,
  });

  res.json({
    submittedCount: normalized.length,
    verifiedCount: matched.length,
    matchedEnrollments: matched.map((m) => m.enrollmentNumber),
    message: `Verified ${matched.length} matching enrolled student account(s) for your college.`,
  });
});

collegeAdminRouter.get('/college-admin/verifications', async (req, res) => {
  const collegeId = req.user!.collegeId!;

  const requests = await db
    .select({
      id: verificationRequests.id,
      studentUserId: verificationRequests.studentUserId,
      collegeId: verificationRequests.collegeId,
      method: verificationRequests.method,
      evidenceOriginalName: verificationRequests.evidenceOriginalName,
      evidenceMimeType: verificationRequests.evidenceMimeType,
      notes: verificationRequests.notes,
      status: verificationRequests.status,
      decisionReason: verificationRequests.decisionReason,
      reviewedAt: verificationRequests.reviewedAt,
      createdAt: verificationRequests.createdAt,
      studentName: users.fullName,
      studentEmail: users.email,
      studentMobile: users.mobile,
      enrollmentNumber: studentProfiles.enrollmentNumber,
      course: studentProfiles.course,
      department: studentProfiles.department,
      academicYear: studentProfiles.academicYear,
      officialCollegeEmail: studentProfiles.officialCollegeEmail,
    })
    .from(verificationRequests)
    .innerJoin(users, eq(users.id, verificationRequests.studentUserId))
    .innerJoin(studentProfiles, eq(studentProfiles.userId, verificationRequests.studentUserId))
    .where(eq(verificationRequests.collegeId, collegeId))
    .orderBy(sql`case when ${verificationRequests.status} = 'Pending' then 0 else 1 end`, desc(verificationRequests.createdAt));

  res.json({ requests });
});

collegeAdminRouter.post('/college-admin/verifications/:id/decision', async (req, res) => {
  const requestId = Number(req.params.id);
  const schema = z.object({
    decision: z.enum(['Verified', 'Rejected', 'Additional evidence required', 'Suspended']),
    reason: z.string().trim().min(5, 'Decision reason is required').max(500),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid verification decision' });
  }

  const collegeId = req.user!.collegeId!;
  const [requestRow] = await db
    .select({ id: verificationRequests.id, studentUserId: verificationRequests.studentUserId })
    .from(verificationRequests)
    .where(and(eq(verificationRequests.id, requestId), eq(verificationRequests.collegeId, collegeId)))
    .limit(1);

  if (!requestRow) {
    return res.status(404).json({ error: 'Verification request not found for your assigned college.' });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(verificationRequests)
      .set({
        status: parsed.data.decision,
        reviewerUserId: req.user!.id,
        decisionReason: parsed.data.reason,
        reviewedAt: new Date(),
      })
      .where(and(eq(verificationRequests.id, requestId), eq(verificationRequests.collegeId, collegeId)));

    await tx
      .update(studentProfiles)
      .set({
        verificationStatus: parsed.data.decision,
        updatedAt: new Date(),
      })
      .where(and(eq(studentProfiles.userId, requestRow.studentUserId), eq(studentProfiles.collegeId, collegeId)));
  });

  await createNotification({
    userId: requestRow.studentUserId,
    type: 'verification_update',
    title: `College Verification Status: ${parsed.data.decision}`,
    message: `Reviewer notes: ${parsed.data.reason}`,
    linkPath: '/dashboard',
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'college_admin',
    collegeId,
    action: 'STUDENT_VERIFICATION_DECISION',
    entityType: 'verification_request',
    entityId: requestId,
    details: { decision: parsed.data.decision, studentUserId: requestRow.studentUserId },
    ipAddress: req.ip,
  });

  res.json({ message: `Verification updated to ${parsed.data.decision}.` });
});

collegeAdminRouter.get('/college-admin/fee-structures', async (req, res) => {
  const structures = await db
    .select()
    .from(feeStructures)
    .where(eq(feeStructures.collegeId, req.user!.collegeId!))
    .orderBy(desc(feeStructures.academicYear), feeStructures.course);
  res.json({ feeStructures: structures });
});

collegeAdminRouter.post('/college-admin/fee-structures', async (req, res) => {
  const schema = z.object({
    course: z.string().trim().min(2).max(100),
    academicYear: z.string().trim().min(2).max(30),
    semester: z.string().trim().min(1).max(30).default('Annual'),
    tuitionFee: z.coerce.number().min(0),
    examinationFee: z.coerce.number().min(0),
    laboratoryFee: z.coerce.number().min(0),
    hostelFee: z.coerce.number().min(0),
    transportFee: z.coerce.number().min(0),
    otherAuthorisedFee: z.coerce.number().min(0),
    dueDate: z.string().trim().max(30).optional(),
    sourceReference: z.string().trim().min(3, 'Official fee order/circular reference is required').max(200),
    applyToMatchingStudents: z.boolean().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid fee structure data' });
  }

  const d = parsed.data;
  const collegeId = req.user!.collegeId!;
  const total =
    d.tuitionFee + d.examinationFee + d.laboratoryFee + d.hostelFee + d.transportFee + d.otherAuthorisedFee;

  const out = await db.transaction(async (tx) => {
    const [structure] = await tx
      .insert(feeStructures)
      .values({
        collegeId,
        course: d.course,
        academicYear: d.academicYear,
        semester: d.semester,
        tuitionFee: d.tuitionFee,
        examinationFee: d.examinationFee,
        laboratoryFee: d.laboratoryFee,
        hostelFee: d.hostelFee,
        transportFee: d.transportFee,
        otherAuthorisedFee: d.otherAuthorisedFee,
        dueDate: d.dueDate || null,
        sourceReference: d.sourceReference,
        createdBy: req.user!.id,
      })
      .onConflictDoUpdate({
        target: [feeStructures.collegeId, feeStructures.course, feeStructures.academicYear, feeStructures.semester],
        set: {
          tuitionFee: d.tuitionFee,
          examinationFee: d.examinationFee,
          laboratoryFee: d.laboratoryFee,
          hostelFee: d.hostelFee,
          transportFee: d.transportFee,
          otherAuthorisedFee: d.otherAuthorisedFee,
          dueDate: d.dueDate || null,
          sourceReference: d.sourceReference,
          updatedAt: new Date(),
        },
      })
      .returning({ id: feeStructures.id });

    let syncedStudents = 0;
    if (d.applyToMatchingStudents) {
      const students = await tx
        .select({ userId: studentProfiles.userId })
        .from(studentProfiles)
        .where(
          and(
            eq(studentProfiles.collegeId, collegeId),
            ilike(studentProfiles.course, d.course),
            ilike(studentProfiles.academicYear, d.academicYear)
          )
        );

      for (const s of students) {
        await tx
          .insert(studentFeeAccounts)
          .values({
            studentUserId: s.userId,
            collegeId,
            feeStructureId: structure.id,
            academicYear: d.academicYear,
            tuitionFee: d.tuitionFee,
            examinationFee: d.examinationFee,
            laboratoryFee: d.laboratoryFee,
            hostelFee: d.hostelFee,
            transportFee: d.transportFee,
            otherAuthorisedFee: d.otherAuthorisedFee,
            totalApplicableFee: total,
            dueDate: d.dueDate || null,
            updatedBy: req.user!.id,
          })
          .onConflictDoUpdate({
            target: [studentFeeAccounts.studentUserId, studentFeeAccounts.academicYear],
            set: {
              feeStructureId: structure.id,
              tuitionFee: d.tuitionFee,
              examinationFee: d.examinationFee,
              laboratoryFee: d.laboratoryFee,
              hostelFee: d.hostelFee,
              transportFee: d.transportFee,
              otherAuthorisedFee: d.otherAuthorisedFee,
              totalApplicableFee: total,
              dueDate: d.dueDate || null,
              updatedBy: req.user!.id,
              updatedAt: new Date(),
            },
          });
        syncedStudents++;
      }
    }

    return { structureId: structure.id, syncedStudents };
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'college_admin',
    collegeId,
    action: 'FEE_STRUCTURE_SAVED',
    entityType: 'fee_structure',
    entityId: out.structureId,
    details: { course: d.course, academicYear: d.academicYear, semester: d.semester, total, syncedStudents: out.syncedStudents },
    ipAddress: req.ip,
  });

  res.status(201).json({
    message: `Authorised fee structure saved (Total: Rs. ${total.toLocaleString('en-IN')}). Linked to ${out.syncedStudents} matching student account(s).`,
    ...out,
  });
});

collegeAdminRouter.get('/college-admin/fee-accounts', async (req, res) => {
  const collegeId = req.user!.collegeId!;

  const accounts = await db
    .select({
      id: studentFeeAccounts.id,
      studentUserId: studentFeeAccounts.studentUserId,
      collegeId: studentFeeAccounts.collegeId,
      academicYear: studentFeeAccounts.academicYear,
      totalApplicableFee: studentFeeAccounts.totalApplicableFee,
      dueDate: studentFeeAccounts.dueDate,
      updatedAt: studentFeeAccounts.updatedAt,
      studentName: users.fullName,
      enrollmentNumber: studentProfiles.enrollmentNumber,
      course: studentProfiles.course,
      amountPaid: sql<number>`coalesce((
        select sum(fp.amount) from fee_payments fp
        where fp.student_fee_account_id = ${studentFeeAccounts.id}
        and fp.verification_status in ('verified_by_college', 'gateway_confirmed')
      ), 0)::double precision`,
    })
    .from(studentFeeAccounts)
    .innerJoin(users, eq(users.id, studentFeeAccounts.studentUserId))
    .innerJoin(studentProfiles, eq(studentProfiles.userId, studentFeeAccounts.studentUserId))
    .where(eq(studentFeeAccounts.collegeId, collegeId))
    .orderBy(desc(studentFeeAccounts.updatedAt));

  res.json({ accounts });
});

collegeAdminRouter.post('/college-admin/fee-accounts/:accountId/payments', async (req, res) => {
  const accountId = Number(req.params.accountId);
  const schema = z.object({
    amount: z.coerce.number().positive('Payment amount must be positive'),
    paymentMode: z.enum(['College Challan', 'Bank NEFT/RTGS', 'Scholarship Reimbursement']),
    receiptNumber: z.string().trim().min(3, 'Official receipt/challan number required').max(60),
    providerReference: z.string().trim().max(100).optional(),
    paidAt: z.string().trim().min(4),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payment record' });
  }

  const collegeId = req.user!.collegeId!;
  const [account] = await db
    .select({
      id: studentFeeAccounts.id,
      studentUserId: studentFeeAccounts.studentUserId,
      academicYear: studentFeeAccounts.academicYear,
    })
    .from(studentFeeAccounts)
    .where(and(eq(studentFeeAccounts.id, accountId), eq(studentFeeAccounts.collegeId, collegeId)))
    .limit(1);

  if (!account) {
    return res.status(404).json({ error: 'Student fee account not found for your college.' });
  }

  const [existingReceipt] = await db
    .select({ id: feePayments.id })
    .from(feePayments)
    .where(eq(feePayments.receiptNumber, parsed.data.receiptNumber))
    .limit(1);

  if (existingReceipt) {
    return res.status(409).json({ error: 'A payment with this official receipt number is already recorded.' });
  }

  const [payment] = await db
    .insert(feePayments)
    .values({
      studentFeeAccountId: account.id,
      studentUserId: account.studentUserId,
      collegeId,
      amount: parsed.data.amount,
      paymentMode: parsed.data.paymentMode,
      receiptNumber: parsed.data.receiptNumber,
      providerReference: parsed.data.providerReference || null,
      verificationStatus: 'verified_by_college',
      recordedBy: req.user!.id,
      paidAt: parsed.data.paidAt,
    })
    .returning({ id: feePayments.id });

  await createNotification({
    userId: account.studentUserId,
    type: 'fee_reminder',
    title: `Fee Receipt Recorded: ${parsed.data.receiptNumber}`,
    message: `A verified payment of Rs. ${parsed.data.amount.toLocaleString('en-IN')} (${parsed.data.paymentMode}) has been posted to your ${account.academicYear} ledger.`,
    linkPath: '/dashboard',
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'college_admin',
    collegeId,
    action: 'FEE_PAYMENT_RECORDED',
    entityType: 'fee_payment',
    entityId: payment.id,
    details: { amount: parsed.data.amount, receiptNumber: parsed.data.receiptNumber },
    ipAddress: req.ip,
  });

  res.status(201).json({ message: 'Verified fee payment recorded successfully.' });
});

collegeAdminRouter.get('/college-admin/grievances', async (req, res) => {
  const collegeId = req.user!.collegeId!;

  const rows = await db
    .select({
      id: grievances.id,
      referenceNumber: grievances.referenceNumber,
      category: grievances.category,
      subject: grievances.subject,
      description: grievances.description,
      contactPhone: grievances.contactPhone,
      contactEmail: grievances.contactEmail,
      status: grievances.status,
      aiSuggestedCategory: grievances.aiSuggestedCategory,
      aiSummary: grievances.aiSummary,
      aiUrgency: grievances.aiUrgency,
      aiMissingInfo: grievances.aiMissingInfo,
      aiPossibleDuplicateRef: grievances.aiPossibleDuplicateRef,
      aiDraftResponse: grievances.aiDraftResponse,
      aiProviderUsed: grievances.aiProviderUsed,
      escalatedToState: grievances.escalatedToState,
      studentFeedback: grievances.studentFeedback,
      createdAt: grievances.createdAt,
      updatedAt: grievances.updatedAt,
      studentName: users.fullName,
      enrollmentNumber: studentProfiles.enrollmentNumber,
      course: studentProfiles.course,
      department: studentProfiles.department,
    })
    .from(grievances)
    .innerJoin(users, eq(users.id, grievances.studentUserId))
    .innerJoin(studentProfiles, eq(studentProfiles.userId, grievances.studentUserId))
    .where(eq(grievances.collegeId, collegeId))
    .orderBy(sql`case when ${grievances.status} in ('Submitted', 'Escalated', 'Reopened') then 0 else 1 end`, desc(grievances.createdAt));

  const grvIds = rows.map((r) => r.id);
  const attMap = new Map<number, Array<{ id: number; originalName: string; mimeType: string }>>();
  if (grvIds.length > 0) {
    const atts = await db
      .select({
        id: grievanceAttachments.id,
        grievanceId: grievanceAttachments.grievanceId,
        originalName: grievanceAttachments.originalName,
        mimeType: grievanceAttachments.mimeType,
      })
      .from(grievanceAttachments)
      .where(inArray(grievanceAttachments.grievanceId, grvIds));
    for (const a of atts) {
      const list = attMap.get(a.grievanceId) || [];
      list.push({ id: a.id, originalName: a.originalName, mimeType: a.mimeType });
      attMap.set(a.grievanceId, list);
    }
  }

  res.json({
    grievances: rows.map((r) => ({
      ...r,
      attachments: attMap.get(r.id) || [],
    })),
  });
});

collegeAdminRouter.post('/college-admin/grievances/:id/status', async (req, res) => {
  const grievanceId = Number(req.params.id);
  const schema = z.object({
    status: z.enum(GRIEVANCE_STATUSES),
    comment: z.string().trim().min(5, 'Staff response note is required').max(1000),
    isInternal: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid status update' });
  }

  const collegeId = req.user!.collegeId!;
  const [grievance] = await db
    .select({
      id: grievances.id,
      status: grievances.status,
      studentUserId: grievances.studentUserId,
      referenceNumber: grievances.referenceNumber,
      escalatedToState: grievances.escalatedToState,
    })
    .from(grievances)
    .where(and(eq(grievances.id, grievanceId), eq(grievances.collegeId, collegeId)))
    .limit(1);

  if (!grievance) {
    return res.status(404).json({ error: 'Grievance not found for your assigned college.' });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(grievances)
      .set({
        status: parsed.data.status,
        assignedTo: req.user!.id,
        escalatedToState: parsed.data.status === 'Escalated' ? true : grievance.escalatedToState,
        updatedAt: new Date(),
      })
      .where(and(eq(grievances.id, grievanceId), eq(grievances.collegeId, collegeId)));

    await tx.insert(grievanceHistory).values({
      grievanceId,
      actorUserId: req.user!.id,
      actorRole: 'college_admin',
      previousStatus: grievance.status,
      newStatus: parsed.data.status,
      comment: parsed.data.comment,
      isInternal: Boolean(parsed.data.isInternal),
    });
  });

  if (!parsed.data.isInternal) {
    await createNotification({
      userId: grievance.studentUserId,
      type: 'grievance_update',
      title: `Grievance ${grievance.referenceNumber}: ${parsed.data.status}`,
      message: parsed.data.comment,
      linkPath: '/services',
    });
  }

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'college_admin',
    collegeId,
    action: 'GRIEVANCE_STATUS_UPDATED',
    entityType: 'grievance',
    entityId: grievanceId,
    details: { previousStatus: grievance.status, newStatus: parsed.data.status },
    ipAddress: req.ip,
  });

  res.json({ message: `Grievance updated to ${parsed.data.status}.` });
});

collegeAdminRouter.post('/college-admin/notices', async (req, res) => {
  const schema = z.object({
    category: z.enum(['Announcement', 'Examination', 'Scholarship', 'Fee Reminder']),
    title: z.string().trim().min(5).max(160),
    body: z.string().trim().min(10).max(2000),
    officialUrl: z.string().trim().url().optional().or(z.literal('')),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid notice input' });
  }

  const collegeId = req.user!.collegeId!;
  const [created] = await db
    .insert(notices)
    .values({
      scope: 'college',
      collegeId,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      officialUrl: parsed.data.officialUrl || null,
      publishedBy: req.user!.id,
    })
    .returning({ id: notices.id });

  const notifiedCount = await notifyCollegeStudents(collegeId, {
    type: parsed.data.category === 'Fee Reminder' ? 'fee_reminder' : 'college_announcement',
    title: parsed.data.title,
    message: parsed.data.body.slice(0, 220),
    linkPath: '/dashboard',
  });

  res.status(201).json({
    id: created.id,
    message: `Official college notice published and sent to ${notifiedCount} registered student(s).`,
  });
});

collegeAdminRouter.post('/college-admin/correction-request', async (req, res) => {
  const schema = z.object({
    website: z.string().trim().url().optional().or(z.literal('')),
    contactEmail: z.string().trim().email().optional().or(z.literal('')),
    contactPhone: z.string().trim().max(30).optional(),
    address: z.string().trim().min(5).max(300).optional(),
    accreditation: z.string().trim().max(200).optional(),
    justification: z.string().trim().min(10, 'Justification / official circular source required').max(500),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid correction request' });
  }

  const { justification, ...changes } = parsed.data;
  const [created] = await db
    .insert(collegeCorrectionRequests)
    .values({
      collegeId: req.user!.collegeId!,
      requestedBy: req.user!.id,
      proposedChangesJson: JSON.stringify(changes),
      justification,
      status: 'pending',
    })
    .returning({ id: collegeCorrectionRequests.id });

  res.status(201).json({
    id: created.id,
    message: 'Profile correction request submitted for State Administrator approval.',
  });
});

collegeAdminRouter.get('/college-admin/photos', async (req, res) => {
  const photos = await db
    .select()
    .from(collegePhotos)
    .where(eq(collegePhotos.collegeId, req.user!.collegeId!))
    .orderBy(desc(collegePhotos.createdAt));
  res.json({ photos });
});

collegeAdminRouter.post('/college-admin/photos', collegePhotoUpload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please select a valid JPEG, PNG, or WebP photograph (max 5 MB).' });
  }
  const category = typeof req.body?.category === 'string' && req.body.category.trim() ? req.body.category.trim() : 'Campus';
  const caption = typeof req.body?.caption === 'string' ? req.body.caption.trim() : '';
  const sourceAttribution =
    typeof req.body?.sourceAttribution === 'string' ? req.body.sourceAttribution.trim() : '';
  const permissionReference =
    typeof req.body?.permissionReference === 'string' ? req.body.permissionReference.trim() : '';

  if (caption.length < 5 || sourceAttribution.length < 3 || permissionReference.length < 3) {
    return res.status(400).json({
      error: 'Caption, official source attribution, and written permission reference are all mandatory.',
    });
  }

  const [created] = await db
    .insert(collegePhotos)
    .values({
      collegeId: req.user!.collegeId!,
      category,
      filePath: req.file.path,
      caption,
      sourceAttribution,
      permissionReference,
      uploadedBy: req.user!.id,
      approvalStatus: 'pending',
    })
    .returning({ id: collegePhotos.id });

  res.status(201).json({
    id: created.id,
    status: 'pending',
    message: 'Photograph uploaded cleanly. It will remain private until approved by a State Administrator.',
  });
});

collegeAdminRouter.get('/college-admin/logos', async (req, res) => {
  const logos = await db
    .select()
    .from(collegeLogos)
    .where(eq(collegeLogos.collegeId, req.user!.collegeId!))
    .orderBy(desc(collegeLogos.createdAt));
  res.json({
    logos: logos.map((l) => ({
      ...l,
      hasFile: Boolean(l.filePath),
      filePath: undefined,
    })),
  });
});

collegeAdminRouter.post('/college-admin/logos', collegeLogoUpload.single('logo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a clean official PNG, JPEG, or WebP logo file (max 5 MB).' });
  }
  const sourceAttribution =
    typeof req.body?.sourceAttribution === 'string' ? req.body.sourceAttribution.trim() : '';
  const permissionReference =
    typeof req.body?.permissionReference === 'string' ? req.body.permissionReference.trim() : '';
  const verificationNote =
    typeof req.body?.verificationNote === 'string' ? req.body.verificationNote.trim() : '';
  const sourceUrl = typeof req.body?.sourceUrl === 'string' ? req.body.sourceUrl.trim() : '';

  if (sourceAttribution.length < 3 || permissionReference.length < 3) {
    return res.status(400).json({
      error: 'Official source attribution and written institutional permission reference are mandatory.',
    });
  }

  const collegeId = req.user!.collegeId!;
  const [created] = await db
    .insert(collegeLogos)
    .values({
      collegeId,
      filePath: req.file.path,
      sourceUrl: sourceUrl || null,
      sourceAttribution,
      permissionReference,
      verificationNote: verificationNote || null,
      uploadedBy: req.user!.id,
      approvalStatus: 'pending',
    })
    .returning({ id: collegeLogos.id });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'college_admin',
    collegeId,
    action: 'COLLEGE_LOGO_UPLOADED',
    entityType: 'college_logo',
    entityId: created.id,
    details: { sourceAttribution, permissionReference },
    ipAddress: req.ip,
  });

  res.status(201).json({
    id: created.id,
    status: 'pending',
    message: 'Official college logo submitted cleanly. It remains private until approved by a State Administrator.',
  });
});

collegeAdminRouter.get('/college-admin/posters', async (req, res) => {
  const rows = await db
    .select()
    .from(posters)
    .where(eq(posters.collegeId, req.user!.collegeId!))
    .orderBy(desc(posters.createdAt));

  res.json({
    posters: rows.map((p) => ({
      ...p,
      hasImage: Boolean(p.imageFilePath),
      imageFilePath: undefined,
    })),
  });
});

collegeAdminRouter.post('/college-admin/posters', posterImageUpload.single('image'), async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(5).max(160),
    subtitle: z.string().trim().min(4).max(180),
    category: z.string().trim().min(3).max(80),
    summary: z.string().trim().min(10).max(800),
    ctaLabel: z.string().trim().min(2).max(80).default('View Notice'),
    ctaUrl: z.string().trim().min(1).max(300).default('/colleges'),
    sourceAttribution: z.string().trim().min(3).max(200),
    authorisationRef: z.string().trim().min(3).max(150),
    publishDate: z.string().trim().max(20).optional(),
    expiryDate: z.string().trim().max(20).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid poster submission data' });
  }

  const d = parsed.data;
  const collegeId = req.user!.collegeId!;
  const [created] = await db
    .insert(posters)
    .values({
      title: d.title,
      subtitle: d.subtitle,
      category: d.category,
      summary: d.summary,
      ctaLabel: d.ctaLabel,
      ctaUrl: d.ctaUrl,
      imageFilePath: req.file?.path || null,
      scope: 'college',
      collegeId,
      sourceAttribution: d.sourceAttribution,
      authorisationRef: d.authorisationRef,
      approvalStatus: 'pending',
      publishDate: d.publishDate || new Date().toISOString().slice(0, 10),
      expiryDate: d.expiryDate || null,
      createdBy: req.user!.id,
    })
    .returning({ id: posters.id });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'college_admin',
    collegeId,
    action: 'COLLEGE_POSTER_SUBMITTED',
    entityType: 'poster',
    entityId: created.id,
    details: { title: d.title, category: d.category },
    ipAddress: req.ip,
  });

  res.status(201).json({
    id: created.id,
    status: 'pending',
    message: 'College announcement poster submitted for State Administrator approval.',
  });
});

collegeAdminRouter.get('/college-admin/reports', async (req, res) => {
  const collegeId = req.user!.collegeId!;

  const [
    [{ value: totalStudents }],
    [{ value: verifiedStudents }],
    [{ value: pendingStudents }],
    [{ value: approvedPhotosCount }],
    [{ value: pendingPhotosCount }],
    [{ value: approvedLogosCount }],
    [{ value: activePostersCount }],
    [{ value: resolvedGrievances }],
    [{ value: escalatedGrievances }],
    [{ value: totalCollectedFees }],
    [{ value: totalAssessedFees }],
  ] = await Promise.all([
    db.select({ value: count() }).from(studentProfiles).where(eq(studentProfiles.collegeId, collegeId)),
    db
      .select({ value: count() })
      .from(studentProfiles)
      .where(and(eq(studentProfiles.collegeId, collegeId), eq(studentProfiles.verificationStatus, 'Verified'))),
    db
      .select({ value: count() })
      .from(studentProfiles)
      .where(and(eq(studentProfiles.collegeId, collegeId), eq(studentProfiles.verificationStatus, 'College verification pending'))),
    db
      .select({ value: count() })
      .from(collegePhotos)
      .where(and(eq(collegePhotos.collegeId, collegeId), eq(collegePhotos.approvalStatus, 'approved'))),
    db
      .select({ value: count() })
      .from(collegePhotos)
      .where(and(eq(collegePhotos.collegeId, collegeId), eq(collegePhotos.approvalStatus, 'pending'))),
    db
      .select({ value: count() })
      .from(collegeLogos)
      .where(and(eq(collegeLogos.collegeId, collegeId), eq(collegeLogos.approvalStatus, 'approved'))),
    db
      .select({ value: count() })
      .from(posters)
      .where(and(eq(posters.collegeId, collegeId), eq(posters.approvalStatus, 'approved'), eq(posters.isArchived, false))),
    db
      .select({ value: count() })
      .from(grievances)
      .where(and(eq(grievances.collegeId, collegeId), inArray(grievances.status, ['Resolved', 'Closed']))),
    db
      .select({ value: count() })
      .from(grievances)
      .where(and(eq(grievances.collegeId, collegeId), eq(grievances.escalatedToState, true))),
    db
      .select({ value: sql<number>`coalesce(sum(${feePayments.amount}), 0)::double precision` })
      .from(feePayments)
      .where(
        and(
          eq(feePayments.collegeId, collegeId),
          inArray(feePayments.verificationStatus, ['verified_by_college', 'gateway_confirmed'])
        )
      ),
    db
      .select({ value: sql<number>`coalesce(sum(${studentFeeAccounts.totalApplicableFee}), 0)::double precision` })
      .from(studentFeeAccounts)
      .where(eq(studentFeeAccounts.collegeId, collegeId)),
  ]);

  res.json({
    report: {
      totalStudents,
      verifiedStudents,
      pendingStudents,
      approvedPhotosCount,
      pendingPhotosCount,
      approvedLogosCount,
      activePostersCount,
      resolvedGrievances,
      escalatedGrievances,
      totalAssessedFees,
      totalCollectedFees,
      totalPendingFees: Math.max(0, totalAssessedFees - totalCollectedFees),
    },
  });
});

collegeAdminRouter.get('/college-admin/integration', async (req, res) => {
  const [integration] = await db
    .select()
    .from(collegeIntegrations)
    .where(eq(collegeIntegrations.collegeId, req.user!.collegeId!))
    .limit(1);
  res.json({ integration: integration || null });
});

collegeAdminRouter.put('/college-admin/integration', async (req, res) => {
  const schema = z.object({
    adapterType: z.enum(['manual_portal', 'rest_readonly', 'csv_authorised_import']),
    endpointUrl: z.string().trim().url().optional().or(z.literal('')),
    writtenAuthorisationRef: z
      .string()
      .trim()
      .min(4, 'Written authorisation reference is required for external ERP connectors')
      .max(150),
    syncCapabilities: z.array(z.string()).default(['student_verification', 'fee_structures']),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid integration configuration' });
  }

  const collegeId = req.user!.collegeId!;
  const status = parsed.data.adapterType === 'manual_portal' ? 'not_configured' : 'authorised_ready';

  await db.transaction(async (tx) => {
    await tx
      .insert(collegeIntegrations)
      .values({
        collegeId,
        adapterType: parsed.data.adapterType,
        endpointUrl: parsed.data.endpointUrl || null,
        readOnly: true,
        writtenAuthorisationRef: parsed.data.writtenAuthorisationRef,
        syncCapabilitiesJson: JSON.stringify(parsed.data.syncCapabilities),
        status,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: collegeIntegrations.collegeId,
        set: {
          adapterType: parsed.data.adapterType,
          endpointUrl: parsed.data.endpointUrl || null,
          readOnly: true,
          writtenAuthorisationRef: parsed.data.writtenAuthorisationRef,
          syncCapabilitiesJson: JSON.stringify(parsed.data.syncCapabilities),
          status,
          updatedAt: new Date(),
        },
      });

    await tx
      .update(colleges)
      .set({
        erpIntegrationType: parsed.data.adapterType,
        erpStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(colleges.id, collegeId));
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'college_admin',
    collegeId,
    action: 'ERP_INTEGRATION_UPDATED',
    entityType: 'college_integration',
    entityId: collegeId,
    details: { adapterType: parsed.data.adapterType, readOnly: true },
    ipAddress: req.ip,
  });

  res.json({ message: 'Read-only integration adapter metadata saved cleanly.' });
});
