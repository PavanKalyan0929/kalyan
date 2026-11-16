import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  Building2,
  Eye,
  GraduationCap,
  IndianRupee,
  MessageSquareWarning,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { CollegeFeesGuidanceSlide } from '../components/CollegeFeesGuidanceSlide.tsx';
import { CollegeLogoMark } from '../components/CollegeLogoMark.tsx';
import { CollegeQuickModal } from '../components/CollegeQuickModal.tsx';
import { CompetitiveExamSidebar } from '../components/CompetitiveExamSidebar.tsx';
import { EditorialPosterCard, type PosterRecord } from '../components/EditorialPosterCard.tsx';
import { EdutechSectorShowcase } from '../components/EdutechSectorShowcase.tsx';
import { FeaturedDomainBlogs } from '../components/FeaturedDomainBlogs.tsx';
import { LatestCircularsBoard } from '../components/LatestCircularsBoard.tsx';
import { StatusText } from '../components/StatusText.tsx';
import { StudentHeroSlider } from '../components/StudentHeroSlider.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useCompare } from '../context/CompareContext.tsx';
import { useShortlist } from '../context/ShortlistContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface PublicStats {
  totalColleges: number;
  verifiedColleges: number;
  districtsCovered: number;
  totalApDistricts: number;
  activeScholarships: number;
  registeredStudents: number;
  resolvedGrievances: number;
  collegesWithPhotos: number;
  collegesWithLogos: number;
}

