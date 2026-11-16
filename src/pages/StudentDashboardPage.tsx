import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Bookmark,
  Building2,
  Download,
  ExternalLink,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { CollegeLogoMark } from '../components/CollegeLogoMark.tsx';
import { StatusText } from '../components/StatusText.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useShortlist } from '../context/ShortlistContext.tsx';
import {
  apiFetch,
  fetchAuthenticatedBlobUrl,
  formatDate,
  formatDateTime,
  formatINR,
  openAuthenticatedFile,
} from '../lib/api.ts';

interface StudentDashboardData {
  user: {
    id: number;
    fullName: string;
    email: string;
    mobile: string;
    createdAt: string;
  };
  profile: {
    enrollmentNumber: string;
    collegeId: number;
    course: string;
    department: string;
    academicYear: string;
    admissionYear: number;
    currentSemester: string;
    dob: string | null;
    profilePhotoPath: string | null;
    verificationStatus: string;
    verificationMethod: string | null;
    officialCollegeEmail: string | null;
    mobileOtpVerified: boolean;
  };
  college: {
    id: number;
    name: string;
    institutionCode: string | null;
    district: string;
    affiliatedUniversity: string;
    officialEmailDomain: string | null;
    website?: string | null;
    address?: string | null;
    management?: string | null;
    category?: string | null;
    accreditation?: string | null;
    approvedLogoId?: number | null;
  };
  verificationHistory: Array<{
    id: number;
    method: string;
    evidenceOriginalName: string | null;
    notes: string | null;
    status: string;
    decisionReason: string | null;
    reviewedAt: string | null;
    createdAt: string;
    reviewerName: string | null;
  }>;
  fees: {
    hasAuthorisedFeeRecord: boolean;
    accounts: Array<{
      id: number;
      academicYear: string;
      tuitionFee: number;
      examinationFee: number;
      laboratoryFee: number;
      hostelFee: number;
      transportFee: number;
      otherAuthorisedFee: number;
      totalApplicableFee: number;
      dueDate: string | null;
      sourceReference: string | null;
    }>;
    payments: Array<{
      id: number;
      amount: number;
      paymentMode: string;
      receiptNumber: string;
      verificationStatus: string;
      paidAt: string;
    }>;
    totals: { totalApplicable: number; totalPaid: number; pendingAmount: number };
    paymentGatewayConfigured: boolean;
  };
  scholarshipTrackers: Array<{
    id: number;
    title: string;
    category: string;
    trackingStatus: string;
    externalApplicationId: string | null;
    officialUrl: string;
  }>;
  grievances: Array<{
    id: number;
    referenceNumber: string;
    category: string;
    subject: string;
    status: string;
    createdAt: string;
  }>;
  collegeNotices: Array<{ id: number; category: string; title: string; body: string; publishedAt: string }>;
  statewideNotices: Array<{ id: number; category: string; title: string; body: string; publishedAt: string }>;
  notifications: Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    emailDeliveryStatus: string;
    smsDeliveryStatus: string;
    createdAt: string;
  }>;
  privacyRequests: Array<{
    id: number;
    requestType: string;
    reason: string | null;
    status: string;
    createdAt: string;
  }>;
  smsConfigured: boolean;
}

type StudentTab = 'overview' | 'college' | 'verification' | 'fees' | 'career' | 'notifications' | 'profile';

