import { useEffect, useState } from 'react';
import { ArrowRightCircle, Clock, ExternalLink, FileText, Filter, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { apiFetch, formatDate } from '../lib/api.ts';

interface ApiNotice {
  id: number;
  category: string;
  title: string;
  body: string;
  officialUrl: string | null;
  publishedAt: string;
}

interface CircularItem {
  id: string;
  category: string;
  isNew: boolean;
  title: string;
  date: string;
  referenceNo: string;
  summary: string;
  officialUrl?: string | null;
}

const REFERENCE_CIRCULARS: CircularItem[] = [
  {
    id: 'ref-eapcet',
    category: 'EAPCET',
    isNew: true,
    title: 'AP EAPCET 2026–27 Final Phase Web Options & Seat Allotment Guidelines',
    date: '16 Nov 2026',
    referenceNo: 'APSCHE/EAPCET-2026/WO-04',
    summary:
      'Qualified AP EAPCET candidates should verify institution codes and branch intake directly on the official APSCHE CET portal before exercising final web options across all 26 AP districts.',
    officialUrl: 'https://cets.apsche.ap.gov.in',
  },
  {
    id: 'ref-fee',
    category: 'FEE ORDER',
    isNew: true,
    title: 'Authorised Tuition Fee Orders for Engineering, Degree & Professional Programmes (2026–27)',
    date: '16 Nov 2026',
    referenceNo: 'APHERMC / GO.Ms.HE/2026',
    summary:
      'Review government-notified tuition, examination, laboratory, and other authorised fee heads published inside your verified College Profile and Student Fee Ledger.',
    officialUrl: '/fees',
  },
  {
    id: 'ref-upsc',
    category: 'UPSC',
    isNew: true,
    title: 'UPSC Civil Services & ESE 2026–27 One-Time Registration (OTR) & Document Specifications',
    date: '15 Nov 2026',
    referenceNo: 'UPSC/OTR-2026/N-19',
    summary:
      'Guidelines for candidate One-Time Registration, scanned document specifications, and eligibility verification ahead of UPSC Preliminary and Engineering Services examinations.',
    officialUrl: 'https://upsc.gov.in',
  },
  {
    id: 'ref-oamdc',
    category: 'DEGREE',
    isNew: false,
    title: 'AP OAMDC Degree Admissions 2026–27: Certificate Verification & Seat Allotment',
    date: '14 Nov 2026',
    referenceNo: 'APSCHE/OAMDC/2026-27',
    summary:
      'Schedule for online registration, helpline center verification, and seat allotment for B.Sc, B.Com, BBA, and B.A Honours courses across Andhra Pradesh.',
    officialUrl: 'https://oamdc.ap.gov.in',
  },
  {
    id: 'ref-appsc',
    category: 'APPSC',
    isNew: false,
    title: 'APPSC Group-I, Group-II & Departmental Examination Reference Schedule',
    date: '12 Nov 2026',
    referenceNo: 'APPSC/NOTIF-08/2026',
    summary:
      'Official examination dates, syllabus outlines, and hall ticket advisories published for Andhra Pradesh Public Service Commission examinations.',
    officialUrl: 'https://psc.ap.gov.in',
  },
  {
    id: 'ref-pg',
    category: 'PG EXAMS',
    isNew: false,
    title: 'AP ICET (MBA / MCA) & AP PGECET Counselling Reporting Instructions',
    date: '10 Nov 2026',
    referenceNo: 'APSCHE/ICET-PGECET/2026',
    summary:
      'Instructions for downloading provisional allotment orders and completing college self-reporting at allotted postgraduate institutions.',
    officialUrl: 'https://cets.apsche.ap.gov.in',
  },
];

function mapNoticeCategory(category: string): string {
  const upper = category.toUpperCase();
  if (upper.includes('SCHOLARSHIP') || upper.includes('FEE')) return 'FEE ORDER';
  if (upper.includes('EXAM')) return 'EAPCET';
  if (upper.includes('POLICY')) return 'DEGREE';
  return 'EAPCET';
}

export function LatestCircularsBoard() {
  const { t } = useLanguage();
  const [nowText, setNowText] = useState('');
  const [boardFontSize, setBoardFontSize] = useState(14);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeCircular, setActiveCircular] = useState<CircularItem | null>(null);
  const [circulars, setCirculars] = useState<CircularItem[]>(REFERENCE_CIRCULARS);

  useEffect(() => {
    const updateClock = () => {
      const formatted = new Date()
        .toLocaleString('en-IN', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
        .toUpperCase();
      setNowText(formatted);
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    apiFetch<{ statewideNotices: ApiNotice[] }>('/api/notices')
      .then((res) => {
        const dbCirculars: CircularItem[] = (res.statewideNotices || []).map((n) => ({
          id: `notice-${n.id}`,
          category: mapNoticeCategory(n.category),
          isNew: true,
          title: n.title,
          date: formatDate(n.publishedAt),
          referenceNo: `ASH-NOTICE-${n.id}`,
          summary: n.body,
          officialUrl: n.officialUrl,
        }));
        setCirculars([...dbCirculars, ...REFERENCE_CIRCULARS]);
      })
      .catch(() => setCirculars(REFERENCE_CIRCULARS));
  }, []);

  const categories = ['ALL', 'EAPCET', 'UPSC', 'APPSC', 'DEGREE', 'PG EXAMS', 'FEE ORDER'];

  const filteredCirculars =
    selectedCategory === 'ALL'
      ? circulars
      : circulars.filter((c) => c.category === selectedCategory);

  return (
    <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Top Time & Readability Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#9A7B2C] px-4 py-2 text-white sm:px-6">
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wide">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{nowText || 'IST LIVE PORTAL'}</span>
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Circular list font size">
            <button
              type="button"
              onClick={() => setBoardFontSize((s) => Math.max(12, s - 1))}
              className="rounded border border-white/50 px-2 py-0.5 text-[11px] font-bold hover:bg-white hover:text-[#0F2547] cursor-pointer"
              aria-label="Decrease circular text size"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => setBoardFontSize(14)}
              className="rounded border border-white bg-white px-2 py-0.5 text-[11px] font-bold text-[#0F2547] cursor-pointer"
              aria-label="Reset circular text size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => setBoardFontSize((s) => Math.min(18, s + 1))}
              className="rounded border border-white/50 px-2 py-0.5 text-[11px] font-bold hover:bg-white hover:text-[#0F2547] cursor-pointer"
              aria-label="Increase circular text size"
            >
              A+
            </button>
          </div>
        </div>

        {/* Institutional Header & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F2547] px-5 py-3.5 text-white sm:px-6">
          <h2 className="font-serif text-lg sm:text-xl font-semibold tracking-tight">
            {t.circularsTitle}
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="mr-1 h-3.5 w-3.5 text-[#E6C775]" aria-hidden="true" />
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#E6C775] text-[#0F2547]'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Circular Rows */}
        <div className="divide-y divide-slate-100 bg-white px-4 py-2 sm:px-6">
          {filteredCirculars.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveCircular(item)}
              style={{ fontSize: `${boardFontSize}px` }}
              className="group w-full text-left flex items-start justify-between gap-3 py-3.5 px-2 rounded-lg transition hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <ArrowRightCircle
                  className="mt-1 h-4 w-4 shrink-0 text-[#1E3A8A] transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
                <div className="leading-snug text-slate-800 group-hover:text-[#0F2547] font-medium">
                  <span>{item.title}</span>
                  {item.isNew && (
                    <span className="ml-2 inline-block rounded bg-[#EA580C] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      NEW
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden shrink-0 items-center gap-2.5 sm:flex">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7B2C]">
                  {item.category}
                </span>
                <span className="font-mono text-xs text-slate-400">{item.date}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Circular Detail Modal */}
      {activeCircular && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="circular-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/70 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0F2547] px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#E6C775]" aria-hidden="true" />
                <span className="font-mono text-xs font-semibold">{activeCircular.referenceNo}</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveCircular(null)}
                aria-label="Close circular notice"
                className="rounded-lg p-1 hover:bg-white/15 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold uppercase tracking-wider text-[#9A7B2C]">
                  {activeCircular.category}
                </span>
                <span className="font-mono">Issued: {activeCircular.date}</span>
              </div>
              <h3 id="circular-modal-title" className="font-serif text-xl font-semibold text-[#0F2547]">
                {activeCircular.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">{activeCircular.summary}</p>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveCircular(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                {activeCircular.officialUrl && (
                  <a
                    href={activeCircular.officialUrl}
                    target={activeCircular.officialUrl.startsWith('http') ? '_blank' : undefined}
                    rel={activeCircular.officialUrl.startsWith('http') ? 'noreferrer' : undefined}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2547] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A]"
                  >
                    <span>Open Official Reference</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
