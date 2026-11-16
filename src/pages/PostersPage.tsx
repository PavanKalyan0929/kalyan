import { useEffect, useState } from 'react';
import { EditorialPosterCard, type PosterRecord } from '../components/EditorialPosterCard.tsx';
import { apiFetch } from '../lib/api.ts';

export function PostersPage() {
  const [posters, setPosters] = useState<PosterRecord[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter) params.set('category', categoryFilter);
    if (scopeFilter) params.set('scope', scopeFilter);

    apiFetch<{ posters: PosterRecord[] }>(`/api/posters?${params.toString()}`)
      .then((res) => setPosters(res.posters || []))
      .catch(() => setPosters([]))
      .finally(() => setLoading(false));
  }, [categoryFilter, scopeFilter]);

  const categories = Array.from(new Set(posters.map((p) => p.category)));

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
            Curated Student Advisories &amp; Notices
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[#0F2547]">
            ASH Educational Posters &amp; Institutional Announcements
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Official platform advisories and State-approved college announcement posters. Every poster carries source attribution and authorisation metadata without invented deadlines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            aria-label="Filter posters by scope"
          >
            <option value="">All Scopes</option>
            <option value="statewide">Statewide Advisories</option>
            <option value="district">District Specific</option>
            <option value="college">College Announcements</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            aria-label="Filter posters by category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : posters.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          No active posters match your selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posters.map((poster, idx) => (
            <EditorialPosterCard key={poster.id} poster={poster} variant={idx === 0 ? 'navy' : 'light'} />
          ))}
        </div>
      )}
    </div>
  );
}
