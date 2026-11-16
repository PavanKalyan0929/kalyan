import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Headphones, Search, Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useShortlist } from '../context/ShortlistContext.tsx';
import { apiFetch, formatDateTime } from '../lib/api.ts';

interface LookupTicket {
  referenceNumber: string;
  category: string;
  status: string;
  escalatedToState: boolean;
  collegeName: string | null;
  createdAt: string;
  updatedAt: string;
}

const HELP_CATEGORIES = [
  'Fee-related issues',
  'Scholarship issues',
  'Examination issues',
  'Academic problems',
  'College administration',
  'Other student concerns',
] as const;

export function StudentHelpdeskModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user, needsStudentOnboarding } = useAuth();
  const { showToast } = useShortlist();
  const isVerifiedStudentRole = Boolean(user && user.role === 'student' && !needsStudentOnboarding);

  const [tab, setTab] = useState<'new' | 'track'>('track');
  const [category, setCategory] = useState<string>(HELP_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [lookupRef, setLookupRef] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupTicket | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [searching, setSearching] = useState(false);

  const [myTickets, setMyTickets] = useState<LookupTicket[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (user?.mobile) {
      setContactPhone((prev) => prev || user.mobile);
    }
    if (isVerifiedStudentRole) {
      apiFetch<{ grievances: LookupTicket[] }>('/api/student/grievances')
        .then((res) => setMyTickets(res.grievances || []))
        .catch(() => setMyTickets([]));
    } else {
      setMyTickets([]);
    }
  }, [isOpen, isVerifiedStudentRole, user?.mobile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerifiedStudentRole) return;
    setSubmitting(true);
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('category', category);
      fd.append('subject', subject.trim());
      fd.append('description', description.trim());
      fd.append('contactPhone', contactPhone.trim() || user?.mobile || '9999999999');
      fd.append('contactEmail', user?.email || '');
      fd.append('consentAccepted', 'true');

      const res = await apiFetch<{ id: number; referenceNumber: string }>('/api/student/grievances', {
        method: 'POST',
        body: fd,
      });

      showToast(`Grievance submitted: ${res.referenceNumber}`, 'success');
      setSubject('');
      setDescription('');
      setLookupRef(res.referenceNumber);
      setTab('track');

      const [refreshed, lookup] = await Promise.all([
        apiFetch<{ grievances: LookupTicket[] }>('/api/student/grievances'),
        apiFetch<{ ticket: LookupTicket }>(`/api/grievances/lookup?ref=${encodeURIComponent(res.referenceNumber)}`),
      ]);
      setMyTickets(refreshed.grievances || []);
      setLookupResult(lookup.ticket || null);
      setLookupError('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to register grievance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = lookupRef.trim().toUpperCase();
    if (!trimmed) return;
    setSearching(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await apiFetch<{ ticket: LookupTicket }>(
        `/api/grievances/lookup?ref=${encodeURIComponent(trimmed)}`
      );
      setLookupResult(res.ticket);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'No ticket matched that reference ID.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F2547]/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ash-helpdesk-title"
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#0F2547] px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Headphones className="h-5 w-5 text-[#EA580C]" aria-hidden="true" />
            <h3 id="ash-helpdesk-title" className="text-base font-bold tracking-tight">
              ASH Student Grievance &amp; Helpdesk
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-200 hover:bg-white/15 cursor-pointer"
            aria-label="Close helpdesk dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-5">
          <button
            type="button"
            onClick={() => setTab('track')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              tab === 'track'
                ? 'border-[#EA580C] text-[#0F2547]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Track Ticket Status
          </button>
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              tab === 'new'
                ? 'border-[#EA580C] text-[#0F2547]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Submit New Grievance
          </button>
        </div>

        {tab === 'new' ? (
          isVerifiedStudentRole ? (
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F2547]">Query Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#0F2547]"
                  >
                    {HELP_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F2547]">Contact Mobile</label>
                  <input
                    type="tel"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F2547]">Subject</label>
                <input
                  type="text"
                  required
                  minLength={5}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F2547]">Description</label>
                <textarea
                  rows={3}
                  required
                  minLength={15}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide specific academic/fee details for your College Grievance Cell..."
                  className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Link
                  to="/services"
                  onClick={onClose}
                  className="text-xs font-semibold text-[#1E3A8A] hover:underline"
                >
                  Need to attach PDF/image evidence? Open Full Desk →
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F2547] hover:bg-[#1E3A8A] disabled:opacity-60 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-[#EA580C]" />
                  <span>{submitting ? 'Submitting...' : 'Submit Official Grievance'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 space-y-4">
              <p className="text-sm font-semibold text-[#0F2547]">
                Student Authentication Required for Grievance Submission
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                To route official grievances directly to your College Grievance Cell or the State Escalation Desk with authentic tracking IDs, sign in and complete your college-linked student registration.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {!user ? (
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="rounded-lg bg-[#0F2547] hover:bg-[#1E3A8A] px-4 py-2 text-xs font-bold text-white"
                  >
                    Sign In with Google
                  </Link>
                ) : (
                  <Link
                    to={user.role === 'college_admin' ? '/college-admin' : user.role === 'state_admin' ? '/state-admin' : '/register'}
                    onClick={onClose}
                    className="rounded-lg bg-[#0F2547] hover:bg-[#1E3A8A] px-4 py-2 text-xs font-bold text-white"
                  >
                    {needsStudentOnboarding ? 'Complete Student Onboarding' : 'Open Admin Queue'}
                  </Link>
                )}
                <Link
                  to="/services"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Student Services Page →
                </Link>
              </div>
            </div>
          )
        ) : (
          <div className="p-6 space-y-4">
            <form onSubmit={handleLookup} className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-[#1E3A8A]">
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={lookupRef}
                  onChange={(e) => setLookupRef(e.target.value)}
                  placeholder="Enter Grievance Ref (e.g. ASH-GRV-...)"
                  className="w-full text-xs font-mono font-semibold text-[#0F2547] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="rounded-lg bg-[#0F2547] hover:bg-[#1E3A8A] px-4 py-2 text-xs font-bold text-white cursor-pointer whitespace-nowrap"
              >
                {searching ? 'Checking...' : 'Check Status'}
              </button>
            </form>

            {lookupError && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {lookupError}
              </p>
            )}

            {lookupResult && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-bold text-[#0F2547]">{lookupResult.referenceNumber}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {lookupResult.status}
                  </span>
                </div>
                <p className="text-xs text-slate-700">
                  {lookupResult.category}
                  {lookupResult.collegeName ? ` · ${lookupResult.collegeName}` : ''}
                </p>
                <p className="text-[11px] text-slate-500">
                  Last Updated: {formatDateTime(lookupResult.updatedAt)}
                  {lookupResult.escalatedToState ? ' · Escalated to State Desk' : ''}
                </p>
              </div>
            )}

            {isVerifiedStudentRole && myTickets.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Your Recent Grievances
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {myTickets.slice(0, 4).map((ticket) => (
                    <div
                      key={ticket.referenceNumber}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-mono text-xs font-bold text-[#0F2547]">
                          {ticket.referenceNumber}
                        </p>
                        <p className="text-xs text-slate-600 truncate">{ticket.category}</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 shrink-0">
                        {ticket.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-1 flex justify-end">
              <Link
                to="/services"
                onClick={onClose}
                className="text-xs font-semibold text-[#1E3A8A] hover:underline"
              >
                Open Full Grievance Portal →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