export function StudentDashboardPage() {
  const { refreshAuth } = useAuth();
  const { savedIds, toggleSave } = useShortlist();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [shortlistedColleges, setShortlistedColleges] = useState<
    Array<{
      collegeId: number;
      name: string;
      institutionCode: string | null;
      category: string;
      district: string;
    }>
  >([]);
  const [tab, setTab] = useState<StudentTab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [photoBlobUrl, setPhotoBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{
      colleges: Array<{
        collegeId: number;
        name: string;
        institutionCode: string | null;
        category: string;
        district: string;
      }>;
    }>('/api/student/shortlists')
      .then((res) => setShortlistedColleges(res.colleges || []))
      .catch(() => setShortlistedColleges([]));
  }, [savedIds]);

  // Verification submission state
  const [verMethod, setVerMethod] = useState<'evidence_upload' | 'official_college_email'>('evidence_upload');
  const [officialEmail, setOfficialEmail] = useState('');
  const [verNotes, setVerNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Profile & DPDP Privacy state
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    academicYear: '',
    currentSemester: '',
    dob: '',
  });
  const [otpMobile, setOtpMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch<StudentDashboardData>('/api/student/dashboard');
      setData(res);
      setProfileForm({
        fullName: res.user.fullName,
        academicYear: res.profile.academicYear,
        currentSemester: res.profile.currentSemester || 'Semester 1',
        dob: res.profile.dob || '',
      });
      setOtpMobile(res.user.mobile || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    let activeUrl: string | null = null;
    if (data?.profile.profilePhotoPath) {
      fetchAuthenticatedBlobUrl(`/api/files/student-photo/${data.user.id}`)
        .then((url) => {
          activeUrl = url;
          setPhotoBlobUrl(url);
        })
        .catch(() => setPhotoBlobUrl(null));
    } else {
      setPhotoBlobUrl(null);
    }
    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [data?.user.id, data?.profile.profilePhotoPath]);

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('method', verMethod);
      if (verMethod === 'official_college_email') {
        formData.append('officialCollegeEmail', officialEmail);
      }
      if (verNotes) formData.append('notes', verNotes);
      if (evidenceFile) formData.append('evidence', evidenceFile);

      const res = await apiFetch<{ message: string }>('/api/student/verification/submit', {
        method: 'POST',
        body: formData,
      });
      setMessage(res.message);
      setEvidenceFile(null);
      setVerNotes('');
      await loadDashboard();
      await refreshAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification submission failed');
    }
  };

  const attemptGatewayPayment = async () => {
    setMessage('');
    setError('');
    try {
      await apiFetch('/api/student/fees/pay', { method: 'POST', body: JSON.stringify({}) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment gateway unavailable');
    }
  };

  const downloadStatementCsv = () => {
    if (!data) return;
    const rows = [
      ['Andhra Student Hub - Official Fee Statement'],
      ['Student Name', data.user.fullName],
      ['Enrolment Number', data.profile.enrollmentNumber],
      ['College', data.college.name],
      ['Course', data.profile.course],
      ['Total Applicable Fee (INR)', String(data.fees.totals.totalApplicable)],
      ['Total Verified Paid (INR)', String(data.fees.totals.totalPaid)],
      ['Pending Balance (INR)', String(data.fees.totals.pendingAmount)],
      [],
      ['Receipt Number', 'Payment Mode', 'Amount (INR)', 'Verification Status', 'Paid Date'],
      ...data.fees.payments.map((p) => [
        p.receiptNumber,
        p.paymentMode,
        String(p.amount),
        p.verificationStatus,
        p.paidAt,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ASH-Fee-Statement-${data.profile.enrollmentNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markNotificationRead = async (id: number) => {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
    await loadDashboard();
    await refreshAuth();
  };

  const markAllRead = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'POST' });
    await loadDashboard();
    await refreshAuth();
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await apiFetch<{ message: string }>('/api/student/profile', {
        method: 'PATCH',
        body: JSON.stringify(profileForm),
      });
      setMessage(res.message);
      await loadDashboard();
      await refreshAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile');
    }
  };

  const sendOtp = async () => {
    setMessage('');
    setError('');
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ mobile: otpMobile, purpose: 'profile_update' }),
      });
      setMessage(res.message);
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to dispatch OTP');
    }
  };

  const verifyOtp = async () => {
    setMessage('');
    setError('');
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ mobile: otpMobile, otp: otpCode }),
      });
      setMessage(res.message);
      setOtpSent(false);
      setOtpCode('');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    }
  };

  const downloadPersonalDataJson = async () => {
    setError('');
    try {
      const exportData = await apiFetch<Record<string, unknown>>('/api/student/privacy/export');
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ASH-Student-Data-${data?.profile.enrollmentNumber || 'export'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('Personal data export downloaded cleanly.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export personal data');
    }
  };

  const requestAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await apiFetch<{ message: string }>('/api/student/privacy/request', {
        method: 'POST',
        body: JSON.stringify({ requestType: 'account_deletion', reason: deletionReason }),
      });
      setMessage(res.message);
      setDeletionReason('');
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Privacy request failed');
    }
  };

  if (loading && !data) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10">
        <div className="h-8 bg-slate-200 rounded w-1/3 animate-pulse" />
        <div className="mt-6 h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CollegeLogoMark
            name={data.college.name}
            institutionCode={data.college.institutionCode}
            approvedLogoId={data.college.approvedLogoId}
            size="md"
          />
          {photoBlobUrl && (
            <img
              src={photoBlobUrl}
              alt={data.user.fullName}
              className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
            />
          )}
          <div>
            <p className="text-xs text-slate-500 font-mono">
              Enrolment: {data.profile.enrollmentNumber} · {data.profile.course} ({data.profile.department}) ·{' '}
              {data.profile.currentSemester}
            </p>
            <h1 className="mt-1 font-serif text-2xl font-bold text-[#0F2547]">{data.user.fullName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              <Link to={`/colleges/${data.college.id}`} className="text-[#1E3A8A] font-medium hover:underline">
                {data.college.name}
              </Link>{' '}
              · {data.college.district}{' '}
              {data.college.institutionCode ? `(${data.college.institutionCode})` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-1.5">
          <span className="text-xs text-slate-500">College Identity Verification</span>
          <StatusText status={data.profile.verificationStatus} />
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-1 p-1 bg-slate-200/70 rounded-lg no-print">
        {(
          [
            ['overview', 'Overview & Notices'],
            ['college', 'My College'],
            ['verification', 'Identity Verification'],
            ['fees', 'Fee Ledger & Statement'],
            ['career', 'Career & Scholarships'],
            ['notifications', `Notifications (${data.notifications.filter((n) => !n.isRead).length})`],
            ['profile', 'Profile & DPDP Privacy'],
          ] as Array<[StudentTab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              tab === key ? 'bg-white text-slate-950 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 text-sm">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">{error}</div>
      )}

      {/* TAB: OVERVIEW */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Total Applicable Fee</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950">
                {data.fees.hasAuthorisedFeeRecord ? formatINR(data.fees.totals.totalApplicable) : 'Not Published'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Verified Amount Paid</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-emerald-700">
                {formatINR(data.fees.totals.totalPaid)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Pending Fee Balance</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-700">
                {formatINR(data.fees.totals.pendingAmount)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500">Open Grievances</p>
              <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-950">
                {data.grievances.filter((g) => !['Resolved', 'Closed'].includes(g.status)).length}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-950">College & Statewide Notices</h2>
                <Link to="/career-exams" className="text-xs font-semibold text-blue-900 hover:underline">
                  Exam Updates →
                </Link>
              </div>
              <div className="mt-4 divide-y divide-slate-100">
                {[...data.collegeNotices, ...data.statewideNotices].slice(0, 6).map((n) => (
                  <div key={`${n.title}-${n.id}`} className="py-3">
                    <p className="text-xs text-slate-500">
                      {n.category} · {formatDate(n.publishedAt)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{n.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-950">My Shortlisted Colleges ({shortlistedColleges.length})</h2>
                  <Link to="/colleges?tab=saved" className="text-xs font-semibold text-blue-900 hover:underline">
                    Manage Shortlist →
                  </Link>
                </div>
                {shortlistedColleges.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    No colleges shortlisted yet. Bookmark institutions in the directory to compare them here.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {shortlistedColleges.slice(0, 4).map((sc) => (
                      <div key={sc.collegeId} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <Link
                            to={`/colleges/${sc.collegeId}`}
                            className="font-semibold text-[#0F2547] hover:text-[#1E3A8A] truncate block"
                          >
                            {sc.name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {sc.district} · {sc.category}
                            {sc.institutionCode ? ` · ${sc.institutionCode}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void toggleSave(sc.collegeId, sc.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#EA580C] border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0 cursor-pointer"
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                          Saved
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-950">Scholarship Trackers</h2>
                  <Link to="/scholarships" className="text-xs font-semibold text-blue-900 hover:underline">
                    Browse All →
                  </Link>
                </div>
                {data.scholarshipTrackers.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">
                    No scholarships bookmarked yet. Visit the Scholarships page to track Jnanabhumi or NSP schemes.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {data.scholarshipTrackers.map((st) => (
                      <div key={st.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">{st.title}</p>
                          <p className="text-xs text-slate-500">
                            {st.trackingStatus}{' '}
                            {st.externalApplicationId ? `· ID: ${st.externalApplicationId}` : ''}
                          </p>
                        </div>
                        <a
                          href={st.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-900 hover:underline"
                        >
                          Portal
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-950">Recent Grievances</h2>
                  <Link to="/services" className="text-xs font-semibold text-blue-900 hover:underline">
                    Manage Grievances →
                  </Link>
                </div>
                {data.grievances.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No grievances filed.</p>
                ) : (
                  <div className="mt-3 divide-y divide-slate-100">
                    {data.grievances.slice(0, 4).map((g) => (
                      <div key={g.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                        <div>
                          <p className="font-mono text-xs text-slate-500">{g.referenceNumber}</p>
                          <p className="font-medium text-slate-900">{g.subject}</p>
                        </div>
                        <StatusText status={g.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MY COLLEGE */}
      {tab === 'college' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <CollegeLogoMark
                name={data.college.name}
                institutionCode={data.college.institutionCode}
                approvedLogoId={data.college.approvedLogoId}
                size="lg"
                showPlaceholderLabel
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9A7B2C]">
                  Linked Institution
                </p>
                <h2 className="mt-1 font-serif text-xl font-bold text-[#0F2547]">{data.college.name}</h2>
                <p className="mt-1 text-xs text-slate-600">
                  {data.college.district} District · {data.college.affiliatedUniversity}
                </p>
              </div>
            </div>

            <dl className="pt-4 border-t border-slate-200 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Institution Code</dt>
                <dd className="font-mono font-semibold text-slate-900">{data.college.institutionCode || 'Not assigned'}</dd>
              </div>
              {data.college.category && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Category & Type</dt>
                  <dd className="text-slate-900">
                    {data.college.category} {data.college.management ? `· ${data.college.management}` : ''}
                  </dd>
                </div>
              )}
              {data.college.accreditation && (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Accreditation</dt>
                  <dd className="text-slate-900 text-right">{data.college.accreditation}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Official Domain</dt>
                <dd className="font-mono text-slate-900">
                  {data.college.officialEmailDomain ? `@${data.college.officialEmailDomain}` : 'Not registered'}
                </dd>
              </div>
              {data.college.address && (
                <div className="pt-2 border-t border-slate-100">
                  <dt className="text-xs text-slate-500">Campus Address</dt>
                  <dd className="mt-1 text-xs text-slate-700 leading-relaxed">{data.college.address}</dd>
                </div>
              )}
            </dl>

            <div className="pt-3 flex flex-wrap gap-3">
              <Link
                to={`/colleges/${data.college.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2547] hover:bg-[#1E3A8A] rounded-lg"
              >
                <Building2 className="w-3.5 h-3.5" />
                Open Full College Profile & Gallery
              </Link>
              {data.college.website && (
                <a
                  href={data.college.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Official Website
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#0F2547]">Official College Circulars & Notices</h3>
            {data.collegeNotices.length === 0 ? (
              <p className="text-sm text-slate-500">
                No notices published by {data.college.name} administrators yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.collegeNotices.map((n) => (
                  <div key={n.id} className="py-3.5">
                    <p className="text-xs font-medium text-[#9A7B2C]">
                      {n.category} · {formatDate(n.publishedAt)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{n.title}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: CAREER & SCHOLARSHIPS */}
      {tab === 'career' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link
              to="/upsc"
              className="bg-[#0F2547] text-white border border-[#1E3A8A] rounded-xl p-5 hover:bg-[#15315E] transition-colors"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E6C775]">Civil Services</p>
              <h3 className="mt-1 font-serif text-lg font-semibold">UPSC & APPSC Center</h3>
              <p className="mt-1.5 text-xs text-slate-200">
                CSE stages, syllabus structure & verified portals.
              </p>
            </Link>
            <Link
              to="/scholarships"
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#1E3A8A] transition-colors"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A7B2C]">State & Central</p>
              <h3 className="mt-1 font-serif text-lg font-semibold text-[#0F2547]">Scholarships Directory</h3>
              <p className="mt-1.5 text-xs text-slate-600">
                Jnanabhumi & NSP schemes with bookmark tracking.
              </p>
            </Link>
            <Link
              to="/nptel"
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#1E3A8A] transition-colors"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A7B2C]">Skill Credits</p>
              <h3 className="mt-1 font-serif text-lg font-semibold text-[#0F2547]">NPTEL & SWAYAM</h3>
              <p className="mt-1.5 text-xs text-slate-600">
                IIT/IISc verified online courses & credit transfer guidance.
              </p>
            </Link>
            <Link
              to="/career-exams"
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-[#1E3A8A] transition-colors"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9A7B2C]">All Exams</p>
              <h3 className="mt-1 font-serif text-lg font-semibold text-[#0F2547]">Competitive Exams & Jobs</h3>
              <p className="mt-1.5 text-xs text-slate-600">
                SSC, Banking IBPS, RRB, GATE & AP employment calendars.
              </p>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#9A7B2C]" />
                  <h2 className="text-lg font-bold text-[#0F2547]">Bookmarked Scholarship Trackers</h2>
                </div>
                <Link to="/scholarships" className="text-xs font-semibold text-[#1E3A8A] hover:underline">
                  Manage Trackers →
                </Link>
              </div>
              {data.scholarshipTrackers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No scholarship trackers added yet. Open the Scholarships directory to track Jnanabhumi or NSP schemes.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.scholarshipTrackers.map((st) => (
                    <div key={st.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                      <div>
                        <p className="font-semibold text-slate-900">{st.title}</p>
                        <p className="text-xs text-slate-500">
                          Status: {st.trackingStatus}{' '}
                          {st.externalApplicationId ? `· Ref: ${st.externalApplicationId}` : ''}
                        </p>
                      </div>
                      <a
                        href={st.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E3A8A] hover:underline shrink-0"
                      >
                        Official Portal
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1E3A8A]" />
                <h2 className="text-lg font-bold text-[#0F2547]">Student Services & Posters</h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Access the Student Grievance Redressal Desk, browse verified statewide educational awareness posters, or consult district institutional directories.
              </p>
              <div className="pt-2 flex flex-wrap gap-2.5">
                <Link
                  to="/services"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#0F2547] rounded-lg"
                >
                  Open Student Helpdesk & Grievances
                </Link>
                <Link
                  to="/posters"
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  View Awareness Posters
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: IDENTITY VERIFICATION */}
      {tab === 'verification' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={submitVerification} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Submit College Identity Verification</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verification confirms you are a genuine enrolled student of <strong>{data.college.name}</strong>. Email verification alone is never treated as proof of enrolment—your College Administrator reviews evidence or synchronises with the college database.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-800">Verification Method</label>
              <select
                value={verMethod}
                onChange={(e) => setVerMethod(e.target.value as 'evidence_upload' | 'official_college_email')}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="evidence_upload">Upload Student ID / Bonafide Proof (Recommended)</option>
                <option value="official_college_email">
                  Official College Email Validation{' '}
                  {data.college.officialEmailDomain ? `(@${data.college.officialEmailDomain})` : '(Domain not set)'}
                </option>
              </select>
            </div>

            {verMethod === 'official_college_email' ? (
              <div>
                <label className="block text-sm font-medium text-slate-800">Official College Email</label>
                <input
                  type="email"
                  required
                  value={officialEmail}
                  onChange={(e) => setOfficialEmail(e.target.value)}
                  placeholder={data.college.officialEmailDomain ? `student@${data.college.officialEmailDomain}` : 'Not available'}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Private Evidence File (JPG, PNG, WebP, or PDF up to 5 MB)
                </label>
                <input
                  type="file"
                  required
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:font-semibold"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Stored privately. Accessible only to you and your assigned College Administrator.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-800">Notes for Reviewer (optional)</label>
              <textarea
                rows={3}
                value={verNotes}
                onChange={(e) => setVerNotes(e.target.value)}
                placeholder="Mention semester, roll number, or admission allotment order..."
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              Submit for College Review
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-slate-950">Verification Decision History</h2>
            {data.verificationHistory.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No verification submissions recorded yet.</p>
            ) : (
              <div className="mt-4 divide-y divide-slate-200">
                {data.verificationHistory.map((vr) => (
                  <div key={vr.id} className="py-4 space-y-1.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">Method: {vr.method.replace(/_/g, ' ')}</span>
                      <StatusText status={vr.status} />
                    </div>
                    <p className="text-xs text-slate-500">Submitted: {formatDateTime(vr.createdAt)}</p>
                    {vr.evidenceOriginalName && (
                      <button
                        type="button"
                        onClick={() => {
                          openAuthenticatedFile(`/api/files/verification/${vr.id}`, vr.evidenceOriginalName || undefined).catch(
                            (err) => setError(err instanceof Error ? err.message : 'Unable to open file')
                          );
                        }}
                        className="inline-block text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                      >
                        View Uploaded Evidence ({vr.evidenceOriginalName}) →
                      </button>
                    )}
                    {vr.decisionReason && (
                      <p className="text-xs bg-slate-50 border border-slate-200 rounded p-2.5 text-slate-700">
                        <strong>Reviewer ({vr.reviewerName || 'College Staff'}):</strong> {vr.decisionReason}{' '}
                        {vr.reviewedAt ? `(${formatDateTime(vr.reviewedAt)})` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: FEES */}
      {tab === 'fees' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Authorised Fee Breakdown & Statement</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Calculated strictly from authorised fee structures and verified receipts recorded by {data.college.name}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 no-print">
                <button
                  type="button"
                  onClick={downloadStatementCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Statement
                </button>
                <button
                  type="button"
                  onClick={attemptGatewayPayment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  Pay Online ({data.fees.paymentGatewayConfigured ? 'Configured' : 'Gateway Status'})
                </button>
              </div>
            </div>

            {!data.fees.hasAuthorisedFeeRecord ? (
              <div className="py-8 text-sm text-slate-600">
                Your College Administrator has not assigned an authorised fee structure to your account for {data.profile.academicYear} yet. No invented fees are displayed.
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                {data.fees.accounts.map((acc) => (
                  <div key={acc.id} className="overflow-x-auto">
                    <p className="text-xs font-semibold text-slate-700 mb-2">
                      Academic Year: {acc.academicYear} · Due Date: {acc.dueDate || 'As per college circular'} · Ref:{' '}
                      {acc.sourceReference || 'College Office'}
                    </p>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500 text-left">
                          <th className="py-2">Fee Component</th>
                          <th className="py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr><td className="py-2">Tuition Fee</td><td className="py-2 text-right font-mono tabular-nums">{formatINR(acc.tuitionFee)}</td></tr>
                        <tr><td className="py-2">Examination Fee</td><td className="py-2 text-right font-mono tabular-nums">{formatINR(acc.examinationFee)}</td></tr>
                        <tr><td className="py-2">Laboratory Fee</td><td className="py-2 text-right font-mono tabular-nums">{formatINR(acc.laboratoryFee)}</td></tr>
                        <tr><td className="py-2">Hostel Fee</td><td className="py-2 text-right font-mono tabular-nums">{formatINR(acc.hostelFee)}</td></tr>
                        <tr><td className="py-2">Transport Fee</td><td className="py-2 text-right font-mono tabular-nums">{formatINR(acc.transportFee)}</td></tr>
                        <tr><td className="py-2">Other Authorised Charges</td><td className="py-2 text-right font-mono tabular-nums">{formatINR(acc.otherAuthorisedFee)}</td></tr>
                        <tr className="font-bold border-t border-slate-300">
                          <td className="py-2.5">Total Applicable Fee</td>
                          <td className="py-2.5 text-right font-mono tabular-nums">{formatINR(acc.totalApplicableFee)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Total Applicable</p>
                    <p className="text-xl font-bold font-mono tabular-nums">{formatINR(data.fees.totals.totalApplicable)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Verified Payments</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-emerald-700">{formatINR(data.fees.totals.totalPaid)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pending Balance</p>
                    <p className="text-xl font-bold font-mono tabular-nums text-amber-700">{formatINR(data.fees.totals.pendingAmount)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-slate-950">Verified Payment History & Receipts</h3>
            {data.fees.payments.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No verified fee payments recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 pr-4">Receipt Number</th>
                      <th className="py-2 pr-4">Mode</th>
                      <th className="py-2 pr-4">Paid Date</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.fees.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-4 font-mono font-semibold text-slate-900">{p.receiptNumber}</td>
                        <td className="py-2.5 pr-4">{p.paymentMode}</td>
                        <td className="py-2.5 pr-4 text-slate-600">{formatDate(p.paidAt)}</td>
                        <td className="py-2.5 pr-4"><StatusText status={p.verificationStatus} /></td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-semibold">{formatINR(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-950">In-App Notifications</h2>
            <button
              type="button"
              onClick={markAllRead}
              className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
          {data.notifications.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.notifications.map((n) => (
                <div key={n.id} className={`py-4 flex items-start justify-between gap-4 ${n.isRead ? 'opacity-70' : ''}`}>
                  <div>
                    <p className="text-xs text-slate-500">
                      {n.type.replace(/_/g, ' ')} · {formatDateTime(n.createdAt)} · Email: {n.emailDeliveryStatus} · SMS:{' '}
                      {n.smsDeliveryStatus}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{n.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(n.id)}
                      className="text-xs font-semibold text-blue-900 hover:underline whitespace-nowrap cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: PROFILE & DPDP PRIVACY */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={saveProfile} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Student Profile & Locked Institution Identity</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Institution:</strong> {data.college.name} (Locked after registration)
              </p>
              <p>
                <strong>Enrolment No.:</strong> <span className="font-mono">{data.profile.enrollmentNumber}</span>
              </p>
              <p>
                <strong>Google Sign-In Email:</strong> {data.user.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800">Full Name</label>
              <input
                type="text"
                required
                value={profileForm.fullName}
                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-800">Current Academic Year</label>
                <input
                  type="text"
                  required
                  value={profileForm.academicYear}
                  onChange={(e) => setProfileForm({ ...profileForm, academicYear: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800">Current Semester</label>
                <input
                  type="text"
                  required
                  value={profileForm.currentSemester}
                  onChange={(e) => setProfileForm({ ...profileForm, currentSemester: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800">Date of Birth (optional)</label>
              <input
                type="date"
                value={profileForm.dob}
                onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg cursor-pointer">
              Save Profile Changes
            </button>
          </form>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-950">Mobile Number & OTP Verification</h2>
                <span className="text-xs font-semibold text-slate-600">
                  {data.profile.mobileOtpVerified ? 'OTP Verified' : 'Not OTP Verified'}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                SMS Gateway Status: {data.smsConfigured ? 'Configured' : 'Not configured on this deployment'}. Mobile OTP verifies phone ownership only and never replaces college identity verification.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="tel"
                  pattern="[6-9][0-9]{9}"
                  value={otpMobile}
                  onChange={(e) => setOtpMobile(e.target.value)}
                  placeholder="10-digit Indian mobile"
                  className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={sendOtp}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer"
                >
                  Send Mobile OTP
                </button>
              </div>
              {otpSent && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={verifyOtp}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg cursor-pointer"
                  >
                    Verify OTP
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-900" />
                <h2 className="text-lg font-bold text-slate-950">Account & DPDP Privacy Controls</h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Authentication is managed securely via Firebase Google Sign-In (no local passwords stored on ASH). You may download your complete machine-readable personal record or request an account deletion governance review.
              </p>
              <button
                type="button"
                onClick={downloadPersonalDataJson}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download My Personal Data (JSON)
              </button>

              <form onSubmit={requestAccountDeletion} className="pt-3 border-t border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Request Account Deletion / Data Governance Review
                </label>
                <input
                  type="text"
                  required
                  minLength={5}
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Reason for data governance / account deletion request..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg cursor-pointer"
                >
                  Submit Privacy Request
                </button>
              </form>

              {data.privacyRequests.length > 0 && (
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">Previous Privacy Requests</p>
                  {data.privacyRequests.map((pr) => (
                    <p key={pr.id} className="text-slate-600">
                      {pr.requestType} · {pr.status} · {formatDateTime(pr.createdAt)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
