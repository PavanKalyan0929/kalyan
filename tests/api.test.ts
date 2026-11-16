import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { eq, inArray, like } from 'drizzle-orm';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ash-test-'));
process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads');

const { createApiApp } = await import('../server/app.ts');
const { setTokenVerifierForTesting } = await import('../server/middleware/auth.ts');
const { db, createPool } = await import('../src/db/index.ts');
const {
  auditLogs,
  collegeLogos,
  examAdvertisements,
  feePayments,
  feeStructures,
  grievanceAttachments,
  grievanceHistory,
  grievances,
  notifications,
  otpVerifications,
  posters,
  privacyRequests,
  studentFeeAccounts,
  studentProfiles,
  studentShortlists,
  users,
  verificationRequests,
} = await import('../src/db/schema.ts');

let server: import('node:http').Server;
let baseUrl = '';
const runTag = Date.now().toString(36).toUpperCase();
let testEmails: string[] = [];
let createdFeeStructureId: number | null = null;
let createdLogoId: number | null = null;
let createdPosterId: number | null = null;
let createdExamAdId: number | null = null;
let hadPreExistingStateAdmin = false;

const TOKENS: Record<
  string,
  { uid: string; email: string; name: string; email_verified: boolean }
> = {
  'state-admin-token': {
    uid: `test-uid-state-${runTag}`,
    email: `state.admin.${runTag}@test.ash.local`,
    name: 'AP State Commissioner Test',
    email_verified: true,
  },
  'attacker-token': {
    uid: `test-uid-attacker-${runTag}`,
    email: `attacker.${runTag}@test.ash.local`,
    name: 'Attacker Test',
    email_verified: true,
  },
  'ca1-token': {
    uid: `test-uid-ca1-${runTag}`,
    email: `admin1.${runTag}@test.ash.local`,
    name: 'College 1 Admin Test',
    email_verified: true,
  },
  'student-a-token': {
    uid: `test-uid-stda-${runTag}`,
    email: `kiran.${runTag}@test.ash.local`,
    name: 'Kiran Kumar Test',
    email_verified: true,
  },
  'student-b-token': {
    uid: `test-uid-stdb-${runTag}`,
    email: `divya.${runTag}@test.ash.local`,
    name: 'Divya Sri Test',
    email_verified: true,
  },
  'dup-student-token': {
    uid: `test-uid-dup-${runTag}`,
    email: `dup.${runTag}@test.ash.local`,
    name: 'Duplicate Student Test',
    email_verified: true,
  },
};

testEmails = Object.values(TOKENS).map((t) => t.email.toLowerCase());

async function req(
  urlPath: string,
  options: { method?: string; body?: unknown; token?: string } = {}
) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(`${baseUrl}${urlPath}`, {
    method: options.method || 'GET',
    headers,
    body: isFormData
      ? (options.body as FormData)
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

before(async () => {
  setTokenVerifierForTesting(async (token: string) => {
    const identity = TOKENS[token];
    if (!identity) {
      throw new Error('Invalid test token');
    }
    return identity;
  });

  const existingAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, 'state_admin'))
    .limit(1);
  hadPreExistingStateAdmin = existingAdmins.length > 0;

  const app = createApiApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  setTokenVerifierForTesting(null);
  await new Promise<void>((resolve) => server.close(() => resolve()));

  // Clean up test rows created in Cloud SQL PostgreSQL
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.email, testEmails));
  const testUserIds = testUsers.map((u) => u.id);

  if (testUserIds.length > 0) {
    const testGrievances = await db
      .select({ id: grievances.id })
      .from(grievances)
      .where(inArray(grievances.studentUserId, testUserIds));
    const testGrvIds = testGrievances.map((g) => g.id);

    if (testGrvIds.length > 0) {
      await db.delete(grievanceAttachments).where(inArray(grievanceAttachments.grievanceId, testGrvIds));
      await db.delete(grievanceHistory).where(inArray(grievanceHistory.grievanceId, testGrvIds));
      await db.delete(grievances).where(inArray(grievances.id, testGrvIds));
    }

    await db.delete(feePayments).where(inArray(feePayments.studentUserId, testUserIds));
    await db.delete(studentFeeAccounts).where(inArray(studentFeeAccounts.studentUserId, testUserIds));
    await db.delete(verificationRequests).where(inArray(verificationRequests.studentUserId, testUserIds));
    await db.delete(otpVerifications).where(inArray(otpVerifications.userId, testUserIds));
    await db.delete(notifications).where(inArray(notifications.userId, testUserIds));
    await db.delete(privacyRequests).where(inArray(privacyRequests.userId, testUserIds));
    await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, testUserIds));
    await db.delete(studentShortlists).where(inArray(studentShortlists.userId, testUserIds));
    await db.delete(studentProfiles).where(inArray(studentProfiles.userId, testUserIds));
    if (createdLogoId) {
      await db.delete(collegeLogos).where(eq(collegeLogos.id, createdLogoId));
    }
    if (createdPosterId) {
      await db.delete(posters).where(eq(posters.id, createdPosterId));
    }
    if (createdExamAdId) {
      await db.delete(examAdvertisements).where(eq(examAdvertisements.id, createdExamAdId));
    }
    if (createdFeeStructureId) {
      await db.delete(feeStructures).where(eq(feeStructures.id, createdFeeStructureId));
    }
    await db.delete(feeStructures).where(like(feeStructures.sourceReference, `%TEST-${runTag}%`));
    await db.delete(users).where(inArray(users.id, testUserIds));
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
  await createPool().end();
});

