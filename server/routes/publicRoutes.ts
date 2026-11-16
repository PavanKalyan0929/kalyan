import crypto from 'node:crypto';
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { Router } from 'express';
import { db } from '../../src/db/index.ts';
import {
  careerExams,
  collegeLogos,
  collegePhotos,
  colleges,
  examAdvertisements,
  feePayments,
  feeStructures,
  grievances,
  notices,
  nptelTracks,
  posters,
  scholarships,
  users,
} from '../../src/db/schema.ts';
import { writeAuditLog } from '../../src/db/users.ts';
import { config } from '../config.ts';
import { optionalAuth } from '../middleware/auth.ts';
import { AP_DISTRICTS, COMPETITIVE_EXAMS_DETAIL, ensurePublicDataSeeded } from '../seedData.ts';
import { checkOllamaHealth, runAssistantQuery } from '../services/aiService.ts';

export const publicRouter = Router();

function safeJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatCollege(
  row: typeof colleges.$inferSelect,
  approvedPhotoId: number | null = null,
  approvedLogoId: number | null = null
) {
  return {
    id: row.id,
    name: row.name,
    institutionCode: row.institutionCode,
    category: row.category,
    management: row.management,
    district: row.district,
    address: row.address,
    pinCode: row.pinCode,
    website: row.website,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    principalContact: row.principalContact,
    affiliatedUniversity: row.affiliatedUniversity,
    autonomousStatus: row.autonomousStatus,
    programmes: safeJsonArray(row.programmesJson),
    engineeringBranches: safeJsonArray(row.engineeringBranchesJson),
    degreeCourses: safeJsonArray(row.degreeCoursesJson),
    facilities: safeJsonArray(row.facilitiesJson),
    admissionInfo: row.admissionInfo,
    accreditation: row.accreditation,
    academicCalendarNote: row.academicCalendarNote,
    placementSummary: row.placementSummary,
    verificationStatus: row.verificationStatus,
    dataSource: row.dataSource,
    sourceUrl: row.sourceUrl,
    lastVerifiedAt: row.lastVerifiedAt,
    officialEmailDomain: row.officialEmailDomain,
    erpIntegrationType: row.erpIntegrationType,
    erpStatus: row.erpStatus,
    isActive: row.isActive,
    approvedPhotoId,
    approvedLogoId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

publicRouter.get('/health', async (_req, res) => {
  const ollama = await checkOllamaHealth();

  res.json({
    status: 'ok',
    integrations: {
      ollama,
      smsConfigured: config.sms.isConfigured,
      smtpConfigured: config.smtp.isConfigured,
      paymentGatewayConfigured: config.payment.isConfigured,
      paymentProvider: config.payment.provider || null,
      counsellorWhatsappConfigured: Boolean(config.counsellorWhatsappNumber),
    },
    domainConfig: {
      proposedDomain: config.proposedDomain,
    },
    timestamp: new Date().toISOString(),
  });
});

publicRouter.get('/stats/public', async (_req, res) => {
  await ensurePublicDataSeeded();

  const [
    [{ value: totalColleges }],
    [{ value: verifiedColleges }],
    [{ value: districtsCovered }],
    [{ value: activeScholarships }],
    [{ value: registeredStudents }],
    [{ value: resolvedGrievances }],
    [{ value: collegesWithPhotos }],
    [{ value: collegesWithLogos }],
  ] = await Promise.all([
    db.select({ value: count() }).from(colleges).where(eq(colleges.isActive, true)),
    db
      .select({ value: count() })
      .from(colleges)
      .where(and(eq(colleges.isActive, true), eq(colleges.verificationStatus, 'verified'))),
    db
      .select({ value: sql<number>`count(distinct ${colleges.district})::int` })
      .from(colleges)
      .where(eq(colleges.isActive, true)),
    db.select({ value: count() }).from(scholarships).where(eq(scholarships.isActive, true)),
    db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, 'student'), eq(users.isActive, true), sql`${users.collegeId} is not null`)),
    db
      .select({ value: count() })
      .from(grievances)
      .where(inArray(grievances.status, ['Resolved', 'Closed'])),
    db
      .select({ value: sql<number>`count(distinct ${collegePhotos.collegeId})::int` })
      .from(collegePhotos)
      .where(eq(collegePhotos.approvalStatus, 'approved')),
    db
      .select({ value: sql<number>`count(distinct ${collegeLogos.collegeId})::int` })
      .from(collegeLogos)
      .where(eq(collegeLogos.approvalStatus, 'approved')),
  ]);

  res.json({
    totalColleges,
    verifiedColleges,
    districtsCovered,
    totalApDistricts: AP_DISTRICTS.length,
    activeScholarships,
    registeredStudents,
    resolvedGrievances,
    collegesWithPhotos,
    collegesWithLogos,
    apDistricts: AP_DISTRICTS,
  });
});

