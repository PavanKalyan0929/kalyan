# Andhra Student Hub (ASH) — Backend API Contract

All private endpoints require `Authorization: Bearer <Firebase ID Token>` obtained from Firebase Google Sign-In.

## 1. Public Endpoints
- `GET /api/health` — Clean service liveness metadata (`{ ok, service, version, proposedDomain, integrations }`). Never exposes DB telemetry or credentials.
- `GET /api/stats/public` — Live statewide counts from Cloud SQL (`totalColleges`, `verifiedColleges`, `districtsCovered`, `registeredStudents`, `verifiedStudents`, `activeScholarships`, `activeNptelCourses`, `resolvedGrievances`).
- `GET /api/colleges` — Searchable/paginated AP College Directory (`search`, `district`, `category`, `management`, `university`, `course`, `page`, `limit`).
- `GET /api/colleges/:id` — Detailed verified institution record, approved campus photos (`category`, `caption`, `sourceAttribution`, `permissionReference`), authorised fee structures, and college notices.
- `GET /api/scholarships` — State/Central/Private scholarship listings (`category`, `search`).
- `GET /api/career-exams` — Official entrance/government exam tracker (`category`, `search`).
- `GET /api/nptel` — Curated NPTEL / SWAYAM free course tracks (`discipline`, `level`, `search`).
- `GET /api/notices` — Official statewide announcements.
- `POST /api/assistant/query` — Local AI / deterministic rule-based Q&A grounded in verified AP records.
- `POST /api/payments/webhook` — HMAC-SHA256 verified payment gateway webhook (`503` when gateway secret unconfigured).

## 2. Authentication, Setup & OTP
- `GET /api/setup/status` — Indicates whether `needsStateAdminBootstrap` is `true` (0 `state_admin` rows).
- `POST /api/setup/bootstrap-state-admin` — Auth required; initializes first State Admin once, permanently `403` afterwards.
- `GET /api/auth/me` — Returns current user, college summary, `studentProfile`, `needsStudentOnboarding`, and `unreadNotifications`.
- `POST /api/auth/register-student` — Completes college-linked student onboarding (multipart `studentPhoto` optional, `consentAccepted: true` required). Sets status strictly to `College verification pending`.
- `POST /api/auth/otp/send` — Sends 6-digit salted SHA-256 OTP (`503` when SMS provider unconfigured; 60s cooldown).
- `POST /api/auth/otp/verify` — Timing-safe verification (`10`-minute expiry, max `5` attempts). Never bypasses college identity verification.
- `GET /api/auth/integration-status` — Readiness flags for SMS, SMTP, Payment Gateway, and Ollama.

## 3. Student Workspace (`/api/student/*` — Student Role Only)
- `GET /api/student/dashboard` — Profile, college, verification history, authorised fee totals, scholarship trackers, grievances, notices, notifications, and privacy requests.
- `PATCH /api/student/profile` — Updates editable profile fields (`fullName`, `academicYear`, `currentSemester`, `dob`). Cannot mutate `collegeId`, `enrollmentNumber`, or `verificationStatus`.
- `POST /api/student/verification/submit` — Uploads private ID/bonafide evidence or submits official college email for staff review.
- `GET /api/student/fees/statement` — Downloadable fee breakdown computed strictly from college-authorised records.
- `POST /api/student/fees/pay` — Returns `503` when payment gateway is unconfigured (never fakes payment success).
- `POST /api/student/scholarships/:id/track` — Personal bookmark & application reference tracker.
- `GET /api/student/grievances` & `POST /api/student/grievances` — Submit grievances with up to 3 private attachments & DPDP consent.
- `GET /api/student/grievances/:id` — Full non-internal status history & attachment metadata.
- `POST /api/student/grievances/:id/evidence` — Append additional evidence files or notes.
- `POST /api/student/grievances/:id/feedback` — Record post-resolution feedback or reopen a resolved/closed ticket.
- `POST /api/student/grievances/:id/escalate` — Escalate complaint to the State Higher Education Desk.
- `GET /api/student/privacy/export` & `POST /api/student/privacy/request` — DPDP data export and account deletion governance requests.

## 4. College Administrator (`/api/college-admin/*` — Strictly Tenant-Scoped to `req.user.collegeId`)
- `GET /api/college-admin/dashboard`
- `GET /api/college-admin/students` & `POST /api/college-admin/students/verify-roster`
- `GET /api/college-admin/verifications` & `POST /api/college-admin/verifications/:id/decision`
- `GET /api/college-admin/fee-structures` & `POST /api/college-admin/fee-structures`
- `GET /api/college-admin/fee-accounts` & `POST /api/college-admin/fee-accounts/:accountId/payments`
- `GET /api/college-admin/grievances` & `POST /api/college-admin/grievances/:id/status`
- `POST /api/college-admin/notices`
- `POST /api/college-admin/correction-request`
- `GET /api/college-admin/photos` & `POST /api/college-admin/photos`
- `GET /api/college-admin/integration` & `PUT /api/college-admin/integration`

## 5. State Administrator (`/api/state-admin/*` — State Admin Role Only)
- `GET /api/state-admin/dashboard`
- `GET /api/state-admin/colleges`, `POST /api/state-admin/colleges`, `PATCH /api/state-admin/colleges/:id/verify`
- `POST /api/state-admin/colleges/import`, `GET /api/state-admin/colleges/export`, `POST /api/state-admin/colleges/merge`
- `GET /api/state-admin/correction-requests` & `POST /api/state-admin/correction-requests/:id/decision`
- `GET /api/state-admin/photos/pending` & `POST /api/state-admin/photos/:id/decision`
- `GET /api/state-admin/college-admins` & `POST /api/state-admin/college-admins` (passwordless Google email role binding)
- `GET /api/state-admin/grievances` & `POST /api/state-admin/grievances/:id/action`
- `POST /api/state-admin/scholarships` & `POST /api/state-admin/notices`
- `GET /api/state-admin/integrations`, `GET /api/state-admin/privacy-requests`, `GET /api/state-admin/audit-logs`

## 6. Protected File Serving (`/api/files/*`)
- `GET /api/files/verification/:requestId` — Student owner, assigned College Admin, or State Admin.
- `GET /api/files/grievance/:attachmentId` — Grievance owner, assigned College Admin, or State Admin.
- `GET /api/files/student-photo/:studentUserId` — Student owner, assigned College Admin, or State Admin.
- `GET /api/files/college-photo/:photoId` — Public when `approvalStatus === 'approved'`; otherwise requires State Admin or owning College Admin.
