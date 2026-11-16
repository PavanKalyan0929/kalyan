import React, { useEffect, useState } from 'react';
import { CalendarClock, Compass, ExternalLink, PlusCircle, Send, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface ExamAdRow {
  id: number;
  examName: string;
  category: string;
  deadline: string;
  description: string;
  applyUrl: string;
}

interface CareerExamRow {
  id: number;
  title: string;
  conductingBody: string;
  category: string;
  scheduleNote: string;
  officialUrl: string;
}

export function CompetitiveExamSidebar() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [ads, setAds] = useState<ExamAdRow[]>([]);
  const [exams, setExams] = useState<CareerExamRow[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'EXAMS' | 'CAREER'>('ALL');
  const [showPostForm, setShowPostForm] = useState(false);

  const [examName, setExamName] = useState('');
  const [category, setCategory] = useState('COMPETITIVE EXAM');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [applyUrl, setApplyUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadAlerts = () => {
    apiFetch<{ ads: ExamAdRow[] }>('/api/exam-ads')
      .then((res) => setAds(res.ads || []))
      .catch(() => setAds([]));
    apiFetch<{ exams: CareerExamRow[] }>('/api/career-exams')
      .then((res) => setExams((res.exams || []).slice(0, 4)))
      .catch(() => setExams([]));
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim() || !deadline.trim()) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const res = await apiFetch<{ ad: ExamAdRow; message: string }>('/api/state-admin/exam-ads', {
        method: 'POST',
        body: JSON.stringify({
          examName: examName.trim(),
          category,
          deadline: deadline.trim(),
          description: description.trim() || 'Official student notification & guidance portal.',
          applyUrl: applyUrl.trim() || 'https://cets.apsche.ap.gov.in',
        }),
      });
      setAds((prev) => [res.ad, ...prev]);
      setExamName('');
      setDeadline('');
      setDescription('');
      setApplyUrl('');
      setShowPostForm(false);
      setFeedback('Published live to Competitive Exam & Career board.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to publish advisory');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAds = ads.filter((ad) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'CAREER') return ad.category === 'CAREER GUIDANCE';
    return ad.category !== 'CAREER GUIDANCE';
  });

  return (
    <aside className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-[#0F2547] px-5 py-3.5 text-white flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{t.examSidebarTitle}</h3>
        <div className="flex items-center gap-2">
          {user?.role === 'state_admin' && (
            <button
              type="button"
              onClick={() => setShowPostForm((prev) => !prev)}
              className="inline-flex items-center gap-1 rounded bg-[#EA580C] hover:bg-[#C2410C] px-2 py-1 text-[11px] font-semibold text-white transition cursor-pointer"
            >
              {showPostForm ? <X className="h-3 w-3" /> : <PlusCircle className="h-3 w-3" />}
              <span>{showPostForm ? 'Close' : 'Post Ad'}</span>
            </button>
          )}
          <Link to="/career-exams" className="text-xs font-semibold text-[#E6C775] hover:underline whitespace-nowrap">
            View All →
          </Link>
        </div>
      </div>

      {/* Filter Switcher */}
      <div className="flex gap-1.5 border-b border-slate-100 bg-[#FBF9F4] p-2.5" role="tablist" aria-label="Filter exam and career alerts">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'EXAMS', label: 'Exams' },
          { id: 'CAREER', label: 'Career' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filterType === tab.id}
            onClick={() => setFilterType(tab.id as 'ALL' | 'EXAMS' | 'CAREER')}
            className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition cursor-pointer ${
              filterType === tab.id
                ? 'bg-[#0F2547] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-[#0F2547]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-900">
          {feedback}
        </div>
      )}

      {/* State Admin Publish Advisory Form */}
      {showPostForm && user?.role === 'state_admin' && (
        <form onSubmit={handlePublish} className="border-b border-slate-200 bg-orange-50/60 p-4 space-y-2.5">
          <p className="text-xs font-bold text-[#0F2547]">Publish Statewide Exam / Career Advisory</p>
          <input
            type="text"
            required
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder="Title (e.g. AP PGECET 2026)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#0F2547]"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-[#0F2547]"
            >
              <option value="COMPETITIVE EXAM">COMPETITIVE EXAM</option>
              <option value="CAREER GUIDANCE">CAREER GUIDANCE</option>
              <option value="ENGINEERING">ENGINEERING</option>
              <option value="DEGREE">DEGREE</option>
              <option value="PG EXAMS">PG EXAMS</option>
              <option value="GOVT EXAMS">GOVT EXAMS</option>
            </select>
            <input
              type="text"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="Schedule / Deadline"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-[#0F2547]"
            />
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Summary for AP students..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#0F2547]"
          />
          <input
            type="text"
            value={applyUrl}
            onChange={(e) => setApplyUrl(e.target.value)}
            placeholder="Official URL (e.g. https://cets.apsche.ap.gov.in)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-[#0F2547]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F2547] py-2 text-xs font-semibold text-white hover:bg-[#1E3A8A] cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 text-[#E6C775]" />
            <span>{submitting ? 'Publishing...' : 'Publish Live'}</span>
          </button>
        </form>
      )}

      {/* Alerts List */}
      <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
        {filteredAds.map((ad) => {
          const isInternal = ad.applyUrl.startsWith('/');
          const content = (
            <>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-[#9A7B2C]">
                  {ad.category === 'CAREER GUIDANCE' && <Compass className="h-3 w-3" aria-hidden="true" />}
                  {ad.category}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1E3A8A] shrink-0" />
              </div>
              <h4 className="mt-1 text-sm font-semibold text-[#0F2547] group-hover:text-[#1E3A8A] leading-snug">
                {ad.examName}
              </h4>
              <p className="mt-1 text-xs text-slate-600 line-clamp-2">{ad.description}</p>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-[#EA580C]">
                <CalendarClock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{ad.deadline}</span>
              </p>
            </>
          );

          return isInternal ? (
            <Link key={`ad-${ad.id}`} to={ad.applyUrl} className="block p-4 hover:bg-slate-50 transition-colors group">
              {content}
            </Link>
          ) : (
            <a
              key={`ad-${ad.id}`}
              href={ad.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="block p-4 hover:bg-slate-50 transition-colors group"
            >
              {content}
            </a>
          );
        })}

        {filterType !== 'CAREER' &&
          exams.map((exam) => (
            <a
              key={`exam-${exam.id}`}
              href={exam.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="block p-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="font-semibold uppercase tracking-wider text-[#9A7B2C]">
                  {exam.category}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1E3A8A] shrink-0" />
              </div>
              <h4 className="mt-1 text-sm font-semibold text-[#0F2547] group-hover:text-[#1E3A8A] leading-snug">
                {exam.title}
              </h4>
              <p className="mt-1 text-xs text-slate-600">{exam.conductingBody}</p>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-[#EA580C]">
                <CalendarClock className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{exam.scheduleNote}</span>
              </p>
            </a>
          ))}
      </div>

      <div className="border-t border-slate-200 bg-[#FBF9F4] px-5 py-3.5 flex items-center justify-between gap-2 text-xs">
        <Link to="/upsc" className="font-semibold text-[#0F2547] hover:text-[#1E3A8A] hover:underline">
          UPSC &amp; APPSC Center
        </Link>
        <Link to="/nptel" className="font-semibold text-[#1E3A8A] hover:underline">
          NPTEL Tracks →
        </Link>
      </div>
    </aside>
  );
}
