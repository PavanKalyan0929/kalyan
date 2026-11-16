import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';

interface DistrictStat {
  district: string;
  totalColleges: number;
  verifiedColleges: number;
  pendingColleges: number;
}

export function DistrictsPage() {
  const [districts, setDistricts] = useState<DistrictStat[]>([]);
  const [summary, setSummary] = useState({ totalApDistricts: 26, districtsWithColleges: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'awaiting'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{
      districts: DistrictStat[];
      totalApDistricts: number;
      districtsWithColleges: number;
    }>('/api/districts')
      .then((res) => {
        setDistricts(res.districts);
        setSummary({
          totalApDistricts: res.totalApDistricts,
          districtsWithColleges: res.districtsWithColleges,
        });
      })
      .catch(() => setDistricts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = districts.filter((d) => {
    const matchesSearch = !search.trim() || d.district.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && d.totalColleges > 0) ||
      (filter === 'awaiting' && d.totalColleges === 0);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
            Statewide Higher Education Geography
          </p>
          <h1 className="mt-1 font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#0F2547]">
            All {summary.totalApDistricts} Districts of Andhra Pradesh
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Browse verified higher-education institutions district by district. Districts currently awaiting verified college records are shown transparently without fabricated entries.
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-500">Districts Indexed</p>
            <p className="font-mono font-bold text-xl tabular-nums text-[#0F2547]">
              {summary.districtsWithColleges} / {summary.totalApDistricts}
            </p>
          </div>
          <Link
            to="/colleges"
            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2547] hover:bg-[#1E3A8A] rounded-lg whitespace-nowrap"
          >
            Search Full Directory →
          </Link>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by district name (e.g. Tirupati, Nellore, Guntur)..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            aria-label="Filter AP districts"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          {[
            { id: 'all', label: `All Districts (${districts.length})` },
            { id: 'active', label: `With Colleges (${districts.filter((d) => d.totalColleges > 0).length})` },
            { id: 'awaiting', label: `Awaiting Records (${districts.filter((d) => d.totalColleges === 0).length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as typeof filter)}
              className={`px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                filter === tab.id
                  ? 'bg-[#0F2547] text-white border-[#0F2547]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <Link
              key={item.district}
              to={`/colleges?district=${encodeURIComponent(item.district)}`}
              className="group bg-white border border-slate-200 hover:border-[#1E3A8A] rounded-xl p-5 flex flex-col justify-between transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold text-[#0F2547] group-hover:text-[#1E3A8A]">
                    {item.district}
                  </h2>
                  <MapPin className="w-4 h-4 text-slate-400 group-hover:text-[#9A7B2C] shrink-0 mt-0.5" />
                </div>

                {item.totalColleges > 0 ? (
                  <p className="mt-3 text-xs text-slate-600 font-mono tabular-nums">
                    {item.verifiedColleges} Verified
                    {item.pendingColleges > 0 ? ` · ${item.pendingColleges} Pending` : ''}
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    Onboarding verification queue open
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono font-semibold tabular-nums text-slate-800">
                  {item.totalColleges} institution{item.totalColleges === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A]">
                  Browse <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
