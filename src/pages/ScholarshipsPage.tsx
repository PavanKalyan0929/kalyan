import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Search } from 'lucide-react';
import { ScholarshipPortalSlide } from '../components/ScholarshipPortalSlide.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface Scholarship {
  id: number;
  title: string;
  category: string;
  provider: string;
  meritOrNeed: string;
  eligibility: string;
  requiredDocuments: string[];
  openingDate: string | null;
  deadline: string | null;
  officialUrl: string;
  isOfficial: boolean;
  verificationNote: string;
  lastVerifiedAt: string | null;
}

const CATEGORIES = ['All', 'Andhra Pradesh State', 'Central Government', 'Private / Corporate'];

export function ScholarshipsPage() {
  const { user } = useAuth();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const [trackingStatus, setTrackingStatus] = useState('Bookmarked');
  const [externalAppId, setExternalAppId] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category !== 'All') params.set('category', category);
    if (search.trim()) params.set('search', search.trim());
    apiFetch<{ scholarships: Scholarship[] }>(`/api/scholarships?${params.toString()}`)
      .then((res) => setScholarships(res.scholarships))
      .catch(() => setScholarships([]))
      .finally(() => setLoading(false));
  }, [category, search]);

  const saveTracking = async (scholarshipId: number) => {
    setFeedback('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/student/scholarships/${scholarshipId}/track`, {
        method: 'POST',
        body: JSON.stringify({
          trackingStatus,
          externalApplicationId: externalAppId,
          notes,
        }),
      });
      setFeedback(res.message);
      setTrackingId(null);
      setExternalAppId('');
      setNotes('');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to save tracking status');
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Scholarships & Financial Assistance</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl">
            Official Andhra Pradesh (Jnanabhumi) and Central Government (National Scholarship Portal) schemes. Official applications are submitted directly on the linked government portals; ASH never fabricates submission receipts.
          </p>
        </div>
        <Link
          to="/services"
          className="text-sm font-semibold text-blue-900 hover:underline whitespace-nowrap"
        >
          File Scholarship Grievance →
        </Link>
      </div>

      {/* Role Gateway & Academic Year 2026-27 Banner */}
      <ScholarshipPortalSlide />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                category === c ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scholarship or provider..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          />
        </div>
      </div>

      {feedback && (
        <div className="bg-blue-50 border border-blue-200 text-blue-950 rounded-xl p-4 text-sm">
          {feedback}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : scholarships.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          No scholarship schemes match your current filter.
        </div>
      ) : (
        <div className="space-y-5">
          {scholarships.map((s) => (
            <article key={s.id} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-blue-900">{s.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{s.provider}</span>
                    <span aria-hidden="true">·</span>
                    <span>{s.meritOrNeed}</span>
                    <span aria-hidden="true">·</span>
                    <span className={s.isOfficial ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {s.isOfficial ? 'Official Scheme' : 'Unverified / External Listing'}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-950">{s.title}</h2>
                  <p className="text-sm text-slate-700 leading-relaxed">{s.eligibility}</p>

                  <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
                    <div>
                      <p className="font-semibold text-slate-800">Required Documents</p>
                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                        {s.requiredDocuments.map((doc) => (
                          <li key={doc}>{doc}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">Application Window & Verification Note</p>
                      {s.openingDate && <p className="mt-1">Opens: {s.openingDate}</p>}
                      <p className="mt-1">Deadline: {s.deadline || 'Verify on official portal'}</p>
                      <p className="mt-1 text-slate-500">{s.verificationNote}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <a
                    href={s.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg whitespace-nowrap"
                  >
                    Official Portal
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {user?.role === 'student' && (
                    <button
                      type="button"
                      onClick={() => setTrackingId(trackingId === s.id ? null : s.id)}
                      className="px-4 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap cursor-pointer"
                    >
                      {trackingId === s.id ? 'Close Tracker' : 'Update Personal Tracker'}
                    </button>
                  )}
                </div>
              </div>

              {trackingId === s.id && user?.role === 'student' && (
                <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Personal Status</label>
                    <select
                      value={trackingStatus}
                      onChange={(e) => setTrackingStatus(e.target.value)}
                      className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="Bookmarked">Bookmarked</option>
                      <option value="Applied on Official Portal">Applied on Official Portal</option>
                      <option value="Under Verification">Under Verification</option>
                      <option value="Sanctioned">Sanctioned</option>
                      <option value="Disbursed">Disbursed</option>
                      <option value="Issue Reported">Issue Reported</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Official Portal Application ID (optional)</label>
                    <input
                      type="text"
                      value={externalAppId}
                      onChange={(e) => setExternalAppId(e.target.value)}
                      placeholder="e.g. JNB2026..."
                      className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Personal notes..."
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => saveTracking(s.id)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-900 rounded-lg whitespace-nowrap cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
