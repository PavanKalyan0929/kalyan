import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, ExternalLink, Scale, Sparkles } from 'lucide-react';
import { useCompare } from '../context/CompareContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface MatchedCollege {
  id: number;
  name: string;
  institutionCode: string | null;
  category: string;
  management: string;
  district: string;
  affiliatedUniversity: string;
  admissionInfo: string | null;
  verificationStatus: string;
  approvedLogoId: number | null;
}

const RESERVATION_ADVISORIES: Record<string, string> = {
  OC: 'Open Category seats are allotted strictly via state merit order; EAPCET / OAMDC phase-wise web options remain open across all regions.',
  EWS: '10% Economically Weaker Section supernumerary quota applies in APSCHE / AICTE-approved institutions with valid revenue certificate.',
  'BC-A': 'BC-A reservation quota applies across Convener seats along with full Jnanabhumi Vidya Deevena tuition fee reimbursement for eligible families.',
  'BC-B': 'BC-B reservation quota applies across Convener seats along with eligible Jnanabhumi Vidya Deevena / Vasathi Deevena benefits.',
  'BC-C': 'BC-C reservation quota applies across Convener seats subject to valid community & income verification during certificate upload.',
  'BC-D': 'BC-D reservation quota applies across Convener seats with priority web-option allotment in state and private affiliated colleges.',
  'BC-E': 'BC-E reservation quota applies across Convener & Minority counselling pools where applicable under APSCHE guidelines.',
  SC: 'SC reservation quota (15%) with full Post-Matric Vidya Deevena reimbursement applies in verified Convener admissions.',
  ST: 'ST reservation quota (6%) with full Post-Matric Vidya Deevena reimbursement applies across AP State Universities and affiliated colleges.',
};

export function RankPredictorWidget({
  districts,
  verifiedCount,
}: {
  districts: string[];
  verifiedCount?: number;
}) {
  const { isCompared, toggleCompare } = useCompare();
  const [rank, setRank] = useState('');
  const [reservation, setReservation] = useState('OC');
  const [streamType, setStreamType] = useState('Engineering');
  const [preferredDistrict, setPreferredDistrict] = useState('');
  const [matches, setMatches] = useState<MatchedCollege[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericRank = Number(rank);
    if (!numericRank || numericRank <= 0) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('verificationStatus', 'verified');
      if (streamType) params.set('category', streamType);
      if (preferredDistrict) params.set('district', preferredDistrict);
      params.set('limit', '6');

      const res = await apiFetch<{ colleges: MatchedCollege[] }>(`/api/colleges?${params.toString()}`);
      setMatches(res.colleges || []);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const numericRank = Number(rank);
  const counsellingGuidance =
    numericRank > 0 && numericRank <= 5000
      ? 'Strong priority range for State University Campuses (AU, JNTUK, JNTUA, SVU) and Autonomous Engineering Institutions in Phase-I Web Options.'
      : numericRank > 5000 && numericRank <= 25000
        ? 'Competitive range for Top Autonomous & NAAC-accredited Private Engineering / Degree institutions across APSCHE Convener Quota.'
        : 'Wide choice of Affiliated Private, Aided & Government Degree / Engineering institutions; verify multi-district web options on APSCHE portals.';

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F2547] text-[#EA580C] shrink-0">
            <Calculator className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#0F2547]">
              AP EAPCET &amp; OAMDC Eligibility Guidance Finder
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Match your rank band and reservation category against{' '}
              <span className="font-mono font-semibold text-[#0F2547]">
                {verifiedCount ? `${verifiedCount}+` : 'verified'}
              </span>{' '}
              AP institutions without fabricated cutoffs.
            </p>
          </div>
        </div>
        <a
          href="https://eapcet-sche.aptonline.in/EAPCET/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] hover:underline"
        >
          Official APSCHE Counselling Portal
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <form onSubmit={handlePredict} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label htmlFor="ash-rank-input" className="block text-xs font-semibold text-[#0F2547]">
            Entrance Rank (EAPCET / ICET)
          </label>
          <input
            id="ash-rank-input"
            type="number"
            min="1"
            required
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            placeholder="e.g. 8500"
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-[#0F2547] focus:border-[#1E3A8A] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="ash-res-select" className="block text-xs font-semibold text-[#0F2547]">
            Reservation Category
          </label>
          <select
            id="ash-res-select"
            value={reservation}
            onChange={(e) => setReservation(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F2547] focus:border-[#1E3A8A] focus:outline-none"
          >
            {Object.keys(RESERVATION_ADVISORIES).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ash-stream-select" className="block text-xs font-semibold text-[#0F2547]">
            Program Stream
          </label>
          <select
            id="ash-stream-select"
            value={streamType}
            onChange={(e) => setStreamType(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F2547] focus:border-[#1E3A8A] focus:outline-none"
          >
            <option value="Engineering">Engineering (B.Tech)</option>
            <option value="Degree">Degree (B.Sc / B.Com / B.A)</option>
            <option value="University">State Universities</option>
            <option value="">All Streams</option>
          </select>
        </div>

        <div>
          <label htmlFor="ash-district-pref" className="block text-xs font-semibold text-[#0F2547]">
            Preferred District
          </label>
          <select
            id="ash-district-pref"
            value={preferredDistrict}
            onChange={(e) => setPreferredDistrict(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-[#0F2547] focus:border-[#1E3A8A] focus:outline-none"
          >
            <option value="">All AP Districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white transition cursor-pointer"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>{loading ? 'Searching...' : 'Find Eligible Colleges'}</span>
          </button>
        </div>
      </form>

      {matches && (
        <div className="mt-6 border-t border-slate-200 pt-5 space-y-4">
          <div className="rounded-lg bg-[#F8F9FB] border border-slate-200 p-4 text-xs text-slate-700 space-y-1.5">
            <p className="font-semibold text-[#0F2547]">
              Counselling Advisory — Rank{' '}
              <span className="font-mono tabular-nums">{Number(rank).toLocaleString()}</span> ({reservation})
            </p>
            <p>{counsellingGuidance}</p>
            <p className="text-slate-600">{RESERVATION_ADVISORIES[reservation]}</p>
            <p className="text-[11px] text-slate-500">
              Note: Actual branch closing ranks are published phase-by-phase by APSCHE / OAMDC on official counselling portals. Always verify latest allotment cutoffs before locking options.
            </p>
          </div>

          {matches.length === 0 ? (
            <p className="text-sm text-slate-600">
              No verified colleges matched the selected stream and district combination. Try selecting "All AP Districts" or switching streams.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((item) => {
                const compared = isCompared(item.id);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        {item.district} · {item.management}
                        {item.institutionCode ? ` · ${item.institutionCode}` : ''}
                      </p>
                      <h4 className="mt-1 text-sm font-bold text-[#0F2547] leading-snug">
                        <Link to={`/colleges/${item.id}`} className="hover:text-[#1E3A8A]">
                          {item.name}
                        </Link>
                      </h4>
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                        {item.admissionInfo || `Affiliated: ${item.affiliatedUniversity}`}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => toggleCompare(item)}
                        className={`inline-flex items-center gap-1 font-semibold cursor-pointer ${
                          compared ? 'text-[#EA580C]' : 'text-slate-700 hover:text-[#0F2547]'
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5" />
                        {compared ? 'Added to Compare' : 'Compare'}
                      </button>
                      <Link to={`/colleges/${item.id}`} className="font-semibold text-[#1E3A8A] hover:underline">
                        Profile →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
