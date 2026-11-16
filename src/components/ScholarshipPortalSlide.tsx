import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Megaphone,
  Headphones,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import heroCampusImg from '../assets/images/hero_ap_university_campus_1794844976315.jpg';
import heroLibraryImg from '../assets/images/hero_ap_library_students_1794844975826.jpg';
import sectorSeminarImg from '../assets/images/sector_ap_careers_seminar_1794847411888.jpg';

const SCHOLARSHIP_BANNERS = [
  {
    id: 'banner-1',
    image: heroCampusImg,
    caption: 'Academic Year 2026–27 · Post-Matric & Merit-cum-Means Scholarships for Andhra Pradesh Students',
  },
  {
    id: 'banner-2',
    image: heroLibraryImg,
    caption: 'Jnanabhumi RTF/MTF Tuition & Maintenance Fee Support · Check Official Eligibility & Attendance Rules',
  },
  {
    id: 'banner-3',
    image: sectorSeminarImg,
    caption: 'NSP Central Sector & AICTE Pragati / Saksham Fellowships · Verified Direct Official Portal Links',
  },
];

interface RoleAction {
  label: string;
  to?: string;
  externalUrl?: string;
}

interface RoleCard {
  id: string;
  title: string;
  bgColor: string;
  hoverColor: string;
  icon: typeof GraduationCap;
  subtitle: string;
  actions: RoleAction[];
}

const ROLE_CARDS: RoleCard[] = [
  {
    id: 'students',
    title: 'Students',
    bgColor: 'bg-[#0F2547]',
    hoverColor: 'hover:bg-[#1E3A8A]',
    icon: GraduationCap,
    subtitle: 'Fresh & Renewal Scholarship Tracking (2026–27)',
    actions: [
      { label: 'Complete Student Registration & College Onboarding', to: '/register' },
      { label: 'Update Personal Scholarship Tracker in Dashboard', to: '/dashboard' },
      { label: 'Open AP Jnanabhumi Official Portal', externalUrl: 'https://jnanabhumi.ap.gov.in' },
    ],
  },
  {
    id: 'institutions',
    title: 'Institutions',
    bgColor: 'bg-[#1E3A8A]',
    hoverColor: 'hover:bg-[#0F2547]',
    icon: Building2,
    subtitle: 'College Administration & Verification Desk',
    actions: [
      { label: 'Open College Administrator Console', to: '/college-admin' },
      { label: 'Publish Authorised Fee Structures & Student Statements', to: '/fees' },
      { label: 'Browse Verified AP Institutional Directory', to: '/colleges' },
    ],
  },
  {
    id: 'officers',
    title: 'Officers',
    bgColor: 'bg-[#7A5E1D]',
    hoverColor: 'hover:bg-[#9A7B2C]',
    icon: UserCheck,
    subtitle: 'State Governance & Verification Desk',
    actions: [
      { label: 'Open State Administration & Governance Portal', to: '/state-admin' },
      { label: 'Inspect 26-District Institutional Coverage', to: '/districts' },
      { label: 'Review Escalated Scholarship Grievances', to: '/services' },
    ],
  },
  {
    id: 'public',
    title: 'Public',
    bgColor: 'bg-[#1E5B70]',
    hoverColor: 'hover:bg-[#174758]',
    icon: Users,
    subtitle: 'Open Schemes, Eligibility & Fee Transparency',
    actions: [
      { label: 'Search AP Engineering & Degree Institutions', to: '/colleges' },
      { label: 'Inspect Scheme Eligibility & Required Documents', to: '/scholarships' },
      { label: 'Read Student Grievance Redressal Guidelines', to: '/services' },
    ],
  },
  {
    id: 'fellowship',
    title: 'Fellowship',
    bgColor: 'bg-[#C2410C]',
    hoverColor: 'hover:bg-[#EA580C]',
    icon: Award,
    subtitle: 'PG, Research, GATE & NPTEL Merit Tracks',
    actions: [
      { label: 'Explore AICTE, GATE & Competitive Exam Tracks', to: '/career-exams' },
      { label: 'View SWAYAM-NPTEL IIT/IIM Credit Courses', to: '/nptel' },
      { label: 'Open National Scholarship Portal (NSP)', externalUrl: 'https://scholarships.gov.in' },
    ],
  },
];

