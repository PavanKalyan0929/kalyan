import { and, asc, count, desc, eq, ilike, notInArray, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../src/db/index.ts';
import {
  auditLogs,
  collegeCorrectionRequests,
  collegeIntegrations,
  collegeLogos,
  collegePhotos,
  colleges,
  examAdvertisements,
  feePayments,
  feeStructures,
  grievanceHistory,
  grievances,
  notices,
  posters,
  privacyRequests,
  scholarships,
  studentFeeAccounts,
  studentProfiles,
  studentShortlists,
  users,
  verificationRequests,
} from '../../src/db/schema.ts';
import { writeAuditLog } from '../../src/db/users.ts';
import { requireAuth, requireRole } from '../middleware/auth.ts';
import { posterImageUpload } from '../middleware/upload.ts';
import { AP_DISTRICTS } from '../seedData.ts';
import { GRIEVANCE_STATUSES } from '../services/aiService.ts';
import { createNotification } from '../services/notificationService.ts';

export const stateAdminRouter = Router();

stateAdminRouter.use('/state-admin', requireAuth, requireRole('state_admin'));

stateAdminRouter.get('/state-admin/dashboard', async (_req, res) => {
  const [
    [{ value: totalColleges }],
    [{ value: verifiedColleges }],
    [{ value: pendingColleges }],
    [{ value: totalStudents }],
    [{ value: verifiedStudents }],
    [{ value: totalCollegeAdmins }],
    [{ value: escalatedGrievances }],
    [{ value: openGrievances }],
    [{ value: pendingPhotoApprovals }],
    [{ value: pendingLogoApprovals }],
    [{ value: pendingPosterApprovals }],
    [{ value: pendingCorrections }],
    districtStats,
    grievanceByStatus,
  ] = await Promise.all([
    db.select({ value: count() }).from(colleges),
    db.select({ value: count() }).from(colleges).where(eq(colleges.verificationStatus, 'verified')),
    db.select({ value: count() }).from(colleges).where(eq(colleges.verificationStatus, 'pending')),
    db.select({ value: count() }).from(users).where(eq(users.role, 'student')),
    db.select({ value: count() }).from(studentProfiles).where(eq(studentProfiles.verificationStatus, 'Verified')),
    db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, 'college_admin'), eq(users.isActive, true))),
    db
      .select({ value: count() })
      .from(grievances)
      .where(or(eq(grievances.status, 'Escalated'), eq(grievances.escalatedToState, true))),
    db
      .select({ value: count() })
      .from(grievances)
      .where(notInArray(grievances.status, ['Resolved', 'Closed'])),
    db.select({ value: count() }).from(collegePhotos).where(eq(collegePhotos.approvalStatus, 'pending')),
    db.select({ value: count() }).from(collegeLogos).where(eq(collegeLogos.approvalStatus, 'pending')),
    db.select({ value: count() }).from(posters).where(eq(posters.approvalStatus, 'pending')),
    db
      .select({ value: count() })
      .from(collegeCorrectionRequests)
      .where(eq(collegeCorrectionRequests.status, 'pending')),
    db
      .select({
        district: colleges.district,
        total: count(),
        verified: sql<number>`sum(case when ${colleges.verificationStatus} = 'verified' then 1 else 0 end)::int`,
      })
      .from(colleges)
      .groupBy(colleges.district)
      .orderBy(desc(count()), asc(colleges.district)),
    db
      .select({
        status: grievances.status,
        count: count(),
      })
      .from(grievances)
      .groupBy(grievances.status)
      .orderBy(desc(count())),
  ]);

  res.json({
    metrics: {
      totalColleges,
      verifiedColleges,
      pendingColleges,
      totalStudents,
      verifiedStudents,
      totalCollegeAdmins,
      escalatedGrievances,
      openGrievances,
      pendingPhotoApprovals,
      pendingLogoApprovals,
      pendingPosterApprovals,
      pendingCorrections,
    },
    districtStats,
    grievanceByStatus,
  });
});

stateAdminRouter.get('/state-admin/colleges', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const rows = status
    ? await db
        .select()
        .from(colleges)
        .where(eq(colleges.verificationStatus, status))
        .orderBy(desc(colleges.updatedAt), asc(colleges.name))
    : await db.select().from(colleges).orderBy(desc(colleges.updatedAt), asc(colleges.name));

  res.json({ colleges: rows });
});