publicRouter.get('/districts', async (_req, res) => {
  await ensurePublicDataSeeded();

  const rows = await db
    .select({
      district: colleges.district,
      totalColleges: count(),
      verifiedColleges: sql<number>`sum(case when ${colleges.verificationStatus} = 'verified' then 1 else 0 end)::int`,
      pendingColleges: sql<number>`sum(case when ${colleges.verificationStatus} <> 'verified' then 1 else 0 end)::int`,
    })
    .from(colleges)
    .where(eq(colleges.isActive, true))
    .groupBy(colleges.district);

  const byDistrict = new Map(rows.map((r) => [r.district, r]));
  const districts = AP_DISTRICTS.map((name) => {
    const stats = byDistrict.get(name);
    return {
      district: name,
      totalColleges: stats?.totalColleges ?? 0,
      verifiedColleges: stats?.verifiedColleges ?? 0,
      pendingColleges: stats?.pendingColleges ?? 0,
    };
  });

  res.json({
    districts,
    totalApDistricts: AP_DISTRICTS.length,
    districtsWithColleges: rows.length,
  });
});

publicRouter.get('/colleges', async (req, res) => {
  await ensurePublicDataSeeded();

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const management = typeof req.query.management === 'string' ? req.query.management.trim() : '';
  const university = typeof req.query.university === 'string' ? req.query.university.trim() : '';
  const course = typeof req.query.course === 'string' ? req.query.course.trim() : '';
  const verificationStatus =
    typeof req.query.verificationStatus === 'string' ? req.query.verificationStatus.trim() : '';
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 12)));
  const offset = (page - 1) * limit;

  const conditions = [eq(colleges.isActive, true)];

  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        ilike(colleges.name, term),
        ilike(colleges.institutionCode, term),
        ilike(colleges.district, term),
        ilike(colleges.affiliatedUniversity, term)
      )!
    );
  }
  if (district) conditions.push(eq(colleges.district, district));
  if (category) conditions.push(eq(colleges.category, category));
  if (management) conditions.push(eq(colleges.management, management));
  if (university) conditions.push(ilike(colleges.affiliatedUniversity, `%${university}%`));
  if (course) {
    const cTerm = `%${course}%`;
    conditions.push(
      or(
        ilike(colleges.programmesJson, cTerm),
        ilike(colleges.engineeringBranchesJson, cTerm),
        ilike(colleges.degreeCoursesJson, cTerm)
      )!
    );
  }
  if (verificationStatus) {
    conditions.push(eq(colleges.verificationStatus, verificationStatus));
  }

  const whereClause = and(...conditions);

  const [{ value: total }] = await db.select({ value: count() }).from(colleges).where(whereClause);

  const rows = await db
    .select()
    .from(colleges)
    .where(whereClause)
    .orderBy(sql`case when ${colleges.verificationStatus} = 'verified' then 0 else 1 end`, asc(colleges.name))
    .limit(limit)
    .offset(offset);

  const collegeIds = rows.map((r) => r.id);
  const photoMap = new Map<number, number>();
  const logoMap = new Map<number, number>();
  if (collegeIds.length > 0) {
    const [approvedPhotos, approvedLogos] = await Promise.all([
      db
        .select({ id: collegePhotos.id, collegeId: collegePhotos.collegeId })
        .from(collegePhotos)
        .where(and(inArray(collegePhotos.collegeId, collegeIds), eq(collegePhotos.approvalStatus, 'approved')))
        .orderBy(desc(collegePhotos.id)),
      db
        .select({ id: collegeLogos.id, collegeId: collegeLogos.collegeId })
        .from(collegeLogos)
        .where(
          and(
            inArray(collegeLogos.collegeId, collegeIds),
            eq(collegeLogos.approvalStatus, 'approved'),
            sql`${collegeLogos.filePath} is not null`
          )
        )
        .orderBy(desc(collegeLogos.id)),
    ]);

    for (const p of approvedPhotos) {
      if (!photoMap.has(p.collegeId)) {
        photoMap.set(p.collegeId, p.id);
      }
    }
    for (const l of approvedLogos) {
      if (!logoMap.has(l.collegeId)) {
        logoMap.set(l.collegeId, l.id);
      }
    }
  }

  const [distinctDistricts, distinctCategories, distinctManagements, distinctUniversities] = await Promise.all([
    db
      .selectDistinct({ district: colleges.district })
      .from(colleges)
      .where(eq(colleges.isActive, true))
      .orderBy(asc(colleges.district)),
    db
      .selectDistinct({ category: colleges.category })
      .from(colleges)
      .where(eq(colleges.isActive, true))
      .orderBy(asc(colleges.category)),
    db
      .selectDistinct({ management: colleges.management })
      .from(colleges)
      .where(eq(colleges.isActive, true))
      .orderBy(asc(colleges.management)),
    db
      .selectDistinct({ affiliatedUniversity: colleges.affiliatedUniversity })
      .from(colleges)
      .where(eq(colleges.isActive, true))
      .orderBy(asc(colleges.affiliatedUniversity)),
  ]);

  res.json({
    colleges: rows.map((r) => formatCollege(r, photoMap.get(r.id) ?? null, logoMap.get(r.id) ?? null)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    filterMeta: {
      districts: distinctDistricts.map((d) => d.district),
      categories: distinctCategories.map((c) => c.category),
      managements: distinctManagements.map((m) => m.management),
      universities: distinctUniversities.map((u) => u.affiliatedUniversity),
    },
  });
});

