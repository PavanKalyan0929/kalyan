import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { CollegeLogoMark } from '../components/CollegeLogoMark.tsx';
import { StatusText } from '../components/StatusText.tsx';
import { apiFetch, fetchAuthenticatedBlobUrl, formatDateTime, formatINR, openAuthenticatedFile } from '../lib/api.ts';

type CollegeAdminTab =
  | 'overview'
  | 'verifications'
  | 'students'
  | 'fees'
  | 'grievances'
  | 'notices'
  | 'photos'
  | 'posters'
  | 'reports'
  | 'integration';

const ALL_GRIEVANCE_STATUSES = [
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
];

const GALLERY_CATEGORIES = [
  'Campus',
  'Buildings',
  'Canteen',
  'Sports',
  'Laboratories',
  'Library',
  'Events',
  'Student Life',
];

const POSTER_CATEGORIES = [
  'College Events & Fests',
  'Technical Symposiums',
  'Campus Announcements',
  'Career & Placement Drives',
  'Academic Advisories',
];

function AuthAssetPreview({
  url,
  alt,
  className = 'w-16 h-16 object-contain rounded border border-slate-200 bg-white p-1 shrink-0',
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let activeUrl: string | null = null;
    fetchAuthenticatedBlobUrl(url)
      .then((blobUrl) => {
        activeUrl = blobUrl;
        setSrc(blobUrl);
      })
      .catch(() => setFailed(true));

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [url]);

  if (failed) {
    return (
      <div className="w-16 h-16 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 shrink-0">
        No Preview
      </div>
    );
  }
  if (!src) {
    return <div className="w-16 h-16 rounded border border-slate-200 bg-slate-100 animate-pulse shrink-0" />;
  }
  return <img src={src} alt={alt} className={className} />;
}