stateAdminRouter.post('/state-admin/colleges', async (req, res) => {
  const schema = z.object({
    name: z.string().trim().min(3).max(200),
    institutionCode: z.string().trim().max(30).optional().nullable(),
    category: z.string().trim().min(2).max(50),
    management: z.string().trim().min(2).max(50),
    district: z.string().trim().min(2).max(80),
    address: z.string().trim().min(5).max(300),
    pinCode: z.string().trim().max(12).optional().nullable(),
    website: z.string().trim().url().optional().or(z.literal('')),
    affiliatedUniversity: z.string().trim().min(3).max(200),
    programmes: z.array(z.string()).default([]),
    engineeringBranches: z.array(z.string()).default([]),
    degreeCourses: z.array(z.string()).default([]),
    accreditation: z.string().trim().max(200).optional().nullable(),
    dataSource: z.string().trim().min(3, 'Official data source attribution is required').max(200),
    sourceUrl: z.string().trim().url().optional().or(z.literal('')),
    officialEmailDomain: z.string().trim().max(120).optional().nullable(),
    verificationStatus: z.enum(['verified', 'pending']).default('verified'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid college data' });
  }

  const d = parsed.data;
  const [duplicate] = await db
    .select({ id: colleges.id, name: colleges.name })
    .from(colleges)
    .where(and(ilike(colleges.name, d.name), ilike(colleges.district, d.district)))
    .limit(1);

  if (duplicate) {
    return res.status(409).json({
      error: `Duplicate institution detected: ${duplicate.name} already exists in ${d.district}.`,
    });
  }

  const [created] = await db
    .insert(colleges)
    .values({
      name: d.name,
      institutionCode: d.institutionCode || null,
      category: d.category,
      management: d.management,
      district: d.district,
      address: d.address,
      pinCode: d.pinCode || null,
      website: d.website || null,
      affiliatedUniversity: d.affiliatedUniversity,
      programmesJson: JSON.stringify(d.programmes),
      engineeringBranchesJson: JSON.stringify(d.engineeringBranches),
      degreeCoursesJson: JSON.stringify(d.degreeCourses),
      accreditation: d.accreditation || null,
      verificationStatus: d.verificationStatus,
      dataSource: d.dataSource,
      sourceUrl: d.sourceUrl || null,
      lastVerifiedAt: d.verificationStatus === 'verified' ? new Date().toISOString().slice(0, 10) : null,
      officialEmailDomain: d.officialEmailDomain || null,
    })
    .returning({ id: colleges.id });

  await db
    .insert(collegeIntegrations)
    .values({
      collegeId: created.id,
      adapterType: 'manual_portal',
      readOnly: true,
      status: 'not_configured',
    })
    .onConflictDoNothing();

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: created.id,
    action: 'COLLEGE_CREATED',
    entityType: 'college',
    entityId: created.id,
    details: { name: d.name, district: d.district },
    ipAddress: req.ip,
  });

  res.status(201).json({ id: created.id, message: 'College added to directory.' });
});

stateAdminRouter.patch('/state-admin/colleges/:id/verify', async (req, res) => {
  const collegeId = Number(req.params.id);
  const schema = z.object({
    verificationStatus: z.enum(['verified', 'pending', 'rejected']),
    institutionCode: z.string().trim().max(30).optional().nullable(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid verification update' });
  }

  const [existing] = await db
    .select({ id: colleges.id, institutionCode: colleges.institutionCode, isActive: colleges.isActive })
    .from(colleges)
    .where(eq(colleges.id, collegeId))
    .limit(1);

  if (!existing) {
    return res.status(404).json({ error: 'College not found.' });
  }

  await db
    .update(colleges)
    .set({
      verificationStatus: parsed.data.verificationStatus,
      institutionCode:
        parsed.data.institutionCode !== undefined ? parsed.data.institutionCode || null : existing.institutionCode,
      isActive: parsed.data.isActive !== undefined ? parsed.data.isActive : existing.isActive,
      lastVerifiedAt:
        parsed.data.verificationStatus === 'verified' ? new Date().toISOString().slice(0, 10) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(colleges.id, collegeId));

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId,
    action: 'COLLEGE_VERIFICATION_UPDATED',
    entityType: 'college',
    entityId: collegeId,
    details: { verificationStatus: parsed.data.verificationStatus, isActive: parsed.data.isActive },
    ipAddress: req.ip,
  });

  res.json({ message: `College status updated to ${parsed.data.verificationStatus}.` });
});

stateAdminRouter.post('/state-admin/colleges/import', async (req, res) => {
  const itemSchema = z.object({
    name: z.string().trim().min(3),
    district: z.string().trim().min(2),
    category: z.string().trim().min(2),
    management: z.string().trim().min(2),
    address: z.string().trim().min(3),
    affiliatedUniversity: z.string().trim().min(2),
    institutionCode: z.string().trim().optional().nullable(),
    website: z.string().trim().optional().nullable(),
    dataSource: z.string().trim().min(3),
    sourceUrl: z.string().trim().optional().nullable(),
  });
  const schema = z.object({ records: z.array(itemSchema).min(1).max(200) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid import payload' });
  }

  let inserted = 0;
  let skippedDuplicates = 0;
  const duplicateNames: string[] = [];

  for (const r of parsed.data.records) {
    const [exists] = await db
      .select({ id: colleges.id })
      .from(colleges)
      .where(and(ilike(colleges.name, r.name), ilike(colleges.district, r.district)))
      .limit(1);

    if (exists) {
      skippedDuplicates++;
      duplicateNames.push(`${r.name} (${r.district})`);
      continue;
    }

    const [created] = await db
      .insert(colleges)
      .values({
        name: r.name,
        institutionCode: r.institutionCode || null,
        category: r.category,
        management: r.management,
        district: r.district,
        address: r.address,
        website: r.website || null,
        affiliatedUniversity: r.affiliatedUniversity,
        verificationStatus: 'pending',
        dataSource: r.dataSource,
        sourceUrl: r.sourceUrl || null,
      })
      .returning({ id: colleges.id });

    await db
      .insert(collegeIntegrations)
      .values({
        collegeId: created.id,
        adapterType: 'manual_portal',
        readOnly: true,
        status: 'not_configured',
      })
      .onConflictDoNothing();

    inserted++;
  }

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    action: 'COLLEGES_BULK_IMPORTED',
    entityType: 'college',
    details: { inserted, skippedDuplicates },
    ipAddress: req.ip,
  });

  res.json({ inserted, skippedDuplicates, duplicateNames });
});

