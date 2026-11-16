import { and, desc, eq, ilike, ne, or } from 'drizzle-orm';
import { db } from '../../src/db/index.ts';
import { aiInteractionLogs, colleges, grievances } from '../../src/db/schema.ts';
import { config } from '../config.ts';

export interface GrievanceAnalysis {
  suggestedCategory: string;
  summary: string;
  urgency: 'Normal' | 'Elevated' | 'Urgent for Human Review';
  missingInfo: string;
  possibleDuplicateRef: string | null;
  draftResponse: string;
  providerUsed: 'ollama' | 'rule_based_fallback';
  advisoryNote: string;
}

export const GRIEVANCE_CATEGORIES = [
  'Fee-related issues',
  'Scholarship issues',
  'Examination issues',
  'Academic problems',
  'College administration',
  'Certificates and documents',
  'Hostel and transport',
  'Infrastructure',
  'Other student concerns',
] as const;

export const GRIEVANCE_STATUSES = [
  'Submitted',
  'Received',
  'Under review',
  'Assigned',
  'Additional information requested',
  'In progress',
  'Escalated',
  'Resolved',
  'Closed',
  'Reopened',
] as const;

export async function checkOllamaHealth(): Promise<{ online: boolean; model: string; baseUrl: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { online: false, model: config.ollamaModel, baseUrl: config.ollamaBaseUrl };
    }
    return { online: true, model: config.ollamaModel, baseUrl: config.ollamaBaseUrl };
  } catch {
    return { online: false, model: config.ollamaModel, baseUrl: config.ollamaBaseUrl };
  }
}

async function findPossibleDuplicate(
  studentUserId: number,
  collegeId: number,
  subject: string,
  description: string
): Promise<string | null> {
  const existing = await db
    .select({
      referenceNumber: grievances.referenceNumber,
      subject: grievances.subject,
      description: grievances.description,
    })
    .from(grievances)
    .where(
      and(
        eq(grievances.studentUserId, studentUserId),
        eq(grievances.collegeId, collegeId),
        ne(grievances.status, 'Closed')
      )
    )
    .orderBy(desc(grievances.createdAt))
    .limit(15);

  const tokens = new Set(
    `${subject} ${description}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)
  );
  if (tokens.size === 0) return null;

  for (const row of existing) {
    const rowTokens = new Set(
      `${row.subject} ${row.description}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4)
    );
    let overlap = 0;
    for (const t of tokens) {
      if (rowTokens.has(t)) overlap++;
    }
    const ratio = overlap / Math.max(1, Math.min(tokens.size, rowTokens.size));
    if (ratio >= 0.55 && overlap >= 3) {
      return row.referenceNumber;
    }
  }
  return null;
}