publicRouter.get('/colleges/compare', async (req, res) => {
  await ensurePublicDataSeeded();
  const rawIds = typeof req.query.ids === 'string' ? req.query.ids : '';
  const parsedIds = Array.from(
    new Set(
      rawIds
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    )
  ).slice(0, 3);

  if (parsedIds.length === 0) {
    return res.json({ colleges: [] });
  }

  const rows = await db
    .select()
    .from(colleges)
    .where(and(inArray(colleges.id, parsedIds), eq(colleges.isActive, true)));

  const matchedIds = rows.map((r) => r.id);
  const logoMap = new Map<number, number>();
  const photoMap = new Map<number, number>();
  const feeMap = new Map<
    number,
    {
      course: string;
      academicYear: string;
      tuitionFee: number;
      totalAnnualFee: number;
      sourceReference: string;
    }
  >();

  if (matchedIds.length > 0) {
    const [approvedPhotos, approvedLogos, feeRows] = await Promise.all([
      db
        .select({ id: collegePhotos.id, collegeId: collegePhotos.collegeId })
        .from(collegePhotos)
        .where(and(inArray(collegePhotos.collegeId, matchedIds), eq(collegePhotos.approvalStatus, 'approved')))
        .orderBy(desc(collegePhotos.id)),
      db
        .select({ id: collegeLogos.id, collegeId: collegeLogos.collegeId })
        .from(collegeLogos)
        .where(
          and(
            inArray(collegeLogos.collegeId, matchedIds),
            eq(collegeLogos.approvalStatus, 'approved'),
            sql`${collegeLogos.filePath} is not null`
          )
        )
        .orderBy(desc(collegeLogos.id)),
      db
        .select()
        .from(feeStructures)
        .where(inArray(feeStructures.collegeId, matchedIds))
        .orderBy(desc(feeStructures.academicYear), asc(feeStructures.id)),
    ]);

    for (const p of approvedPhotos) {
      if (!photoMap.has(p.collegeId)) photoMap.set(p.collegeId, p.id);
    }
    for (const l of approvedLogos) {
      if (!logoMap.has(l.collegeId)) logoMap.set(l.collegeId, l.id);
    }
    for (const f of feeRows) {
      if (!feeMap.has(f.collegeId)) {
        feeMap.set(f.collegeId, {
          course: f.course,
          academicYear: f.academicYear,
          tuitionFee: f.tuitionFee,
          totalAnnualFee:
            f.tuitionFee + f.examinationFee + f.laboratoryFee + f.hostelFee + f.transportFee + f.otherAuthorisedFee,
          sourceReference: f.sourceReference,
        });
      }
    }
  }

  const ordered = parsedIds
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      ...formatCollege(r, photoMap.get(r.id) ?? null, logoMap.get(r.id) ?? null),
      latestFeeStructure: feeMap.get(r.id) ?? null,
    }));

  return res.json({ colleges: ordered });
});

