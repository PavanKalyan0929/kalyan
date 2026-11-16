import React, { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AndhraPradeshEmblem } from './AndhraPradeshEmblem.tsx';
import heroCampusImg from '../assets/images/hero_ap_university_campus_1794844976315.jpg';
import heroLibraryImg from '../assets/images/hero_ap_library_students_1794844975826.jpg';
import heroLabImg from '../assets/images/hero_ap_engineering_lab_1794844976206.jpg';

const HERO_SLIDES = [
  {
    id: 'campus',
    image: heroCampusImg,
    alt: 'University campus colonnade and lawns in Andhra Pradesh during morning light',
    kicker: 'ANDHRA PRADESH · HIGHER EDUCATION DIGITAL PLATFORM',
    title: 'Connecting Students. Empowering Colleges. Shaping the Future of Andhra Pradesh.',
    subtitle:
      'One verified platform for college records across all 26 AP districts, transparent fee ledgers, Jnanabhumi & NSP scholarships, and student grievance redressal.',
  },
  {
    id: 'library',
    image: heroLibraryImg,
    alt: 'Indian university students studying inside a sunlit central academic library',
    kicker: 'EAPCET · OAMDC · INSTITUTIONAL VERIFICATION',
    title: 'Compare Verified Engineering, Degree & University Campuses With Confidence.',
    subtitle:
      'Inspect official APSCHE institution codes, affiliated universities, approved campus photographs, and statutory accreditation details.',
  },
  {
    id: 'laboratory',
    image: heroLabImg,
    alt: 'Engineering students collaborating at modern laboratory workstations',
    kicker: 'CAREER EXAMS · UPSC & APPSC · NPTEL CREDIT TRACKS',
    title: 'Direct Access to Competitive Exam Schedules, Scholarships & Academic Advisories.',
    subtitle:
      'Track AP EAPCET, ICET, APPSC Group-I/II, UPSC Civil Services, and SWAYAM-NPTEL tracks from one trusted institutional portal.',
  },
];

export function StudentHeroSlider({
  userActionTarget,
  userActionLabel,
}: {
  userActionTarget: string;
  userActionLabel: string;
}) {
  const [current, setCurrent] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/colleges?search=${encodeURIComponent(q)}` : '/colleges');
  };

  return (
    <section className="relative bg-[#0F2547] text-white overflow-hidden border-b border-slate-200">
      {/* Slide Background Media */}
      <div className="relative min-h-[470px] sm:min-h-[500px] flex items-center">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === current;
          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-700 ${
                isActive ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none z-0'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A192F]/95 via-[#0F2547]/85 to-[#0F2547]/45" />
            </div>
          );
        })}

        {/* Foreground Content */}
        <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 sm:px-6 py-12 lg:py-16">
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center gap-3">
              <AndhraPradeshEmblem className="w-11 h-11 shrink-0 drop-shadow-sm" />
              <div>
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.16em] text-[#E6C775]">
                  {HERO_SLIDES[current].kicker}
                </p>
                <p className="text-xs text-slate-300">
                  Your Gateway to a Connected Higher Education Ecosystem
                </p>
              </div>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-white leading-[1.15] [text-wrap:balance]">
              {HERO_SLIDES[current].title}
            </h1>

            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-2xl">
              {HERO_SLIDES[current].subtitle}
            </p>

            {/* Integrated Search Bar */}
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-2.5 bg-white rounded-xl p-2 shadow-xl max-w-2xl"
            >
              <div className="flex flex-1 items-center gap-2.5 px-3">
                <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search colleges, APSCHE codes, districts (Visakhapatnam, Tirupati)..."
                  aria-label="Search Andhra Pradesh colleges"
                  className="w-full py-2 text-sm text-[#0F2547] placeholder-slate-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#EA580C] hover:bg-[#C2410C] px-5 py-2.5 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Search Directory</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Primary Secondary Links */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs sm:text-sm font-semibold">
              <Link
                to={userActionTarget}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 hover:bg-white/20 px-4 py-2 text-white transition-colors whitespace-nowrap"
              >
                {userActionLabel}
              </Link>
              <Link
                to="/districts"
                className="inline-flex items-center gap-1.5 text-[#E6C775] hover:underline whitespace-nowrap"
              >
                <MapPin className="w-4 h-4" />
                Browse 26 AP Districts
              </Link>
              <Link
                to="/scholarships"
                className="inline-flex items-center gap-1 text-slate-200 hover:text-white hover:underline whitespace-nowrap"
              >
                Scholarships &amp; Jnanabhumi →
              </Link>
            </div>
          </div>
        </div>

        {/* Slide Arrows & Dots */}
        <button
          type="button"
          onClick={() => setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          aria-label="Previous campus slide"
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/55 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setCurrent((prev) => (prev + 1) % HERO_SLIDES.length)}
          aria-label="Next campus slide"
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/55 transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 right-6 z-20 flex items-center gap-2">
          {HERO_SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrent(idx)}
              aria-label={`View slide ${idx + 1}: ${s.kicker}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                current === idx ? 'w-7 bg-[#E6C775]' : 'w-2 bg-white/45 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