function ruleBasedGrievanceAnalysis(
  subject: string,
  description: string,
  chosenCategory: string,
  possibleDuplicateRef: string | null
): GrievanceAnalysis {
  const text = `${subject} ${description}`.toLowerCase();

  let suggestedCategory = chosenCategory;
  if (/(fee|tuition|challan|refund|receipt|fine|dues|payment)/.test(text)) {
    suggestedCategory = 'Fee-related issues';
  } else if (/(scholarship|jnanabhumi|vidya deevena|vasathi|nsp|reimbursement|rtf|mtf)/.test(text)) {
    suggestedCategory = 'Scholarship issues';
  } else if (/(exam|hall ticket|marks|result|revaluation|backlog|supply|supplementary)/.test(text)) {
    suggestedCategory = 'Examination issues';
  } else if (/(certificate|bonafide|transfer|tc|od|provisional|transcript|memo)/.test(text)) {
    suggestedCategory = 'Certificates and documents';
  } else if (/(hostel|mess|bus|transport|room|warden)/.test(text)) {
    suggestedCategory = 'Hostel and transport';
  } else if (/(classroom|lab equipment|water|electricity|building|wifi|toilet|infrastructure)/.test(text)) {
    suggestedCategory = 'Infrastructure';
  } else if (/(attendance|faculty|syllabus|lab|class|project|internship|nptel)/.test(text)) {
    suggestedCategory = 'Academic problems';
  } else if (/(principal|office|clerk|admin|harassment|ragging|grievance)/.test(text)) {
    suggestedCategory = 'College administration';
  }

  let urgency: GrievanceAnalysis['urgency'] = 'Normal';
  if (/(urgent|deadline|hall ticket|tomorrow|blocked|detained|ragging|harassment|emergency)/.test(text)) {
    urgency = 'Urgent for Human Review';
  } else if (/(pending|months|weeks|delayed|no response|escalat)/.test(text)) {
    urgency = 'Elevated';
  }

  const missingHints: string[] = [];
  if (description.trim().length < 60) {
    missingHints.push('Provide specific dates, transaction/application numbers, and concerned department.');
  }
  if (suggestedCategory === 'Fee-related issues' && !/(receipt|challan|utr|date|amount|rs|₹|\d{3,})/.test(text)) {
    missingHints.push('Include receipt/challan number, payment date, and exact fee amount.');
  }
  if (suggestedCategory === 'Scholarship issues' && !/(jnanabhumi|nsp|application|id|attendance)/.test(text)) {
    missingHints.push('Include your Jnanabhumi or NSP application ID and academic year.');
  }
  if (suggestedCategory === 'Examination issues' && !/(sem|semester|subject|hall|register|code)/.test(text)) {
    missingHints.push('Specify semester, subject code, and examination session.');
  }

  const cleanSummary = description.trim().length > 180 ? `${description.trim().slice(0, 177)}...` : description.trim();
  const draftResponse = `Thank you for submitting your concern under "${suggestedCategory}". Your complaint is queued for verification with the concerned College Nodal Officer / Department Office. Please ensure any referenced receipts or IDs are attached for prompt human review.`;

  return {
    suggestedCategory,
    summary: `${subject.trim()} — ${cleanSummary}`,
    urgency,
    missingInfo:
      missingHints.length > 0
        ? missingHints.join(' ')
        : 'Key details appear present; attach supporting proof if available.',
    possibleDuplicateRef,
    draftResponse,
    providerUsed: 'rule_based_fallback',
    advisoryNote: 'Advisory triage only (local rule-based classifier). Human college/state staff make all official decisions.',
  };
}

export async function analyzeGrievance(input: {
  studentUserId: number;
  collegeId: number;
  category: string;
  subject: string;
  description: string;
}): Promise<GrievanceAnalysis> {
  const duplicateRef = await findPossibleDuplicate(
    input.studentUserId,
    input.collegeId,
    input.subject,
    input.description
  );

  const fallback = ruleBasedGrievanceAnalysis(
    input.subject,
    input.description,
    input.category,
    duplicateRef
  );

  let finalAnalysis: GrievanceAnalysis = fallback;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const prompt = `You are a triage assistant for the Andhra Student Hub higher education grievance desk.
Analyze this student complaint and respond ONLY with valid JSON having keys:
"suggestedCategory" (one of: ${GRIEVANCE_CATEGORIES.join(', ')}),
"summary" (max 35 words neutral factual summary),
"urgency" (one of: "Normal", "Elevated", "Urgent for Human Review"),
"missingInfo" (what dates, IDs, or documents would help staff review it, max 30 words),
"draftResponse" (polite, neutral 2-sentence acknowledgement draft for the officer, never rejecting or declaring fraud).

Do NOT reject the complaint or declare fraud.
Selected Category: ${input.category}
Subject: ${input.subject}
Description: ${input.description}`;

    const response = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.1 },
      }),
    });
    clearTimeout(timer);

    if (response.ok) {
      const data = (await response.json()) as { response?: string };
      if (data.response) {
        const parsed = JSON.parse(data.response) as Record<string, string>;
        const suggestedCategory = (GRIEVANCE_CATEGORIES as readonly string[]).includes(parsed.suggestedCategory)
          ? parsed.suggestedCategory
          : fallback.suggestedCategory;
        const urgency =
          parsed.urgency === 'Urgent for Human Review' || parsed.urgency === 'Elevated' || parsed.urgency === 'Normal'
            ? parsed.urgency
            : fallback.urgency;

        finalAnalysis = {
          suggestedCategory,
          summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : fallback.summary,
          urgency,
          missingInfo:
            typeof parsed.missingInfo === 'string' && parsed.missingInfo.trim()
              ? parsed.missingInfo.trim()
              : fallback.missingInfo,
          possibleDuplicateRef: duplicateRef,
          draftResponse:
            typeof parsed.draftResponse === 'string' && parsed.draftResponse.trim()
              ? parsed.draftResponse.trim()
              : fallback.draftResponse,
          providerUsed: 'ollama',
          advisoryNote: `Advisory triage generated by local Ollama (${config.ollamaModel}). Final review is always performed by authorised human staff.`,
        };
      }
    }
  } catch {
    // Fall back silently to deterministic classifier
  }

  try {
    await db.insert(aiInteractionLogs).values({
      userRole: 'student',
      feature: 'grievance_triage',
      providerUsed: finalAnalysis.providerUsed,
      topicCategory: finalAnalysis.suggestedCategory,
    });
  } catch {
    // Non-blocking audit log
  }

  return finalAnalysis;
}