publicRouter.get('/colleges/:id', async (req, res) => {
  await ensurePublicDataSeeded();
  const collegeId = Number(req.params.id);
  if (!Number.isInteger(collegeId) || collegeId <= 0) {
    return res.status(400).json({ error: 'Invalid college ID' });
  }

  const [row] = await db.select().from(colleges).where(eq(colleges.id, collegeId)).limit(1);
  if (!row || !row.isActive) {
    return res.status(404).json({ error: 'College record not found' });
  }

  const [approvedPhotos, approvedLogos, structures, collegeNotices, collegePosters] = await Promise.all([
    db
      .select({
        id: collegePhotos.id,
        category: collegePhotos.category,
        caption: collegePhotos.caption,
        sourceAttribution: collegePhotos.sourceAttribution,
        permissionReference: collegePhotos.permissionReference,
        approvedAt: collegePhotos.approvedAt,
      })
      .from(collegePhotos)
      .where(and(eq(collegePhotos.collegeId, collegeId), eq(collegePhotos.approvalStatus, 'approved')))
      .orderBy(desc(collegePhotos.id)),
    db
      .select({
        id: collegeLogos.id,
        filePath: collegeLogos.filePath,
        sourceUrl: collegeLogos.sourceUrl,
        sourceAttribution: collegeLogos.sourceAttribution,
        permissionReference: collegeLogos.permissionReference,
        verificationNote: collegeLogos.verificationNote,
        approvedAt: collegeLogos.approvedAt,
      })
      .from(collegeLogos)
      .where(and(eq(collegeLogos.collegeId, collegeId), eq(collegeLogos.approvalStatus, 'approved')))
      .orderBy(desc(collegeLogos.id))
      .limit(1),
    db
      .select({
        id: feeStructures.id,
        course: feeStructures.course,
        academicYear: feeStructures.academicYear,
        semester: feeStructures.semester,
        tuitionFee: feeStructures.tuitionFee,
        examinationFee: feeStructures.examinationFee,
        laboratoryFee: feeStructures.laboratoryFee,
        hostelFee: feeStructures.hostelFee,
        transportFee: feeStructures.transportFee,
        otherAuthorisedFee: feeStructures.otherAuthorisedFee,
        dueDate: feeStructures.dueDate,
        sourceReference: feeStructures.sourceReference,
        updatedAt: feeStructures.updatedAt,
      })
      .from(feeStructures)
      .where(eq(feeStructures.collegeId, collegeId))
      .orderBy(desc(feeStructures.academicYear), asc(feeStructures.course)),
    db
      .select({
        id: notices.id,
        category: notices.category,
        title: notices.title,
        body: notices.body,
        officialUrl: notices.officialUrl,
        publishedAt: notices.publishedAt,
      })
      .from(notices)
      .where(and(eq(notices.scope, 'college'), eq(notices.collegeId, collegeId)))
      .orderBy(desc(notices.publishedAt))
      .limit(10),
    db
      .select({
        id: posters.id,
        title: posters.title,
        subtitle: posters.subtitle,
        category: posters.category,
        summary: posters.summary,
        ctaLabel: posters.ctaLabel,
        ctaUrl: posters.ctaUrl,
        imageFilePath: posters.imageFilePath,
        sourceAttribution: posters.sourceAttribution,
        authorisationRef: posters.authorisationRef,
        publishDate: posters.publishDate,
        expiryDate: posters.expiryDate,
      })
      .from(posters)
      .where(
        and(
          eq(posters.collegeId, collegeId),
          eq(posters.approvalStatus, 'approved'),
          eq(posters.isArchived, false)
        )
      )
      .orderBy(desc(posters.id))
      .limit(6),
  ]);

  const approvedLogo = approvedLogos[0] || null;
  const approvedLogoFileId = approvedLogo && approvedLogo.filePath ? approvedLogo.id : null;

  res.json({
    college: formatCollege(row, approvedPhotos[0]?.id ?? null, approvedLogoFileId),
    approvedLogo: approvedLogo
      ? {
          id: approvedLogo.id,
          hasFile: Boolean(approvedLogo.filePath),
          sourceUrl: approvedLogo.sourceUrl,
          sourceAttribution: approvedLogo.sourceAttribution,
          permissionReference: approvedLogo.permissionReference,
          verificationNote: approvedLogo.verificationNote,
          approvedAt: approvedLogo.approvedAt,
        }
      : null,
    approvedPhotos,
    approvedPosters: collegePosters.map((p) => ({
      ...p,
      hasImage: Boolean(p.imageFilePath),
      imageFilePath: undefined,
    })),
    feeStructures: structures,
    notices: collegeNotices,
  });
});