stateAdminRouter.get('/state-admin/colleges/export', async (_req, res) => {
  const rows = await db.select().from(colleges).orderBy(asc(colleges.district), asc(colleges.name));
  const header = [
    'ID',
    'Name',
    'Institution Code',
    'Category',
    'Management',
    'District',
    'Affiliated University',
    'Verification Status',
    'Data Source',
    'Website',
  ];
  const csv = [
    header,
    ...rows.map((c) => [
      c.id,
      c.name,
      c.institutionCode || '',
      c.category,
      c.management,
      c.district,
      c.affiliatedUniversity,
      c.verificationStatus,
      c.dataSource,
      c.website || '',
    ]),
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ash-ap-colleges-directory.csv"');
  res.send(csv);
});

stateAdminRouter.post('/state-admin/colleges/merge', async (req, res) => {
  const schema = z.object({
    duplicateCollegeId: z.coerce.number().int().positive(),
    targetCollegeId: z.coerce.number().int().positive(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success || parsed.data.duplicateCollegeId === parsed.data.targetCollegeId) {
    return res.status(400).json({ error: 'Provide two distinct college IDs to merge.' });
  }

  const { duplicateCollegeId, targetCollegeId } = parsed.data;
  const [[dup], [target]] = await Promise.all([
    db.select({ id: colleges.id, name: colleges.name }).from(colleges).where(eq(colleges.id, duplicateCollegeId)).limit(1),
    db.select({ id: colleges.id, name: colleges.name }).from(colleges).where(eq(colleges.id, targetCollegeId)).limit(1),
  ]);

  if (!dup || !target) {
    return res.status(404).json({ error: 'Source or target college record not found.' });
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ collegeId: targetCollegeId }).where(eq(users.collegeId, duplicateCollegeId));
    await tx.update(studentProfiles).set({ collegeId: targetCollegeId }).where(eq(studentProfiles.collegeId, duplicateCollegeId));
    await tx.update(verificationRequests).set({ collegeId: targetCollegeId }).where(eq(verificationRequests.collegeId, duplicateCollegeId));
    await tx.update(grievances).set({ collegeId: targetCollegeId }).where(eq(grievances.collegeId, duplicateCollegeId));
    await tx.update(feeStructures).set({ collegeId: targetCollegeId }).where(eq(feeStructures.collegeId, duplicateCollegeId));
    await tx.update(studentFeeAccounts).set({ collegeId: targetCollegeId }).where(eq(studentFeeAccounts.collegeId, duplicateCollegeId));
    await tx.update(feePayments).set({ collegeId: targetCollegeId }).where(eq(feePayments.collegeId, duplicateCollegeId));
    await tx.update(collegePhotos).set({ collegeId: targetCollegeId }).where(eq(collegePhotos.collegeId, duplicateCollegeId));
    await tx.update(collegeLogos).set({ collegeId: targetCollegeId }).where(eq(collegeLogos.collegeId, duplicateCollegeId));
    await tx.update(posters).set({ collegeId: targetCollegeId }).where(eq(posters.collegeId, duplicateCollegeId));
    await tx.update(notices).set({ collegeId: targetCollegeId }).where(eq(notices.collegeId, duplicateCollegeId));
    await tx.delete(colleges).where(eq(colleges.id, duplicateCollegeId));
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: targetCollegeId,
    action: 'COLLEGE_DUPLICATE_MERGED',
    entityType: 'college',
    entityId: targetCollegeId,
    details: { mergedFromId: duplicateCollegeId, mergedFromName: dup.name, targetName: target.name },
    ipAddress: req.ip,
  });

  res.json({ message: `Merged "${dup.name}" into "${target.name}".` });
});

stateAdminRouter.get('/state-admin/correction-requests', async (_req, res) => {
  const requests = await db
    .select({
      id: collegeCorrectionRequests.id,
      collegeId: collegeCorrectionRequests.collegeId,
      proposedChangesJson: collegeCorrectionRequests.proposedChangesJson,
      justification: collegeCorrectionRequests.justification,
      status: collegeCorrectionRequests.status,
      reviewNotes: collegeCorrectionRequests.reviewNotes,
      createdAt: collegeCorrectionRequests.createdAt,
      reviewedAt: collegeCorrectionRequests.reviewedAt,
      collegeName: colleges.name,
      district: colleges.district,
      requestedByName: users.fullName,
    })
    .from(collegeCorrectionRequests)
    .innerJoin(colleges, eq(colleges.id, collegeCorrectionRequests.collegeId))
    .innerJoin(users, eq(users.id, collegeCorrectionRequests.requestedBy))
    .orderBy(sql`case when ${collegeCorrectionRequests.status} = 'pending' then 0 else 1 end`, desc(collegeCorrectionRequests.createdAt));

  res.json({ requests });
});

