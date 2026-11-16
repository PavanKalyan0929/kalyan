import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Building2, ExternalLink, Globe, GraduationCap, MapPin, Scale, ShieldCheck, X } from 'lucide-react';
import { CollegeLogoMark } from '../components/CollegeLogoMark.tsx';
import { EditorialPosterCard, type PosterRecord } from '../components/EditorialPosterCard.tsx';
import { StatusText } from '../components/StatusText.tsx';
import { useCompare } from '../context/CompareContext.tsx';
import { useShortlist } from '../context/ShortlistContext.tsx';
import { apiFetch, formatDate, formatINR } from '../lib/api.ts';

const PHOTO_GALLERY_TABS = [
  'All',
  'Campus',
  'Buildings',
  'Canteen',
  'Sports',
  'Laboratories',
  'Library',
  'Events',
  'Student Life',
] as const;

interface ApprovedPhoto {
  id: number;
  category: string;
  caption: string;
  sourceAttribution: string;
  permissionReference: string;
  approvedAt: string | null;
}

interface CollegeDetailResponse {
  college: {
    id: number;
    name: string;
    institutionCode: string | null;
    category: string;
    management: string;
    district: string;
    address: string;
    pinCode: string | null;
    website: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    affiliatedUniversity: string;
    autonomousStatus: string | null;
    programmes: string[];
    engineeringBranches: string[];
    degreeCourses: string[];
    facilities: string[];
    admissionInfo: string | null;
    accreditation: string | null;
    academicCalendarNote: string | null;
    placementSummary: string | null;
    verificationStatus: string;
    dataSource: string;
    sourceUrl: string | null;
    lastVerifiedAt: string | null;
    officialEmailDomain: string | null;
    approvedLogoId: number | null;
    approvedPhotoId: number | null;
  };
  approvedLogo: {
    id: number;
    hasFile: boolean;
    sourceUrl: string | null;
    sourceAttribution: string;
    permissionReference: string;
    verificationNote: string | null;
    approvedAt: string | null;
  } | null;
  approvedPhotos: ApprovedPhoto[];
  approvedPosters: PosterRecord[];
  feeStructures: Array<{
    id: number;
    course: string;
    academicYear: string;
    semester: string;
    tuitionFee: number;
    examinationFee: number;
    laboratoryFee: number;
    hostelFee: number;
    transportFee: number;
    otherAuthorisedFee: number;
    dueDate: string | null;
    sourceReference: string;
  }>;
  notices: Array<{
    id: number;
    category: string;
    title: string;
    body: string;
    publishedAt: string;
  }>;
}

