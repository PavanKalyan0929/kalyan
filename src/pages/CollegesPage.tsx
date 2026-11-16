import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, Building2, ChevronLeft, ChevronRight, ExternalLink, Eye, Scale, Search } from 'lucide-react';
import { CollegeLogoMark } from '../components/CollegeLogoMark.tsx';
import { CollegeQuickModal } from '../components/CollegeQuickModal.tsx';
import { RankPredictorWidget } from '../components/RankPredictorWidget.tsx';
import { StatusText } from '../components/StatusText.tsx';
import { useCompare } from '../context/CompareContext.tsx';
import { useShortlist } from '../context/ShortlistContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface College {
  id: number;
  name: string;
  institutionCode: string | null;
  category: string;
  management: string;
  district: string;
  address: string;
  website: string | null;
  affiliatedUniversity: string;
  programmes: string[];
  engineeringBranches: string[];
  degreeCourses: string[];
  accreditation: string | null;
  verificationStatus: string;
  dataSource: string;
  approvedPhotoId: number | null;
  approvedLogoId: number | null;
}

interface FilterMeta {
  districts: string[];
  categories: string[];
  managements: string[];
  universities: string[];
}

export function CollegesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { savedIds, isSaved, toggleSave } = useShortlist();
  const { isCompared, toggleCompare } = useCompare();
  const [colleges, setColleges] = useState<College[]>([]);
  const [filterMeta, setFilterMeta] = useState<FilterMeta>({
    districts: [],
    categories: [],
    managements: [],
    universities: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [category, setCategory] = useState('');
  const [management, setManagement] = useState('');
  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [savedOnly, setSavedOnly] = useState(searchParams.get('tab') === 'saved');
  const [quickCollege, setQuickCollege] = useState<College | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const paramDistrict = searchParams.get('district') || '';
    const paramSearch = searchParams.get('search') || '';
    const paramSaved = searchParams.get('tab') === 'saved';
    if (paramDistrict !== district) {
      setDistrict(paramDistrict);
      setPage(1);
    }
    if (paramSearch && paramSearch !== search) {
      setSearch(paramSearch);
      setPage(1);
    }
    if (paramSaved !== savedOnly) {
      setSavedOnly(paramSaved);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (district) params.set('district', district);
    if (category) params.set('category', category);
    if (management) params.set('management', management);
    if (university) params.set('university', university);
    if (course) params.set('course', course);
    if (verificationStatus) params.set('verificationStatus', verificationStatus);
    params.set('page', savedOnly ? '1' : String(page));
    params.set('limit', savedOnly ? '100' : '12');

    apiFetch<{
      colleges: College[];
      pagination: { total: number; totalPages: number };
      filterMeta: FilterMeta;
    }>(`/api/colleges?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        const rows = savedOnly
          ? res.colleges.filter((c) => savedIds.includes(c.id))
          : res.colleges;
        setColleges(rows);
        setTotal(savedOnly ? rows.length : res.pagination.total);
        setTotalPages(savedOnly ? 1 : res.pagination.totalPages);
        setFilterMeta(res.filterMeta);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load colleges');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, district, category, management, university, course, verificationStatus, savedOnly, savedIds, page]);

  const resetFilters = () => {
    setSearch('');
    setDistrict('');
    setCategory('');
    setManagement('');
    setUniversity('');
    setCourse('');
    setVerificationStatus('');
    setSavedOnly(false);
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
            Verified Institutional Registry
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#0F2547]">
            Andhra Pradesh College Directory
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Verifiable institutional records across Andhra Pradesh universities, engineering colleges, and government/aided degree colleges. Institution codes, logos, and photographs are displayed only where verified.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a href="#rank-predictor" className="text-sm font-semibold text-[#EA580C] hover:underline whitespace-nowrap">
            Rank &amp; Eligibility Finder ↓
          </a>
          <Link to="/districts" className="text-sm font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap">
            View 26 AP Districts →
          </Link>
          <p className="text-sm font-mono tabular-nums text-slate-700">
            {total} institution{total === 1 ? '' : 's'} matched
          </p>
        </div>
      </div>

      {/* Category & Shortlist Quick Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit">
        {[
          { label: 'All Colleges', cat: '', saved: false },
          { label: 'Engineering', cat: 'Engineering', saved: false },
          { label: 'Degree', cat: 'Degree', saved: false },
          { label: 'University', cat: 'University', saved: false },
          { label: `My Shortlist (${savedIds.length})`, cat: '', saved: true },
        ].map((tabItem) => {
          const isActive = tabItem.saved ? savedOnly : !savedOnly && category === tabItem.cat;
          return (
            <button
              key={tabItem.label}
              type="button"
              onClick={() => {
                setSavedOnly(tabItem.saved);
                setCategory(tabItem.cat);
                setPage(1);
                if (tabItem.saved) {
                  setSearchParams({ tab: 'saved' });
                } else {
                  const next = new URLSearchParams();
                  if (district) next.set('district', district);
                  if (search) next.set('search', search);
                  setSearchParams(next);
                }
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                isActive ? 'bg-white text-[#0F2547] shadow-sm' : 'text-slate-600 hover:text-[#0F2547]'
              }`}
            >
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search college name, APSCHE code, district..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
              aria-label="Search colleges"
            />
          </div>

          <input
            type="text"
            value={course}
            onChange={(e) => {
              setCourse(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by course or branch (e.g. CSE, B.Com)..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            aria-label="Filter by course or branch"
          />

          <select
            value={district}
            onChange={(e) => {
              const next = e.target.value;
              setDistrict(next);
              setPage(1);
              if (next) {
                setSearchParams({ district: next });
              } else {
                setSearchParams({});
              }
            }}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            aria-label="Filter by district"
          >
            <option value="">All Districts</option>
            {filterMeta.districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            aria-label="Filter by college category"
          >
            <option value="">All Categories</option>
            {filterMeta.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={management}
            onChange={(e) => {
              setManagement(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            aria-label="Filter by management"
          >
            <option value="">All Management Types</option>
            {filterMeta.managements.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={university}
            onChange={(e) => {
              setUniversity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white lg:col-span-2"
            aria-label="Filter by affiliated university"
          >
            <option value="">All Affiliated Universities</option>
            {filterMeta.universities.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <select
              value={verificationStatus}
              onChange={(e) => {
                setVerificationStatus(e.target.value);
                setPage(1);
              }}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              aria-label="Filter by verification status"
            >
              <option value="">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
            <button
              type="button"
              onClick={resetFilters}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl p-5 h-72 animate-pulse">
              <div className="h-32 bg-slate-100 rounded-lg" />
              <div className="mt-4 h-5 bg-slate-100 rounded w-3/4" />
              <div className="mt-2 h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : colleges.length === 0 ? (
        <div className="mt-8 bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-semibold text-slate-900">No institutions match your filters</p>
          <p className="mt-1 text-sm text-slate-600">Try clearing one or more filters or searching by district.</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#0F2547] rounded-lg cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colleges.map((c) => (
            <article
              key={c.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Authentic Approved Photo or Clean Institutional Placeholder */}
                <div className="h-44 bg-slate-100 border-b border-slate-200 relative overflow-hidden">
                  {c.approvedPhotoId ? (
                    <img
                      src={`/api/files/college-photo/${c.approvedPhotoId}`}
                      alt={`${c.name} approved campus photograph`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-500">
                      <Building2 className="w-7 h-7 text-slate-400 mb-2" aria-hidden="true" />
                      <p className="text-xs font-medium text-slate-600">Official college photograph coming soon.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Awaiting authorised college upload &amp; state approval</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void toggleSave(c.id, c.name)}
                    aria-label={isSaved(c.id) ? `Remove ${c.name} from shortlist` : `Save ${c.name} to shortlist`}
                    className={`absolute top-3 right-3 p-2 rounded-full border shadow-sm transition-colors cursor-pointer ${
                      isSaved(c.id)
                        ? 'bg-[#EA580C] text-white border-[#EA580C]'
                        : 'bg-white/95 text-[#0F2547] border-slate-200 hover:bg-white'
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5">
                  <div className="flex items-start gap-3.5">
                    <CollegeLogoMark
                      name={c.name}
                      institutionCode={c.institutionCode}
                      approvedLogoId={c.approvedLogoId}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-[#0F2547] leading-snug">
                        <Link to={`/colleges/${c.id}`} className="hover:text-[#1E3A8A]">
                          {c.name}
                        </Link>
                      </h2>
                      <p className="mt-1.5 text-xs text-slate-600">
                        {c.district} <span aria-hidden="true">·</span> {c.category} <span aria-hidden="true">·</span> {c.management}
                        {c.institutionCode ? (
                          <>
                            {' '}
                            <span aria-hidden="true">·</span>{' '}
                            <span className="font-mono font-medium text-slate-800">Code: {c.institutionCode}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-500 truncate" title={c.affiliatedUniversity}>
                    Affiliated: {c.affiliatedUniversity}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <StatusText status={c.verificationStatus === 'verified' ? 'Verified' : 'Pending'} />
                    {c.programmes.length > 0 && (
                      <span className="text-xs text-slate-500 truncate max-w-[160px]">
                        {c.programmes.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCompare(c)}
                    className={`inline-flex items-center gap-1 font-semibold cursor-pointer ${
                      isCompared(c.id) ? 'text-[#EA580C]' : 'text-slate-700 hover:text-[#0F2547]'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    {isCompared(c.id) ? 'Compared' : 'Compare'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCollege(c)}
                    className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-[#0F2547] cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </button>
                  <Link to={`/colleges/${c.id}`} className="font-semibold text-[#1E3A8A] hover:underline">
                    Profile →
                  </Link>
                </div>
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900"
                  >
                    Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <CollegeQuickModal college={quickCollege} onClose={() => setQuickCollege(null)} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
          <p className="text-sm text-slate-600 tabular-nums">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div id="rank-predictor" className="mt-10">
        <RankPredictorWidget districts={filterMeta.districts} verifiedCount={total} />
      </div>
    </div>
  );
}
