import { useEffect, useState } from 'react';
import { Bookmark, Building2, CheckCircle2, ExternalLink, MapPin, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CollegeLogoMark } from './CollegeLogoMark.tsx';
import { StatusText } from './StatusText.tsx';
import { useShortlist } from '../context/ShortlistContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface QuickModalCollege {
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
  accreditation: string | null;
  verificationStatus: string;
  approvedPhotoId: number | null;
  approvedLogoId: number | null;
}

interface ApprovedPhoto {
  id: number;
  category: string;
  caption: string;
}

export function CollegeQuickModal({
  college,
  onClose,
}: {
  college: QuickModalCollege | null;
  onClose: () => void;
}) {
  const { isSaved, toggleSave } = useShortlist();
  const [photos, setPhotos] = useState<ApprovedPhoto[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [facilities, setFacilities] = useState<string[]>([]);

  useEffect(() => {
    if (!college) return;
    setActivePhotoIndex(0);
    setPhotos([]);
    setFacilities([]);

    let active = true;
    apiFetch<{
      approvedPhotos: ApprovedPhoto[];
      college: { facilities: string[] };
    }>(`/api/colleges/${college.id}`)
      .then((res) => {
        if (!active) return;
        setPhotos(res.approvedPhotos || []);
        setFacilities(res.college?.facilities || []);
      })
      .catch(() => {
        // Ignore transient detail fetch failures
      });

    return () => {
      active = false;
    };
  }, [college]);

  if (!college) return null;

  const saved = isSaved(college.id);
  const activePhoto = photos[activePhotoIndex] || null;
  const fallbackPhotoId = activePhoto?.id ?? college.approvedPhotoId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={`${college.name} quick preview`}
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close college preview"
          className="absolute right-4 top-4 z-10 rounded-full bg-white/95 p-2 text-[#0F2547] border border-slate-200 shadow hover:bg-slate-50 cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Campus Media Banner */}
        <div className="relative h-56 sm:h-68 w-full bg-slate-100 border-b border-slate-200">
          {fallbackPhotoId ? (
            <img
              src={`/api/files/college-photo/${fallbackPhotoId}`}
              alt={activePhoto?.caption || `${college.name} verified campus photograph`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <Building2 className="w-9 h-9 text-slate-400 mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">Official college photograph coming soon.</p>
              <p className="text-xs text-slate-500 mt-1">
                Only authentic institution-authorised campus photographs appear once approved by State Administration.
              </p>
            </div>
          )}

          {photos.length > 1 && (
            <div className="absolute bottom-3 left-4 flex flex-wrap gap-1.5">
              {photos.slice(0, 5).map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    idx === activePhotoIndex
                      ? 'bg-[#EA580C] text-white'
                      : 'bg-[#0F2547]/80 text-white hover:bg-[#0F2547]'
                  }`}
                >
                  {p.category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <CollegeLogoMark
                name={college.name}
                institutionCode={college.institutionCode}
                approvedLogoId={college.approvedLogoId}
                size="md"
              />
              <div>
                <p className="text-xs text-slate-500">
                  {college.category} <span aria-hidden="true">·</span> {college.management}{' '}
                  <span aria-hidden="true">·</span> {college.district} District
                </p>
                <h2 className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-[#0F2547]">
                  {college.name}
                </h2>
                <p className="mt-1 text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                  <span>{college.address}</span>
                </p>
              </div>
            </div>
            <StatusText status={college.verificationStatus === 'verified' ? 'Verified' : 'Pending'} />
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                APSCHE / Institution Code
              </dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-[#0F2547]">
                {college.institutionCode || 'Pending record'}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Affiliated University
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#0F2547] line-clamp-2">
                {college.affiliatedUniversity}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Accreditation
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[#0F2547] line-clamp-2">
                {college.accreditation || 'Verify via institution portal'}
              </dd>
            </div>
          </dl>

          {college.programmes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Programmes Offered
              </h3>
              <p className="mt-1.5 text-sm text-slate-700">{college.programmes.join(' · ')}</p>
            </div>
          )}

          {facilities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Recorded Campus Infrastructure
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {facilities.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void toggleSave(college.id, college.name)}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                  saved
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'border border-slate-300 bg-white text-[#0F2547] hover:bg-slate-50'
                }`}
              >
                <Bookmark className="h-4 w-4" />
                {saved ? 'Saved in Shortlist' : 'Add to Shortlist'}
              </button>
              {college.website && (
                <a
                  href={college.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0F2547]"
                >
                  Official Site
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <Link
              to={`/colleges/${college.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2547] hover:bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Open Full Institution Profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