stateAdminRouter.post('/state-admin/correction-requests/:id/decision', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    decision: z.enum(['approved', 'rejected']),
    reviewNotes: z.string().trim().min(3).max(500),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid decision' });
  }

  const [row] = await db
    .select()
    .from(collegeCorrectionRequests)
    .where(eq(collegeCorrectionRequests.id, id))
    .limit(1);
  if (!row) {
    return res.status(404).json({ error: 'Correction request not found.' });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(collegeCorrectionRequests)
      .set({
        status: parsed.data.decision,
        reviewedBy: req.user!.id,
        reviewNotes: parsed.data.reviewNotes,
        reviewedAt: new Date(),
      })
      .where(eq(collegeCorrectionRequests.id, id));

    if (parsed.data.decision === 'approved') {
      const changes = JSON.parse(row.proposedChangesJson) as Record<string, string | undefined>;
      const [col] = await tx.select().from(colleges).where(eq(colleges.id, row.collegeId)).limit(1);
      if (col) {
        await tx
          .update(colleges)
          .set({
            website: changes.website !== undefined ? changes.website || null : col.website,
            contactEmail:
              changes.contactEmail !== undefined
                ? changes.contactEmail || null
                : changes.contact_email !== undefined
                  ? changes.contact_email || null
                  : col.contactEmail,
            contactPhone:
              changes.contactPhone !== undefined
                ? changes.contactPhone || null
                : changes.contact_phone !== undefined
                  ? changes.contact_phone || null
                  : col.contactPhone,
            address: changes.address !== undefined && changes.address ? changes.address : col.address,
            accreditation: changes.accreditation !== undefined ? changes.accreditation || null : col.accreditation,
            updatedAt: new Date(),
          })
          .where(eq(colleges.id, row.collegeId));
      }
    }
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: row.collegeId,
    action: 'COLLEGE_CORRECTION_REVIEWED',
    entityType: 'college_correction_request',
    entityId: id,
    details: { decision: parsed.data.decision },
    ipAddress: req.ip,
  });

  res.json({ message: `Correction request ${parsed.data.decision}.` });
});

stateAdminRouter.get('/state-admin/photos/pending', async (_req, res) => {
  const photos = await db
    .select({
      id: collegePhotos.id,
      collegeId: collegePhotos.collegeId,
      category: collegePhotos.category,
      caption: collegePhotos.caption,
      sourceAttribution: collegePhotos.sourceAttribution,
      permissionReference: collegePhotos.permissionReference,
      approvalStatus: collegePhotos.approvalStatus,
      rejectionReason: collegePhotos.rejectionReason,
      createdAt: collegePhotos.createdAt,
      collegeName: colleges.name,
      district: colleges.district,
      uploaderName: users.fullName,
    })
    .from(collegePhotos)
    .innerJoin(colleges, eq(colleges.id, collegePhotos.collegeId))
    .leftJoin(users, eq(users.id, collegePhotos.uploadedBy))
    .orderBy(sql`case when ${collegePhotos.approvalStatus} = 'pending' then 0 else 1 end`, desc(collegePhotos.createdAt));

  res.json({ photos });
});

stateAdminRouter.post('/state-admin/photos/:id/decision', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    decision: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().trim().max(400).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid photo decision.' });
  }

  const [photo] = await db
    .select({ id: collegePhotos.id, collegeId: collegePhotos.collegeId })
    .from(collegePhotos)
    .where(eq(collegePhotos.id, id))
    .limit(1);

  if (!photo) {
    return res.status(404).json({ error: 'Photograph record not found.' });
  }

  await db
    .update(collegePhotos)
    .set({
      approvalStatus: parsed.data.decision,
      approvedBy: req.user!.id,
      approvedAt: parsed.data.decision === 'approved' ? new Date() : null,
      rejectionReason:
        parsed.data.decision === 'rejected' ? parsed.data.rejectionReason || 'Rejected by State Reviewer' : null,
    })
    .where(eq(collegePhotos.id, id));

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: photo.collegeId,
    action: 'COLLEGE_PHOTO_REVIEWED',
    entityType: 'college_photo',
    entityId: id,
    details: { decision: parsed.data.decision },
    ipAddress: req.ip,
  });

  res.json({ message: `College photograph marked ${parsed.data.decision}.` });
});

stateAdminRouter.get('/state-admin/logos/pending', async (_req, res) => {
  const logos = await db
    .select({
      id: collegeLogos.id,
      collegeId: collegeLogos.collegeId,
      filePath: collegeLogos.filePath,
      sourceUrl: collegeLogos.sourceUrl,
      sourceAttribution: collegeLogos.sourceAttribution,
      permissionReference: collegeLogos.permissionReference,
      verificationNote: collegeLogos.verificationNote,
      approvalStatus: collegeLogos.approvalStatus,
      rejectionReason: collegeLogos.rejectionReason,
      createdAt: collegeLogos.createdAt,
      collegeName: colleges.name,
      district: colleges.district,
      uploaderName: users.fullName,
    })
    .from(collegeLogos)
    .innerJoin(colleges, eq(colleges.id, collegeLogos.collegeId))
    .leftJoin(users, eq(users.id, collegeLogos.uploadedBy))
    .orderBy(sql`case when ${collegeLogos.approvalStatus} = 'pending' then 0 else 1 end`, desc(collegeLogos.createdAt));

  res.json({
    logos: logos.map((l) => ({
      ...l,
      hasFile: Boolean(l.filePath),
      filePath: undefined,
    })),
  });
});

