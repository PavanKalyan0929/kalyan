import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, Scale, Trash2, X } from 'lucide-react';
import { useCompare } from '../context/CompareContext.tsx';
import { apiFetch, formatINR } from '../lib/api.ts';
import { CollegeLogoMark } from './CollegeLogoMark.tsx';
import { StatusText } from './StatusText.tsx';

interface DetailedCompareCollege {
  id: number;
  name: string;
  institutionCode: string | null;
  category: string;
  management: string;
  district: string;
  address: string;
  website: string | null;
  affiliatedUniversity: string;
  autonomousStatus: string | null;
  programmes: string[];
  engineeringBranches: string[];
  degreeCourses: string[];
  facilities: string[];
  accreditation: string | null;
  admissionInfo: string | null;
  verificationStatus: string;
  approvedLogoId: number | null;
  latestFeeStructure: {
    course: string;
    academicYear: string;
    tuitionFee: number;
    totalAnnualFee: number;
    sourceReference: string;
  } | null;
}

export function CollegeCompareDrawer() {
  const { compareList, removeCompare, clearCompare, compareModalOpen, setCompareModalOpen } = useCompare();
  const [detailedRows, setDetailedRows] = useState<DetailedCompareCollege[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!compareModalOpen || compareList.length === 0) return;
    let active = true;
    setLoadingDetails(true);
    const ids = compareList.map((c) => c.id).join(',');
    apiFetch<{ colleges: DetailedCompareCollege[] }>(`/api/colleges/compare?ids=${encodeURIComponent(ids)}`)
      .then((res) => {
        if (active) setDetailedRows(res.colleges || []);
      })
      .catch(() => {
        if (active) setDetailedRows([]);
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });
    return () => {
      active = false;
    };
  }, [compareModalOpen, compareList]);

  useEffect(() => {
    if (!compareModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCompareModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [compareModalOpen, setCompareModalOpen]);

  if (compareList.length === 0) return null;

  const matrixItems: DetailedCompareCollege[] =
    detailedRows.length > 0
      ? detailedRows
      : compareList.map((c) => ({
          ...c,
          address: c.district,
          website: null,
          autonomousStatus: null,
          programmes: [],
          engineeringBranches: [],
          degreeCourses: [],
          facilities: [],
          accreditation: null,
          admissionInfo: null,
          latestFeeStructure: null,
        }));

  return (
    <>
      {/* Sticky Bottom Comparison Bar */}
      <div
        role="region"
        aria-label="College Comparison Bar"
        className="fixed bottom-4 left-1/2 z-40 flex w-[94%] max-w-3xl -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[#1E3A8A]/40 bg-[#0F2547] px-4 py-3 text-white shadow-2xl no-print"
      >
        <div className="flex items-center gap-3 overflow-x-auto min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 shrink-0 tabular-nums">
            <Scale className="h-4 w-4" aria-hidden="true" />
            <span>Compare ({compareList.length}/3):</span>
          </div>

          <div className="flex items-center gap-2">
            {compareList.map((col) => (
              <span
                key={col.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 border border-white/15 px-2.5 py-1 text-xs font-semibold text-white whitespace-nowrap"
              >
                <span className="max-w-[140px] truncate">{col.institutionCode || col.name}</span>
                <button
                  type="button"
                  onClick={() => removeCompare(col.id)}
                  className="text-slate-300 hover:text-red-300 cursor-pointer"
                  aria-label={`Remove ${col.name} from comparison`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={clearCompare}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
            title="Clear Comparison"
            aria-label="Clear comparison list"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCompareModalOpen(true)}
            className="rounded-lg bg-[#EA580C] hover:bg-[#C2410C] px-4 py-2 text-xs font-bold text-white transition cursor-pointer whitespace-nowrap"
          >
            Compare Now
          </button>
        </div>
      </div>

      {/* Full Comparison Matrix Modal */}
      {compareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2547]/75 p-4 backdrop-blur-xs"
          onClick={() => setCompareModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-matrix-title"
            className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-[#0F2547] px-6 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <Scale className="h-5 w-5 text-[#EA580C]" aria-hidden="true" />
                <div>
                  <h2 id="compare-matrix-title" className="text-base sm:text-lg font-bold tracking-tight">
                    Side-by-Side Verified Institution Comparison
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Comparing authentic records from the Andhra Pradesh Institutional Registry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-200 hover:bg-white/15 cursor-pointer"
                aria-label="Close comparison dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Loading verified comparison metrics from database...
              </div>
            ) : (
              <div className="overflow-x-auto p-6">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="w-44 py-3 pr-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Parameter
                      </th>
                      {matrixItems.map((col) => (
                        <th key={col.id} className="min-w-[230px] px-4 py-3 align-top">
                          <div className="flex items-start gap-3">
                            <CollegeLogoMark
                              name={col.name}
                              institutionCode={col.institutionCode}
                              approvedLogoId={col.approvedLogoId}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <Link
                                to={`/colleges/${col.id}`}
                                onClick={() => setCompareModalOpen(false)}
                                className="text-sm font-bold text-[#0F2547] hover:text-[#1E3A8A] leading-snug block"
                              >
                                {col.name}
                              </Link>
                              <p className="mt-0.5 text-xs font-medium text-slate-500">
                                {col.category} · {col.institutionCode ? `Code ${col.institutionCode}` : 'Code pending'}
                              </p>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3.5 pr-4 text-xs font-bold text-slate-600">Verification Status</td>
                      {matrixItems.map((col) => (
                        <td key={col.id} className="px-4 py-3.5">
                          <StatusText status={col.verificationStatus === 'verified' ? 'Verified' : 'Pending'} />
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="py-3.5 pr-4 text-xs font-bold text-slate-600">District &amp; Location</td>
                      {matrixItems.map((col) => (
                        <td key={col.id} className="px-4 py-3.5 text-xs text-slate-800">
                          <span className="inline-flex items-start gap-1.5 font-semibold text-[#0F2547]">
                            <MapPin className="h-3.5 w-3.5 text-[#EA580C] shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{col.district} District</span>
                          </span>
                          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{col.address}</p>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3.5 pr-4 text-xs font-bold text-slate-600">Management &amp; Affiliation</td>
                      {matrixItems.map((col) => (
                        <td key={col.id} className="px-4 py-3.5 text-xs text-slate-700">
                          <p className="font-semibold text-[#0F2547]">{col.management}</p>
                          <p className="mt-0.5 text-slate-600">{col.affiliatedUniversity}</p>
                          {col.autonomousStatus && (
                            <p className="mt-0.5 text-[11px] text-slate-500">{col.autonomousStatus}</p>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="py-3.5 pr-4 text-xs font-bold text-slate-600">Published Annual Fee</td>
                      {matrixItems.map((col) => (
                        <td key={col.id} className="px-4 py-3.5 text-xs">
                          {col.latestFeeStructure ? (
                            <div>
                              <p className="font-mono font-bold tabular-nums text-emerald-800">
                                {formatINR(col.latestFeeStructure.totalAnnualFee)}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {col.latestFeeStructure.course} · {col.latestFeeStructure.academicYear}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Ref: {col.latestFeeStructure.sourceReference}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-500">
                              Not recorded on platform yet — check APHERMC / official portal
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3.5 pr-4 text-xs font-bold text-slate-600">Programmes &amp; Branches</td>
                      {matrixItems.map((col) => {
                        const list =
                          col.engineeringBranches.length > 0
                            ? col.engineeringBranches
                            : col.degreeCourses.length > 0
                              ? col.degreeCourses
                              : col.programmes;
                        return (
                          <td key={col.id} className="px-4 py-3.5 text-xs text-slate-700 leading-relaxed">
                            {list.length > 0 ? list.slice(0, 6).join(', ') : 'Verify via official website'}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="py-3.5 pr-4 text-xs font-bold text-slate-600">Accreditation &amp; Admissions</td>
                      {matrixItems.map((col) => (
                        <td key={col.id} className="px-4 py-3.5 text-xs text-slate-700 leading-relaxed">
                          <p className="font-medium text-slate-900">
                            {col.accreditation || 'Verify accreditation on institution portal'}
                          </p>
                          {col.admissionInfo && (
                            <p className="mt-1 text-[11px] text-slate-600">{col.admissionInfo}</p>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3.5 pr-4 text-xs font-bold text-slate-600">Campus Facilities</td>
                      {matrixItems.map((col) => (
                        <td key={col.id} className="px-4 py-3.5 text-xs text-slate-600 leading-relaxed">
                          {col.facilities.length > 0
                            ? col.facilities.slice(0, 5).join(', ')
                            : 'Check detailed college profile'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/70">
                      <td className="py-3.5 pr-4 text-xs font-bold text-slate-600">Actions</td>
                      {matrixItems.map((col) => (
                        <td key={col.id} className="px-4 py-3.5 text-xs">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              to={`/colleges/${col.id}`}
                              onClick={() => setCompareModalOpen(false)}
                              className="font-bold text-[#1E3A8A] hover:underline"
                            >
                              Full Profile →
                            </Link>
                            {col.website && (
                              <a
                                href={col.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
                              >
                                Website
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