export async function runAssistantQuery(
  question: string,
  userContext?: { collegeName?: string; role?: string }
): Promise<{
  answer: string;
  providerUsed: 'ollama' | 'rule_based_fallback';
  model: string;
  references: Array<{ label: string; path: string }>;
}> {
  const q = question.toLowerCase();
  const references: Array<{ label: string; path: string }> = [];

  if (/(college|district|code|eapcet|university|affiliation)/.test(q)) {
    references.push({ label: 'Andhra Pradesh College Directory', path: '/colleges' });
  }
  if (/(scholarship|jnanabhumi|vidya|vasathi|nsp|pragati|saksham)/.test(q)) {
    references.push({ label: 'Official Scholarships Portal', path: '/scholarships' });
  }
  if (/(fee|tuition|challan|receipt|pending|statement)/.test(q)) {
    references.push({ label: 'Fee Information & Ledger', path: '/fees' });
  }
  if (/(grievance|complaint|escalat|problem|certificate|exam)/.test(q)) {
    references.push({ label: 'Student Services & Grievance Desk', path: '/services' });
  }
  if (/(nptel|swayam|credit|course)/.test(q)) {
    references.push({ label: 'NPTEL & Learning Tracks', path: '/nptel' });
  }
  if (/(gate|appsc|icet|pgecet|internship|career)/.test(q)) {
    references.push({ label: 'Career & Competitive Exams', path: '/career-exams' });
  }

  const term = `%${q.slice(0, 40)}%`;
  const collegeMatches = await db
    .select({
      name: colleges.name,
      district: colleges.district,
      institutionCode: colleges.institutionCode,
      management: colleges.management,
      verificationStatus: colleges.verificationStatus,
    })
    .from(colleges)
    .where(
      or(
        ilike(colleges.name, term),
        ilike(colleges.district, term),
        ilike(colleges.institutionCode, `%${q.slice(0, 20)}%`)
      )
    )
    .limit(4);

  let result: {
    answer: string;
    providerUsed: 'ollama' | 'rule_based_fallback';
    model: string;
    references: Array<{ label: string; path: string }>;
  } | null = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const systemContext = `You are the Andhra Student Hub (ASH) Academic & Student Support Assistant for Andhra Pradesh, India.
Distinguish verified platform facts from general guidance. Never invent institution codes, fee amounts, or fake scholarship deadlines.
If something requires official college or Jnanabhumi/NSP portal verification, tell the student clearly.
${userContext?.collegeName ? `User's institution: ${userContext.collegeName}.` : ''}`;

    const res = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.ollamaModel,
        prompt: `${systemContext}\n\nStudent Question: ${question}\n\nAnswer clearly in 3-6 sentences:`,
        stream: false,
        options: { temperature: 0.2 },
      }),
    });
    clearTimeout(timer);
    if (res.ok) {
      const payload = (await res.json()) as { response?: string };
      if (payload.response && payload.response.trim()) {
        result = {
          answer: payload.response.trim(),
          providerUsed: 'ollama',
          model: config.ollamaModel,
          references,
        };
      }
    }
  } catch {
    // Fall through cleanly to offline rule-based assistant
  }

  if (!result) {
    let answer = '';
    if (/(jnanabhumi|vidya deevena|vasathi|scholarship|nsp)/.test(q)) {
      answer =
        'Verified Platform Guidance: Andhra Pradesh state scholarships (Vidya Deevena RTF & Vasathi Deevena MTF) are officially submitted and verified on jnanabhumi.ap.gov.in (typically requiring 75% semester attendance and NPCI-Aadhaar bank seeding). Central/AICTE schemes (CSSS, Pragati, Saksham) require One-Time Registration (OTR) at scholarships.gov.in. General Guidance: You can save/track your official application ID inside ASH Scholarships or raise a Scholarship Grievance if verification is delayed.';
    } else if (/(verify|verification|student id|enrolment|enrollment|email|otp)/.test(q)) {
      answer =
        'Verified Platform Rules: College identity verification on ASH uses official college email validation, student ID/enrolment document upload, and review by your assigned College Administrator (or authorised ERP adapter). Neither mobile OTP nor email validation alone is treated as proof of college enrolment.';
    } else if (/(fee|challan|receipt|payment|pending)/.test(q)) {
      answer =
        'Verified Platform Rules: Applicable tuition, exam, lab, hostel, and transport fees are computed strictly from your college’s published fee structures and verified receipts. Where an online gateway is not configured, verified challan/NEFT payments appear after College Admin confirmation, and you can print or download your official fee statement from your Student Dashboard.';
    } else if (/(grievance|complaint|escalat|status|delay)/.test(q)) {
      answer =
        'Verified Platform Process: Submit a grievance under Student Services / Grievances with supporting evidence (PDF/JPG/PNG up to 5 MB) to receive a unique tracking reference (ASH-GRV-...). Complaints progress through Submitted → Received → Under review → Assigned → In progress → Resolved/Closed, with State Desk escalation available when unresolved.';
    } else if (/(nptel|swayam|credit)/.test(q)) {
      answer =
        'Verified Guidance: NPTEL courses offered by IITs/IISc on swayam.gov.in and nptel.ac.in may qualify for UGC/AICTE credit transfer in Andhra Pradesh universities and autonomous colleges after passing the proctored examination. Always confirm exact subject mapping with your Department Academic Coordinator before enrolling.';
    } else if (collegeMatches.length > 0) {
      const formatted = collegeMatches
        .map(
          (c) =>
            `${c.name} (${c.district}, ${c.management}${c.institutionCode ? `, Code: ${c.institutionCode}` : ''}, Status: ${c.verificationStatus})`
        )
        .join('; ');
      answer = `Verified Directory Matches in ASH: ${formatted}. Open the Colleges Directory to inspect programmes, affiliation, and official source links.`;
    } else {
      answer =
        'Local AI service (Ollama) is currently offline, so ASH is running in structured rule-based guidance mode. I can guide you on Andhra Pradesh college verification, Jnanabhumi & NSP scholarship portals, fee transparency, grievance escalation, NPTEL credit transfer, and competitive exams. Use the quick links below or check official portals for live circulars.';
    }

    result = {
      answer,
      providerUsed: 'rule_based_fallback',
      model: 'offline-rule-engine',
      references: references.length > 0 ? references : [{ label: 'Browse AP College Directory', path: '/colleges' }],
    };
  }

  try {
    await db.insert(aiInteractionLogs).values({
      userRole: userContext?.role || 'visitor',
      feature: 'assistant',
      providerUsed: result.providerUsed,
      topicCategory: references[0]?.label || 'General Guidance',
    });
  } catch {
    // Non-blocking interaction log
  }

  return result;
}
