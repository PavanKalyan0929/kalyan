import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusText } from '../components/StatusText.tsx';
import { apiFetch, fetchAuthenticatedBlobUrl, formatDateTime, openAuthenticatedFile } from '../lib/api.ts';

type StateTab =
  | 'overview'
  | 'colleges'
  | 'approvals'
  | 'posters'
  | 'admins'
  | 'grievances'
  | 'notices'
  | 'governance'
  | 'audit';

const POSTER_CATEGORIES = [
  'UPSC & Civil Services',
  'APPSC & State Exams',
  'Jnanabhumi & Scholarships',
  'NPTEL & Skill Missions',
  'Engineering & Degree Admissions',
  'Student Grievance & Rights',
  'College Events & Fests',
];

function AuthImagePreview({
  url,
  caption,
  className = 'w-full h-40 object-cover rounded border border-slate-200',
}: {
  url: string;
  caption: string;
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
      <div className="w-full h-32 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-xs text-slate-500">
        Unable to load preview
      </div>
    );
  }
  if (!src) {
    return <div className="w-full h-32 rounded border border-slate-200 bg-slate-100 animate-pulse" />;
  }
  return <img src={src} alt={caption} className={className} />;
}

export function StateAdminDashboardPage() {
  const [tab, setTab] = useState<StateTab>('overview');
  const [dashboard, setDashboard] = useState<{
    metrics: Record<string, number>;
    districtStats: Array<{ district: string; total: number; verified: number }>;
    grievanceByStatus: Array<{ status: string; count: number }>;
  } | null>(null);

  const [colleges, setColleges] = useState<Array<Record<string, unknown>>>([]);
  const [corrections, setCorrections] = useState<Array<Record<string, unknown>>>([]);
  const [pendingPhotos, setPendingPhotos] = useState<Array<Record<string, unknown>>>([]);
  const [pendingLogos, setPendingLogos] = useState<Array<Record<string, unknown>>>([]);
  const [postersList, setPostersList] = useState<Array<Record<string, unknown>>>([]);
  const [dataQuality, setDataQuality] = useState<{
    summary: Record<string, number>;
    districtCoverage: Array<{ district: string; total: number; verified: number }>;
  } | null>(null);
  const [collegeAdmins, setCollegeAdmins] = useState<Array<Record<string, unknown>>>([]);
  const [grievances, setGrievances] = useState<Array<Record<string, unknown>>>([]);
  const [integrations, setIntegrations] = useState<Array<Record<string, unknown>>>([]);
  const [privacyRequests, setPrivacyRequests] = useState<Array<Record<string, unknown>>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, unknown>>>([]);
  const [registrySummary, setRegistrySummary] = useState<{
    categoryCounts: Array<{ category: string; total: number; verified: number }>;
    totalShortlists: number;
    recentStudents: Array<{
      id: number;
      fullName: string;
      email: string;
      createdAt: string;
      collegeName: string | null;
      district: string | null;
      enrollmentNumber: string | null;
      verificationStatus: string | null;
    }>;
  } | null>(null);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Forms
  const [newCollege, setNewCollege] = useState({
    name: '',
    institutionCode: '',
    category: 'Engineering',
    management: 'Private',
    district: 'Visakhapatnam',
    address: '',
    website: '',
    affiliatedUniversity: '',
    dataSource: 'APSCHE Official Directory',
  });
  const [bulkJson, setBulkJson] = useState('');
  const [mergeForm, setMergeForm] = useState({ duplicateCollegeId: '', targetCollegeId: '' });
  const [adminForm, setAdminForm] = useState({ fullName: '', email: '', mobile: '', collegeId: '' });
  const [noticeForm, setNoticeForm] = useState({ category: 'Announcement', title: '', body: '', officialUrl: '' });
  const [posterImage, setPosterImage] = useState<File | null>(null);
  const [posterForm, setPosterForm] = useState({
    title: '',
    subtitle: '',
    category: 'UPSC & Civil Services',
    summary: '',
    ctaLabel: 'Open Resource',
    ctaUrl: '/upsc',
    scope: 'statewide' as 'statewide' | 'district' | 'college',
    district: 'Visakhapatnam',
    collegeId: '',
    sourceAttribution: 'Andhra Student Hub State Editorial Desk',
    authorisationRef: '',
    publishDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
  });
  const [grvAction, setGrvAction] = useState<Record<number, { status: string; comment: string }>>({});

  const loadAll = async () => {
    try {
      const [d, c, cr, ph, lg, ps, dq, ca, gr, intg, priv, al, reg] = await Promise.all([
        apiFetch<typeof dashboard>('/api/state-admin/dashboard'),
        apiFetch<{ colleges: Array<Record<string, unknown>> }>('/api/state-admin/colleges'),
        apiFetch<{ requests: Array<Record<string, unknown>> }>('/api/state-admin/correction-requests'),
        apiFetch<{ photos: Array<Record<string, unknown>> }>('/api/state-admin/photos/pending'),
        apiFetch<{ logos: Array<Record<string, unknown>> }>('/api/state-admin/logos/pending'),
        apiFetch<{ posters: Array<Record<string, unknown>> }>('/api/state-admin/posters'),
        apiFetch<typeof dataQuality>('/api/state-admin/data-quality'),
        apiFetch<{ collegeAdmins: Array<Record<string, unknown>> }>('/api/state-admin/college-admins'),
        apiFetch<{ grievances: Array<Record<string, unknown>> }>('/api/state-admin/grievances'),
        apiFetch<{ integrations: Array<Record<string, unknown>> }>('/api/state-admin/integrations'),
        apiFetch<{ requests: Array<Record<string, unknown>> }>('/api/state-admin/privacy-requests'),
        apiFetch<{ logs: Array<Record<string, unknown>> }>('/api/state-admin/audit-logs'),
        apiFetch<typeof registrySummary>('/api/state-admin/registry-summary'),
      ]);
      setDashboard(d);
      setColleges(c.colleges);
      setCorrections(cr.requests);
      setPendingPhotos(ph.photos);
      setPendingLogos(lg.logos);
      setPostersList(ps.posters);
      setDataQuality(dq);
      setCollegeAdmins(ca.collegeAdmins);
      setGrievances(gr.grievances);
      setIntegrations(intg.integrations);
      setPrivacyRequests(priv.requests);
      setAuditLogs(al.logs);
      setRegistrySummary(reg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to load State Admin Dashboard');
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const verifyCollege = async (
    id: number,
    verificationStatus: 'verified' | 'pending' | 'rejected',
    isActive?: boolean
  ) => {
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/state-admin/colleges/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ verificationStatus, ...(isActive !== undefined ? { isActive } : {}) }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/state-admin/colleges', {
        method: 'POST',
        body: JSON.stringify(newCollege),
      });
      setMsg(res.message);
      setNewCollege({
        name: '',
        institutionCode: '',
        category: 'Engineering',
        management: 'Private',
        district: 'Visakhapatnam',
        address: '',
        website: '',
        affiliatedUniversity: '',
        dataSource: 'APSCHE Official Directory',
      });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create college');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const parsed = JSON.parse(bulkJson);
      const records = Array.isArray(parsed) ? parsed : parsed.records;
      const res = await apiFetch<{ inserted: number; skippedDuplicates: number }>('/api/state-admin/colleges/import', {
        method: 'POST',
        body: JSON.stringify({ records }),
      });
      setMsg(`Bulk import completed: ${res.inserted} inserted, ${res.skippedDuplicates} duplicates skipped.`);
      setBulkJson('');
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Bulk import failed — verify valid JSON array of records.');
    }
  };

  const handleMergeColleges = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/state-admin/colleges/merge', {
        method: 'POST',
        body: JSON.stringify({
          duplicateCollegeId: Number(mergeForm.duplicateCollegeId),
          targetCollegeId: Number(mergeForm.targetCollegeId),
        }),
      });
      setMsg(res.message);
      setMergeForm({ duplicateCollegeId: '', targetCollegeId: '' });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Merge failed');
    }
  };

  const reviewCorrection = async (id: number, decision: 'approved' | 'rejected') => {
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/state-admin/correction-requests/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNotes: `${decision} by State Administrator` }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Review failed');
    }
  };

  const reviewPhoto = async (id: number, decision: 'approved' | 'rejected') => {
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/state-admin/photos/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Photo review failed');
    }
  };

  const reviewLogo = async (id: number, decision: 'approved' | 'rejected') => {
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/state-admin/logos/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Logo review failed');
    }
  };

  const publishStatePoster = async (e: React.FormEvent) => {
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
      fd.append('scope', posterForm.scope);
      if (posterForm.scope === 'district' && posterForm.district) fd.append('district', posterForm.district);
      if (posterForm.scope === 'college' && posterForm.collegeId) fd.append('collegeId', posterForm.collegeId);
      fd.append('sourceAttribution', posterForm.sourceAttribution);
      fd.append('authorisationRef', posterForm.authorisationRef);
      if (posterForm.publishDate) fd.append('publishDate', posterForm.publishDate);
      if (posterForm.expiryDate) fd.append('expiryDate', posterForm.expiryDate);

      const res = await apiFetch<{ message: string }>('/api/state-admin/posters', { method: 'POST', body: fd });
      setMsg(res.message);
      setPosterImage(null);
      setPosterForm({
        title: '',
        subtitle: '',
        category: 'UPSC & Civil Services',
        summary: '',
        ctaLabel: 'Open Resource',
        ctaUrl: '/upsc',
        scope: 'statewide',
        district: 'Visakhapatnam',
        collegeId: '',
        sourceAttribution: 'Andhra Student Hub State Editorial Desk',
        authorisationRef: '',
        publishDate: new Date().toISOString().slice(0, 10),
        expiryDate: '',
      });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Poster publication failed');
    }
  };

  const reviewPoster = async (id: number, decision: 'approved' | 'rejected') => {
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/state-admin/posters/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Poster review failed');
    }
  };

  const toggleArchivePoster = async (id: number, isArchived: boolean) => {
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/state-admin/posters/${id}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived }),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unable to update archive status');
    }
  };

  const createCollegeAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/state-admin/college-admins', {
        method: 'POST',
        body: JSON.stringify({ ...adminForm, collegeId: Number(adminForm.collegeId) }),
      });
      setMsg(res.message);
      setAdminForm({ fullName: '', email: '', mobile: '', collegeId: '' });
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Provisioning failed');
    }
  };

  const handleStateGrievance = async (id: number) => {
    const act = grvAction[id];
    if (!act) return;
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/state-admin/grievances/${id}/action`, {
        method: 'POST',
        body: JSON.stringify(act),
      });
      setMsg(res.message);
      await loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    }
  };

  const publishStateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const res = await apiFetch<{ message: string }>('/api/state-admin/notices', {
        method: 'POST',
        body: JSON.stringify(noticeForm),
      });
      setMsg(res.message);
      setNoticeForm({ category: 'Announcement', title: '', body: '', officialUrl: '' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to publish notice');
    }
  };

  if (!dashboard) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 py-10 text-sm text-slate-600">
        Loading State Administration Desk...
      </div>
    );
  }

  const pendingApprovalsTotal =
    (dashboard.metrics.pendingCorrections || 0) +
    (dashboard.metrics.pendingPhotoApprovals || 0) +
    (dashboard.metrics.pendingLogoApprovals || 0);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9A7B2C]">State Higher Education Desk</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-[#0F2547]">Andhra Pradesh State Administration Console</h1>
        <p className="text-sm text-slate-600 mt-1">
          All counts and district breakdowns below are calculated directly from verified Cloud SQL PostgreSQL institutional records.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-slate-200/70 rounded-lg">
        {(
          [
            ['overview', 'Statewide Overview'],
            ['colleges', `Colleges (${dashboard.metrics.totalColleges || 0})`],
            ['approvals', `Approvals (${pendingApprovalsTotal})`],
            ['posters', `Posters (${dashboard.metrics.pendingPosterApprovals || 0} Pending)`],
            ['admins', `College Admins (${dashboard.metrics.totalCollegeAdmins || 0})`],
            ['grievances', `Grievances (${dashboard.metrics.escalatedGrievances || 0} Escalated)`],
            ['notices', 'Statewide Notices'],
            ['governance', 'Integrations & Privacy'],
            ['audit', 'Audit Logs'],
          ] as Array<[StateTab, string]>
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
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              ['Verified Colleges', dashboard.metrics.verifiedColleges],
              ['Pending Colleges', dashboard.metrics.pendingColleges],
              ['With Approved Photos', dataQuality?.summary.collegesWithPhotos ?? 0],
              ['With Official Logos', dataQuality?.summary.collegesWithLogos ?? 0],
              ['Registered Students', dashboard.metrics.totalStudents],
              ['Escalated Grievances', dashboard.metrics.escalatedGrievances],
            ].map(([label, val]) => (
              <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0F2547]">{val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#0F2547]">
                    26-District AP Coverage ({dataQuality?.summary.districtsCovered ?? dashboard.districtStats.length}/
                    {dataQuality?.summary.totalApDistricts ?? 26} Active)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {dataQuality?.summary.districtsMissing ?? 0} districts currently have 0 verified records and await onboarding.
                  </p>
                </div>
                <Link to="/districts" className="text-xs font-semibold text-[#1E3A8A] hover:underline">
                  Public Coverage Map →
                </Link>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="border-b border-slate-200 text-xs text-slate-500">
                      <th className="py-2 px-3">District (26 Official)</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-3 text-right">Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(dataQuality?.districtCoverage || dashboard.districtStats).map((d) => (
                      <tr key={d.district} className={d.total === 0 ? 'bg-amber-50/40' : ''}>
                        <td className="py-2 px-3 font-medium text-slate-900">{d.district}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{d.total}</td>
                        <td
                          className={`py-2 px-3 text-right font-mono tabular-nums ${
                            d.verified > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          {d.verified}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-[#0F2547] mb-3">Statewide Grievance Breakdown</h2>
              {dashboard.grievanceByStatus.length === 0 ? (
                <p className="text-sm text-slate-500">No grievances recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {dashboard.grievanceByStatus.map((g) => (
                    <div key={g.status} className="py-2.5 flex items-center justify-between text-sm">
                      <StatusText status={g.status} />
                      <span className="font-mono font-semibold tabular-nums">{g.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'colleges' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form onSubmit={handleAddCollege} className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-950">Add Verifiable Institution Record</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Official College Name"
                  value={newCollege.name}
                  onChange={(e) => setNewCollege({ ...newCollege, name: e.target.value })}
                  className="sm:col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="APSCHE Code (optional)"
                  value={newCollege.institutionCode}
                  onChange={(e) => setNewCollege({ ...newCollege, institutionCode: e.target.value })}
                  className="px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
                <select
                  value={newCollege.category}
                  onChange={(e) => setNewCollege({ ...newCollege, category: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Degree">Degree</option>
                  <option value="University">University</option>
                  <option value="Polytechnic">Polytechnic</option>
                </select>
                <select
                  value={newCollege.management}
                  onChange={(e) => setNewCollege({ ...newCollege, management: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Government">Government</option>
                  <option value="Autonomous">Autonomous</option>
                  <option value="Aided">Aided</option>
                  <option value="Private">Private</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="District"
                  value={newCollege.district}
                  onChange={(e) => setNewCollege({ ...newCollege, district: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  placeholder="Full Address"
                  value={newCollege.address}
                  onChange={(e) => setNewCollege({ ...newCollege, address: e.target.value })}
                  className="sm:col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  placeholder="Affiliated University"
                  value={newCollege.affiliatedUniversity}
                  onChange={(e) => setNewCollege({ ...newCollege, affiliatedUniversity: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="url"
                  placeholder="Official Website (https://...)"
                  value={newCollege.website}
                  onChange={(e) => setNewCollege({ ...newCollege, website: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  required
                  placeholder="Data Source Attribution"
                  value={newCollege.dataSource}
                  onChange={(e) => setNewCollege({ ...newCollege, dataSource: e.target.value })}
                  className="sm:col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg cursor-pointer">
                Add Institution
              </button>
            </form>

            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={handleBulkImport} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-950">Bulk Import (Pending Review)</h2>
                  <button
                    type="button"
                    onClick={() => {
                      openAuthenticatedFile('/api/state-admin/colleges/export', 'ash-ap-colleges-directory.csv').catch((e) =>
                        setErr(e instanceof Error ? e.message : 'Export failed')
                      );
                    }}
                    className="text-xs font-semibold text-blue-900 hover:underline cursor-pointer"
                  >
                    Export Directory CSV →
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  placeholder='[{"name":"...","district":"...","category":"Degree","management":"Government","address":"...","affiliatedUniversity":"...","dataSource":"APSCHE"}]'
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg"
                />
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer">
                  Import Authorised Batch
                </button>
              </form>

              <form onSubmit={handleMergeColleges} className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
                <h2 className="text-base font-bold text-slate-950">Merge Duplicate College Records</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    required
                    value={mergeForm.duplicateCollegeId}
                    onChange={(e) => setMergeForm({ ...mergeForm, duplicateCollegeId: e.target.value })}
                    className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Duplicate (Remove)</option>
                    {colleges.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        #{String(c.id)} {String(c.name)}
                      </option>
                    ))}
                  </select>
                  <select
                    required
                    value={mergeForm.targetCollegeId}
                    onChange={(e) => setMergeForm({ ...mergeForm, targetCollegeId: e.target.value })}
                    className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Target (Keep)</option>
                    {colleges.map((c) => (
                      <option key={String(c.id)} value={String(c.id)}>
                        #{String(c.id)} {String(c.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 rounded-lg cursor-pointer">
                  Merge & Re-link Records
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
            <h2 className="text-lg font-bold text-slate-950 mb-4">Directory Verification Controls</h2>
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4">Institution</th>
                  <th className="py-2 pr-4">District</th>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Visibility</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colleges.map((c) => {
                  const isActive = Boolean(c.isActive);
                  return (
                    <tr key={String(c.id)}>
                      <td className="py-2.5 pr-4 font-medium">{String(c.name)}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{String(c.district)}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs">
                        {c.institutionCode ? String(c.institutionCode) : '—'}
                      </td>
                      <td className="py-2.5 pr-4">
                        <StatusText status={String(c.verificationStatus)} />
                      </td>
                      <td className="py-2.5 pr-4 text-xs font-medium text-slate-600">
                        {isActive ? 'Active' : 'Archived'}
                      </td>
                      <td className="py-2.5 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => verifyCollege(Number(c.id), 'verified', true)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded cursor-pointer"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => verifyCollege(Number(c.id), 'pending')}
                          className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 rounded cursor-pointer"
                        >
                          Set Pending
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            verifyCollege(
                              Number(c.id),
                              (String(c.verificationStatus) as 'verified' | 'pending' | 'rejected') || 'verified',
                              !isActive
                            )
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded cursor-pointer"
                        >
                          {isActive ? 'Archive' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0F2547]">Official College Logo Approval Queue</h2>
            {pendingLogos.length === 0 ? (
              <p className="text-sm text-slate-500">No official college logos submitted yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingLogos.map((lg) => (
                  <div key={String(lg.id)} className="border border-slate-200 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#0F2547]">{String(lg.collegeName)}</p>
                        <p className="text-xs text-slate-500">{String(lg.district)}</p>
                      </div>
                      <StatusText status={String(lg.approvalStatus)} />
                    </div>
                    <AuthImagePreview
                      url={`/api/files/college-logo/${String(lg.id)}`}
                      caption={`${String(lg.collegeName)} logo`}
                      className="w-full h-32 object-contain bg-slate-50 rounded border border-slate-200 p-2"
                    />
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>Source: {String(lg.sourceAttribution)}</p>
                      <p className="font-mono">Permission: {String(lg.permissionReference)}</p>
                      {Boolean(lg.sourceUrl) && (
                        <a
                          href={String(lg.sourceUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1E3A8A] hover:underline block truncate"
                        >
                          {String(lg.sourceUrl)}
                        </a>
                      )}
                    </div>
                    {lg.approvalStatus === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => reviewLogo(Number(lg.id), 'approved')}
                          className="px-3 py-1 text-xs font-semibold text-white bg-emerald-700 rounded cursor-pointer"
                        >
                          Approve Logo
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewLogo(Number(lg.id), 'rejected')}
                          className="px-3 py-1 text-xs font-semibold text-white bg-red-700 rounded cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#0F2547]">Directory Profile Correction Requests</h2>
              {corrections.length === 0 ? (
                <p className="text-sm text-slate-500">No correction requests.</p>
              ) : (
                corrections.map((cr) => (
                  <div key={String(cr.id)} className="border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">{String(cr.collegeName)}</span>
                      <StatusText status={String(cr.status)} />
                    </div>
                    <p className="text-xs text-slate-600">Requested by: {String(cr.requestedByName)}</p>
                    <p className="text-xs font-mono bg-slate-50 p-2 rounded">{String(cr.proposedChangesJson)}</p>
                    <p className="text-xs text-slate-700">Justification: {String(cr.justification)}</p>
                    {cr.status === 'pending' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => reviewCorrection(Number(cr.id), 'approved')}
                          className="px-3 py-1 text-xs font-semibold text-white bg-emerald-700 rounded cursor-pointer"
                        >
                          Approve & Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewCorrection(Number(cr.id), 'rejected')}
                          className="px-3 py-1 text-xs font-semibold text-white bg-red-700 rounded cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#0F2547]">College Photograph Approval Queue</h2>
              {pendingPhotos.length === 0 ? (
                <p className="text-sm text-slate-500">No photographs awaiting approval.</p>
              ) : (
                pendingPhotos.map((p) => (
                  <div key={String(p.id)} className="border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        {String(p.collegeName)} ({String(p.category || 'Campus')})
                      </span>
                      <StatusText status={String(p.approvalStatus)} />
                    </div>
                    <AuthImagePreview url={`/api/files/college-photo/${String(p.id)}`} caption={String(p.caption)} />
                    <p className="text-xs">{String(p.caption)}</p>
                    <p className="text-xs text-slate-500">
                      Source: {String(p.sourceAttribution)} · Permission: {String(p.permissionReference)}
                    </p>
                    {p.approvalStatus === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => reviewPhoto(Number(p.id), 'approved')}
                          className="px-3 py-1 text-xs font-semibold text-white bg-emerald-700 rounded cursor-pointer"
                        >
                          Approve for Publishing
                        </button>
                        <button
                          type="button"
                          onClick={() => reviewPhoto(Number(p.id), 'rejected')}
                          className="px-3 py-1 text-xs font-semibold text-white bg-red-700 rounded cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'posters' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form onSubmit={publishStatePoster} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-[#0F2547]">Publish Statewide / District Poster</h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                State Administrators may publish verified educational awareness posters immediately across statewide, district, or institution scope.
              </p>
            </div>
            <select
              value={posterForm.category}
              onChange={(e) => setPosterForm({ ...posterForm, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {POSTER_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={posterForm.scope}
                onChange={(e) =>
                  setPosterForm({ ...posterForm, scope: e.target.value as 'statewide' | 'district' | 'college' })
                }
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="statewide">Statewide</option>
                <option value="district">Specific District</option>
                <option value="college">Specific College</option>
              </select>
              {posterForm.scope === 'district' && (
                <input
                  type="text"
                  required
                  placeholder="District name"
                  value={posterForm.district}
                  onChange={(e) => setPosterForm({ ...posterForm, district: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              )}
              {posterForm.scope === 'college' && (
                <select
                  required
                  value={posterForm.collegeId}
                  onChange={(e) => setPosterForm({ ...posterForm, collegeId: e.target.value })}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Select College</option>
                  {colleges.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.name)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <input
              type="text"
              required
              minLength={5}
              placeholder="Poster Headline"
              value={posterForm.title}
              onChange={(e) => setPosterForm({ ...posterForm, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              minLength={4}
              placeholder="Subtitle / Issuing Authority"
              value={posterForm.subtitle}
              onChange={(e) => setPosterForm({ ...posterForm, subtitle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <textarea
              required
              rows={3}
              minLength={10}
              placeholder="Summary text..."
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
                placeholder="CTA Route or https:// URL"
                value={posterForm.ctaUrl}
                onChange={(e) => setPosterForm({ ...posterForm, ctaUrl: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <input
              type="text"
              required
              placeholder="Source attribution"
              value={posterForm.sourceAttribution}
              onChange={(e) => setPosterForm({ ...posterForm, sourceAttribution: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              required
              placeholder="Authorisation Reference ID"
              value={posterForm.authorisationRef}
              onChange={(e) => setPosterForm({ ...posterForm, authorisationRef: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="date"
                value={posterForm.publishDate}
                onChange={(e) => setPosterForm({ ...posterForm, publishDate: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <input
                type="date"
                value={posterForm.expiryDate}
                onChange={(e) => setPosterForm({ ...posterForm, expiryDate: e.target.value })}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Optional Poster Image (JPEG/PNG/WebP)</label>
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
              Publish Poster Immediately
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#0F2547]">All Posters & Approval Queue ({postersList.length})</h2>
            {postersList.length === 0 ? (
              <p className="text-sm text-slate-500">No posters recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {postersList.map((ps) => {
                  const id = Number(ps.id);
                  const isArchived = Boolean(ps.isArchived);
                  return (
                    <div key={id} className="border border-slate-200 rounded-lg p-4 space-y-2.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#9A7B2C]">
                            {String(ps.category)} · {String(ps.scope)}
                            {ps.collegeName ? ` (${String(ps.collegeName)})` : ps.district ? ` (${String(ps.district)})` : ''}
                          </p>
                          <p className="font-serif text-base font-bold text-[#0F2547]">{String(ps.title)}</p>
                          <p className="text-xs text-slate-600">{String(ps.subtitle)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusText status={String(ps.approvalStatus)} />
                          {isArchived && (
                            <span className="text-[11px] font-mono text-slate-500">Archived</span>
                          )}
                        </div>
                      </div>
                      {Boolean(ps.hasImage) && (
                        <AuthImagePreview url={`/api/files/poster/${id}`} caption={String(ps.title)} />
                      )}
                      <p className="text-xs text-slate-700 leading-relaxed">{String(ps.summary)}</p>
                      <p className="text-[11px] text-slate-500">
                        {String(ps.sourceAttribution)} · Ref: {String(ps.authorisationRef)}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {ps.approvalStatus === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => reviewPoster(id, 'approved')}
                              className="px-3 py-1 text-xs font-semibold text-white bg-emerald-700 rounded cursor-pointer"
                            >
                              Approve Poster
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewPoster(id, 'rejected')}
                              className="px-3 py-1 text-xs font-semibold text-white bg-red-700 rounded cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleArchivePoster(id, !isArchived)}
                          className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                        >
                          {isArchived ? 'Restore Poster' : 'Archive Poster'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'admins' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={createCollegeAdmin} className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-950">Provision College Administrator</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Assign an institutional Google email to manage a single tenant-isolated college. Passwordless Google Sign-In links this account automatically on first sign-in.
            </p>
            <input
              type="text"
              required
              placeholder="Full Name"
              value={adminForm.fullName}
              onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="email"
              required
              placeholder="Official Google Email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
            <input
              type="tel"
              required
              pattern="[6-9][0-9]{9}"
              placeholder="10-digit Mobile"
              value={adminForm.mobile}
              onChange={(e) => setAdminForm({ ...adminForm, mobile: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
            />
            <select
              required
              value={adminForm.collegeId}
              onChange={(e) => setAdminForm({ ...adminForm, collegeId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Assign Institution</option>
              {colleges.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.name)} ({String(c.district)})
                </option>
              ))}
            </select>
            <button type="submit" className="w-full py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg cursor-pointer">
              Provision College Admin Role
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-slate-950 mb-4">Active College Administrators</h2>
            {collegeAdmins.length === 0 ? (
              <p className="text-sm text-slate-500">No College Administrator accounts provisioned yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-sm">
                {collegeAdmins.map((a) => (
                  <div key={String(a.id)} className="py-3 flex justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{String(a.fullName)}</p>
                      <p className="text-xs text-slate-600">
                        {String(a.email)} · {String(a.collegeName || 'Unassigned')}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{String(a.district || '')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'grievances' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-950">Statewide & Escalated Grievance Monitoring</h2>
          {grievances.length === 0 ? (
            <p className="text-sm text-slate-500">No grievances filed across the platform yet.</p>
          ) : (
            grievances.map((g) => {
              const id = Number(g.id);
              const act = grvAction[id] || { status: 'In progress', comment: '' };
              return (
                <div key={id} className="border border-slate-200 rounded-lg p-4 space-y-2">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono text-slate-500">
                        {String(g.referenceNumber)} · {String(g.collegeName)} ({String(g.district)}) ·{' '}
                        {String(g.studentName)}
                      </p>
                      <p className="font-semibold text-slate-950">{String(g.subject)}</p>
                    </div>
                    <StatusText status={String(g.status)} />
                  </div>
                  <p className="text-sm text-slate-700">{String(g.description)}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
                    <select
                      value={act.status}
                      onChange={(e) => setGrvAction({ ...grvAction, [id]: { ...act, status: e.target.value } })}
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Under review">Under review</option>
                      <option value="In progress">In progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <input
                      type="text"
                      placeholder="State-level directive / resolution note..."
                      value={act.comment}
                      onChange={(e) => setGrvAction({ ...grvAction, [id]: { ...act, comment: e.target.value } })}
                      className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleStateGrievance(id)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded-lg cursor-pointer"
                    >
                      Post State Action
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'notices' && (
        <form onSubmit={publishStateNotice} className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl space-y-4">
          <h2 className="text-lg font-bold text-slate-950">Publish Statewide Notice</h2>
          <select
            value={noticeForm.category}
            onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          >
            <option value="Announcement">Announcement</option>
            <option value="Examination">Examination</option>
            <option value="Scholarship">Scholarship</option>
            <option value="Policy">Policy</option>
          </select>
          <input
            type="text"
            required
            placeholder="Title"
            value={noticeForm.title}
            onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <textarea
            required
            rows={4}
            placeholder="Body..."
            value={noticeForm.body}
            onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <input
            type="url"
            placeholder="Official Reference URL (optional)"
            value={noticeForm.officialUrl}
            onChange={(e) => setNoticeForm({ ...noticeForm, officialUrl: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <button type="submit" className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg cursor-pointer">
            Publish Statewide Notice
          </button>
        </form>
      )}

      {tab === 'governance' && (
        <div className="space-y-6">
          {/* State Admin Restricted Platform Registry & Student Governance Table */}
          {registrySummary && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0F2547]">
                    State Platform Registry &amp; Student Enrollment Table
                  </h2>
                  <p className="text-xs text-slate-500">
                    Restricted strictly to verified State Administrator sessions via server-verified RBAC.
                  </p>
                </div>
                <span className="font-mono text-xs font-semibold text-[#0F2547] tabular-nums">
                  Active Student Shortlists: {registrySummary.totalShortlists}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {registrySummary.categoryCounts.map((cat) => (
                  <div key={cat.category} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs text-slate-500">{cat.category}</p>
                    <p className="mt-1 text-lg font-bold font-mono tabular-nums text-[#0F2547]">
                      {cat.verified}/{cat.total}
                    </p>
                    <p className="text-[11px] text-slate-500">verified / total</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Enrolment</th>
                      <th className="py-2.5 px-3">Institution &amp; District</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrySummary.recentStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500">
                          No registered students recorded yet.
                        </td>
                      </tr>
                    ) : (
                      registrySummary.recentStudents.map((st) => (
                        <tr key={st.id}>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{st.fullName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{st.email}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-800">{st.enrollmentNumber || 'Pending'}</td>
                          <td className="py-2.5 px-3 text-slate-700">
                            {st.collegeName ? `${st.collegeName} (${st.district || '—'})` : 'Onboarding pending'}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusText status={st.verificationStatus || 'Pending'} />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                            {formatDateTime(st.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-bold text-slate-950">Authorised College ERP Connectors</h2>
              {integrations.length === 0 ? (
                <p className="text-sm text-slate-500">No college integration metadata registered yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {integrations.map((i) => (
                    <div key={String(i.id)} className="py-2.5 flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {String(i.collegeName)} ({String(i.district)})
                        </p>
                        <p className="text-slate-600">
                          Adapter: <span className="font-mono">{String(i.adapterType)}</span> · Ref:{' '}
                          {i.writtenAuthorisationRef ? String(i.writtenAuthorisationRef) : 'Manual Only'}
                        </p>
                      </div>
                      <span className="font-mono text-slate-700">{String(i.status)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-bold text-slate-950">DPDP Student Privacy & Deletion Requests</h2>
              {privacyRequests.length === 0 ? (
                <p className="text-sm text-slate-500">No privacy or account deletion requests pending.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {privacyRequests.map((pr) => (
                    <div key={String(pr.id)} className="py-2.5 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-900">
                          {String(pr.userName)} ({String(pr.userEmail)})
                        </span>
                        <span className="font-mono text-slate-700">{String(pr.status)}</span>
                      </div>
                      <p className="text-slate-600">
                        Type: {String(pr.requestType)} · {formatDateTime(String(pr.createdAt))}
                      </p>
                      {Boolean(pr.reason) && <p className="text-slate-600">Reason: {String(pr.reason)}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 overflow-x-auto">
          <h2 className="text-lg font-bold text-slate-950 mb-4">Immutable Platform Audit Logs (Latest 100)</h2>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4">Timestamp</th>
                <th className="py-2 pr-4">Actor</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((l) => (
                <tr key={String(l.id)}>
                  <td className="py-2 pr-4 font-mono whitespace-nowrap">{formatDateTime(String(l.createdAt))}</td>
                  <td className="py-2 pr-4">{l.actorEmail ? String(l.actorEmail) : 'System'}</td>
                  <td className="py-2 pr-4">{l.actorRole ? String(l.actorRole) : '—'}</td>
                  <td className="py-2 pr-4 font-mono font-semibold">{String(l.action)}</td>
                  <td className="py-2 font-mono">
                    {String(l.entityType)} #{String(l.entityId || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