stateAdminRouter.post('/state-admin/logos/:id/decision', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    decision: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().trim().max(400).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid logo review decision.' });
  }

  const [logo] = await db
    .select({ id: collegeLogos.id, collegeId: collegeLogos.collegeId })
    .from(collegeLogos)
    .where(eq(collegeLogos.id, id))
    .limit(1);

  if (!logo) {
    return res.status(404).json({ error: 'Logo record not found.' });
  }

  await db
    .update(collegeLogos)
    .set({
      approvalStatus: parsed.data.decision,
      approvedBy: req.user!.id,
      approvedAt: parsed.data.decision === 'approved' ? new Date() : null,
      rejectionReason:
        parsed.data.decision === 'rejected' ? parsed.data.rejectionReason || 'Rejected by State Reviewer' : null,
    })
    .where(eq(collegeLogos.id, id));

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: logo.collegeId,
    action: 'COLLEGE_LOGO_REVIEWED',
    entityType: 'college_logo',
    entityId: id,
    details: { decision: parsed.data.decision },
    ipAddress: req.ip,
  });

  res.json({ message: `Official college logo marked ${parsed.data.decision}.` });
});

stateAdminRouter.get('/state-admin/posters', async (_req, res) => {
  const rows = await db
    .select({
      id: posters.id,
      slug: posters.slug,
      title: posters.title,
      subtitle: posters.subtitle,
      category: posters.category,
      summary: posters.summary,
      ctaLabel: posters.ctaLabel,
      ctaUrl: posters.ctaUrl,
      imageFilePath: posters.imageFilePath,
      scope: posters.scope,
      district: posters.district,
      collegeId: posters.collegeId,
      collegeName: colleges.name,
      sourceAttribution: posters.sourceAttribution,
      authorisationRef: posters.authorisationRef,
      approvalStatus: posters.approvalStatus,
      publishDate: posters.publishDate,
      expiryDate: posters.expiryDate,
      isArchived: posters.isArchived,
      rejectionReason: posters.rejectionReason,
      createdAt: posters.createdAt,
    })
    .from(posters)
    .leftJoin(colleges, eq(colleges.id, posters.collegeId))
    .orderBy(sql`case when ${posters.approvalStatus} = 'pending' then 0 else 1 end`, desc(posters.id));

  res.json({
    posters: rows.map((p) => ({
      ...p,
      hasImage: Boolean(p.imageFilePath),
      imageFilePath: undefined,
    })),
  });
});

stateAdminRouter.post('/state-admin/posters', posterImageUpload.single('image'), async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(5).max(160),
    subtitle: z.string().trim().min(4).max(180),
    category: z.string().trim().min(3).max(80),
    summary: z.string().trim().min(10).max(800),
    ctaLabel: z.string().trim().min(2).max(80).default('Open Portal'),
    ctaUrl: z.string().trim().min(1).max(300).default('/scholarships'),
    scope: z.enum(['statewide', 'district', 'college']).default('statewide'),
    district: z.string().trim().max(80).optional(),
    collegeId: z.coerce.number().int().positive().optional(),
    sourceAttribution: z.string().trim().min(3).max(200),
    authorisationRef: z.string().trim().min(3).max(150),
    publishDate: z.string().trim().max(20).optional(),
    expiryDate: z.string().trim().max(20).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid poster data' });
  }

  const d = parsed.data;
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
      scope: d.scope,
      district: d.scope === 'district' ? d.district || null : null,
      collegeId: d.scope === 'college' ? d.collegeId || null : null,
      sourceAttribution: d.sourceAttribution,
      authorisationRef: d.authorisationRef,
      approvalStatus: 'approved',
      publishDate: d.publishDate || new Date().toISOString().slice(0, 10),
      expiryDate: d.expiryDate || null,
      isArchived: false,
      createdBy: req.user!.id,
      approvedBy: req.user!.id,
      approvedAt: new Date(),
    })
    .returning({ id: posters.id });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: d.scope === 'college' ? d.collegeId || null : null,
    action: 'STATE_POSTER_PUBLISHED',
    entityType: 'poster',
    entityId: created.id,
    details: { title: d.title, scope: d.scope, category: d.category },
    ipAddress: req.ip,
  });

  res.status(201).json({ id: created.id, message: 'Poster published immediately to public portal.' });
});

stateAdminRouter.post('/state-admin/posters/:id/decision', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    decision: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().trim().max(400).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid poster review decision.' });
  }

  const [existing] = await db.select({ id: posters.id, collegeId: posters.collegeId }).from(posters).where(eq(posters.id, id)).limit(1);
  if (!existing) {
    return res.status(404).json({ error: 'Poster not found.' });
  }

  await db
    .update(posters)
    .set({
      approvalStatus: parsed.data.decision,
      approvedBy: req.user!.id,
      approvedAt: parsed.data.decision === 'approved' ? new Date() : null,
      rejectionReason:
        parsed.data.decision === 'rejected' ? parsed.data.rejectionReason || 'Rejected by State Reviewer' : null,
      updatedAt: new Date(),
    })
    .where(eq(posters.id, id));

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: existing.collegeId,
    action: 'POSTER_REVIEWED',
    entityType: 'poster',
    entityId: id,
    details: { decision: parsed.data.decision },
    ipAddress: req.ip,
  });

  res.json({ message: `Poster marked ${parsed.data.decision}.` });
});

