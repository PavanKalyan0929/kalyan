import { useEffect, useState } from 'react';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

const COOKIE_CONSENT_KEY = 'ash_cookie_consent_status';

export function CookieConsentBanner({
  forceOpenTrigger = 0,
}: {
  forceOpenTrigger?: number;
}) {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (forceOpenTrigger > 0) {
      setShowPolicyModal(true);
    }
  }, [forceOpenTrigger]);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
    setShowPolicyModal(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setVisible(false);
    setShowPolicyModal(false);
  };

  return (
    <>
      {visible && (
        <div
          role="region"
          aria-label="Cookie Consent Notice"
          className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md sm:px-6 no-print"
        >
          <div className="mx-auto flex max-w-[1360px] flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0F2547] text-[#E6C775]">
                <Cookie className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                {lang === 'te' ? (
                  <>
                    ఈ పోర్టల్ వినియోగాన్ని అర్థం చేసుకోవడానికి మేము కుకీలను ఉపయోగిస్తాము. మీరు అంగీకరించకపోతే
                    అదనపు విశ్లేషణ సమాచారం సేకరించబడదు.{' '}
                    <button
                      type="button"
                      onClick={() => setShowPolicyModal(true)}
                      className="font-bold text-[#0F2547] underline decoration-[#EA580C] underline-offset-2 hover:text-[#EA580C] cursor-pointer"
                    >
                      కుకీ విధానాన్ని చదవండి
                    </button>
                  </>
                ) : (
                  <>
                    We use cookies strictly for essential session security and optional portal usage metrics under the{' '}
                    <strong>DPDP Act, 2023</strong>. Nothing is collected unless you accept.{' '}
                    <button
                      type="button"
                      onClick={() => setShowPolicyModal(true)}
                      className="font-bold text-[#0F2547] underline decoration-[#EA580C] underline-offset-2 hover:text-[#EA580C] cursor-pointer"
                    >
                      Read cookie policy
                    </button>
                  </>
                )}
              </p>
            </div>

            <div className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-auto">
              <button
                type="button"
                onClick={handleReject}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs sm:text-sm font-semibold text-[#0F2547] transition hover:bg-slate-100 sm:flex-initial cursor-pointer"
              >
                {lang === 'te' ? 'తిరస్కరించు' : 'Reject Optional'}
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 rounded-lg bg-[#0F2547] px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E3A8A] sm:flex-initial cursor-pointer"
              >
                {lang === 'te' ? 'అంగీకరించు' : 'Accept'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPolicyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-policy-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/70 p-4 backdrop-blur-sm"
        >
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setShowPolicyModal(false)}
              aria-label="Close Cookie Policy"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0F2547] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 text-[#0F2547]">
              <ShieldCheck className="h-6 w-6 text-[#EA580C]" aria-hidden="true" />
              <h2 id="cookie-policy-title" className="font-serif text-xl font-semibold">
                Cookie &amp; Data Privacy Policy — Andhra Student Hub
              </h2>
            </div>

            <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                <strong>Andhra Student Hub (ASH)</strong> respects student privacy under the{' '}
                <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>. No optional usage
                measurement is enabled unless you click <strong>Accept</strong>.
              </p>

              <div className="rounded-xl border border-slate-200 bg-[#FBF9F4] p-4 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F2547]">
                  1. Strictly Necessary Storage (Always Active)
                </h3>
                <p className="text-xs">
                  Stores your cookie preference, accessibility font scale, language selection, guest
                  college shortlist, and Firebase authenticated session state so the portal functions
                  securely.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[#FBF9F4] p-4 space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F2547]">
                  2. Usage Measurement (Opt-In Only)
                </h3>
                <p className="text-xs">
                  Activated only if you choose <strong>Accept</strong>. Measures aggregated directory
                  searches across Andhra Pradesh districts to improve portal speed. Selecting{' '}
                  <strong>Reject Optional</strong> keeps optional telemetry disabled.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleReject}
                className="rounded-lg border border-slate-300 px-5 py-2 text-xs sm:text-sm font-semibold text-[#0F2547] hover:bg-slate-50 cursor-pointer"
              >
                Reject All Optional
              </button>
              <button
                type="button"
                onClick={handleAccept}
                className="rounded-lg bg-[#0F2547] px-5 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#1E3A8A] cursor-pointer"
              >
                Accept &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
