import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const colleges = pgTable(
  'colleges',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    institutionCode: text('institution_code'),
    category: text('category').notNull(),
    management: text('management').notNull(),
    district: text('district').notNull(),
    address: text('address').notNull(),
    pinCode: text('pin_code'),
    website: text('website'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    principalContact: text('principal_contact'),
    affiliatedUniversity: text('affiliated_university').notNull(),
    autonomousStatus: text('autonomous_status'),
    programmesJson: text('programmes_json').notNull().default('[]'),
    engineeringBranchesJson: text('engineering_branches_json').notNull().default('[]'),
    degreeCoursesJson: text('degree_courses_json').notNull().default('[]'),
    facilitiesJson: text('facilities_json').notNull().default('[]'),
    admissionInfo: text('admission_info'),
    accreditation: text('accreditation'),
    academicCalendarNote: text('academic_calendar_note'),
    placementSummary: text('placement_summary'),
    verificationStatus: text('verification_status').notNull().default('pending'),
    dataSource: text('data_source').notNull(),
    sourceUrl: text('source_url'),
    lastVerifiedAt: text('last_verified_at'),
    officialEmailDomain: text('official_email_domain'),
    erpIntegrationType: text('erp_integration_type').notNull().default('manual'),
    erpStatus: text('erp_status').notNull().default('not_configured'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_colleges_name_district').on(table.name, table.district),
    index('idx_colleges_district').on(table.district),
    index('idx_colleges_category').on(table.category),
    index('idx_colleges_verification').on(table.verificationStatus),
  ]
);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').notNull().unique(), // Firebase Auth UID
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    mobile: text('mobile').notNull().default(''),
    role: text('role').notNull().default('student'), // 'student' | 'college_admin' | 'state_admin'
    collegeId: integer('college_id').references(() => colleges.id, { onDelete: 'set null' }),
    emailVerified: boolean('email_verified').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    consentAcceptedAt: timestamp('consent_accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_users_role').on(table.role),
    index('idx_users_college').on(table.collegeId),
  ]
);