test('1. Public directory search, filter, and clean health endpoint work', async () => {
  const health = await req('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.status, 'ok');
  assert.equal('database' in health.json, false);

  const stats = await req('/api/stats/public');
  assert.equal(stats.status, 200);
  assert.ok(Number(stats.json.totalColleges) >= 20);

  const search = await req('/api/colleges?search=AUCE&district=Visakhapatnam');
  assert.equal(search.status, 200);
  const colleges = search.json.colleges as Array<{ institutionCode: string; district: string }>;
  assert.ok(colleges.length >= 1);
  assert.equal(colleges[0].institutionCode, 'AUCE');
  assert.equal(colleges[0].district, 'Visakhapatnam');
});

test('2. Unauthenticated and unauthorized role checks enforce 401 and 403', async () => {
  const unauth = await req('/api/student/dashboard');
  assert.equal(unauth.status, 401);

  const nonAdminState = await req('/api/state-admin/dashboard', { token: 'attacker-token' });
  assert.equal(nonAdminState.status, 403);
});

test('3. State Admin bootstrap works once when empty and remains locked permanently', async () => {
  const status1 = await req('/api/setup/status');
  assert.equal(status1.status, 200);

  if (!hadPreExistingStateAdmin) {
    assert.equal(status1.json.needsStateAdminBootstrap, true);
    const boot = await req('/api/setup/bootstrap-state-admin', {
      method: 'POST',
      token: 'state-admin-token',
      body: {
        fullName: 'AP State Commissioner Test',
        mobile: '9876543210',
      },
    });
    assert.equal(boot.status, 201);
  } else {
    // Ensure test state admin account exists cleanly for subsequent admin tests
    await req('/api/auth/me', { token: 'state-admin-token' });
    await db
      .update(users)
      .set({ role: 'state_admin', collegeId: null })
      .where(eq(users.email, TOKENS['state-admin-token'].email.toLowerCase()));
  }

  const secondBoot = await req('/api/setup/bootstrap-state-admin', {
    method: 'POST',
    token: 'attacker-token',
    body: {
      fullName: 'Attacker',
      mobile: '9876543211',
    },
  });
  assert.equal(secondBoot.status, 403);
});

test('4. Student onboarding, OTP honesty & security, tenant isolation, fees, and grievances', async () => {
  const dir = await req('/api/colleges?limit=5');
  const collegesList = dir.json.colleges as Array<{ id: number; name: string }>;
  const college1 = collegesList[0];
  const college2 = collegesList[1];

  // State Admin provisions College 1 Admin (passwordless email binding)
  const createCA1 = await req('/api/state-admin/college-admins', {
    method: 'POST',
    token: 'state-admin-token',
    body: {
      fullName: 'College 1 Admin Test',
      email: TOKENS['ca1-token'].email,
      mobile: '9876500001',
      collegeId: college1.id,
    },
  });
  assert.equal(createCA1.status, 201);

  // Verify Google user starts with needsStudentOnboarding=true
  const meBefore = await req('/api/auth/me', { token: 'student-a-token' });
  assert.equal(meBefore.status, 200);
  assert.equal(meBefore.json.needsStudentOnboarding, true);

  // When SMS provider is unconfigured, /api/auth/otp/send must return honest 503
  delete process.env.SMS_TEST_ECHO;
  const otpUnconfigured = await req('/api/auth/otp/send', {
    method: 'POST',
    token: 'student-a-token',
    body: { mobile: '9876511111', purpose: 'registration' },
  });
  assert.equal(otpUnconfigured.status, 503);

  // Test OTP verification with test echo enabled (NODE_ENV=test)
  process.env.SMS_TEST_ECHO = 'true';
  const otpSent = await req('/api/auth/otp/send', {
    method: 'POST',
    token: 'student-a-token',
    body: { mobile: '9876511111', purpose: 'registration' },
  });
  assert.equal(otpSent.status, 200);
  const testOtp = String(otpSent.json.testOtp);
  assert.match(testOtp, /^\d{6}$/);

  const otpBad = await req('/api/auth/otp/verify', {
    method: 'POST',
    token: 'student-a-token',
    body: { mobile: '9876511111', otp: '000000' === testOtp ? '111111' : '000000' },
  });
  assert.equal(otpBad.status, 400);

  const otpGood = await req('/api/auth/otp/verify', {
    method: 'POST',
    token: 'student-a-token',
    body: { mobile: '9876511111', otp: testOtp },
  });
  assert.equal(otpGood.status, 200);
  assert.equal(otpGood.json.verified, true);
  delete process.env.SMS_TEST_ECHO;

  // Complete College-Linked Onboarding for Student A (College 1) and Student B (College 2)
  const enrollmentA = `24A91${runTag.slice(-4)}`;
  const enrollmentB = `24B91${runTag.slice(-4)}`;

  const regA = await req('/api/auth/register-student', {
    method: 'POST',
    token: 'student-a-token',
    body: {
      fullName: 'Kiran Kumar Test',
      enrollmentNumber: enrollmentA,
      mobile: '9876511111',
      collegeId: college1.id,
      course: 'B.Tech',
      department: 'Computer Science & Engineering',
      academicYear: `2025-${runTag}`,
      admissionYear: 2024,
      currentSemester: 'Semester 3',
      consentAccepted: true,
    },
  });
  assert.equal(regA.status, 201);
  // Verifying mobile OTP must NOT bypass College verification pending!
  assert.equal(regA.json.verificationStatus, 'College verification pending');

  const regB = await req('/api/auth/register-student', {
    method: 'POST',
    token: 'student-b-token',
    body: {
      fullName: 'Divya Sri Test',
      enrollmentNumber: enrollmentB,
      mobile: '9876522222',
      collegeId: college2.id,
      course: 'B.Tech',
      department: 'ECE',
      academicYear: `2025-${runTag}`,
      admissionYear: 2024,
      currentSemester: 'Semester 3',
      consentAccepted: true,
    },
  });
  assert.equal(regB.status, 201);

  // Duplicate enrollment in same college must be rejected
  const dupReg = await req('/api/auth/register-student', {
    method: 'POST',
    token: 'dup-student-token',
    body: {
      fullName: 'Duplicate Student Test',
      enrollmentNumber: enrollmentA,
      mobile: '9876533333',
      collegeId: college1.id,
      course: 'B.Tech',
      department: 'CSE',
      academicYear: `2025-${runTag}`,
      admissionYear: 2024,
      currentSemester: 'Semester 1',
      consentAccepted: true,
    },
  });
  assert.equal(dupReg.status, 409);

  // Student profile PATCH must NEVER allow modifying collegeId or verificationStatus
  const patchProfile = await req('/api/student/profile', {
    method: 'PATCH',
    token: 'student-a-token',
    body: {
      fullName: 'Kiran Kumar Updated',
      collegeId: college2.id,
      verificationStatus: 'Verified',
    },
  });
  assert.equal(patchProfile.status, 200);
  const meAfterPatch = await req('/api/auth/me', { token: 'student-a-token' });
  const spAfter = meAfterPatch.json.studentProfile as { collegeId: number; verificationStatus: string };
  assert.equal(spAfter.collegeId, college1.id);
  assert.equal(spAfter.verificationStatus, 'College verification pending');

  // Student A uploads invalid file type -> rejected
  const badForm = new FormData();
  badForm.append('method', 'evidence_upload');
  badForm.append('evidence', new Blob(['malicious'], { type: 'application/x-msdownload' }), 'malware.exe');
  const badUpload = await req('/api/student/verification/submit', {
    method: 'POST',
    token: 'student-a-token',
    body: badForm,
  });
  assert.equal(badUpload.status, 400);

  // Student A uploads valid PNG ID evidence
  const goodForm = new FormData();
  goodForm.append('method', 'evidence_upload');
  goodForm.append('notes', 'College ID Card front');
  goodForm.append('evidence', new Blob(['fake-png-header'], { type: 'image/png' }), 'student-id.png');
  const goodUpload = await req('/api/student/verification/submit', {
    method: 'POST',
    token: 'student-a-token',
    body: goodForm,
  });
  assert.equal(goodUpload.status, 201);
  assert.equal(goodUpload.json.status, 'College verification pending');
  const verReqIdA = Number(goodUpload.json.requestId);

  // Student B submits verification in College 2
  const formB = new FormData();
  formB.append('method', 'evidence_upload');
  formB.append('evidence', new Blob(['png-b'], { type: 'image/png' }), 'id-b.png');
  const uploadB = await req('/api/student/verification/submit', {
    method: 'POST',
    token: 'student-b-token',
    body: formB,
  });
  const verReqIdB = Number(uploadB.json.requestId);

  // Cross-tenant isolation: College 1 Admin MUST NOT access College 2 verification or file!
  const crossAccessDecision = await req(`/api/college-admin/verifications/${verReqIdB}/decision`, {
    method: 'POST',
    token: 'ca1-token',
    body: { decision: 'Verified', reason: 'Attempt cross-tenant approval' },
  });
  assert.equal(crossAccessDecision.status, 404);

  const crossAccessFile = await req(`/api/files/verification/${verReqIdB}`, {
    token: 'ca1-token',
  });
  assert.equal(crossAccessFile.status, 403);

  // Cross-student private file isolation
  const crossStudentFile = await req(`/api/files/verification/${verReqIdB}`, {
    token: 'student-a-token',
  });
  assert.equal(crossStudentFile.status, 403);

  // College 1 Admin approves Student A
  const approveA = await req(`/api/college-admin/verifications/${verReqIdA}/decision`, {
    method: 'POST',
    token: 'ca1-token',
    body: { decision: 'Verified', reason: 'Matched with college admission register' },
  });
  assert.equal(approveA.status, 200);

  // Fee structure + payment calculation check
  const saveFee = await req('/api/college-admin/fee-structures', {
    method: 'POST',
    token: 'ca1-token',
    body: {
      course: 'B.Tech',
      academicYear: `2025-${runTag}`,
      semester: 'Annual',
      tuitionFee: 50000,
      examinationFee: 2500,
      laboratoryFee: 3500,
      hostelFee: 0,
      transportFee: 0,
      otherAuthorisedFee: 1000,
      sourceReference: `APHERMC GO Ms No 12 TEST-${runTag}`,
      applyToMatchingStudents: true,
    },
  });
  assert.equal(saveFee.status, 201);
  assert.equal(saveFee.json.syncedStudents, 1);
  createdFeeStructureId = Number(saveFee.json.structureId);

  const feeAccounts = await req('/api/college-admin/fee-accounts', { token: 'ca1-token' });
  const account = (feeAccounts.json.accounts as Array<{ id: number; enrollmentNumber: string }>).find(
    (a) => a.enrollmentNumber === enrollmentA
  );
  assert.ok(account);

  const postPayment = await req(`/api/college-admin/fee-accounts/${account.id}/payments`, {
    method: 'POST',
    token: 'ca1-token',
    body: {
      amount: 30000,
      paymentMode: 'College Challan',
      receiptNumber: `CHLN-${runTag}-0001`,
      paidAt: '2026-08-10',
    },
  });
  assert.equal(postPayment.status, 201);

  const studentDash = await req('/api/student/dashboard', { token: 'student-a-token' });
  assert.equal(studentDash.status, 200);
  const fees = studentDash.json.fees as {
    totals: { totalApplicable: number; totalPaid: number; pendingAmount: number };
  };
  assert.equal(fees.totals.totalApplicable, 57000);
  assert.equal(fees.totals.totalPaid, 30000);
  assert.equal(fees.totals.pendingAmount, 27000);

  // Zero secret exposure in JSON payloads
  const rawDash = JSON.stringify(studentDash.json);
  assert.equal(rawDash.includes('passwordHash'), false);

  // Unconfigured payment gateway must return 503 honestly, never fake success
  const payAttempt = await req('/api/student/fees/pay', {
    method: 'POST',
    token: 'student-a-token',
    body: {},
  });
  assert.equal(payAttempt.status, 503);

  // Grievance submission + additional evidence + escalation + State Admin resolution
  const grvForm = new FormData();
  grvForm.append('category', 'Scholarship issues');
  grvForm.append('subject', 'Jnanabhumi biometric attendance mismatch');
  grvForm.append('description', 'My attendance is 82% in CSE register but showing 71% on portal.');
  grvForm.append('contactPhone', '9876511111');
  grvForm.append('contactEmail', TOKENS['student-a-token'].email);
  grvForm.append('consentAccepted', 'true');

  const grvRes = await req('/api/student/grievances', {
    method: 'POST',
    token: 'student-a-token',
    body: grvForm,
  });
  assert.equal(grvRes.status, 201);
  assert.ok(String(grvRes.json.referenceNumber).startsWith('ASH-GRV-'));
  const grvId = Number(grvRes.json.id);

  const escRes = await req(`/api/student/grievances/${grvId}/escalate`, {
    method: 'POST',
    token: 'student-a-token',
    body: { reason: 'Urgent scholarship deadline approaching next week.' },
  });
  assert.equal(escRes.status, 200);

  const stateResolve = await req(`/api/state-admin/grievances/${grvId}/action`, {
    method: 'POST',
    token: 'state-admin-token',
    body: { status: 'Resolved', comment: 'Directed college nodal officer to sync updated biometric sheet.' },
  });
  assert.equal(stateResolve.status, 200);

  // Public non-PII grievance ticket status lookup
  const grvRef = String(grvRes.json.referenceNumber);
  const lookupOk = await req(`/api/grievances/lookup?ref=${encodeURIComponent(grvRef)}`);
  assert.equal(lookupOk.status, 200);
  const ticketObj = lookupOk.json.ticket as Record<string, unknown>;
  assert.equal(ticketObj.referenceNumber, grvRef);
  assert.equal(ticketObj.status, 'Resolved');
  assert.equal(ticketObj.escalatedToState, true);
  assert.equal('contactPhone' in ticketObj, false);
  assert.equal('contactEmail' in ticketObj, false);
  assert.equal('description' in ticketObj, false);

  const lookupBad = await req('/api/grievances/lookup?ref=INVALID');
  assert.equal(lookupBad.status, 400);

  // Official College Logo Upload -> 403 while pending -> State Admin Approves -> 200 Public
  const logoForm = new FormData();
  logoForm.append('sourceAttribution', 'Official College PR Desk');
  logoForm.append('permissionReference', `MEMO-LOGO-${runTag}`);
  logoForm.append('logo', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' }), 'crest.png');

  const logoUpload = await req('/api/college-admin/logos', {
    method: 'POST',
    token: 'ca1-token',
    body: logoForm,
  });
  assert.equal(logoUpload.status, 201);
  assert.equal(logoUpload.json.status, 'pending');
  createdLogoId = Number(logoUpload.json.id);

  // Pending logo MUST NOT be accessible publicly
  const publicLogoPending = await fetch(`${baseUrl}/api/files/college-logo/${createdLogoId}`);
  assert.equal(publicLogoPending.status, 403);

  // State Admin approves the logo
  const approveLogo = await req(`/api/state-admin/logos/${createdLogoId}/decision`, {
    method: 'POST',
    token: 'state-admin-token',
    body: { decision: 'approved' },
  });
  assert.equal(approveLogo.status, 200);

  const publicLogoApproved = await fetch(`${baseUrl}/api/files/college-logo/${createdLogoId}`);
  assert.equal(publicLogoApproved.status, 200);
  await publicLogoApproved.arrayBuffer();

  // College Poster submission -> stays out of public /api/posters until approved
  const posterForm = new FormData();
  posterForm.append('title', `Tech Symposium ${runTag}`);
  posterForm.append('subtitle', 'Department of Computer Science');
  posterForm.append('category', 'Technical Symposiums');
  posterForm.append('summary', 'Annual statewide engineering symposium hosted with official institutional authorisation.');
  posterForm.append('ctaLabel', 'Inspect College');
  posterForm.append('ctaUrl', `/colleges/${college1.id}`);
  posterForm.append('sourceAttribution', 'Principal Office');
  posterForm.append('authorisationRef', `POSTER-REF-${runTag}`);

  const posterSubmit = await req('/api/college-admin/posters', {
    method: 'POST',
    token: 'ca1-token',
    body: posterForm,
  });
  assert.equal(posterSubmit.status, 201);
  createdPosterId = Number(posterSubmit.json.id);

  const publicPostersBefore = await req('/api/posters');
  assert.equal(
    (publicPostersBefore.json.posters as Array<{ id: number }>).some((p) => p.id === createdPosterId),
    false
  );

  const approvePoster = await req(`/api/state-admin/posters/${createdPosterId}/decision`, {
    method: 'POST',
    token: 'state-admin-token',
    body: { decision: 'approved' },
  });
  assert.equal(approvePoster.status, 200);

  const publicPostersAfter = await req('/api/posters');
  assert.equal(
    (publicPostersAfter.json.posters as Array<{ id: number }>).some((p) => p.id === createdPosterId),
    true
  );
});

test('5. Priority verified colleges remain distinct, 26 AP districts & UPSC exam details load accurately', async () => {
  // Check the 4 priority separate verified colleges exist distinctly
  const priorityChecks = [
    { code: 'NARN', nameIncludes: 'Nellore', district: 'Sri Potti Sriramulu Nellore' },
    { code: 'NRNG', nameIncludes: 'Gudur', district: 'Tirupati' },
    { code: 'SANK', nameIncludes: 'Audisankara', district: 'Tirupati' },
    { code: 'NBKR', nameIncludes: 'NBKR', district: 'Tirupati' },
  ];

  for (const item of priorityChecks) {
    const res = await req(`/api/colleges?search=${encodeURIComponent(item.code)}`);
    assert.equal(res.status, 200);
    const list = res.json.colleges as Array<{
      name: string;
      institutionCode: string;
      district: string;
      verificationStatus: string;
    }>;
    const match = list.find((c) => c.institutionCode === item.code);
    assert.ok(match, `Expected priority college with code ${item.code}`);
    assert.equal(match.district, item.district);
    assert.equal(match.verificationStatus, 'verified');
    assert.ok(match.name.includes(item.nameIncludes));
  }

  // Verify 26 official AP districts endpoint
  const districtsRes = await req('/api/districts');
  assert.equal(districtsRes.status, 200);
  const districtsList = districtsRes.json.districts as Array<{ district: string; total: number }>;
  assert.equal(districtsList.length, 26);

  // Verify UPSC & competitive exams details endpoint
  const examsRes = await req('/api/competitive-exams/details');
  assert.equal(examsRes.status, 200);
  const details = examsRes.json.exams as Array<{ id: string; officialPortalUrl: string }>;
  assert.ok(details.some((e) => e.id === 'upsc-cse' && e.officialPortalUrl.includes('upsc.gov.in')));
  assert.ok(details.some((e) => e.id === 'appsc-groups' && e.officialPortalUrl.includes('psc.ap.gov.in')));

  // Verify State Admin data quality & College Admin report endpoints work
  const dqRes = await req('/api/state-admin/data-quality', { token: 'state-admin-token' });
  assert.equal(dqRes.status, 200);
  assert.equal((dqRes.json.summary as { totalApDistricts: number }).totalApDistricts, 26);

  const caReport = await req('/api/college-admin/reports', { token: 'ca1-token' });
  assert.equal(caReport.status, 200);
  assert.ok('totalStudents' in (caReport.json.report as Record<string, unknown>));

  // Verify student college shortlist toggle & retrieval
  const collegesForShortlist = await req('/api/colleges?limit=1');
  assert.equal(collegesForShortlist.status, 200);
  const targetCollege = (collegesForShortlist.json.colleges as Array<{ id: number }>)[0];
  assert.ok(targetCollege);

  const toggleOn = await req(`/api/student/shortlists/${targetCollege.id}`, {
    method: 'POST',
    token: 'student-a-token',
  });
  assert.equal(toggleOn.status, 200);
  assert.equal(toggleOn.json.saved, true);
  assert.ok((toggleOn.json.collegeIds as number[]).includes(targetCollege.id));

  const shortlistList = await req('/api/student/shortlists', { token: 'student-a-token' });
  assert.equal(shortlistList.status, 200);
  assert.ok((shortlistList.json.collegeIds as number[]).includes(targetCollege.id));

  const toggleOff = await req(`/api/student/shortlists/${targetCollege.id}`, {
    method: 'POST',
    token: 'student-a-token',
  });
  assert.equal(toggleOff.status, 200);
  assert.equal(toggleOff.json.saved, false);
  assert.equal((toggleOff.json.collegeIds as number[]).includes(targetCollege.id), false);

  // Verify State Admin platform registry summary (and strict 403 for non-admin)
  const forbiddenRegistry = await req('/api/state-admin/registry-summary', { token: 'attacker-token' });
  assert.equal(forbiddenRegistry.status, 403);

  const registrySummary = await req('/api/state-admin/registry-summary', { token: 'state-admin-token' });
  assert.equal(registrySummary.status, 200);
  assert.ok(Array.isArray(registrySummary.json.categoryCounts));
  assert.ok(Array.isArray(registrySummary.json.recentStudents));
  assert.ok('totalShortlists' in registrySummary.json);

  // Verify live exam advertisements public feed + State Admin RBAC create/delete
  const publicExamAds = await req('/api/exam-ads');
  assert.equal(publicExamAds.status, 200);
  const seededAds = publicExamAds.json.ads as Array<{ id: number; examName: string }>;
  assert.ok(seededAds.length >= 4);

  const forbiddenAdCreate = await req('/api/state-admin/exam-ads', {
    method: 'POST',
    token: 'attacker-token',
    body: {
      examName: `Unauthorized Exam ${runTag}`,
      category: 'ENGINEERING',
      deadline: 'Last Date: 30 Nov 2026',
      description: 'Should fail with 403.',
      applyUrl: 'https://cets.apsche.ap.gov.in/',
    },
  });
  assert.equal(forbiddenAdCreate.status, 403);

  const createdAd = await req('/api/state-admin/exam-ads', {
    method: 'POST',
    token: 'state-admin-token',
    body: {
      examName: `AP EAPCET Test Advisory ${runTag}`,
      category: 'ENGINEERING',
      deadline: 'Last Date: 30 Nov 2026',
      description: 'Statewide engineering admissions counselling window notice.',
      applyUrl: 'https://cets.apsche.ap.gov.in/',
    },
  });
  assert.equal(createdAd.status, 201);
  createdExamAdId = Number((createdAd.json.ad as { id: number }).id);
  assert.ok(createdExamAdId > 0);

  const afterAdCreate = await req('/api/exam-ads');
  assert.equal(afterAdCreate.status, 200);
  assert.ok((afterAdCreate.json.ads as Array<{ id: number }>).some((ad) => ad.id === createdExamAdId));

  const deleteAd = await req(`/api/state-admin/exam-ads/${createdExamAdId}`, {
    method: 'DELETE',
    token: 'state-admin-token',
  });
  assert.equal(deleteAd.status, 200);
  createdExamAdId = null;

  // Verify honest 503 when COUNSELLOR_WHATSAPP_NUMBER is not configured
  const prevWa = process.env.COUNSELLOR_WHATSAPP_NUMBER;
  delete process.env.COUNSELLOR_WHATSAPP_NUMBER;
  const waRes = await req('/api/support/whatsapp');
  assert.equal(waRes.status, 503);
  if (prevWa) process.env.COUNSELLOR_WHATSAPP_NUMBER = prevWa;

  // Spot-check newly seeded real named AP institutions
  for (const code of ['SRKR', 'VVIT', 'GPRE']) {
    const spot = await req(`/api/colleges?search=${encodeURIComponent(code)}`);
    assert.equal(spot.status, 200);
    const list = spot.json.colleges as Array<{ institutionCode: string | null }>;
    assert.ok(list.some((c) => c.institutionCode === code), `Expected institution ${code}`);
  }

  // Verify side-by-side college comparison endpoint (max 3 institutions + fee structure field)
  const fourColleges = await req('/api/colleges?limit=4');
  assert.equal(fourColleges.status, 200);
  const ids = (fourColleges.json.colleges as Array<{ id: number }>).map((c) => c.id);
  assert.ok(ids.length >= 3);
  const compareRes = await req(`/api/colleges/compare?ids=${ids.join(',')}`);
  assert.equal(compareRes.status, 200);
  const compared = compareRes.json.colleges as Array<{ id: number; latestFeeStructure: unknown }>;
  assert.equal(compared.length, 3);
  assert.ok('latestFeeStructure' in compared[0]);
});