export function CollegeAdminDashboardPage() {
  const [tab, setTab] = useState<CollegeAdminTab>('overview');
  const [dashboard, setDashboard] = useState<{
    college: { id: number; name: string; district: string; institutionCode: string | null };
    metrics: Record<string, number>;
  } | null>(null);
  const [verifications, setVerifications] = useState<Array<Record<string, unknown>>>([]);
  const [students, setStudents] = useState<Array<Record<string, unknown>>>([]);
  const [feeStructures, setFeeStructures] = useState<Array<Record<string, unknown>>>([]);
  const [feeAccounts, setFeeAccounts] = useState<Array<Record<string, unknown>>>([]);
  const [grievances, setGrievances] = useState<Array<Record<string, unknown>>>([]);
  const [photos, setPhotos] = useState<Array<Record<string, unknown>>>([]);
  const [logos, setLogos] = useState<Array<Record<string, unknown>>>([]);
  const [postersList, setPostersList] = useState<Array<Record<string, unknown>>>([]);
  const [report, setReport] = useState<Record<string, number> | null>(null);
  const [integration, setIntegration] = useState<{
    adapterType: string;
    endpointUrl: string | null;
    writtenAuthorisationRef: string | null;
    status: string;
  } | null>(null);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Forms
  const [decisionReason, setDecisionReason] = useState<Record<number, string>>({});
  const [rosterInput, setRosterInput] = useState('');
  const [rosterRef, setRosterRef] = useState('');
  const [feeForm, setFeeForm] = useState({
    course: 'B.Tech',
    academicYear: '2025-2026',
    semester: 'Annual',
    tuitionFee: '0',
    examinationFee: '0',
    laboratoryFee: '0',
    hostelFee: '0',
    transportFee: '0',
    otherAuthorisedFee: '0',
    dueDate: '',
    sourceReference: '',
    applyToMatchingStudents: true,
  });
  const [payForm, setPayForm] = useState<
    Record<number, { amount: string; receiptNumber: string; paymentMode: string; paidAt: string }>
  >({});
  const [grvUpdate, setGrvUpdate] = useState<Record<number, { status: string; comment: string }>>({});
  const [noticeForm, setNoticeForm] = useState({ category: 'Announcement', title: '', body: '' });
  const [corrForm, setCorrForm] = useState({
    website: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    justification: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoMeta, setPhotoMeta] = useState({
    category: 'Campus',
    caption: '',
    sourceAttribution: '',
    permissionReference: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoMeta, setLogoMeta] = useState({
    sourceAttribution: '',
    permissionReference: '',
    sourceUrl: '',
    verificationNote: '',
  });
  const [posterImage, setPosterImage] = useState<File | null>(null);
  const [posterForm, setPosterForm] = useState({
    title: '',
    subtitle: '',
    category: 'College Events & Fests',
    summary: '',
    ctaLabel: 'View College Notice',
    ctaUrl: '/colleges',
    sourceAttribution: '',
    authorisationRef: '',
    publishDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
  });
  const [erpForm, setErpForm] = useState({
    adapterType: 'manual_portal',
    endpointUrl: '',
    writtenAuthorisationRef: '',
  });

  const loadAll = async () => {
    try {
      const [d, v, s, fs, fa, g, p, lg, ps, rp, erp] = await Promise.all([
        apiFetch<typeof dashboard>('/api/college-admin/dashboard'),
        apiFetch<{ requests: Array<Record<string, unknown>> }>('/api/college-admin/verifications'),
        apiFetch<{ students: Array<Record<string, unknown>> }>('/api/college-admin/students'),
        apiFetch<{ feeStructures: Array<Record<string, unknown>> }>('/api/college-admin/fee-structures'),
        apiFetch<{ accounts: Array<Record<string, unknown>> }>('/api/college-admin/fee-accounts'),
        apiFetch<{ grievances: Array<Record<string, unknown>> }>('/api/college-admin/grievances'),
        apiFetch<{ photos: Array<Record<string, unknown>> }>('/api/college-admin/photos'),
        apiFetch<{ logos: Array<Record<string, unknown>> }>('/api/college-admin/logos'),
        apiFetch<{ posters: Array<Record<string, unknown>> }>('/api/college-admin/posters'),
        apiFetch<{ report: Record<string, number> }>('/api/college-admin/reports'),
        apiFetch<{ integration: typeof integration }>('/api/college-admin/integration'),
      ]);
      setDashboard(d);
      setVerifications(v.requests);
      setStudents(s.students);
      setFeeStructures(fs.feeStructures);
      setFeeAccounts(fa.accounts);
      setGrievances(g.grievances);
      setPhotos(p.photos);
      setLogos(lg.logos);
      setPostersList(ps.posters);
      setReport(rp.report);
      setIntegration(erp.integration);
      if (erp.integration) {
        setErpForm({
          adapterType: erp.integration.adapterType || 'manual_portal',
          endpointUrl: erp.integration.endpointUrl || '',
          writtenAuthorisationRef: erp.integration.writtenAuthorisationRef || '',
        });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to load college admin workspace');
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleVerificationDecision = async (
    id: number,
    decision: 'Verified' | 'Rejected' | 'Additional evidence required' | 'Suspended'
  ) => {
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/college-admin/verifications/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, reason: decisionReason[id] || `${decision} by College Administrator` }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Decision failed');
    }
  };

  const handleBatchRosterVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    const enrollmentNumbers = rosterInput
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await apiFetch<{ message: string }>('/api/college-admin/students/verify-roster', {
        method: 'POST',
        body: JSON.stringify({ enrollmentNumbers, verificationReference: rosterRef }),
      });
      setMsg(res.message);
      setRosterInput('');
      setRosterRef('');
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Roster verification failed');
    }
  };

  const handleSaveFeeStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/college-admin/fee-structures', {
        method: 'POST',
        body: JSON.stringify({
          ...feeForm,
          tuitionFee: Number(feeForm.tuitionFee),
          examinationFee: Number(feeForm.examinationFee),
          laboratoryFee: Number(feeForm.laboratoryFee),
          hostelFee: Number(feeForm.hostelFee),
          transportFee: Number(feeForm.transportFee),
          otherAuthorisedFee: Number(feeForm.otherAuthorisedFee),
        }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to save fee structure');
    }
  };

  const handleRecordPayment = async (accountId: number) => {
    setErr('');
    setMsg('');
    const p = payForm[accountId];
    if (!p) return;
    try {
      const res = await apiFetch<{ message: string }>(`/api/college-admin/fee-accounts/${accountId}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(p.amount),
          paymentMode: p.paymentMode || 'College Challan',
          receiptNumber: p.receiptNumber,
          paidAt: p.paidAt || new Date().toISOString().slice(0, 10),
        }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Payment recording failed');
    }
  };

  const handleGrievanceUpdate = async (grievanceId: number) => {
    setErr('');
    setMsg('');
    const u = grvUpdate[grievanceId];
    if (!u) return;
    try {
      const res = await apiFetch<{ message: string }>(`/api/college-admin/grievances/${grievanceId}/status`, {
        method: 'POST',
        body: JSON.stringify(u),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Grievance update failed');
    }
  };

  const handlePublishNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/college-admin/notices', {
        method: 'POST',
        body: JSON.stringify(noticeForm),
      });
      setMsg(res.message);
      setNoticeForm({ category: 'Announcement', title: '', body: '' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Notice failed');
    }
  };

  const handleCorrectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/college-admin/correction-request', {
        method: 'POST',
        body: JSON.stringify(corrForm),
      });
      setMsg(res.message);
      setCorrForm({ website: '', contactEmail: '', contactPhone: '', address: '', justification: '' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Request failed');
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) return;
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      fd.append('category', photoMeta.category);
      fd.append('caption', photoMeta.caption);
      fd.append('sourceAttribution', photoMeta.sourceAttribution);
      fd.append('permissionReference', photoMeta.permissionReference);
      const res = await apiFetch<{ message: string }>('/api/college-admin/photos', { method: 'POST', body: fd });
      setMsg(res.message);
      setPhotoFile(null);
      setPhotoMeta({ category: 'Campus', caption: '', sourceAttribution: '', permissionReference: '' });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Photo upload failed');
    }
  };

  const handleLogoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoFile) return;
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      fd.append('logo', logoFile);
      fd.append('sourceAttribution', logoMeta.sourceAttribution);
      fd.append('permissionReference', logoMeta.permissionReference);
      if (logoMeta.sourceUrl) fd.append('sourceUrl', logoMeta.sourceUrl);
      if (logoMeta.verificationNote) fd.append('verificationNote', logoMeta.verificationNote);

      const res = await apiFetch<{ message: string }>('/api/college-admin/logos', { method: 'POST', body: fd });
      setMsg(res.message);
      setLogoFile(null);
      setLogoMeta({ sourceAttribution: '', permissionReference: '', sourceUrl: '', verificationNote: '' });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Logo upload failed');
    }
  };

  const handlePosterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const fd = new FormData();
      if (posterImage) fd.append('image', posterImage);
      fd.append('title', posterForm.title);
      fd.append('subtitle', posterForm.subtitle);
      fd.append('category', posterForm.category);
      fd.append('summary', posterForm.summary);
      fd.append('ctaLabel', posterForm.ctaLabel);
      fd.append('ctaUrl', posterForm.ctaUrl);
      fd.append('sourceAttribution', posterForm.sourceAttribution);
      fd.append('authorisationRef', posterForm.authorisationRef);
      if (posterForm.publishDate) fd.append('publishDate', posterForm.publishDate);
      if (posterForm.expiryDate) fd.append('expiryDate', posterForm.expiryDate);

      const res = await apiFetch<{ message: string }>('/api/college-admin/posters', { method: 'POST', body: fd });
      setMsg(res.message);
      setPosterImage(null);
      setPosterForm({
        title: '',
        subtitle: '',
        category: 'College Events & Fests',
        summary: '',
        ctaLabel: 'View College Notice',
        ctaUrl: `/colleges/${dashboard?.college.id || ''}`,
        sourceAttribution: '',
        authorisationRef: '',
        publishDate: new Date().toISOString().slice(0, 10),
        expiryDate: '',
      });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Poster submission failed');
    }
  };

  const downloadInstitutionReportCsv = () => {
    if (!dashboard || !report) return;
    const rows = [
      ['Andhra Student Hub — Institutional Status & Audit Summary'],
      ['Institution', dashboard.college.name],
      ['District', dashboard.college.district],
      ['Code', dashboard.college.institutionCode || 'Not assigned'],
      ['Generated At', new Date().toISOString()],
      [],
      ['Metric', 'Value'],
      ['Registered Students', String(report.totalStudents ?? 0)],
      ['Verified Students', String(report.verifiedStudents ?? 0)],
      ['Pending Verifications', String(report.pendingStudents ?? 0)],
      ['Approved Campus Photographs', String(report.approvedPhotosCount ?? 0)],
      ['Pending Campus Photographs', String(report.pendingPhotosCount ?? 0)],
      ['Approved Official Logos', String(report.approvedLogosCount ?? 0)],
      ['Active Approved Posters', String(report.activePostersCount ?? 0)],
      ['Resolved Grievances', String(report.resolvedGrievances ?? 0)],
      ['Escalated Grievances', String(report.escalatedGrievances ?? 0)],
      ['Total Assessed Fees (INR)', String(report.totalAssessedFees ?? 0)],
      ['Verified Collected Fees (INR)', String(report.totalCollectedFees ?? 0)],
      ['Pending Fee Balance (INR)', String(report.totalPendingFees ?? 0)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASH-Institution-Report-${dashboard.college.institutionCode || dashboard.college.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveErp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/college-admin/integration', {
        method: 'PUT',
        body: JSON.stringify(erpForm),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to save integration configuration');
    }
  };

  if (!dashboard) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 py-10 text-sm text-slate-600">Loading College Admin Portal...</div>
    );
  }

  const approvedLogo = logos.find((l) => l.approvalStatus === 'approved');

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CollegeLogoMark
            name={dashboard.college.name}
            institutionCode={dashboard.college.institutionCode}
            approvedLogoId={approvedLogo ? Number(approvedLogo.id) : null}
            size="md"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#9A7B2C]">
              College Administrator Console · Tenant-Isolated Scope
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-[#0F2547]">{dashboard.college.name}</h1>
            <p className="text-sm text-slate-600">
              {dashboard.college.district} District{' '}
              {dashboard.college.institutionCode ? `· Code: ${dashboard.college.institutionCode}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-slate-200/70 rounded-lg">
        {(
          [
            ['overview', 'Overview'],
            ['verifications', `Verifications (${dashboard.metrics.pendingVerifications || 0})`],
            ['students', `Students (${dashboard.metrics.totalStudents || 0})`],
            ['fees', 'Fees & Payments'],
            ['grievances', `Grievances (${dashboard.metrics.openGrievances || 0})`],
            ['notices', 'Notices & Profile'],
            ['photos', 'Official Logo & Photos'],
            ['posters', `Posters (${postersList.length})`],
            ['reports', 'Reports'],
            ['integration', 'Read-Only ERP'],
          ] as Array<[CollegeAdminTab, string]>
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap cursor-pointer ${
              tab === k ? 'bg-white text-slate-950 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 text-sm">{msg}</div>}
      {err && <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">{err}</div>}

      {tab === 'overview' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            ['Registered Students', dashboard.metrics.totalStudents],
            ['Verified Students', dashboard.metrics.verifiedStudents],
            ['Pending Verifications', dashboard.metrics.pendingVerifications],
            ['Open Grievances', dashboard.metrics.openGrievances],
            ['Assessed Fees', formatINR(dashboard.metrics.totalAssessedFees)],
            ['Verified Collections', formatINR(dashboard.metrics.totalCollectedFees)],
            ['Pending Balances', formatINR(dashboard.metrics.totalPendingFees)],
          ].map(([label, val]) => (
            <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950">{val}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'verifications' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-950">Student Identity Verification Queue</h2>
          {verifications.length === 0 ? (
            <p className="text-sm text-slate-500">No verification requests for this institution yet.</p>
          ) : (
            <div className="divide-y divide-slate-200">
              {verifications.map((vr) => {
                const id = Number(vr.id);
                return (
                  <div key={id} className="py-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {String(vr.studentName)} · <span className="font-mono text-xs">{String(vr.enrollmentNumber)}</span>
                        </p>
                        <p className="text-xs text-slate-600">
                          {String(vr.course)} ({String(vr.department)}) · Method: {String(vr.method)} ·{' '}
                          {formatDateTime(String(vr.createdAt))}
                        </p>
                        {Boolean(vr.officialCollegeEmail) && (
                          <p className="text-xs text-slate-600">Official College Email: {String(vr.officialCollegeEmail)}</p>
                        )}
                      </div>
                      <StatusText status={String(vr.status)} />
                    </div>
                    {Boolean(vr.evidenceOriginalName) && (
                      <button
                        type="button"
                        onClick={() => {
                          openAuthenticatedFile(
                            `/api/files/verification/${id}`,
                            String(vr.evidenceOriginalName)
                          ).catch((e) => setErr(e instanceof Error ? e.message : 'Unable to open file'));
                        }}
                        className="inline-block text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                      >
                        Inspect Private Evidence Document ({String(vr.evidenceOriginalName)}) →
                      </button>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        placeholder="Decision reason / staff remarks..."
                        value={decisionReason[id] || ''}
                        onChange={(e) => setDecisionReason({ ...decisionReason, [id]: e.target.value })}
                        className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleVerificationDecision(id, 'Verified')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer"
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerificationDecision(id, 'Additional evidence required')}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 rounded-lg cursor-pointer"
                      >
                        Request Evidence
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerificationDecision(id, 'Rejected')}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 rounded-lg cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVerificationDecision(id, 'Suspended')}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-200 rounded-lg cursor-pointer"
                      >
                        Suspend
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'students' && (
        <div className="space-y-6">
          <form onSubmit={handleBatchRosterVerify} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-950">Batch Roster Verification</h2>
            <p className="text-xs text-slate-600">
              Paste authorised enrolment numbers (separated by commas, spaces, or newlines) to verify matching students registered under {dashboard.college.name}.
            </p>
            <textarea
              required
              rows={3}
              value={rosterInput}
              onChange={(e) => setRosterInput(e.target.value)}
              placeholder="24A91A0501, 24A91A0502..."
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={rosterRef}
                onChange={(e) => setRosterRef(e.target.value)}
                placeholder="Authorised admission register / ERP circular reference"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
              <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg cursor-pointer">
                Verify Matching Enrolments
              </button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
            <h2 className="text-lg font-bold text-slate-950 mb-4">
              Enrolled Student Directory (Assigned Institution Only)
            </h2>
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4">Enrolment</th>
                  <th className="py-2 pr-4">Student Name</th>
                  <th className="py-2 pr-4">Course & Branch</th>
                  <th className="py-2 pr-4">Year & Semester</th>
                  <th className="py-2">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={String(s.id)}>
                    <td className="py-2.5 pr-4 font-mono text-xs">{String(s.enrollmentNumber)}</td>
                    <td className="py-2.5 pr-4 font-medium">{String(s.fullName)}</td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {String(s.course)} · {String(s.department)}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {String(s.academicYear)} ({String(s.currentSemester || 'Semester 1')})
                    </td>
                    <td className="py-2.5">
                      <StatusText status={String(s.verificationStatus)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'fees' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveFeeStructure} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Publish Authorised Fee Structure</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <input
                type="text"
                required
                placeholder="Course (e.g. B.Tech)"
                value={feeForm.course}
                onChange={(e) => setFeeForm({ ...feeForm, course: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Academic Year (e.g. 2025-2026)"
                value={feeForm.academicYear}
                onChange={(e) => setFeeForm({ ...feeForm, academicYear: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Semester (e.g. Annual / Sem 1)"
                value={feeForm.semester}
                onChange={(e) => setFeeForm({ ...feeForm, semester: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Official Order / GO Reference"
                value={feeForm.sourceReference}
                onChange={(e) => setFeeForm({ ...feeForm, sourceReference: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {(
                [
                  ['tuitionFee', 'Tuition'],
                  ['examinationFee', 'Exam'],
                  ['laboratoryFee', 'Lab'],
                  ['hostelFee', 'Hostel'],
                  ['transportFee', 'Transport'],
                  ['otherAuthorisedFee', 'Other'],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs text-slate-600">{label} (INR)</label>
                  <input
                    type="number"
                    min={0}
                    value={feeForm[field]}
                    onChange={(e) => setFeeForm({ ...feeForm, [field]: e.target.value })}
                    className="mt-1 w-full px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={feeForm.applyToMatchingStudents}
                onChange={(e) => setFeeForm({ ...feeForm, applyToMatchingStudents: e.target.checked })}
              />
              Apply this fee structure to matching enrolled students automatically
            </label>
            <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg cursor-pointer">
              Save Fee Structure
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-slate-950">Published Structures ({feeStructures.length})</h3>
            <div className="mt-3 divide-y divide-slate-100 text-sm">
              {feeStructures.map((fs) => (
                <div key={String(fs.id)} className="py-2.5 flex justify-between">
                  <span>
                    {String(fs.course)} · {String(fs.academicYear)} ({String(fs.semester || 'Annual')}) —{' '}
                    {String(fs.sourceReference)}
                  </span>
                  <span className="font-mono font-semibold">
                    {formatINR(
                      Number(fs.tuitionFee) +
                        Number(fs.examinationFee) +
                        Number(fs.laboratoryFee) +
                        Number(fs.hostelFee) +
                        Number(fs.transportFee) +
                        Number(fs.otherAuthorisedFee)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-950">Student Fee Accounts & Record Verified Payment</h3>
            {feeAccounts.length === 0 ? (
              <p className="text-sm text-slate-500">No student fee accounts linked yet.</p>
            ) : (
              feeAccounts.map((acc) => {
                const id = Number(acc.id);
                const pf = payForm[id] || {
                  amount: '',
                  receiptNumber: '',
                  paymentMode: 'College Challan',
                  paidAt: new Date().toISOString().slice(0, 10),
                };
                return (
                  <div key={id} className="border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-semibold">
                        {String(acc.studentName)} ({String(acc.enrollmentNumber)}) · {String(acc.academicYear)}
                      </span>
                      <span className="font-mono">
                        Total: {formatINR(Number(acc.totalApplicableFee))} · Paid: {formatINR(Number(acc.amountPaid))}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="number"
                        placeholder="Amount (INR)"
                        value={pf.amount}
                        onChange={(e) => setPayForm({ ...payForm, [id]: { ...pf, amount: e.target.value } })}
                        className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Official Receipt / Challan No."
                        value={pf.receiptNumber}
                        onChange={(e) => setPayForm({ ...payForm, [id]: { ...pf, receiptNumber: e.target.value } })}
                        className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                      />
                      <select
                        value={pf.paymentMode}
                        onChange={(e) => setPayForm({ ...payForm, [id]: { ...pf, paymentMode: e.target.value } })}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="College Challan">College Challan</option>
                        <option value="Bank NEFT/RTGS">Bank NEFT/RTGS</option>
                        <option value="Scholarship Reimbursement">Scholarship Reimbursement</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRecordPayment(id)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer"
                      >
                        Post Verified Receipt
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'grievances' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-950">Institution Grievance Queue</h2>
          {grievances.length === 0 ? (
            <p className="text-sm text-slate-500">No grievances filed for this college.</p>
          ) : (
            grievances.map((g) => {
              const id = Number(g.id);
              const u = grvUpdate[id] || { status: 'In progress', comment: '' };
              const attachments = (g.attachments as Array<{ id: number; originalName: string }>) || [];
              return (
                <div key={id} className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-slate-500">
                        {String(g.referenceNumber)} · {String(g.studentName)} ({String(g.enrollmentNumber)}) ·{' '}
                        {String(g.category)}
                      </p>
                      <p className="font-semibold text-slate-950">{String(g.subject)}</p>
                    </div>
                    <StatusText status={String(g.status)} />
                  </div>
                  <p className="text-sm text-slate-700">{String(g.description)}</p>

                  {Boolean(g.aiDraftResponse) && (
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-slate-700 space-y-1">
                      <p className="font-semibold text-slate-900">
                        AI Advisory Hint ({String(g.aiUrgency || 'Normal')} · {String(g.aiSuggestedCategory || g.category)})
                      </p>
                      <p>Suggested Response Draft: {String(g.aiDraftResponse)}</p>
                    </div>
                  )}

                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => {
                            openAuthenticatedFile(`/api/files/grievance/${att.id}`, att.originalName).catch((e) =>
                              setErr(e instanceof Error ? e.message : 'Unable to open attachment')
                            );
                          }}
                          className="text-xs font-semibold text-blue-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded cursor-pointer"
                        >
                          Attachment: {att.originalName}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                    <select
                      value={u.status}
                      onChange={(e) => setGrvUpdate({ ...grvUpdate, [id]: { ...u, status: e.target.value } })}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      {ALL_GRIEVANCE_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Official staff response note..."
                      value={u.comment}
                      onChange={(e) => setGrvUpdate({ ...grvUpdate, [id]: { ...u, comment: e.target.value } })}
                      className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleGrievanceUpdate(id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded-lg cursor-pointer"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'notices' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handlePublishNotice} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Publish College Notice & Notify Students</h2>
            <select
              value={noticeForm.category}
              onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="Announcement">Announcement</option>
              <option value="Examination">Examination</option>
              <option value="Scholarship">Scholarship</option>
              <option value="Fee Reminder">Fee Reminder</option>
            </select>
            <input
              type="text"
              required
              placeholder="Notice title"
              value={noticeForm.title}
              onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <textarea
              required
              rows={4}
              placeholder="Notice body..."
              value={noticeForm.body}
              onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg cursor-pointer">
              Publish College Notice
            </button>
          </form>

          <form onSubmit={handleCorrectionRequest} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Request Directory Profile Correction</h2>
            <p className="text-xs text-slate-600">
              Changes require State Administrator verification before updating the public directory.
            </p>
            <input
              type="url"
              placeholder="Official Website URL"
              value={corrForm.website}
              onChange={(e) => setCorrForm({ ...corrForm, website: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="Official Contact Email"
                value={corrForm.contactEmail}
                onChange={(e) => setCorrForm({ ...corrForm, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Official Contact Phone"
                value={corrForm.contactPhone}
                onChange={(e) => setCorrForm({ ...corrForm, contactPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <input
              type="text"
              placeholder="Updated Address (optional)"
              value={corrForm.address}
              onChange={(e) => setCorrForm({ ...corrForm, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <textarea
              required
              rows={3}
              placeholder="Justification & official reference..."
              value={corrForm.justification}
              onChange={(e) => setCorrForm({ ...corrForm, justification: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg cursor-pointer">
              Submit Correction Request
            </button>
          </form>
        </div>
      )}

      {tab === 'photos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleLogoUpload} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#0F2547]">Submit Official College Logo</h2>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Upload only your institution’s official crest or emblem in crisp PNG, JPEG, or WebP format (max 5 MB). Remains private until approved by the State Administrator.
                </p>
              </div>
              <input
                type="file"
                required
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:font-semibold"
              />
              <input
                type="text"
                required
                placeholder="Official source attribution (e.g. Registrar / PR Office)"
                value={logoMeta.sourceAttribution}
                onChange={(e) => setLogoMeta({ ...logoMeta, sourceAttribution: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Written permission reference (e.g. Principal Memo No.)"
                value={logoMeta.permissionReference}
                onChange={(e) => setLogoMeta({ ...logoMeta, permissionReference: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="url"
                placeholder="Official website source URL (optional)"
                value={logoMeta.sourceUrl}
                onChange={(e) => setLogoMeta({ ...logoMeta, sourceUrl: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="Verification note for State Reviewer (optional)"
                value={logoMeta.verificationNote}
                onChange={(e) => setLogoMeta({ ...logoMeta, verificationNote: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-[#0F2547] hover:bg-[#1E3A8A] rounded-lg cursor-pointer"
              >
                Submit Official Logo for Approval
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-bold text-[#0F2547]">Official Logo Submissions ({logos.length})</h2>
              {logos.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No official logo submitted yet. Until approved, ASH displays a monogram placeholder labeled “Unofficial Placeholder”.
                </p>
              ) : (
                <div className="space-y-3">
                  {logos.map((lg) => (
                    <div key={String(lg.id)} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <AuthAssetPreview url={`/api/files/college-logo/${String(lg.id)}`} alt="Submitted logo" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{String(lg.sourceAttribution)}</p>
                          <p className="text-xs text-slate-500 font-mono">Ref: {String(lg.permissionReference)}</p>
                          {Boolean(lg.rejectionReason) && (
                            <p className="text-xs text-red-700 mt-0.5">{String(lg.rejectionReason)}</p>
                          )}
                        </div>
                      </div>
                      <StatusText status={String(lg.approvalStatus)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handlePhotoUpload} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#0F2547]">Upload Authentic Campus Photograph</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every college must maintain its own authentic photo gallery (never AI-generated or stock images). State approval is required before public display.
              </p>
              <select
                value={photoMeta.category}
                onChange={(e) => setPhotoMeta({ ...photoMeta, category: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {GALLERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="file"
                required
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:font-semibold"
              />
              <input
                type="text"
                required
                placeholder="Photo caption (e.g. Main College Entrance Gate)"
                value={photoMeta.caption}
                onChange={(e) => setPhotoMeta({ ...photoMeta, caption: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Source attribution (e.g. Official College PR Office)"
                value={photoMeta.sourceAttribution}
                onChange={(e) => setPhotoMeta({ ...photoMeta, sourceAttribution: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="Written permission reference number"
                value={photoMeta.permissionReference}
                onChange={(e) => setPhotoMeta({ ...photoMeta, permissionReference: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-[#1E3A8A] hover:bg-[#0F2547] rounded-lg cursor-pointer"
              >
                Upload Photograph for State Approval
              </button>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-bold text-[#0F2547]">Uploaded Photographs ({photos.length})</h2>
              {photos.length === 0 ? (
                <p className="text-sm text-slate-500">No photographs uploaded yet.</p>
              ) : (
                <div className="space-y-3">
                  {photos.map((p) => (
                    <div key={String(p.id)} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AuthAssetPreview
                          url={`/api/files/college-photo/${String(p.id)}`}
                          alt={String(p.caption)}
                          className="w-20 h-14 object-cover rounded border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#9A7B2C]">{String(p.category || 'Campus')}</p>
                          <p className="text-sm font-semibold truncate">{String(p.caption)}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {String(p.sourceAttribution)} · {String(p.permissionReference)}
                          </p>
                        </div>
                      </div>
                      <StatusText status={String(p.approvalStatus)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'posters' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={handlePosterSubmit} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F2547]">Submit Authorised College Poster</h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Publish notices, symposiums, placement drives, or academic circulars. Posters undergo State Administrator approval before appearing on the public directory.
              </p>
            </div>
            <select
              value={posterForm.category}
              onChange={(e) => setPosterForm({ ...posterForm, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {POSTER_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              minLength={5}
              placeholder="Poster Title (e.g. Annual Tech Symposium 2026)"
              value={posterForm.title}
              onChange={(e) => setPosterForm({ ...posterForm, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              minLength={4}
              placeholder="Subtitle / Issuing Department"
              value={posterForm.subtitle}
              onChange={(e) => setPosterForm({ ...posterForm, subtitle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <textarea
              required
              rows={3}
              minLength={10}
              placeholder="Concise official announcement summary..."
              value={posterForm.summary}
              onChange={(e) => setPosterForm({ ...posterForm, summary: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="CTA Label"
                value={posterForm.ctaLabel}
                onChange={(e) => setPosterForm({ ...posterForm, ctaLabel: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="text"
                required
                placeholder="CTA URL or route"
                value={posterForm.ctaUrl}
                onChange={(e) => setPosterForm({ ...posterForm, ctaUrl: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500">Publish Date</label>
                <input
                  type="date"
                  value={posterForm.publishDate}
                  onChange={(e) => setPosterForm({ ...posterForm, publishDate: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500">Expiry Date (optional)</label>
                <input
                  type="date"
                  value={posterForm.expiryDate}
                  onChange={(e) => setPosterForm({ ...posterForm, expiryDate: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <input
              type="text"
              required
              placeholder="Source attribution (e.g. Placement Cell / Principal)"
              value={posterForm.sourceAttribution}
              onChange={(e) => setPosterForm({ ...posterForm, sourceAttribution: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="Written authorisation / circular reference"
              value={posterForm.authorisationRef}
              onChange={(e) => setPosterForm({ ...posterForm, authorisationRef: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Optional Authentic Poster Image (JPEG/PNG/WebP, max 5 MB)
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setPosterImage(e.target.files?.[0] || null)}
                className="mt-1 w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:font-semibold"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold text-white bg-[#0F2547] hover:bg-[#1E3A8A] rounded-lg cursor-pointer"
            >
              Submit Poster for State Approval
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0F2547]">Submitted College Posters ({postersList.length})</h2>
            {postersList.length === 0 ? (
              <p className="text-sm text-slate-500">No posters submitted by this college yet.</p>
            ) : (
              <div className="space-y-3">
                {postersList.map((ps) => (
                  <div key={String(ps.id)} className="border border-slate-200 rounded-lg p-4 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#9A7B2C]">
                          {String(ps.category)}
                        </p>
                        <p className="font-serif text-base font-bold text-[#0F2547]">{String(ps.title)}</p>
                        <p className="text-xs text-slate-600">{String(ps.subtitle)}</p>
                      </div>
                      <StatusText status={String(ps.approvalStatus)} />
                    </div>
                    {Boolean(ps.hasImage) && (
                      <AuthAssetPreview
                        url={`/api/files/poster/${String(ps.id)}`}
                        alt={String(ps.title)}
                        className="w-full h-36 object-cover rounded border border-slate-200"
                      />
                    )}
                    <p className="text-xs text-slate-700 leading-relaxed">{String(ps.summary)}</p>
                    <p className="text-[11px] text-slate-500">
                      {String(ps.sourceAttribution)} · Ref: {String(ps.authorisationRef)}
                    </p>
                    {Boolean(ps.rejectionReason) && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                        Reviewer Note: {String(ps.rejectionReason)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F2547]">Institutional Verification, Media & Fee Report</h2>
              <p className="text-xs text-slate-600 mt-1">
                Live counts compiled strictly from verified institutional records for {dashboard.college.name}.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadInstitutionReportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2547] hover:bg-[#1E3A8A] rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export Institutional CSV
            </button>
          </div>

          {!report ? (
            <p className="text-sm text-slate-500">Report metrics unavailable.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                ['Registered Students', String(report.totalStudents ?? 0)],
                ['Verified Students', String(report.verifiedStudents ?? 0)],
                ['Pending Verifications', String(report.pendingStudents ?? 0)],
                ['Approved Official Logos', String(report.approvedLogosCount ?? 0)],
                ['Approved Campus Photos', String(report.approvedPhotosCount ?? 0)],
                ['Pending Campus Photos', String(report.pendingPhotosCount ?? 0)],
                ['Active Posters', String(report.activePostersCount ?? 0)],
                ['Resolved Grievances', String(report.resolvedGrievances ?? 0)],
                ['Escalated Grievances', String(report.escalatedGrievances ?? 0)],
                ['Assessed Fees', formatINR(report.totalAssessedFees ?? 0)],
                ['Verified Collected', formatINR(report.totalCollectedFees ?? 0)],
                ['Pending Balance', formatINR(report.totalPendingFees ?? 0)],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#0F2547]">{val}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'integration' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSaveErp} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Read-Only College ERP Adapter Configuration</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              ASH connects only to authorised, read-only institutional endpoints or CSV rosters with documented written approval from college leadership. ASH never scrapes external college portals.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-800">Adapter Type</label>
              <select
                value={erpForm.adapterType}
                onChange={(e) => setErpForm({ ...erpForm, adapterType: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="manual_portal">Manual College Admin Portal (Default)</option>
                <option value="csv_authorised_import">Authorised CSV Roster Import</option>
                <option value="rest_readonly">Authorised Read-Only REST Endpoint</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800">Read-Only Endpoint URL (if REST)</label>
              <input
                type="url"
                value={erpForm.endpointUrl}
                onChange={(e) => setErpForm({ ...erpForm, endpointUrl: e.target.value })}
                placeholder="https://erp.college.edu.in/api/readonly/ash"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800">Written Authorisation Reference *</label>
              <input
                type="text"
                required
                minLength={4}
                value={erpForm.writtenAuthorisationRef}
                onChange={(e) => setErpForm({ ...erpForm, writtenAuthorisationRef: e.target.value })}
                placeholder="Principal / Registrar Memo No."
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg cursor-pointer">
              Save Read-Only Adapter Metadata
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 text-sm">
            <h3 className="text-base font-bold text-slate-950">Current Connector Status</h3>
            <p className="text-slate-600">
              Adapter Type: <strong className="font-mono">{integration?.adapterType || 'manual_portal'}</strong>
            </p>
            <p className="text-slate-600">
              Status: <strong className="font-mono">{integration?.status || 'not_configured'}</strong>
            </p>
            <p className="text-slate-600">
              Written Ref: <span className="font-mono">{integration?.writtenAuthorisationRef || 'Not recorded'}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