export const collegePhotos = pgTable('college_photos', {
  id: serial('id').primaryKey(),
  collegeId: integer('college_id')
    .references(() => colleges.id, { onDelete: 'cascade' })
    .notNull(),
  category: text('category').notNull().default('Campus'), // Campus, Entrance, Library, Laboratory, Sports, Event
  filePath: text('file_path').notNull(),
  caption: text('caption').notNull(),
  sourceAttribution: text('source_attribution').notNull(),
  permissionReference: text('permission_reference').notNull(),
  uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  approvalStatus: text('approval_status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  approvedBy: integer('approved_by').references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const collegeLogos = pgTable(
  'college_logos',
  {
    id: serial('id').primaryKey(),
    collegeId: integer('college_id')
      .references(() => colleges.id, { onDelete: 'cascade' })
      .notNull(),
    filePath: text('file_path'),
    sourceUrl: text('source_url'),
    sourceAttribution: text('source_attribution').notNull(),
    permissionReference: text('permission_reference').notNull(),
    verificationNote: text('verification_note'),
    uploadedBy: integer('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    approvalStatus: text('approval_status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
    approvedBy: integer('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_college_logos_college').on(table.collegeId),
    index('idx_college_logos_status').on(table.approvalStatus),
  ]
);

export const posters = pgTable(
  'posters',
  {
    id: serial('id').primaryKey(),
    slug: text('slug').unique(),
    title: text('title').notNull(),
    subtitle: text('subtitle').notNull(),
    category: text('category').notNull(),
    summary: text('summary').notNull(),
    ctaLabel: text('cta_label').notNull(),
    ctaUrl: text('cta_url').notNull(),
    imageFilePath: text('image_file_path'),
    scope: text('scope').notNull().default('statewide'), // 'statewide' | 'district' | 'college'
    district: text('district'),
    collegeId: integer('college_id').references(() => colleges.id, { onDelete: 'cascade' }),
    sourceAttribution: text('source_attribution').notNull(),
    authorisationRef: text('authorisation_ref').notNull(),
    approvalStatus: text('approval_status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
    publishDate: text('publish_date'),
    expiryDate: text('expiry_date'),
    isArchived: boolean('is_archived').notNull().default(false),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    approvedBy: integer('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at'),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_posters_status').on(table.approvalStatus),
    index('idx_posters_category').on(table.category),
    index('idx_posters_college').on(table.collegeId),
  ]
);

export const collegeCorrectionRequests = pgTable('college_correction_requests', {
  id: serial('id').primaryKey(),
  collegeId: integer('college_id')
    .references(() => colleges.id, { onDelete: 'cascade' })
    .notNull(),
  requestedBy: integer('requested_by')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  proposedChangesJson: text('proposed_changes_json').notNull(),
  justification: text('justification').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

export const studentProfiles = pgTable(
  'student_profiles',
  {
    userId: integer('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    enrollmentNumber: text('enrollment_number').notNull(),
    collegeId: integer('college_id')
      .references(() => colleges.id, { onDelete: 'restrict' })
      .notNull(),
    course: text('course').notNull(),
    department: text('department').notNull(),
    academicYear: text('academic_year').notNull(),
    admissionYear: integer('admission_year').notNull(),
    currentSemester: text('current_semester').notNull().default('Semester 1'),
    dob: text('dob'),
    profilePhotoPath: text('profile_photo_path'),
    verificationStatus: text('verification_status').notNull().default('College verification pending'),
    verificationMethod: text('verification_method'),
    officialCollegeEmail: text('official_college_email'),
    officialEmailVerified: boolean('official_email_verified').notNull().default(false),
    mobileOtpVerified: boolean('mobile_otp_verified').notNull().default(false),
    consentAccepted: boolean('consent_accepted').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('uq_student_college_enrollment').on(table.collegeId, table.enrollmentNumber)]
);

export const studentShortlists = pgTable(
  'student_shortlists',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    collegeId: integer('college_id')
      .references(() => colleges.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('uq_student_shortlist_user_college').on(table.userId, table.collegeId),
    index('idx_student_shortlists_user').on(table.userId),
  ]
);

export const otpVerifications = pgTable('otp_verifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  mobile: text('mobile').notNull(),
  otpHash: text('otp_hash').notNull(),
  purpose: text('purpose').notNull().default('registration'),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const verificationRequests = pgTable('verification_requests', {
  id: serial('id').primaryKey(),
  studentUserId: integer('student_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  collegeId: integer('college_id')
    .references(() => colleges.id, { onDelete: 'cascade' })
    .notNull(),
  method: text('method').notNull(), // 'official_college_email' | 'evidence_upload' | 'erp_adapter' | 'manual_review'
  evidenceFilePath: text('evidence_file_path'),
  evidenceOriginalName: text('evidence_original_name'),
  evidenceMimeType: text('evidence_mime_type'),
  notes: text('notes'),
  status: text('status').notNull().default('Pending'),
  reviewerUserId: integer('reviewer_user_id').references(() => users.id, { onDelete: 'set null' }),
  decisionReason: text('decision_reason'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const feeStructures = pgTable(
  'fee_structures',
  {
    id: serial('id').primaryKey(),
    collegeId: integer('college_id')
      .references(() => colleges.id, { onDelete: 'cascade' })
      .notNull(),
    course: text('course').notNull(),
    academicYear: text('academic_year').notNull(),
    semester: text('semester').notNull().default('Annual'),
    tuitionFee: doublePrecision('tuition_fee').notNull().default(0),
    examinationFee: doublePrecision('examination_fee').notNull().default(0),
    laboratoryFee: doublePrecision('laboratory_fee').notNull().default(0),
    hostelFee: doublePrecision('hostel_fee').notNull().default(0),
    transportFee: doublePrecision('transport_fee').notNull().default(0),
    otherAuthorisedFee: doublePrecision('other_authorised_fee').notNull().default(0),
    dueDate: text('due_date'),
    sourceReference: text('source_reference').notNull(),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('uq_fee_struct_college_course_year').on(table.collegeId, table.course, table.academicYear, table.semester)]
);

export const studentFeeAccounts = pgTable(
  'student_fee_accounts',
  {
    id: serial('id').primaryKey(),
    studentUserId: integer('student_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    collegeId: integer('college_id')
      .references(() => colleges.id, { onDelete: 'cascade' })
      .notNull(),
    feeStructureId: integer('fee_structure_id').references(() => feeStructures.id, { onDelete: 'set null' }),
    academicYear: text('academic_year').notNull(),
    tuitionFee: doublePrecision('tuition_fee').notNull().default(0),
    examinationFee: doublePrecision('examination_fee').notNull().default(0),
    laboratoryFee: doublePrecision('laboratory_fee').notNull().default(0),
    hostelFee: doublePrecision('hostel_fee').notNull().default(0),
    transportFee: doublePrecision('transport_fee').notNull().default(0),
    otherAuthorisedFee: doublePrecision('other_authorised_fee').notNull().default(0),
    totalApplicableFee: doublePrecision('total_applicable_fee').notNull().default(0),
    dueDate: text('due_date'),
    updatedBy: integer('updated_by').references(() => users.id, { onDelete: 'set null' }),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('uq_student_fee_year').on(table.studentUserId, table.academicYear)]
);

export const feePayments = pgTable('fee_payments', {
  id: serial('id').primaryKey(),
  studentFeeAccountId: integer('student_fee_account_id')
    .references(() => studentFeeAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  studentUserId: integer('student_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  collegeId: integer('college_id')
    .references(() => colleges.id, { onDelete: 'cascade' })
    .notNull(),
  amount: doublePrecision('amount').notNull(),
  paymentMode: text('payment_mode').notNull(),
  receiptNumber: text('receipt_number').notNull().unique(),
  providerReference: text('provider_reference'),
  verificationStatus: text('verification_status').notNull().default('verified_by_college'),
  recordedBy: integer('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  paidAt: text('paid_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const scholarships = pgTable('scholarships', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  provider: text('provider').notNull(),
  meritOrNeed: text('merit_or_need').notNull().default('Need & Category Based'),
  eligibility: text('eligibility').notNull(),
  requiredDocumentsJson: text('required_documents_json').notNull().default('[]'),
  openingDate: text('opening_date'),
  deadline: text('deadline'),
  officialUrl: text('official_url').notNull(),
  isOfficial: boolean('is_official').notNull().default(true),
  verificationNote: text('verification_note').notNull(),
  lastVerifiedAt: text('last_verified_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const studentScholarshipTrackers = pgTable(
  'student_scholarship_trackers',
  {
    id: serial('id').primaryKey(),
    studentUserId: integer('student_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    scholarshipId: integer('scholarship_id')
      .references(() => scholarships.id, { onDelete: 'cascade' })
      .notNull(),
    externalApplicationId: text('external_application_id'),
    trackingStatus: text('tracking_status').notNull(),
    notes: text('notes'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('uq_student_scholarship').on(table.studentUserId, table.scholarshipId)]
);

export const grievances = pgTable(
  'grievances',
  {
    id: serial('id').primaryKey(),
    referenceNumber: text('reference_number').notNull().unique(),
    studentUserId: integer('student_user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    collegeId: integer('college_id')
      .references(() => colleges.id, { onDelete: 'cascade' })
      .notNull(),
    category: text('category').notNull(),
    subject: text('subject').notNull(),
    description: text('description').notNull(),
    contactPhone: text('contact_phone').notNull(),
    contactEmail: text('contact_email').notNull(),
    status: text('status').notNull().default('Submitted'),
    assignedTo: integer('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    aiSuggestedCategory: text('ai_suggested_category'),
    aiSummary: text('ai_summary'),
    aiUrgency: text('ai_urgency'),
    aiMissingInfo: text('ai_missing_info'),
    aiPossibleDuplicateRef: text('ai_possible_duplicate_ref'),
    aiDraftResponse: text('ai_draft_response'),
    aiProviderUsed: text('ai_provider_used'),
    escalatedToState: boolean('escalated_to_state').notNull().default(false),
    studentFeedback: text('student_feedback'),
    consentAccepted: boolean('consent_accepted').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_grievances_college').on(table.collegeId),
    index('idx_grievances_student').on(table.studentUserId),
    index('idx_grievances_status').on(table.status),
  ]
);

export const grievanceAttachments = pgTable('grievance_attachments', {
  id: serial('id').primaryKey(),
  grievanceId: integer('grievance_id')
    .references(() => grievances.id, { onDelete: 'cascade' })
    .notNull(),
  filePath: text('file_path').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedBy: integer('uploaded_by')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const grievanceHistory = pgTable('grievance_history', {
  id: serial('id').primaryKey(),
  grievanceId: integer('grievance_id')
    .references(() => grievances.id, { onDelete: 'cascade' })
    .notNull(),
  actorUserId: integer('actor_user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  actorRole: text('actor_role').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  comment: text('comment').notNull(),
  isInternal: boolean('is_internal').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notices = pgTable('notices', {
  id: serial('id').primaryKey(),
  scope: text('scope').notNull(), // 'statewide' | 'college'
  collegeId: integer('college_id').references(() => colleges.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  officialUrl: text('official_url'),
  publishedBy: integer('published_by').references(() => users.id, { onDelete: 'set null' }),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    linkPath: text('link_path'),
    isRead: boolean('is_read').notNull().default(false),
    emailDeliveryStatus: text('email_delivery_status').notNull().default('not_configured'),
    smsDeliveryStatus: text('sms_delivery_status').notNull().default('not_configured'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_notifications_user').on(table.userId, table.isRead)]
);

export const careerExams = pgTable('career_exams', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  conductingBody: text('conducting_body').notNull(),
  category: text('category').notNull(),
  eligibility: text('eligibility').notNull(),
  scheduleNote: text('schedule_note').notNull(),
  officialUrl: text('official_url').notNull(),
  isOfficial: boolean('is_official').notNull().default(true),
});

export const examAdvertisements = pgTable(
  'exam_advertisements',
  {
    id: serial('id').primaryKey(),
    examName: text('exam_name').notNull(),
    category: text('category').notNull().default('COMPETITIVE EXAM'), // 'COMPETITIVE EXAM' | 'CAREER GUIDANCE' | 'ENGINEERING' | 'DEGREE' | 'PG EXAMS' | 'GOVT EXAMS'
    deadline: text('deadline').notNull(),
    description: text('description').notNull(),
    applyUrl: text('apply_url').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_exam_ads_active').on(table.isActive)]
);

export const nptelTracks = pgTable('nptel_tracks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  discipline: text('discipline').notNull(),
  coordinatingInstitute: text('coordinating_institute').notNull(),
  durationWeeks: integer('duration_weeks').notNull(),
  creditTransferNote: text('credit_transfer_note').notNull(),
  swayamUrl: text('swayam_url').notNull(),
});

export const collegeIntegrations = pgTable('college_integrations', {
  id: serial('id').primaryKey(),
  collegeId: integer('college_id')
    .references(() => colleges.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  adapterType: text('adapter_type').notNull().default('manual_portal'),
  endpointUrl: text('endpoint_url'),
  authMode: text('auth_mode').notNull().default('bearer_token'),
  readOnly: boolean('read_only').notNull().default(true),
  writtenAuthorisationRef: text('written_authorisation_ref'),
  syncCapabilitiesJson: text('sync_capabilities_json').notNull().default('[]'),
  status: text('status').notNull().default('not_configured'),
  lastSyncAt: timestamp('last_sync_at'),
  lastError: text('last_error'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorRole: text('actor_role'),
    collegeId: integer('college_id').references(() => colleges.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    detailsJson: text('details_json'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_audit_logs_created').on(table.createdAt)]
);

export const aiInteractionLogs = pgTable('ai_interaction_logs', {
  id: serial('id').primaryKey(),
  userRole: text('user_role').notNull().default('visitor'),
  feature: text('feature').notNull(), // 'assistant' | 'grievance_triage'
  providerUsed: text('provider_used').notNull(),
  topicCategory: text('topic_category'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const privacyRequests = pgTable('privacy_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  requestType: text('request_type').notNull(), // 'data_export' | 'account_deletion'
  reason: text('reason'),
  status: text('status').notNull().default('Submitted'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Drizzle Relations
export const collegesRelations = relations(colleges, ({ many, one }) => ({
  users: many(users),
  photos: many(collegePhotos),
  logos: many(collegeLogos),
  posters: many(posters),
  feeStructures: many(feeStructures),
  grievances: many(grievances),
  shortlists: many(studentShortlists),
  integration: one(collegeIntegrations, {
    fields: [colleges.id],
    references: [collegeIntegrations.collegeId],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  college: one(colleges, {
    fields: [users.collegeId],
    references: [colleges.id],
  }),
  studentProfile: one(studentProfiles, {
    fields: [users.id],
    references: [studentProfiles.userId],
  }),
  grievances: many(grievances),
  notifications: many(notifications),
  shortlists: many(studentShortlists),
}));
