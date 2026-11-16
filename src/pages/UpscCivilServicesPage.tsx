import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, ExternalLink, FileText, Landmark, Scale, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';

interface CompetitiveExamDetail {
  id: string;
  shortCode: string;
  title: string;
  conductingBody: string;
  overview: string;
  eligibility: string;
  qualification: string;
  ageLimit: string;
  stages: string[];
  syllabusSummary: string;
  preparationResources: string[];
  officialPortalUrl: string;
  previousPapersUrl: string;
  scheduleNote: string;
}

export function UpscCivilServicesPage() {
  const [exams, setExams] = useState<CompetitiveExamDetail[]>([]);
  const [activeId, setActiveId] = useState<string>('upsc-cse');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ exams: CompetitiveExamDetail[] }>('/api/competitive-exams/details')
      .then((res) => {
        setExams(res.exams || []);
        if (res.exams?.length > 0) setActiveId(res.exams[0].id);
      })
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, []);

  const activeExam = exams.find((e) => e.id === activeId) || exams[0];

  return (
    <div className="space-y-10 pb-12">
      {/* Formal Dignified Navy & Gold Editorial Header */}
      <section className="bg-[#0F2547] text-white border-b border-[#9A7B2C]/40">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E6C775]">
              Public Administration &amp; Constitutional Recruitment Desk
            </p>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold leading-tight text-white">
              UPSC Civil Services, APPSC &amp; National Competitive Examinations
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-3xl leading-relaxed">
              Structured statutory reference covering eligibility criteria, examination stages, syllabus structure, and direct verified links to official UPSC, APPSC, SSC, IBPS, RRB, and Defence portals.
            </p>
          </div>
          <div className="lg:col-span-4 bg-white/5 border border-white/15 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-[#E6C775] text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Official Independence Notice
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              Andhra Student Hub (ASH) is an independent higher-education student platform. ASH is not an official Union Public Service Commission (UPSC), APPSC, or Government of India agency. Always verify final notifications, dates, and applications directly on the linked official portals.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 space-y-8">
        {/* 4-Step OTR & Application Workflow */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              title: 'Create Account & Login',
              items: [
                { label: 'UPSC Online OTR Portal', url: 'https://upsconline.nic.in' },
                { label: 'APPSC OTR Registration', url: 'https://psc.ap.gov.in' },
              ],
            },
            {
              step: '02',
              title: 'Universal Registration',
              items: [
                { label: 'Read OTR Instructions', url: 'https://upsc.gov.in' },
                { label: 'Verify Aadhaar & Photo Specs', url: 'https://upsconline.nic.in' },
              ],
            },
            {
              step: '03',
              title: 'Common Application Form',
              items: [
                { label: 'Check Active Notifications', url: 'https://upsc.gov.in/examinations/active-exams' },
                { label: 'APPSC Recruitment Calendar', url: 'https://psc.ap.gov.in' },
              ],
            },
            {
              step: '04',
              title: 'Exam Prep & Papers',
              items: [
                { label: 'Official Previous Papers', url: activeExam?.previousPapersUrl || 'https://upsc.gov.in/examinations/previous-question-papers' },
                { label: 'Commission Official Desk', url: activeExam?.officialPortalUrl || 'https://upsc.gov.in' },
              ],
            },
          ].map((card) => (
            <div key={card.step} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-[#9A7B2C]">{card.step}</span>
                <h2 className="text-sm font-semibold text-[#0F2547]">{card.title}</h2>
              </div>
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                {card.items.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between text-xs font-medium text-[#1E3A8A] hover:underline py-1"
                  >
                    <span>{link.label}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-slate-400" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Track Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4" role="tablist" aria-label="Competitive examination tracks">
          {exams.map((ex) => (
            <button
              key={ex.id}
              type="button"
              role="tab"
              aria-selected={activeExam?.id === ex.id}
              onClick={() => setActiveId(ex.id)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                activeExam?.id === ex.id
                  ? 'bg-[#0F2547] text-white border-[#0F2547]'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-[#1E3A8A]'
              }`}
            >
              {ex.shortCode}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
        ) : activeExam ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Reference Document */}
            <article className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-5 bg-[#FBF9F4] border-b border-slate-200 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9A7B2C]">
                    {activeExam.conductingBody}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl font-semibold text-[#0F2547]">
                    {activeExam.title}
                  </h2>
                </div>
                <span className="font-mono text-xs font-semibold text-[#0F2547] bg-white border border-slate-300 px-3 py-1 rounded">
                  {activeExam.shortCode}
                </span>
              </div>

              <div className="p-6 space-y-7">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Overview</h3>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">{activeExam.overview}</p>
                </div>

                <dl className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-100 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">Eligibility &amp; Nationality</dt>
                    <dd className="mt-1 text-slate-800 leading-relaxed">{activeExam.eligibility}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">Academic Qualification</dt>
                    <dd className="mt-1 text-slate-800 leading-relaxed">{activeExam.qualification}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-slate-500">Age Limits &amp; Relaxations</dt>
                    <dd className="mt-1 text-slate-800 leading-relaxed">{activeExam.ageLimit}</dd>
                  </div>
                </dl>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Examination Stages
                  </h3>
                  <ol className="mt-3 space-y-2.5 text-sm text-slate-800">
                    {activeExam.stages.map((stage, idx) => (
                      <li key={stage} className="flex items-start gap-3">
                        <span className="font-mono text-xs font-bold text-[#9A7B2C] pt-0.5 shrink-0">
                          0{idx + 1}.
                        </span>
                        <span className="leading-relaxed">{stage}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Core Syllabus Coverage
                  </h3>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">{activeExam.syllabusSummary}</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Recommended Preparation &amp; Reference Sources
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc list-inside">
                    {activeExam.preparationResources.map((res) => (
                      <li key={res} className="leading-relaxed">
                        {res}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>

            {/* Right Sidebar: Official Links & Exam Guidance */}
            <aside className="lg:col-span-4 space-y-6">
              <div className="bg-[#0F2547] text-white border border-[#1E3A8A] rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-[#E6C775] text-xs font-bold uppercase tracking-wider">
                  <Landmark className="w-4 h-4" />
                  Verified Official Links
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{activeExam.scheduleNote}</p>
                <div className="space-y-2.5 pt-2">
                  <a
                    href={activeExam.officialPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-[#0F2547] bg-[#E6C775] hover:bg-[#d9b860] rounded-lg transition-colors"
                  >
                    <span>Official Commission Portal</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a
                    href={activeExam.previousPapersUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-between px-4 py-2.5 text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded-lg transition-colors"
                  >
                    <span>Previous Papers &amp; Notices</span>
                    <FileText className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#9A7B2C]">
                  <Scale className="w-4 h-4" />
                  Additional Academic Gateways
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Undergraduate degree &amp; B.Tech students in Andhra Pradesh can strengthen GS, Economics, and Public Policy foundations through IIT/IIM SWAYAM-NPTEL electives.
                </p>
                <div className="flex flex-col gap-2 text-sm font-semibold text-[#1E3A8A]">
                  <Link to="/nptel" className="inline-flex items-center gap-1.5 hover:underline">
                    <BookOpenCheck className="w-4 h-4" />
                    Browse NPTEL Credit Tracks →
                  </Link>
                  <Link to="/career-exams" className="hover:underline">
                    AP State Entrance &amp; AICTE Internships →
                  </Link>
                  <Link to="/assistant" className="hover:underline">
                    Ask ASH Academic Assistant →
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