stateAdminRouter.patch('/state-admin/posters/:id/archive', async (req, res) => {
  const id = Number(req.params.id);
  const archived = Boolean(req.body?.isArchived ?? true);

  const [existing] = await db.select({ id: posters.id }).from(posters).where(eq(posters.id, id)).limit(1);
  if (!existing) {
    return res.status(404).json({ error: 'Poster not found.' });
  }

  await db.update(posters).set({ isArchived: archived, updatedAt: new Date() }).where(eq(posters.id, id));
  res.json({ message: archived ? 'Poster archived cleanly.' : 'Poster restored to active status.' });
});

stateAdminRouter.get('/state-admin/data-quality', async (_req, res) => {
  const [
    [{ value: totalColleges }],
    [{ value: verifiedColleges }],
    [{ value: pendingColleges }],
    [{ value: collegesWithPhotos }],
    [{ value: collegesWithLogos }],
    districtRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(colleges).where(eq(colleges.isActive, true)),
    db
      .select({ value: count() })
      .from(colleges)
      .where(and(eq(colleges.isActive, true), eq(colleges.verificationStatus, 'verified'))),
    db
      .select({ value: count() })
      .from(colleges)
      .where(and(eq(colleges.isActive, true), eq(colleges.verificationStatus, 'pending'))),
    db
      .select({ value: sql<number>`count(distinct ${collegePhotos.collegeId})::int` })
      .from(collegePhotos)
      .where(eq(collegePhotos.approvalStatus, 'approved')),
    db
      .select({ value: sql<number>`count(distinct ${collegeLogos.collegeId})::int` })
      .from(collegeLogos)
      .where(eq(collegeLogos.approvalStatus, 'approved')),
    db
      .select({
        district: colleges.district,
        total: count(),
        verified: sql<number>`sum(case when ${colleges.verificationStatus} = 'verified' then 1 else 0 end)::int`,
      })
      .from(colleges)
      .where(eq(colleges.isActive, true))
      .groupBy(colleges.district),
  ]);

  const map = new Map(districtRows.map((d) => [d.district, d]));
  const districtCoverage = AP_DISTRICTS.map((d) => ({
    district: d,
    total: map.get(d)?.total ?? 0,
    verified: map.get(d)?.verified ?? 0,
  }));

  res.json({
    summary: {
      totalColleges,
      verifiedColleges,
      pendingColleges,
      collegesWithPhotos,
      collegesWithLogos,
      totalApDistricts: AP_DISTRICTS.length,
      districtsCovered: districtRows.length,
      districtsMissing: AP_DISTRICTS.length - districtRows.length,
    },
    districtCoverage,
  });
});

stateAdminRouter.get('/state-admin/college-admins', async (_req, res) => {
  const admins = await db
    .select({
      id: users.id,
      uid: users.uid,
      fullName: users.fullName,
      email: users.email,
      mobile: users.mobile,
      collegeId: users.collegeId,
      isActive: users.isActive,
      createdAt: users.createdAt,
      collegeName: colleges.name,
      district: colleges.district,
    })
    .from(users)
    .leftJoin(colleges, eq(colleges.id, users.collegeId))
    .where(eq(users.role, 'college_admin'))
    .orderBy(desc(users.createdAt));

  res.json({ collegeAdmins: admins });
});

stateAdminRouter.post('/state-admin/college-admins', async (req, res) => {
  const schema = z.object({
    fullName: z.string().trim().min(3).max(120),
    email: z.string().trim().email().max(180),
    mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Valid 10-digit Indian mobile number required'),
    collegeId: z.coerce.number().int().positive('Assigned college is required'),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid admin details' });
  }

  const [college] = await db
    .select({ id: colleges.id, name: colleges.name })
    .from(colleges)
    .where(eq(colleges.id, parsed.data.collegeId))
    .limit(1);
  if (!college) {
    return res.status(404).json({ error: 'Assigned college not found.' });
  }

  const email = parsed.data.email.toLowerCase();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing?.role === 'state_admin') {
    return res.status(409).json({ error: 'Cannot reassign a State Administrator account.' });
  }

  let adminId: number;
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        fullName: parsed.data.fullName,
        mobile: parsed.data.mobile,
        role: 'college_admin',
        collegeId: parsed.data.collegeId,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning({ id: users.id });
    adminId = updated.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({
        uid: `pending:${email}`,
        fullName: parsed.data.fullName,
        email,
        mobile: parsed.data.mobile,
        role: 'college_admin',
        collegeId: parsed.data.collegeId,
        emailVerified: true,
        isActive: true,
      })
      .returning({ id: users.id });
    adminId = created.id;
  }

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: parsed.data.collegeId,
    action: 'COLLEGE_ADMIN_PROVISIONED',
    entityType: 'user',
    entityId: adminId,
    details: { email, collegeName: college.name },
    ipAddress: req.ip,
  });

  res.status(201).json({
    id: adminId,
    message: `College Administrator (${email}) provisioned and strictly scoped to ${college.name}. They will be linked automatically when signing in with Google using this email.`,
  });
});