publicRouter.get('/scholarships', async (req, res) => {
  await ensurePublicDataSeeded();
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const meritOrNeed = typeof req.query.meritOrNeed === 'string' ? req.query.meritOrNeed.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  const conditions = [eq(scholarships.isActive, true)];
  if (category) conditions.push(eq(scholarships.category, category));
  if (meritOrNeed) conditions.push(eq(scholarships.meritOrNeed, meritOrNeed));
  if (search) {
    const term = `%${search}%`;
    conditions.push(or(ilike(scholarships.title, term), ilike(scholarships.provider, term), ilike(scholarships.eligibility, term))!);
  }

  const rows = await db
    .select()
    .from(scholarships)
    .where(and(...conditions))
    .orderBy(desc(scholarships.isOfficial), asc(scholarships.id));

  res.json({
    scholarships: rows.map((r) => ({
      ...r,
      requiredDocuments: safeJsonArray(r.requiredDocumentsJson),
    })),
  });
});

publicRouter.get('/career-exams', async (_req, res) => {
  await ensurePublicDataSeeded();
  const exams = await db.select().from(careerExams).orderBy(asc(careerExams.id));
  res.json({ exams });
});

publicRouter.get('/exam-ads', async (_req, res) => {
  await ensurePublicDataSeeded();
  const ads = await db
    .select()
    .from(examAdvertisements)
    .where(eq(examAdvertisements.isActive, true))
    .orderBy(desc(examAdvertisements.createdAt), asc(examAdvertisements.id));
  res.json({ ads });
});

publicRouter.get('/support/whatsapp', (req, res) => {
  if (!config.counsellorWhatsappNumber) {
    return res.status(503).json({
      error: 'Direct WhatsApp counsellor line is not configured on this deployment.',
      configured: false,
    });
  }
  const topic = String(req.query.topic || 'General Fee & Admission Guidance').slice(0, 160);
  const prefilledText = encodeURIComponent(
    `Hello Andhra Student Hub Counsellor, I need guidance regarding: ${topic}`
  );
  return res.redirect(302, `https://wa.me/${config.counsellorWhatsappNumber}?text=${prefilledText}`);
});

publicRouter.get('/competitive-exams/details', async (_req, res) => {
  await ensurePublicDataSeeded();
  res.json({ exams: COMPETITIVE_EXAMS_DETAIL });
});

publicRouter.get('/posters', async (req, res) => {
  await ensurePublicDataSeeded();
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const district = typeof req.query.district === 'string' ? req.query.district.trim() : '';
  const collegeId = req.query.collegeId ? Number(req.query.collegeId) : null;
  const scope = typeof req.query.scope === 'string' ? req.query.scope.trim() : '';

  const today = new Date().toISOString().slice(0, 10);
  const conditions = [
    eq(posters.approvalStatus, 'approved'),
    eq(posters.isArchived, false),
    or(sql`${posters.expiryDate} is null`, sql`${posters.expiryDate} = ''`, sql`${posters.expiryDate} >= ${today}`)!,
  ];

  if (category) conditions.push(eq(posters.category, category));
  if (district) conditions.push(eq(posters.district, district));
  if (scope) conditions.push(eq(posters.scope, scope));
  if (collegeId && Number.isInteger(collegeId) && collegeId > 0) {
    conditions.push(eq(posters.collegeId, collegeId));
  }

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
      publishDate: posters.publishDate,
      expiryDate: posters.expiryDate,
    })
    .from(posters)
    .leftJoin(colleges, eq(colleges.id, posters.collegeId))
    .where(and(...conditions))
    .orderBy(desc(posters.id));

  res.json({
    posters: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      subtitle: r.subtitle,
      category: r.category,
      summary: r.summary,
      ctaLabel: r.ctaLabel,
      ctaUrl: r.ctaUrl,
      hasImage: Boolean(r.imageFilePath),
      scope: r.scope,
      district: r.district,
      collegeId: r.collegeId,
      collegeName: r.collegeName,
      sourceAttribution: r.sourceAttribution,
      authorisationRef: r.authorisationRef,
      publishDate: r.publishDate,
      expiryDate: r.expiryDate,
    })),
  });
});

publicRouter.get('/nptel', async (_req, res) => {
  await ensurePublicDataSeeded();
  const tracks = await db.select().from(nptelTracks).orderBy(asc(nptelTracks.id));
  res.json({ tracks });
});

