import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import blogDegreeImg from '../assets/images/blog_ap_degree_campus_1794847413899.jpg';
import { useLanguage } from '../context/LanguageContext.tsx';
import { apiFetch } from '../lib/api.ts';

export function CollegeFeesGuidanceSlide({
  verifiedColleges,
  districtsCovered,
  activeScholarships,
}: {
  verifiedColleges?: number;
  districtsCovered?: number;
  activeScholarships?: number;
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [quickQuery, setQuickQuery] = useState('');
  const [whatsappConfigured, setWhatsappConfigured] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [studentQuestion, setStudentQuestion] = useState('');

  useEffect(() => {
    apiFetch<{ integrations?: { counsellorWhatsappConfigured?: boolean } }>('/api/health')
      .then((res) => setWhatsappConfigured(Boolean(res.integrations?.counsellorWhatsappConfigured)))
      .catch(() => setWhatsappConfigured(false));
  }, []);

  const openGuidanceChannel = (customTopic?: string) => {
    const topic =
      customTopic?.trim() ||
      quickQuery.trim() ||
      'AP College Fees, EAPCET Cutoffs & Admission Guidance';

    if (whatsappConfigured) {
      window.open(
        `/api/support/whatsapp?topic=${encodeURIComponent(topic)}`,
        '_blank',
        'noopener,noreferrer'
      );
      return;
    }

    setStudentQuestion(topic);
    setChatModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    navigate(q ? `/colleges?search=${encodeURIComponent(q)}` : '/colleges');
  };

  return (
    <section className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#FBF9F4]">
        {/* Sub-Navigation Bar */}
        <div className="border-b border-slate-200 px-5 py-3.5 sm:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-serif text-xl font-bold tracking-tight text-[#0F2547]">
              Fees<span className="text-[#9A7B2C]">&amp;</span>Admissions
            </span>

            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white"
            >
              <Search className="ml-3 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Search college fees..."
                aria-label="Search college fee records"
                className="w-40 sm:w-56 px-2.5 py-1.5 text-xs font-medium text-[#0F2547] placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#0F2547] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1E3A8A] cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
            <Link to="/colleges" className="hover:text-[#0F2547]">
              Colleges
            </Link>
            <Link to="/fees" className="hover:text-[#0F2547]">
              Fee Ledger
            </Link>
            <button
              type="button"
              onClick={() => openGuidanceChannel()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2547] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1E3A8A] cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5 text-[#E6C775]" />
              <span>{whatsappConfigured ? 'WhatsApp Counsellor' : 'Ask Fee Guidance'}</span>
            </button>
          </div>
        </div>

        {/* Main Editorial Hero */}
        <div className="grid grid-cols-1 items-center gap-8 px-5 py-10 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-6 space-y-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
              APHERMC &amp; Institutional Fee Transparency
            </p>

            <h2 className="font-serif text-3xl font-semibold leading-tight text-[#0F2547] sm:text-4xl">
              {t.feeGuidanceTitle}
            </h2>

            <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Inspect authorised tuition, examination, laboratory, and hostel fee components published by colleges, verify Jnanabhumi RTF/MTF eligibility, and escalate fee discrepancies transparently.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/fees"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F2547] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#1E3A8A]"
              >
                <ShieldCheck className="h-4 w-4 text-[#E6C775]" />
                <span>Inspect Fee Transparency</span>
              </Link>

              <Link
                to="/colleges"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#0F2547] transition hover:border-[#0F2547]"
              >
                <span>Browse Verified Colleges</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <img
                src={blogDegreeImg}
                alt="Autonomous college main building and green campus grounds in Andhra Pradesh"
                className="h-64 sm:h-76 w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Metrics Strip (Real DB Values Only) */}
        <div className="px-5 pb-8 sm:px-8">
          <div className="grid grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white lg:grid-cols-4">
            <div className="p-5">
              <p className="font-mono text-2xl font-bold tabular-nums text-[#0F2547]">
                {verifiedColleges ?? '—'}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Verified Campuses
              </p>
            </div>
            <div className="p-5">
              <p className="font-mono text-2xl font-bold tabular-nums text-[#0F2547]">
                {districtsCovered ? `${districtsCovered}/26` : '26'}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                AP Districts Indexed
              </p>
            </div>
            <div className="p-5">
              <p className="font-mono text-2xl font-bold tabular-nums text-[#0F2547]">
                {activeScholarships ?? '—'}
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Official Scholarships
              </p>
            </div>
            <div className="p-5">
              <p className="font-serif text-xl font-bold text-[#1E3A8A]">Zero Hidden Fees</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Receipt-Verified Ledger
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guidance & Helpdesk Modal */}
      {chatModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fee-guidance-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/70 p-4 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#0F2547] px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#E6C775]" aria-hidden="true" />
                <h3 id="fee-guidance-modal-title" className="font-serif text-base font-semibold">
                  Fee &amp; Admission Support Desk
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setChatModalOpen(false)}
                aria-label="Close fee guidance dialog"
                className="rounded-lg p-1 hover:bg-white/15 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs leading-relaxed text-slate-600">
                Direct WhatsApp routing is disabled unless configured by the State Administrator. Use ASH&apos;s built-in Academic Assistant or submit an official fee query through Student Services.
              </p>

              <textarea
                rows={3}
                value={studentQuestion}
                onChange={(e) => setStudentQuestion(e.target.value)}
                placeholder="Describe your college fee or admission question..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0F2547] focus:border-[#0F2547] focus:outline-none"
              />

              <div className="flex flex-col sm:flex-row gap-2.5">
                <Link
                  to={`/assistant`}
                  onClick={() => setChatModalOpen(false)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0F2547] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E3A8A]"
                >
                  <Bot className="h-4 w-4 text-[#E6C775]" />
                  <span>Ask ASH Assistant</span>
                </Link>
                <Link
                  to="/services"
                  onClick={() => setChatModalOpen(false)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-[#0F2547] hover:bg-slate-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Open Grievance Desk</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
