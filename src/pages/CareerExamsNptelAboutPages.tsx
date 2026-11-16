import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, IndianRupee, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';

export function CareerExamsPage() {
  const [exams, setExams] = useState<
    Array<{
      id: number;
      title: string;
      conductingBody: string;
      category: string;
      eligibility: string;
      scheduleNote: string;
      officialUrl: string;
    }>
  >([]);

  useEffect(() => {
    apiFetch<{ exams: typeof exams }>('/api/career-exams')
      .then((res) => setExams(res.exams))
      .catch(() => setExams([]));
  }, []);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9A7B2C]">
            State &amp; National Opportunities
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-[#0F2547]">
            Career, Internships &amp; Competitive Examinations
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl">
            Verified Andhra Pradesh state entrance tests, recruitment portals, national examinations, and AICTE internship gateways. Always verify exam notifications on the linked official portal.
          </p>
        </div>
        <Link
          to="/upsc"
          className="px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2547] hover:bg-[#1E3A8A] rounded-lg whitespace-nowrap"
        >
          Open UPSC, APPSC &amp; Civil Services Desk →
        </Link>
      </div>

      <div id="opportunities" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.map((ex) => (
          <article key={ex.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-blue-900">{ex.category}</span> · {ex.conductingBody}
              </p>
              <h2 className="mt-2 text-lg font-bold text-slate-950">{ex.title}</h2>
              <p className="mt-2 text-sm text-slate-700">
                <strong>Eligibility:</strong> {ex.eligibility}
              </p>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{ex.scheduleNote}</p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100">
              <a
                href={ex.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-900 hover:underline"
              >
                Visit Official Portal
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function NptelPage() {
  const [tracks, setTracks] = useState<
    Array<{
      id: number;
      title: string;
      discipline: string;
      coordinatingInstitute: string;
      durationWeeks: number;
      creditTransferNote: string;
      swayamUrl: string;
    }>
  >([]);

  useEffect(() => {
    apiFetch<{ tracks: typeof tracks }>('/api/nptel')
      .then((res) => setTracks(res.tracks))
      .catch(() => setTracks([]));
  }, []);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">NPTEL & SWAYAM Credit Tracks</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-3xl">
          Curated IIT/IIM SWAYAM-NPTEL courses for Andhra Pradesh engineering and degree students. Confirm credit transfer mapping with your college Academic Coordinator before exam registration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tracks.map((t) => (
          <article key={t.id} className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs text-slate-500">
                {t.discipline} · {t.durationWeeks} Weeks
              </p>
              <h2 className="mt-2 text-lg font-bold text-slate-950">{t.title}</h2>
              <p className="mt-1.5 text-xs font-medium text-slate-700">{t.coordinatingInstitute}</p>
              <p className="mt-3 text-xs text-slate-600 leading-relaxed">{t.creditTransferNote}</p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100">
              <a
                href={t.swayamUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-900 hover:underline"
              >
                Open on NPTEL / SWAYAM
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function FeesInfoPage() {
  const { user } = useAuth();
  const [gatewayConfigured, setGatewayConfigured] = useState(false);

  useEffect(() => {
    apiFetch<{ integrations: { paymentGatewayConfigured: boolean } }>('/api/health')
      .then((res) => setGatewayConfigured(Boolean(res.integrations?.paymentGatewayConfigured)))
      .catch(() => setGatewayConfigured(false));
  }, []);

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="border-b border-slate-200 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Fee Transparency Standard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">College Fee Information & Ledger Rules</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-3xl">
            Andhra Student Hub computes student fee dues strictly from official APHERMC / college-published fee structures and verified receipts—never estimated or fabricated amounts.
          </p>
        </div>
        <Link
          to={user?.role === 'student' ? '/dashboard' : '/colleges'}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg whitespace-nowrap"
        >
          {user?.role === 'student' ? 'Open My Fee Ledger →' : 'Browse College Fee Structures →'}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <IndianRupee className="w-6 h-6 text-blue-900" />
          <h2 className="text-base font-bold text-slate-950">Itemized Fee Components</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every institution fee schedule breaks down Tuition, Examination, Laboratory, Hostel, Transport, and Other Authorised Charges alongside the official GO / circular reference.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <ShieldCheck className="w-6 h-6 text-emerald-700" />
          <h2 className="text-base font-bold text-slate-950">Verified Payment Proofs Only</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Payments appear on your student ledger only after College Administrator receipt verification (bank challan / NEFT / scholarship reimbursement) or signed payment gateway webhook confirmation.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
          <h2 className="text-base font-bold text-slate-950">Online Gateway Status</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {gatewayConfigured
              ? 'An online payment provider is configured on this deployment. Receipts are confirmed exclusively via signed server webhooks.'
              : 'Online payment gateway credentials are not configured on this deployment. Pay via your college’s official bank challan/NEFT counter and receive a verified digital ledger entry.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState<{ online: boolean; model: string } | null>(null);
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      text: string;
      provider?: string;
      references?: Array<{ label: string; path: string }>;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<{ integrations: { ollama: { online: boolean; model: string } } }>('/api/health')
      .then((res) => setOllamaStatus(res.integrations.ollama))
      .catch(() => setOllamaStatus({ online: false, model: 'llama3.2:3b' }));
  }, []);

  const askQuestion = async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setQuestion('');
    setLoading(true);
    try {
      const res = await apiFetch<{
        answer: string;
        providerUsed: string;
        model: string;
        references: Array<{ label: string; path: string }>;
      }>('/api/assistant/query', {
        method: 'POST',
        body: JSON.stringify({ question: trimmed }),
      });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: res.answer,
          provider: `${res.providerUsed} (${res.model})`,
          references: res.references,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Unable to process query right now.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void askQuestion(question);
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">ASH Academic & Grievance Assistant</h1>
        <p className="mt-2 text-sm text-slate-600">
          Powered by local Ollama when running ({ollamaStatus?.model || 'llama3.2:3b'}) with an automatic structured offline fallback—zero paid AI credits required.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Local AI Provider:{' '}
          <span className="font-semibold text-slate-800">
            {ollamaStatus?.online ? `Ollama Online (${ollamaStatus.model})` : 'Ollama Offline — Structured Rule-Based Fallback Active'}
          </span>
        </p>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {[
          'How does Jnanabhumi Vidya Deevena eligibility work?',
          'How do I complete college identity verification?',
          'How can I check my pending college fees?',
          'How do I escalate an unresolved grievance?',
        ].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void askQuestion(prompt)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Conversation */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 min-h-[300px] space-y-4">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Ask a question about Andhra Pradesh colleges, verification, fee statements, scholarships, NPTEL credits, or grievance escalation.
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-blue-900 text-white ml-auto max-w-xl'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 max-w-2xl'
              }`}
            >
              <p>{m.text}</p>
              {m.provider && <p className="mt-2 text-[11px] text-slate-500">Engine: {m.provider}</p>}
              {m.references && m.references.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {m.references.map((ref) => (
                    <Link key={ref.path} to={ref.path} className="text-xs font-semibold text-blue-900 hover:underline">
                      {ref.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {loading && <p className="text-xs text-slate-500">Generating guidance...</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about AP colleges, fees, scholarships, verification, or grievances..."
          className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          Ask
        </button>
      </form>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="max-w-3xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-900">
          About Andhra Student Hub (ASH)
        </p>
        <h1 className="text-3xl font-bold text-slate-950">
          Transparent Higher Education Governance for Andhra Pradesh
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Andhra Student Hub (ASH) connects students, degree and engineering colleges, universities, college administrators, and state higher-education authorities on a unified, privacy-preserving digital platform.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Every architectural decision prioritizes real institutional accountability: college-level tenant isolation ensures one institution cannot access another college’s private student records, financial balances are calculated strictly from authorised fee structures and verified receipts, and student identity documents are stored privately with role-checked access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-200 pt-8">
        <div>
          <h2 className="text-base font-bold text-slate-950">No Fabricated Records</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            College profiles cite official APSCHE/APCCE/institutional sources. Missing codes or photographs remain transparently marked pending verification.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-950">Human-Governed AI</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Optional local Ollama models provide grievance summaries and category suggestions without paid cloud lock-in, and never make disciplinary or rejection decisions.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-950">Read-Only ERP Adapters</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Colleges retain full autonomy over their ERP systems via read-only authorised adapters or manual portal workflows with audit logging.
          </p>
        </div>
      </div>
    </div>
  );
}

export function GovernancePage({ section }: { section: 'privacy' | 'terms' | 'contact' | 'help' }) {
  const titles = {
    privacy: 'Privacy Policy & Data Protection (DPDP Act Compliance)',
    terms: 'Platform Terms of Use & Academic Integrity',
    contact: 'Official Support & State Nodal Contact',
    help: 'Student & College Help Guide',
  };

  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Andhra Student Hub Governance</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">{titles[section]}</h1>
      </div>

      {section === 'privacy' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            Andhra Student Hub collects only the educational profile, enrolment, and grievance evidence records explicitly submitted by students and authorised institutions.
          </p>
          <p>
            <strong>Strict Access Isolation:</strong> Private identity documents and grievance attachments are accessible solely to the submitting student, the assigned College Administrator of that institution, and State Administration oversight.
          </p>
          <p>
            <strong>Your Rights:</strong> Signed-in students can export their personal records in JSON format or submit a formal data export / account deletion request directly from their <Link to="/dashboard" className="text-blue-900 underline">Student Dashboard → Profile & Privacy</Link>. Financial and statutory audit records remain subject to institutional retention requirements.
          </p>
        </div>
      )}

      {section === 'terms' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            1. Students must submit genuine enrolment numbers and authentic institutional identification. Submission of forged evidence may result in verification rejection or suspension by College Administration.
          </p>
          <p>
            2. College Administrators must only approve authentic institutional photographs carrying written permission and must issue receipts strictly for verified fee payments.
          </p>
          <p>
            3. ASH does not replace official APSCHE counselling portals, Jnanabhumi, or NSP; always confirm external application submissions directly on official government domains.
          </p>
        </div>
      )}

      {section === 'contact' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            For institution onboarding, College Administrator email provisioning, or escalated student grievances, contact your designated College Nodal Officer or the Andhra Pradesh State Higher Education Desk.
          </p>
          <p>
            Registered students seeking resolution for college-level fee, scholarship, examination, or certificate delays should submit an auditable ticket via <Link to="/services" className="text-blue-900 underline">Student Services & Grievance Redressal</Link>.
          </p>
        </div>
      )}

      {section === 'help' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            <strong>1. New Student Registration:</strong> Sign in with Google on the Register page, select your AP college, enter your exact enrolment number, and upload ID proof inside your Student Dashboard.
          </p>
          <p>
            <strong>2. Why is my verification pending?</strong> Neither Google Sign-In nor mobile OTP proves enrolment. Your assigned College Administrator must review your ID proof or verify your enrolment via batch roster sync.
          </p>
          <p>
            <strong>3. Need guidance?</strong> Ask the <Link to="/assistant" className="text-blue-900 underline">ASH Academic & Grievance Assistant</Link> anytime.
          </p>
        </div>
      )}
    </div>
  );
}
