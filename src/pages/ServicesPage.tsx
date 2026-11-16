import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Paperclip, ShieldAlert, Upload } from 'lucide-react';
import { StatusText } from '../components/StatusText.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch, formatDateTime, openAuthenticatedFile } from '../lib/api.ts';

const GRIEVANCE_CATEGORIES = [
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

interface GrievanceRow {
  id: number;
  referenceNumber: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  aiSuggestedCategory: string | null;
  aiSummary: string | null;
  aiUrgency: string | null;
  aiMissingInfo: string | null;
  aiPossibleDuplicateRef: string | null;
  aiProviderUsed: string | null;
  escalatedToState: boolean;
  studentFeedback: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GrievanceDetail {
  grievance: GrievanceRow;
  attachments: Array<{ id: number; originalName: string; mimeType: string; fileSize: number }>;
  history: Array<{
    id: number;
    actorRole: string;
    actorName: string;
    previousStatus: string | null;
    newStatus: string;
    comment: string;
    createdAt: string;
  }>;
}

export function ServicesPage() {
  const { user, needsStudentOnboarding } = useAuth();
  const [grievances, setGrievances] = useState<GrievanceRow[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<GrievanceDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const [category, setCategory] = useState<string>(GRIEVANCE_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.mobile || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [files, setFiles] = useState<FileList | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [escalateReason, setEscalateReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<FileList | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackReopen, setFeedbackReopen] = useState(false);

  const loadGrievances = async () => {
    if (user?.role !== 'student' || needsStudentOnboarding) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ grievances: GrievanceRow[] }>('/api/student/grievances');
      setGrievances(res.grievances);
    } catch {
      setGrievances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setContactPhone((prev) => prev || user.mobile);
      setContactEmail((prev) => prev || user.email);
      void loadGrievances();
    }
  }, [user, needsStudentOnboarding]);

  const openDetail = async (id: number) => {
    try {
      const detail = await apiFetch<GrievanceDetail>(`/api/student/grievances/${id}`);
      setSelectedDetail(detail);
    } catch {
      setSelectedDetail(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMsg('');
    setSubmitError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('subject', subject);
      formData.append('description', description);
      formData.append('contactPhone', contactPhone);
      formData.append('contactEmail', contactEmail);
      formData.append('consentAccepted', String(consentAccepted));
      if (files) {
        Array.from(files)
          .slice(0, 3)
          .forEach((f) => formData.append('attachments', f));
      }

      const res = await apiFetch<{
        id: number;
        referenceNumber: string;
        analysis: {
          suggestedCategory: string;
          urgency: string;
          missingInfo: string;
          providerUsed: string;
          advisoryNote: string;
        };
      }>('/api/student/grievances', {
        method: 'POST',
        body: formData,
      });

      setSubmitMsg(
        `Complaint registered with Reference ${res.referenceNumber}. AI Triage (${res.analysis.providerUsed}): Suggested Category "${res.analysis.suggestedCategory}", Urgency "${res.analysis.urgency}". ${res.analysis.advisoryNote}`
      );
      setSubject('');
      setDescription('');
      setFiles(null);
      await loadGrievances();
      await openDetail(res.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit grievance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvidenceSubmit = async (grievanceId: number) => {
    setSubmitError('');
    setSubmitMsg('');
    try {
      const fd = new FormData();
      if (evidenceNote.trim()) fd.append('note', evidenceNote.trim());
      if (evidenceFiles) {
        Array.from(evidenceFiles)
          .slice(0, 3)
          .forEach((f) => fd.append('attachments', f));
      }
      const res = await apiFetch<{ message: string }>(`/api/student/grievances/${grievanceId}/evidence`, {
        method: 'POST',
        body: fd,
      });
      setSubmitMsg(res.message);
      setEvidenceFiles(null);
      setEvidenceNote('');
      await loadGrievances();
      await openDetail(grievanceId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to upload additional evidence');
    }
  };

  const handleFeedbackSubmit = async (grievanceId: number) => {
    setSubmitError('');
    setSubmitMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/student/grievances/${grievanceId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ feedback: feedbackText, reopen: feedbackReopen }),
      });
      setSubmitMsg(res.message);
      setFeedbackText('');
      setFeedbackReopen(false);
      await loadGrievances();
      await openDetail(grievanceId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit feedback');
    }
  };

  const handleEscalate = async (grievanceId: number) => {
    setSubmitError('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/student/grievances/${grievanceId}/escalate`, {
        method: 'POST',
        body: JSON.stringify({ reason: escalateReason }),
      });
      setSubmitMsg(res.message);
      setEscalateReason('');
      await loadGrievances();
      await openDetail(grievanceId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Escalation failed');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Student Services & Grievance Redressal</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl">
          Submit official grievances to your College Grievance Cell with supporting documents and auditable status tracking. Optional local AI assists with classification and urgency hints—human staff always make official review decisions.
        </p>
      </div>

      {!user ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-950">Student Sign-In Required</h2>
          <p className="mt-2 text-sm text-slate-600">
            To protect student privacy and link complaints securely to your verified institution, please sign in with Google or register as a student to submit or track grievances.
          </p>
          <div className="mt-5 flex gap-3">
            <Link to="/login" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg">
              Sign In with Google
            </Link>
            <Link to="/register" className="px-5 py-2.5 text-sm font-semibold text-slate-800 border border-slate-300 rounded-lg">
              Student Registration
            </Link>
          </div>
        </div>
      ) : user.role !== 'student' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-950">Administrative Grievance Queue</h2>
          <p className="mt-2 text-sm text-slate-600">
            You are signed in as <strong>{user.role === 'college_admin' ? 'College Administrator' : 'State Administrator'}</strong>. Review and resolve student grievances from your dashboard.
          </p>
          <Link
            to={user.role === 'college_admin' ? '/college-admin' : '/state-admin'}
            className="mt-4 inline-block px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg"
          >
            Open Admin Grievance Queue →
          </Link>
        </div>
      ) : needsStudentOnboarding ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-2xl">
          <h2 className="text-xl font-semibold text-slate-950">Complete College-Linked Registration First</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your Google account is signed in, but your Andhra Pradesh college and enrolment profile have not been linked yet. Complete onboarding to file or track institutional grievances.
          </p>
          <Link
            to="/register"
            className="mt-4 inline-block px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg"
          >
            Complete Student Onboarding →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Submit Grievance Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-slate-950">Submit New Grievance</h2>

            {submitMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-3 text-xs leading-relaxed">
                {submitMsg}
              </div>
            )}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-xs">
                {submitError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-800">Grievance Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {GRIEVANCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Subject</label>
              <input
                type="text"
                required
                minLength={5}
                maxLength={160}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of the issue"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Detailed Description</label>
              <textarea
                required
                minLength={20}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include dates, receipt/application IDs, and department details..."
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Contact Mobile</label>
                <input
                  type="tel"
                  required
                  pattern="[6-9][0-9]{9}"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Contact Email</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">
                Supporting Documents / Photographs (optional, max 3 files, 5 MB each)
              </label>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setFiles(e.target.files)}
                className="mt-1 w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:font-semibold"
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-700 pt-1">
              <input
                type="checkbox"
                required
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I confirm that these grievance details and supporting attachments are genuine and authorise my College Grievance Cell and State Higher Education Desk to review them under ASH DPDP privacy rules.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting & Running Triage...' : 'Submit Grievance'}
            </button>
          </form>

          {/* My Grievances List + Detail Timeline */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-bold text-slate-950">My Registered Grievances</h2>
              {loading ? (
                <p className="mt-4 text-sm text-slate-500">Loading complaints...</p>
              ) : grievances.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">You have not submitted any grievances yet.</p>
              ) : (
                <div className="mt-4 divide-y divide-slate-200">
                  {grievances.map((g) => (
                    <div key={g.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono text-slate-500">
                          {g.referenceNumber} · {g.category} · {formatDateTime(g.createdAt)}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{g.subject}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <StatusText status={g.status} />
                        <button
                          type="button"
                          onClick={() => openDetail(g.id)}
                          className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap cursor-pointer"
                        >
                          Inspect Timeline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDetail && (
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <p className="text-xs font-mono text-slate-500">{selectedDetail.grievance.referenceNumber}</p>
                    <h3 className="text-lg font-bold text-slate-950 mt-0.5">{selectedDetail.grievance.subject}</h3>
                  </div>
                  <StatusText status={selectedDetail.grievance.status} />
                </div>

                <p className="text-sm text-slate-700 leading-relaxed">{selectedDetail.grievance.description}</p>

                {selectedDetail.grievance.aiSummary && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 space-y-1">
                    <p className="font-semibold text-slate-900">
                      Automated Advisory Triage ({selectedDetail.grievance.aiProviderUsed}) — Human Review Required
                    </p>
                    <p>
                      Suggested Category: {selectedDetail.grievance.aiSuggestedCategory} · Urgency:{' '}
                      {selectedDetail.grievance.aiUrgency}
                    </p>
                    <p>Missing Information Check: {selectedDetail.grievance.aiMissingInfo}</p>
                    {selectedDetail.grievance.aiPossibleDuplicateRef && (
                      <p className="text-amber-800 font-medium">
                        Possible overlap detected with earlier reference: {selectedDetail.grievance.aiPossibleDuplicateRef}
                      </p>
                    )}
                  </div>
                )}

                {selectedDetail.attachments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" /> Private Uploaded Attachments
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {selectedDetail.attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => {
                            openAuthenticatedFile(`/api/files/grievance/${att.id}`, att.originalName).catch((err) =>
                              setSubmitError(err instanceof Error ? err.message : 'Unable to open file')
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {att.originalName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-800">Auditable Status History</p>
                  <div className="mt-2 space-y-3 border-t border-slate-100 pt-3">
                    {selectedDetail.history.map((h) => (
                      <div key={h.id} className="text-xs">
                        <p className="font-semibold text-slate-900">
                          {h.newStatus} ·{' '}
                          <span className="font-normal text-slate-500">
                            {h.actorName} ({h.actorRole}) · {formatDateTime(h.createdAt)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-slate-600">{h.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload Additional Evidence */}
                {!['Closed'].includes(selectedDetail.grievance.status) && (
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-blue-900" />
                      Submit Additional Evidence or Clarification
                    </p>
                    <input
                      type="text"
                      value={evidenceNote}
                      onChange={(e) => setEvidenceNote(e.target.value)}
                      placeholder="Add clarification note (optional if uploading files)"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={(e) => setEvidenceFiles(e.target.files)}
                        className="flex-1 text-xs text-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleEvidenceSubmit(selectedDetail.grievance.id)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap cursor-pointer"
                      >
                        Upload Update
                      </button>
                    </div>
                  </div>
                )}

                {/* Post-resolution feedback / reopen */}
                {['Resolved', 'Closed'].includes(selectedDetail.grievance.status) && (
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-800">Student Feedback & Reopen Option</p>
                    {selectedDetail.grievance.studentFeedback && (
                      <p className="text-xs bg-slate-50 border border-slate-200 rounded p-2 text-slate-700">
                        Previous feedback: {selectedDetail.grievance.studentFeedback}
                      </p>
                    )}
                    <input
                      type="text"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Share resolution feedback or explain why the issue remains unresolved..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={feedbackReopen}
                          onChange={(e) => setFeedbackReopen(e.target.checked)}
                        />
                        Reopen this grievance for follow-up review
                      </label>
                      <button
                        type="button"
                        onClick={() => handleFeedbackSubmit(selectedDetail.grievance.id)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  </div>
                )}

                {!['Resolved', 'Closed', 'Escalated'].includes(selectedDetail.grievance.status) && (
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-700" />
                      Request State-Level Escalation
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={escalateReason}
                        onChange={(e) => setEscalateReason(e.target.value)}
                        placeholder="Explain why escalation to State Administration is needed (min 10 chars)"
                        className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleEscalate(selectedDetail.grievance.id)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg whitespace-nowrap cursor-pointer"
                      >
                        Escalate to State Desk
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