stateAdminRouter.get('/state-admin/grievances', async (req, res) => {
  const escalatedOnly = req.query.escalatedOnly === 'true';

  const baseQuery = db
    .select({
      id: grievances.id,
      referenceNumber: grievances.referenceNumber,
      category: grievances.category,
      subject: grievances.subject,
      description: grievances.description,
      status: grievances.status,
      escalatedToState: grievances.escalatedToState,
      createdAt: grievances.createdAt,
      updatedAt: grievances.updatedAt,
      collegeName: colleges.name,
      district: colleges.district,
      studentName: users.fullName,
      enrollmentNumber: studentProfiles.enrollmentNumber,
    })
    .from(grievances)
    .innerJoin(colleges, eq(colleges.id, grievances.collegeId))
    .innerJoin(users, eq(users.id, grievances.studentUserId))
    .innerJoin(studentProfiles, eq(studentProfiles.userId, grievances.studentUserId));

  const rows = escalatedOnly
    ? await baseQuery
        .where(or(eq(grievances.status, 'Escalated'), eq(grievances.escalatedToState, true)))
        .orderBy(desc(grievances.updatedAt))
    : await baseQuery.orderBy(sql`case when ${grievances.status} = 'Escalated' then 0 else 1 end`, desc(grievances.updatedAt));

  res.json({ grievances: rows });
});

stateAdminRouter.post('/state-admin/grievances/:id/action', async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    status: z.enum(GRIEVANCE_STATUSES),
    comment: z.string().trim().min(5).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid state grievance action' });
  }

  const [grievance] = await db
    .select({
      id: grievances.id,
      status: grievances.status,
      studentUserId: grievances.studentUserId,
      collegeId: grievances.collegeId,
      referenceNumber: grievances.referenceNumber,
    })
    .from(grievances)
    .where(eq(grievances.id, id))
    .limit(1);

  if (!grievance) {
    return res.status(404).json({ error: 'Grievance not found.' });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(grievances)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(grievances.id, id));

    await tx.insert(grievanceHistory).values({
      grievanceId: id,
      actorUserId: req.user!.id,
      actorRole: 'state_admin',
      previousStatus: grievance.status,
      newStatus: parsed.data.status,
      comment: parsed.data.comment,
      isInternal: false,
    });
  });

  await createNotification({
    userId: grievance.studentUserId,
    type: 'grievance_update',
    title: `State Desk Update (${grievance.referenceNumber}): ${parsed.data.status}`,
    message: parsed.data.comment,
    linkPath: '/services',
  });

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    collegeId: grievance.collegeId,
    action: 'STATE_GRIEVANCE_ACTION',
    entityType: 'grievance',
    entityId: id,
    details: { status: parsed.data.status },
    ipAddress: req.ip,
  });

  res.json({ message: 'State-level grievance update recorded.' });
});

