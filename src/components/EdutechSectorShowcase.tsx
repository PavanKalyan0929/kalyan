import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Cpu,
  GraduationCap,
} from 'lucide-react';
import heroCampusImg from '../assets/images/hero_ap_university_campus_1794844976315.jpg';
import heroLibraryImg from '../assets/images/hero_ap_library_students_1794844975826.jpg';
import heroLabImg from '../assets/images/hero_ap_engineering_lab_1794844976206.jpg';
import sectorSeminarImg from '../assets/images/sector_ap_careers_seminar_1794847411888.jpg';

const SHOWCASE_SLIDES = [
  {
    id: 'higher-ed',
    tabLabel: 'Higher Ed & Campuses',
    icon: GraduationCap,
    sectorTag: '26 AP DISTRICTS · UNIVERSITIES & AUTONOMOUS COLLEGES',
    title: 'Shaping Future-Ready Higher Education Across Andhra Pradesh',
    description:
      'Connect with autonomous engineering universities, government degree colleges, and accredited research institutions verified against APSCHE & APCCE records.',
    highlights: [
      'Distinct APSCHE & EAPCET institution codes with verified addresses',
      'Approved campus infrastructure galleries and transparent fee ledgers',
      'Direct admission counselling schedules and institutional advisories',
    ],
    image: heroCampusImg,
    imageCaption: 'University campus colonnade and academic greens in Andhra Pradesh',
    ctaText: 'Explore Verified Colleges',
    targetTo: '/colleges',
  },
  {
    id: 'stem-labs',
    tabLabel: 'STEM & Engineering Labs',
    icon: Cpu,
    sectorTag: 'PRACTICAL ENGINEERING & APPLIED INNOVATION',
    title: 'Modern Laboratories, Computing Centres & Technical Specialisations',
    description:
      'Compare Andhra Pradesh engineering campuses offering B.Tech specialisations in Computer Science, AI & Data Science, VLSI, Robotics, and Core Engineering.',
    highlights: [
      'Branch-wise curriculum and affiliated university transparency',
      'SWAYAM-NPTEL minor and honours credit-transfer pathways',
      'Dedicated AICTE & APSCHE mandated internship readiness',
    ],
    image: heroLabImg,
    imageCaption: 'Engineering undergraduates collaborating at campus laboratory workstations',
    ctaText: 'Browse Engineering Colleges',
    targetTo: '/colleges?category=Engineering',
  },
  {
    id: 'digital-learning',
    tabLabel: 'Digital Libraries & Degree',
    icon: BookOpen,
    sectorTag: 'DEGREE COLLEGES & EXAM READINESS',
    title: 'Interactive Academic Libraries & Competitive Exam Foundations',
    description:
      'Access OAMDC autonomous degree listings, study pathways, and structured reference materials for state and national public service examinations.',
    highlights: [
      'AP EAPCET, ICET, PGECET, UPSC CSE & APPSC Group-I/II guidance',
      'Government & TTD autonomous degree colleges across coastal & Rayalaseema districts',
      'Direct official portal links with zero unverified claims',
    ],
    image: heroLibraryImg,
    imageCaption: 'Students studying in a sunlit autonomous college central library',
    ctaText: 'Browse Degree Institutions',
    targetTo: '/colleges?category=Degree',
  },
  {
    id: 'career-industry',
    tabLabel: 'Career & Shortlists',
    icon: Briefcase,
    sectorTag: 'CAREER COUNSELLING & STUDENT PORTFOLIOS',
    title: 'Bridging Campus Academics with Public & Industry Careers',
    description:
      'Shortlist target institutions, inspect verified tuition structures, and prepare for campus recruitment or civil services with transparent student tooling.',
    highlights: [
      'Persistent college shortlists synced with your student account',
      'Jnanabhumi & National Scholarship Portal (NSP) readiness trackers',
      'Two-tier college & state desk grievance redressal workflow',
    ],
    image: sectorSeminarImg,
    imageCaption: 'Academic faculty mentoring students during a career planning workshop',
    ctaText: 'View My Shortlisted Colleges',
    targetTo: '/colleges?tab=saved',
  },
];

export function EdutechSectorShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [isPaused]);

  const currentSlide = SHOWCASE_SLIDES[activeIndex];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + SHOWCASE_SLIDES.length) % SHOWCASE_SLIDES.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
  };

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="border-b border-slate-200 bg-white"
    >
      <div className="mx-auto max-w-[1360px] px-4 py-12 sm:px-6">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Higher education tracks">
            {SHOWCASE_SLIDES.map((slide, idx) => {
              const Icon = slide.icon;
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActiveIndex(idx)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#0F2547] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-[#0F2547]'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isSelected ? 'text-[#E6C775]' : 'text-slate-500'}`} />
                  <span>{slide.tabLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-1 font-mono text-xs font-semibold tabular-nums text-slate-400">
              0{activeIndex + 1} / 0{SHOWCASE_SLIDES.length}
            </span>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous sector slide"
              className="rounded-lg border border-slate-200 p-2 text-[#0F2547] transition hover:bg-[#0F2547] hover:text-white cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next sector slide"
              className="rounded-lg border border-slate-200 p-2 text-[#0F2547] transition hover:bg-[#0F2547] hover:text-white cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6 space-y-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
              {currentSlide.sectorTag}
            </p>

            <h2 className="font-serif text-2xl font-semibold leading-tight text-[#0F2547] sm:text-3xl">
              {currentSlide.title}
            </h2>

            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              {currentSlide.description}
            </p>

            <ul className="space-y-2 pt-1">
              {currentSlide.highlights.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-xs sm:text-sm font-medium text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EA580C]" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Link
                to={currentSlide.targetTo}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F2547] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
              >
                <span>{currentSlide.ctaText}</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-88 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {SHOWCASE_SLIDES.map((slide, idx) => (
                <div
                  key={slide.id}
                  aria-hidden={idx !== activeIndex}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    idx === activeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.imageCaption}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A192F]/90 via-[#0F2547]/45 to-transparent p-4">
                    <p className="text-xs font-medium text-white">{slide.imageCaption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