export function CollegeDetailPage() {
  const { id } = useParams();
  const { isSaved, toggleSave } = useShortlist();
  const { isCompared, toggleCompare } = useCompare();
  const [data, setData] = useState<CollegeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [galleryTab, setGalleryTab] = useState<string>('All');
  const [lightboxPhoto, setLightboxPhoto] = useState<ApprovedPhoto | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<CollegeDetailResponse>(`/api/colleges/${id}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load institution profile'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="h-8 bg-slate-200 rounded w-1/2 animate-pulse" />
        <div className="mt-6 h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <Link to="/colleges" className="text-sm font-semibold text-[#1E3A8A] hover:underline">
          ← Back to College Directory
        </Link>
        <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-800">
          {error || 'Institution record not found.'}
        </div>
      </div>
    );
  }

  const { college, approvedLogo, approvedPhotos, approvedPosters, feeStructures, notices } = data;
  const filteredPhotos =
    galleryTab === 'All'
      ? approvedPhotos
      : approvedPhotos.filter((p) => p.category.toLowerCase() === galleryTab.toLowerCase());

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <Link to="/colleges" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E3A8A] hover:underline">
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      {/* Institution Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-5">
            <CollegeLogoMark
              name={college.name}
              institutionCode={college.institutionCode}
              approvedLogoId={college.approvedLogoId}
              size="lg"
              showPlaceholderLabel
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{college.category}</span>
                <span aria-hidden="true">·</span>
                <span>{college.management}</span>
                <span aria-hidden="true">·</span>
                <span>{college.district} District</span>
              </div>
              <h1 className="mt-2 font-serif text-2xl sm:text-3xl font-semibold text-[#0F2547]">
                {college.name}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Affiliated University: <span className="font-medium text-slate-900">{college.affiliatedUniversity}</span>
                {college.autonomousStatus ? ` · ${college.autonomousStatus}` : ''}
              </p>
              {approvedLogo && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Official Logo Source: {approvedLogo.sourceAttribution} · Permission Ref: {approvedLogo.permissionReference}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <StatusText status={college.verificationStatus === 'verified' ? 'Verified' : 'Pending'} />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCompare(college)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  isCompared(college.id)
                    ? 'bg-[#0F2547] text-white'
                    : 'border border-slate-300 bg-white text-[#0F2547] hover:bg-slate-50'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                {isCompared(college.id) ? 'Added to Compare' : 'Compare'}
              </button>
              <button
                type="button"
                onClick={() => void toggleSave(college.id, college.name)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  isSaved(college.id)
                    ? 'bg-[#EA580C] hover:bg-[#C2410C] text-white'
                    : 'border border-slate-300 bg-white text-[#0F2547] hover:bg-slate-50'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                {isSaved(college.id) ? 'Saved in Shortlist' : 'Shortlist College'}
              </button>
              {college.website && (
                <a
                  href={college.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2547] hover:bg-[#1E3A8A] rounded-lg"
                >
                  Visit Official Website
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <dl className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
          <div>
            <dt className="text-xs text-slate-500">Institution / APSCHE Code</dt>
            <dd className="mt-1 font-mono font-semibold text-[#0F2547]">
              {college.institutionCode || 'Not recorded — pending verification'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Accreditation / Statutory Status</dt>
            <dd className="mt-1 text-slate-800">{college.accreditation || 'Verify via official institution portal'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Official Email Domain</dt>
            <dd className="mt-1 font-mono text-slate-800">{college.officialEmailDomain || 'Not configured'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Campus Address &amp; Admissions
            </dt>
            <dd className="mt-1 text-slate-800">
              {college.address}
              {college.pinCode ? ` (PIN: ${college.pinCode})` : ''}
            </dd>
            {college.admissionInfo && (
              <p className="mt-2 text-xs text-slate-600">Admissions: {college.admissionInfo}</p>
            )}
          </div>
          <div>
            <dt className="text-xs text-slate-500 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Official Contact Details
            </dt>
            <dd className="mt-1 space-y-1 text-xs text-slate-700">
              {college.contactEmail ? <p>{college.contactEmail}</p> : <p className="text-slate-500">Email: Verify via official website</p>}
              {college.contactPhone && <p className="font-mono">{college.contactPhone}</p>}
              <p className="text-slate-500">
                Placements: {college.placementSummary || 'Verify official records on institution website'}
              </p>
            </dd>
          </div>
        </dl>

        {college.facilities.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Recorded Campus Facilities</p>
            <p className="mt-1 text-xs text-slate-600">{college.facilities.join(' · ')}</p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>
            Data Source: {college.dataSource}
            {college.lastVerifiedAt ? ` · Last Verified: ${college.lastVerifiedAt}` : ''}
          </span>
          {college.sourceUrl && (
            <a href={college.sourceUrl} target="_blank" rel="noreferrer" className="text-[#1E3A8A] hover:underline">
              Verify Source Link →
            </a>
          )}
        </div>
      </div>

      {/* Categorized Authentic Campus Gallery */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[#0F2547]">
              Official Campus Photograph Gallery
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Only authentic photographs of this specific college uploaded with written institutional permission and approved by State Administration appear here.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600 tabular-nums">
            {approvedPhotos.length} verified photo{approvedPhotos.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* 8 Gallery Category Filters */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
          {PHOTO_GALLERY_TABS.map((tab) => {
            const tabCount =
              tab === 'All'
                ? approvedPhotos.length
                : approvedPhotos.filter((p) => p.category.toLowerCase() === tab.toLowerCase()).length;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setGalleryTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  galleryTab === tab
                    ? 'bg-[#0F2547] text-white border-[#0F2547]'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab} ({tabCount})
              </button>
            );
          })}
        </div>

        {filteredPhotos.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
            <Building2 className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">Official college photograph coming soon.</p>
            <p className="text-xs text-slate-500 mt-1">
              {galleryTab === 'All'
                ? 'College administrators can upload verified campus photos inside the College Admin Dashboard.'
                : `No State-approved photographs recorded under "${galleryTab}" yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPhotos.map((photo) => (
              <figure key={photo.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(photo)}
                  className="w-full block text-left cursor-pointer group"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={`/api/files/college-photo/${photo.id}`}
                      alt={photo.caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  </div>
                </button>
                <figcaption className="p-3 bg-slate-50 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-[#0F2547]">
                    {photo.category} · {photo.caption}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Source: {photo.sourceAttribution} · Ref: {photo.permissionReference}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Programmes & Branches */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-[#0F2547]">Available Programmes</h2>
          {college.programmes.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700 list-disc list-inside">
              {college.programmes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Programmes not yet itemized.</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#0F2547]">Engineering Branches</h2>
          {college.engineeringBranches.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700 list-disc list-inside">
              {college.engineeringBranches.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No engineering branches recorded.</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-[#0F2547]">Degree Courses</h2>
          {college.degreeCourses.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700 list-disc list-inside">
              {college.degreeCourses.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No separate degree courses listed.</p>
          )}
        </div>
      </section>

      {/* Approved College Posters (if any) */}
      {approvedPosters && approvedPosters.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-[#0F2547]">
            Official College Announcements &amp; Posters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {approvedPosters.map((poster) => (
              <EditorialPosterCard key={poster.id} poster={poster} />
            ))}
          </div>
        </section>
      )}

      {/* Authorised Fee Structures */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold text-[#0F2547]">
            Published Authorised Fee Structures
          </h2>
          <Link to="/fees" className="text-xs font-semibold text-[#1E3A8A] hover:underline">
            Fee Transparency Policy →
          </Link>
        </div>
        {feeStructures.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            This institution has not published a fee structure on ASH yet. Registered students should check official college circulars.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 pr-4">Course</th>
                  <th className="py-2 pr-4">Year / Sem</th>
                  <th className="py-2 pr-4 text-right">Tuition</th>
                  <th className="py-2 pr-4 text-right">Exam</th>
                  <th className="py-2 pr-4 text-right">Lab</th>
                  <th className="py-2 pr-4 text-right">Hostel/Transport</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2">Order Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeStructures.map((fs) => {
                  const total =
                    fs.tuitionFee +
                    fs.examinationFee +
                    fs.laboratoryFee +
                    fs.hostelFee +
                    fs.transportFee +
                    fs.otherAuthorisedFee;
                  return (
                    <tr key={fs.id}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{fs.course}</td>
                      <td className="py-2.5 pr-4 text-slate-600">
                        {fs.academicYear} ({fs.semester})
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{formatINR(fs.tuitionFee)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{formatINR(fs.examinationFee)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums">{formatINR(fs.laboratoryFee)}</td>
                      <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                        {formatINR(fs.hostelFee + fs.transportFee + fs.otherAuthorisedFee)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono font-semibold tabular-nums">{formatINR(total)}</td>
                      <td className="py-2.5 text-xs text-slate-600">{fs.sourceReference}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* College Public Notices & Student Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="font-serif text-xl font-semibold text-[#0F2547]">College Academic Notices</h2>
          {college.academicCalendarNote && (
            <p className="mt-2 text-xs text-slate-600 bg-[#FBF9F4] border border-slate-200 rounded-lg p-3">
              <strong>Academic Calendar Note:</strong> {college.academicCalendarNote}
            </p>
          )}
          {notices.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No public college notices published on ASH yet.</p>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {notices.map((n) => (
                <div key={n.id} className="py-3">
                  <p className="text-xs text-slate-500">
                    {n.category} · {formatDate(n.publishedAt)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="bg-[#0F2547] text-white border border-[#1E3A8A] rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#E6C775] text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Student Services CTA
          </div>
          <h2 className="font-serif text-lg font-semibold">Enrolled at {college.name}?</h2>
          <p className="text-xs text-slate-200 leading-relaxed">
            Register your official enrolment number to verify your campus identity, check authorised fee ledgers, track scholarships, and file college grievances.
          </p>
          <div className="space-y-2 pt-2 text-xs font-semibold">
            <Link
              to="/register"
              className="block w-full text-center px-4 py-2.5 bg-[#E6C775] text-[#0F2547] hover:bg-[#d9b860] rounded-lg"
            >
              Student Registration &amp; Verification
            </Link>
            <Link
              to="/scholarships"
              className="flex items-center justify-center gap-1.5 w-full px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg"
            >
              <GraduationCap className="w-4 h-4" />
              Eligible Scholarship Portals
            </Link>
          </div>
        </aside>
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxPhoto.caption}
        >
          <div className="bg-white rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#0F2547]">
                {lightboxPhoto.category} · {college.name}
              </span>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                aria-label="Close photograph lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-slate-900 flex items-center justify-center max-h-[70vh]">
              <img
                src={`/api/files/college-photo/${lightboxPhoto.id}`}
                alt={lightboxPhoto.caption}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="p-4 bg-slate-50 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900">{lightboxPhoto.caption}</p>
              <p>
                Source: {lightboxPhoto.sourceAttribution} · Permission Reference: {lightboxPhoto.permissionReference}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