export function ScholarshipPortalSlide() {
  const [slideIdx, setSlideIdx] = useState(0);
  const [activeRole, setActiveRole] = useState<RoleCard | null>(null);
  const [bannerNote, setBannerNote] = useState('');

  const prevSlide = () =>
    setSlideIdx((prev) => (prev - 1 + SCHOLARSHIP_BANNERS.length) % SCHOLARSHIP_BANNERS.length);
  const nextSlide = () =>
    setSlideIdx((prev) => (prev + 1) % SCHOLARSHIP_BANNERS.length);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-[#FBF9F4] px-5 py-3.5 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F2547] text-[#E6C775]">
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold tracking-tight text-[#0F2547]">
              ASH Scholarship Gateway
            </p>
            <p className="text-xs font-medium text-slate-600">
              Academic Year 2026–27 · Jnanabhumi &amp; NSP Role Portals
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-[#0F2547]">
          <button
            type="button"
            onClick={() =>
              setBannerNote('Review income limits, 75% attendance rules, and Aadhaar-NPCI mapping guidelines below.')
            }
            className="inline-flex items-center gap-1.5 hover:text-[#EA580C] cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-[#1E3A8A]" />
            <span>Eligibility FAQs</span>
          </button>
          <Link
            to="/posters"
            className="inline-flex items-center gap-1.5 hover:text-[#EA580C]"
          >
            <Megaphone className="h-4 w-4 text-[#EA580C]" />
            <span>Awareness Posters</span>
          </Link>
          <Link
            to="/services"
            className="inline-flex items-center gap-1.5 hover:text-[#EA580C]"
          >
            <Headphones className="h-4 w-4 text-[#1E3A8A]" />
            <span>Scholarship Helpdesk</span>
          </Link>
        </div>
      </div>

      {bannerNote && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 sm:px-8 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-950">
          <span>{bannerNote}</span>
          <button type="button" onClick={() => setBannerNote('')} className="font-semibold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      <div className="px-4 pt-5 sm:px-8">
        <div className="relative h-52 sm:h-68 w-full overflow-hidden rounded-xl bg-[#0F2547]">
          {SCHOLARSHIP_BANNERS.map((banner, idx) => (
            <div
              key={banner.id}
              aria-hidden={idx !== slideIdx}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === slideIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={banner.image}
                alt={banner.caption}
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F]/85 via-[#0F2547]/35 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                <p className="text-xs sm:text-sm font-medium">{banner.caption}</p>
                <span className="hidden sm:inline-block rounded bg-black/40 px-2.5 py-0.5 font-mono text-[11px]">
                  {idx + 1} / {SCHOLARSHIP_BANNERS.length}
                </span>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous Scholarship Banner"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/65 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next Scholarship Banner"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/65 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {ROLE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveRole(card)}
                className={`group flex h-36 flex-col items-center justify-center rounded-lg ${card.bgColor} ${card.hoverColor} p-4 text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-6 w-6 text-[#E6C775]" aria-hidden="true" />
                  <span className="font-serif text-lg font-semibold tracking-tight">{card.title}</span>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-white/85 group-hover:text-white">
                  <span>Open Portal</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeRole && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-portal-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/70 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className={`${activeRole.bgColor} flex items-center justify-between px-6 py-4 text-white`}>
              <div className="flex items-center gap-2.5">
                <activeRole.icon className="h-6 w-6 text-[#E6C775]" aria-hidden="true" />
                <div>
                  <h3 id="role-portal-modal-title" className="font-serif text-lg font-semibold">
                    {activeRole.title} Portal
                  </h3>
                  <p className="text-xs text-white/80">{activeRole.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRole(null)}
                aria-label="Close portal modal"
                className="rounded-lg p-1 hover:bg-white/15 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {activeRole.actions.map((action) =>
                action.externalUrl ? (
                  <a
                    key={action.label}
                    href={action.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-semibold text-[#0F2547] hover:border-[#1E3A8A] hover:bg-slate-50 transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#9A7B2C] shrink-0" />
                      {action.label}
                    </span>
                    <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                  </a>
                ) : (
                  <Link
                    key={action.label}
                    to={action.to || '/scholarships'}
                    onClick={() => setActiveRole(null)}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-sm font-semibold text-[#0F2547] hover:border-[#1E3A8A] hover:bg-slate-50 transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#1E3A8A] shrink-0" />
                      {action.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