publicRouter.get('/notices', optionalAuth, async (req, res) => {
  await ensurePublicDataSeeded();
  const statewideNotices = await db
    .select()
    .from(notices)
    .where(eq(notices.scope, 'statewide'))
    .orderBy(desc(notices.publishedAt))
    .limit(20);

  let collegeNotices: Array<typeof notices.$inferSelect> = [];
  if (req.user?.collegeId) {
    collegeNotices = await db
      .select()
      .from(notices)
      .where(and(eq(notices.scope, 'college'), eq(notices.collegeId, req.user.collegeId)))
      .orderBy(desc(notices.publishedAt))
      .limit(20);
  }

  res.json({ statewideNotices, collegeNotices });
});

publicRouter.post('/assistant/query', optionalAuth, async (req, res) => {
  await ensurePublicDataSeeded();
  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question || question.length < 3) {
    return res.status(400).json({ error: 'Please enter a clear question (at least 3 characters).' });
  }
  if (question.length > 1000) {
    return res.status(400).json({ error: 'Question must be under 1000 characters.' });
  }

  let collegeName: string | undefined;
  if (req.user?.collegeId) {
    const [col] = await db
      .select({ name: colleges.name })
      .from(colleges)
      .where(eq(colleges.id, req.user.collegeId))
      .limit(1);
    collegeName = col?.name;
  }

  const result = await runAssistantQuery(question, {
    collegeName,
    role: req.user?.role,
  });

  res.json(result);
});

publicRouter.get('/grievances/lookup', async (req, res) => {
  await ensurePublicDataSeeded();
  const ref = typeof req.query.ref === 'string' ? req.query.ref.trim().toUpperCase() : '';
  if (!ref || !/^ASH-GRV-[A-Z0-9-]+$/i.test(ref)) {
    return res.status(400).json({ error: 'Enter a valid ASH grievance reference ID (e.g. ASH-GRV-...).' });
  }

  const [row] = await db
    .select({
      referenceNumber: grievances.referenceNumber,
      category: grievances.category,
      status: grievances.status,
      escalatedToState: grievances.escalatedToState,
      createdAt: grievances.createdAt,
      updatedAt: grievances.updatedAt,
      collegeName: colleges.name,
    })
    .from(grievances)
    .leftJoin(colleges, eq(colleges.id, grievances.collegeId))
    .where(eq(grievances.referenceNumber, ref))
    .limit(1);

  if (!row) {
    return res.status(404).json({ error: `No grievance found for reference ID ${ref}.` });
  }

  return res.json({ ticket: row });
});

publicRouter.post('/payments/webhook', async (req, res) => {
  if (!config.payment.isConfigured || !config.payment.webhookSecret) {
    return res.status(503).json({
      error: 'Payment gateway webhook is not configured on this deployment.',
      paymentGatewayConfigured: false,
    });
  }

  const signature = req.headers['x-webhook-signature'];
  if (typeof signature !== 'string' || !signature) {
    return res.status(401).json({ error: 'Missing webhook signature header.' });
  }

  const expected = crypto
    .createHmac('sha256', config.payment.webhookSecret)
    .update(JSON.stringify(req.body || {}))
    .digest('hex');

  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'));

  if (!valid) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  const { receiptNumber, providerReference, accountId, studentUserId, collegeId, amount } = req.body as {
    receiptNumber?: string;
    providerReference?: string;
    accountId?: number;
    studentUserId?: number;
    collegeId?: number;
    amount?: number;
  };

  if (!receiptNumber || !accountId || !studentUserId || !collegeId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Incomplete verified payment webhook payload.' });
  }

  await db
    .insert(feePayments)
    .values({
      studentFeeAccountId: accountId,
      studentUserId,
      collegeId,
      amount,
      paymentMode: `Online Gateway (${config.payment.provider})`,
      receiptNumber,
      providerReference: providerReference || null,
      verificationStatus: 'gateway_confirmed',
      paidAt: new Date().toISOString().slice(0, 10),
    })
    .onConflictDoNothing();

  await writeAuditLog({
    actorRole: 'system_webhook',
    collegeId,
    action: 'PAYMENT_WEBHOOK_VERIFIED',
    entityType: 'fee_payment',
    entityId: receiptNumber,
    details: { amount, provider: config.payment.provider },
    ipAddress: req.ip,
  });

  return res.json({ received: true });
});