stateAdminRouter.post('/state-admin/scholarships', async (req, res) => {
  const schema = z.object({
    title: z.string().trim().min(5).max(200),
    category: z.enum(['Andhra Pradesh State', 'Central Government', 'Private / Corporate']),
    provider: z.string().trim().min(3).max(160),
    meritOrNeed: z.string().trim().min(3).max(80).default('Need & Category Based'),
    eligibility: z.string().trim().min(10).max(1200),
    requiredDocuments: z.array(z.string()).default([]),
    openingDate: z.string().trim().max(80).optional(),
    deadline: z.string().trim().max(120).optional(),
    officialUrl: z.string().trim().url('Valid official URL required'),
    isOfficial: z.boolean().default(true),
    verificationNote: z.string().trim().min(5).max(400),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid scholarship data' });
  }

  const d = parsed.data;
  const [created] = await db
    .insert(scholarships)
    .values({
      title: d.title,
      category: d.category,
      provider: d.provider,
      meritOrNeed: d.meritOrNeed,
      eligibility: d.eligibility,
      requiredDocumentsJson: JSON.stringify(d.requiredDocuments),
      openingDate: d.openingDate || null,
      deadline: d.deadline || null,
      officialUrl: d.officialUrl,
      isOfficial: d.isOfficial,
      verificationNote: d.verificationNote,
      lastVerifiedAt: new Date().toISOString().slice(0, 10),
      isActive: true,
      createdBy: req.user!.id,
    })
    .returning({ id: scholarships.id });

  res.status(201).json({ id: created.id, message: 'Scholarship announcement published.' });
});

stateAdminRouter.post('/state-admin/notices', async (req, res) => {
  const schema = z.object({
    category: z.enum(['Announcement', 'Examination', 'Scholarship', 'Policy']),
    title: z.string().trim().min(5).max(160),
    body: z.string().trim().min(10).max(2000),
    officialUrl: z.string().trim().url().optional().or(z.literal('')),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid statewide notice' });
  }

  const [created] = await db
    .insert(notices)
    .values({
      scope: 'statewide',
      collegeId: null,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      officialUrl: parsed.data.officialUrl || null,
      publishedBy: req.user!.id,
    })
    .returning({ id: notices.id });

  res.status(201).json({ id: created.id, message: 'Statewide notice published.' });
});

stateAdminRouter.get('/state-admin/integrations', async (_req, res) => {
  const rows = await db
    .select({
      id: collegeIntegrations.id,
      collegeId: collegeIntegrations.collegeId,
      adapterType: collegeIntegrations.adapterType,
      endpointUrl: collegeIntegrations.endpointUrl,
      readOnly: collegeIntegrations.readOnly,
      writtenAuthorisationRef: collegeIntegrations.writtenAuthorisationRef,
      status: collegeIntegrations.status,
      lastSyncAt: collegeIntegrations.lastSyncAt,
      lastError: collegeIntegrations.lastError,
      collegeName: colleges.name,
      district: colleges.district,
    })
    .from(collegeIntegrations)
    .innerJoin(colleges, eq(colleges.id, collegeIntegrations.collegeId))
    .orderBy(asc(colleges.name));
  res.json({ integrations: rows });
});

stateAdminRouter.get('/state-admin/privacy-requests', async (_req, res) => {
  const rows = await db
    .select({
      id: privacyRequests.id,
      userId: privacyRequests.userId,
      requestType: privacyRequests.requestType,
      reason: privacyRequests.reason,
      status: privacyRequests.status,
      createdAt: privacyRequests.createdAt,
      userName: users.fullName,
      userEmail: users.email,
    })
    .from(privacyRequests)
    .innerJoin(users, eq(users.id, privacyRequests.userId))
    .orderBy(desc(privacyRequests.createdAt));
  res.json({ requests: rows });
});

stateAdminRouter.get('/state-admin/audit-logs', async (_req, res) => {
  const logs = await db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      actorRole: auditLogs.actorRole,
      collegeId: auditLogs.collegeId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      detailsJson: auditLogs.detailsJson,
      createdAt: auditLogs.createdAt,
      actorName: users.fullName,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .orderBy(desc(auditLogs.id))
    .limit(100);

  res.json({ logs });
});

stateAdminRouter.get('/state-admin/registry-summary', async (_req, res) => {
  const [categoryCounts, [{ value: totalShortlists }], recentStudents] = await Promise.all([
    db
      .select({
        category: colleges.category,
        total: count(),
        verified: sql<number>`sum(case when ${colleges.verificationStatus} = 'verified' then 1 else 0 end)::int`,
      })
      .from(colleges)
      .where(eq(colleges.isActive, true))
      .groupBy(colleges.category)
      .orderBy(desc(count())),
    db.select({ value: count() }).from(studentShortlists),
    db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        createdAt: users.createdAt,
        collegeName: colleges.name,
        district: colleges.district,
        enrollmentNumber: studentProfiles.enrollmentNumber,
        verificationStatus: studentProfiles.verificationStatus,
      })
      .from(users)
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .leftJoin(colleges, eq(colleges.id, users.collegeId))
      .where(eq(users.role, 'student'))
      .orderBy(desc(users.createdAt))
      .limit(50),
  ]);

  res.json({
    categoryCounts,
    totalShortlists,
    recentStudents,
  });
});

stateAdminRouter.post('/state-admin/exam-ads', async (req, res) => {
  const schema = z.object({
    examName: z.string().trim().min(3).max(180),
    category: z.enum([
      'COMPETITIVE EXAM',
      'CAREER GUIDANCE',
      'ENGINEERING',
      'DEGREE',
      'PG EXAMS',
      'GOVT EXAMS',
    ]),
    deadline: z.string().trim().min(3).max(120),
    description: z.string().trim().min(5).max(500),
    applyUrl: z.string().trim().min(1).max(300).default('https://cets.apsche.ap.gov.in'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid exam advertisement data' });
  }

  const d = parsed.data;
  const [created] = await db
    .insert(examAdvertisements)
    .values({
      examName: d.examName,
      category: d.category,
      deadline: d.deadline,
      description: d.description,
      applyUrl: d.applyUrl,
      isActive: true,
      createdBy: req.user!.id,
    })
    .returning();

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    action: 'EXAM_AD_PUBLISHED',
    entityType: 'exam_advertisement',
    entityId: created.id,
    details: { examName: d.examName, category: d.category },
    ipAddress: req.ip,
  });

  res.status(201).json({ ad: created, message: 'Competitive exam & career advisory published live.' });
});

stateAdminRouter.delete('/state-admin/exam-ads/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid advertisement ID.' });
  }

  const [existing] = await db
    .select({ id: examAdvertisements.id, examName: examAdvertisements.examName })
    .from(examAdvertisements)
    .where(eq(examAdvertisements.id, id))
    .limit(1);

  if (!existing) {
    return res.status(404).json({ error: 'Advertisement not found.' });
  }

  await db
    .update(examAdvertisements)
    .set({ isActive: false })
    .where(eq(examAdvertisements.id, id));

  await writeAuditLog({
    actorUserId: req.user!.id,
    actorRole: 'state_admin',
    action: 'EXAM_AD_ARCHIVED',
    entityType: 'exam_advertisement',
    entityId: id,
    details: { examName: existing.examName },
    ipAddress: req.ip,
  });

  res.json({ message: 'Exam advertisement archived.' });
});