interface SpotlightCollege {
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

const PRIORITY_NAMES = [
  'Narayana Engineering College, Nellore',
  'Narayana Engineering College, Gudur',
  'Audisankara College of Engineering and Technology, Gudur',
  'NBKR Institute of Science and Technology (NBKRIST), Vidyanagar',
];

export function HomePage() {
  const { user, needsStudentOnboarding, needsStateAdminBootstrap } = useAuth();
  const { isSaved, toggleSave } = useShortlist();
  const { isCompared, toggleCompare } = useCompare();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [spotlightColleges, setSpotlightColleges] = useState<SpotlightCollege[]>([]);
  const [posters, setPosters] = useState<PosterRecord[]>([]);
  const [quickCollege, setQuickCollege] = useState<SpotlightCollege | null>(null);

  useEffect(() => {
    apiFetch<PublicStats>('/api/stats/public')
      .then(setStats)
      .catch(() => setStats(null));
    apiFetch<{ colleges: SpotlightCollege[] }>('/api/colleges?verificationStatus=verified&limit=50')
      .then((res) => {
        const all = res.colleges || [];
        const prioritized = all.filter((c) => PRIORITY_NAMES.includes(c.name));
        const remaining = all.filter((c) => !PRIORITY_NAMES.includes(c.name)).slice(0, Math.max(0, 6 - prioritized.length));
        setSpotlightColleges([...prioritized, ...remaining].slice(0, 6));
      })
      .catch(() => setSpotlightColleges([]));
    apiFetch<{ posters: PosterRecord[] }>('/api/posters')
      .then((res) => setPosters((res.posters || []).slice(0, 3)))
      .catch(() => setPosters([]));
  }, []);

  const dashboardTarget =
    user?.role === 'state_admin'
      ? '/state-admin'
      : user?.role === 'college_admin'
        ? '/college-admin'
        : needsStudentOnboarding
          ? '/register'
          : '/dashboard';

  return (
    <div>
      {needsStateAdminBootstrap && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-950">
          <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-3">
            <p>
              <strong>Initial Platform Setup Required:</strong> No State Administrator account has been initialized yet.
            </p>
            <Link
              to="/setup"
              className="font-semibold text-amber-900 underline underline-offset-4 hover:text-amber-700 whitespace-nowrap"
            >
              Initialize State Admin Account →
            </Link>
          </div>
        </div>
      )}

      {/* Campus Photography Hero Carousel + Integrated Directory Search */}
      <StudentHeroSlider
        userActionTarget={user ? dashboardTarget : '/register'}
        userActionLabel={
          user
            ? needsStudentOnboarding
              ? 'Complete Student Onboarding'
              : 'Open My Dashboard'
            : 'Student Registration'
        }
      />

      {/* Full-Width Real-Data KPI Strip */}
      <section className="border-b border-slate-200 bg-[#FBF9F4]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <div>
            <p className="text-xs text-slate-500">Verified Institutions</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0F2547]">
              {stats ? stats.verifiedColleges : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Directory Records</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0F2547]">
              {stats ? stats.totalColleges : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">AP Districts Indexed</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0F2547]">
              {stats ? `${stats.districtsCovered}/${stats.totalApDistricts}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Registered Students</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0F2547]">
              {stats ? stats.registeredStudents : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Official Scholarships</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0F2547]">
              {stats ? stats.activeScholarships : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Grievances Resolved</p>
            <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-[#0F2547]">
              {stats ? stats.resolvedGrievances : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Higher Education & Career Showcase */}
      <EdutechSectorShowcase />

      {/* Featured Institutions + Competitive Exam Alerts Sidebar */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
                  Verified Institutional Directory
                </p>
                <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-[#0F2547]">
                  Featured Verified Colleges in Andhra Pradesh
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Separate campus records maintained with distinct APSCHE / EAPCET institution codes and verified locations.
                </p>
              </div>
              <Link to="/colleges" className="text-sm font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap">
                Explore All Institutions →
              </Link>
            </div>

            {spotlightColleges.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {spotlightColleges.map((col) => {
                  const saved = isSaved(col.id);
                  return (
                    <article
                      key={col.id}
                      className="group bg-white border border-slate-200 hover:border-[#1E3A8A] rounded-xl p-5 flex flex-col justify-between transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3.5 min-w-0">
                          <CollegeLogoMark
                            name={col.name}
                            institutionCode={col.institutionCode}
                            approvedLogoId={col.approvedLogoId}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold text-[#0F2547] group-hover:text-[#1E3A8A] leading-snug">
                              <Link to={`/colleges/${col.id}`}>{col.name}</Link>
                            </h3>
                            <p className="mt-1.5 text-xs text-slate-600">
                              {col.district} <span aria-hidden="true">·</span> {col.category}
                              {col.institutionCode ? (
                                <>
                                  {' '}
                                  <span aria-hidden="true">·</span>{' '}
                                  <span className="font-mono font-semibold text-slate-800">{col.institutionCode}</span>
                                </>
                              ) : null}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void toggleSave(col.id, col.name)}
                          aria-label={saved ? `Remove ${col.name} from shortlist` : `Save ${col.name} to shortlist`}
                          className={`p-2 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                            saved
                              ? 'bg-[#EA580C] text-white border-[#EA580C]'
                              : 'bg-white text-slate-500 border-slate-200 hover:text-[#0F2547] hover:border-slate-300'
                          }`}
                        >
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <StatusText status={col.verificationStatus === 'verified' ? 'Verified' : 'Pending'} />
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleCompare(col)}
                            className={`inline-flex items-center gap-1 font-semibold cursor-pointer ${
                              isCompared(col.id) ? 'text-[#EA580C]' : 'text-slate-600 hover:text-[#0F2547]'
                            }`}
                          >
                            <Scale className="w-3.5 h-3.5" />
                            {isCompared(col.id) ? 'Compared' : 'Compare'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickCollege(col)}
                            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-[#0F2547] cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                          </button>
                          <Link to={`/colleges/${col.id}`} className="font-semibold text-[#1E3A8A] hover:underline">
                            Profile →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <CompetitiveExamSidebar />
          </div>
        </div>
      </section>

      <CollegeQuickModal college={quickCollege} onClose={() => setQuickCollege(null)} />

      {/* Featured ASH Awareness & Editorial Posters */}
      {posters.length > 0 && (
        <section className="bg-white border-y border-slate-200 py-14">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
                  Student Awareness &amp; Campaigns
                </p>
                <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-[#0F2547]">
                  Curated Educational Posters &amp; Advisories
                </h2>
              </div>
              <Link to="/posters" className="text-sm font-semibold text-[#1E3A8A] hover:underline whitespace-nowrap">
                View All Posters →
              </Link>
            </div>

            <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-6">
              {posters.map((poster, i) => (
                <EditorialPosterCard key={poster.id} poster={poster} variant={i === 0 ? 'navy' : 'light'} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Core Platform Pillars */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">Platform Capabilities</p>
          <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[#0F2547]">
            Unified Services for Students, Colleges &amp; State Administration
          </h2>
          <p className="mt-2 text-slate-600 text-sm">
            Built with college-level data isolation, auditable workflows, and verified institutional records.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Building2,
              title: 'Verified College Directory',
              desc: 'Search Andhra Pradesh universities, engineering, autonomous, aided, and government degree colleges with source metadata and APSCHE codes.',
              to: '/colleges',
              cta: 'Browse Directory',
            },
            {
              icon: ShieldCheck,
              title: 'College Identity Verification',
              desc: 'Multi-step enrolment verification via student ID evidence, official college email validation, and authorised college staff review.',
              to: '/dashboard',
              cta: 'Verify Enrolment',
            },
            {
              icon: IndianRupee,
              title: 'Fee Structure Transparency',
              desc: 'View authorised tuition, exam, lab, hostel, and transport fees, payment history, pending balances, and downloadable fee statements.',
              to: '/fees',
              cta: 'View Fee Transparency',
            },
            {
              icon: GraduationCap,
              title: 'AP & Central Scholarships',
              desc: 'Track Jnanabhumi Vidya Deevena, Vasathi Deevena, NSP Central Sector, and AICTE Pragati/Saksham guidelines with official portal links.',
              to: '/scholarships',
              cta: 'Explore Scholarships',
            },
            {
              icon: MessageSquareWarning,
              title: 'Grievance Redressal & Escalation',
              desc: 'Submit complaints with attachments, receive unique tracking references, optional local AI triage, and escalate unresolved cases to State Desk.',
              to: '/services',
              cta: 'File or Track Grievance',
            },
            {
              icon: Scale,
              title: 'UPSC, APPSC & NPTEL Center',
              desc: 'Access formal UPSC CSE, APPSC Group-I/II, SSC, Banking, Railways, Defence, and IIT/IIM SWAYAM-NPTEL credit guidance.',
              to: '/upsc',
              cta: 'Open Competitive Exams Center',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <Icon className="w-6 h-6 text-[#0F2547]" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold text-[#0F2547]">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
                <Link
                  to={item.to}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E3A8A] hover:underline"
                >
                  {item.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Statewide Official Notices & Latest Circulars Board */}
      <LatestCircularsBoard />

      {/* College Fees & Admissions Guidance */}
      <CollegeFeesGuidanceSlide
        verifiedColleges={stats?.verifiedColleges}
        districtsCovered={stats?.districtsCovered}
        activeScholarships={stats?.activeScholarships}
      />

      {/* Curated Domain Guides */}
      <FeaturedDomainBlogs />
    </div>
  );
}
