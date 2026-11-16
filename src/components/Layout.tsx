import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Headphones, Menu, X } from 'lucide-react';
import { AndhraPradeshEmblem } from './AndhraPradeshEmblem.tsx';
import { CollegeCompareDrawer } from './CollegeCompareDrawer.tsx';
import { CookieConsentBanner } from './CookieConsentBanner.tsx';
import { GovAccessibilityBar } from './GovAccessibilityBar.tsx';
import { StudentHelpdeskModal } from './StudentHelpdeskModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useLanguage } from '../context/LanguageContext.tsx';
import { useShortlist } from '../context/ShortlistContext.tsx';

const DIRECT_NAV = [
  { label: 'Home', to: '/' },
  { label: 'Colleges', to: '/colleges' },
  { label: 'AP Districts', to: '/districts' },
  { label: 'Scholarships', to: '/scholarships' },
  { label: 'About ASH', to: '/about' },
];

const DIRECTORY_DROPDOWN = [
  { label: 'Verified Colleges Directory', to: '/colleges' },
  { label: 'My Shortlisted Colleges', to: '/colleges?tab=saved' },
  { label: 'All 26 AP Districts', to: '/districts' },
  { label: 'Awareness Posters', to: '/posters' },
];

const SERVICES_DROPDOWN = [
  { label: 'Student Services', to: '/services' },
  { label: 'Fee Information', to: '/fees' },
  { label: 'Grievances & Escalation', to: '/grievances' },
];

const ACADEMICS_DROPDOWN = [
  { label: 'UPSC & APPSC Exams', to: '/upsc' },
  { label: 'Competitive Exams & Internships', to: '/career-exams' },
  { label: 'NPTEL & Learning', to: '/nptel' },
  { label: 'AI Student Assistant', to: '/assistant' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, needsStudentOnboarding, logout, unreadNotifications } = useAuth();
  const { t } = useLanguage();
  const { savedIds } = useShortlist();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'directory' | 'services' | 'academics' | null>(null);
  const [cookieModalTrigger, setCookieModalTrigger] = useState(0);
  const [helpdeskOpen, setHelpdeskOpen] = useState(false);
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === 'state_admin'
      ? '/state-admin'
      : user?.role === 'college_admin'
        ? '/college-admin'
        : needsStudentOnboarding
          ? '/register'
          : '/dashboard';

  const handleLogout = async () => {
    await logout();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] text-slate-900">
      <GovAccessibilityBar />
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 no-print">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Institutional Wordmark with AP Emblem */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#0F2547] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1E3A8A] rounded"
          >
            <AndhraPradeshEmblem className="w-8 h-8 shrink-0" />
            <span>{t.portalTitle}</span>
          </Link>

          {/* Zone 2: Clean single-line navigation links + dropdowns */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#0F2547] ${
                  isActive ? 'text-[#0F2547] font-semibold border-b-2 border-[#0F2547]' : ''
                }`
              }
            >
              {t.navHome}
            </NavLink>

            <div
              className="relative"
              onMouseEnter={() => setOpenMenu('directory')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === 'directory' ? null : 'directory'))}
                className="inline-flex items-center gap-1 py-1 hover:text-[#0F2547] whitespace-nowrap cursor-pointer"
                aria-expanded={openMenu === 'directory'}
              >
                {t.navDirectory}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {openMenu === 'directory' && (
                <div className="absolute left-0 top-full pt-1 w-60 z-50">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
                    {DIRECTORY_DROPDOWN.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpenMenu(null)}
                        className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0F2547]"
                      >
                        <span>{item.label}</span>
                        {item.to.includes('tab=saved') && savedIds.length > 0 && (
                          <span className="font-mono text-xs font-semibold text-[#EA580C]">
                            {savedIds.length}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              className="relative"
              onMouseEnter={() => setOpenMenu('services')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === 'services' ? null : 'services'))}
                className="inline-flex items-center gap-1 py-1 hover:text-[#0F2547] whitespace-nowrap cursor-pointer"
                aria-expanded={openMenu === 'services'}
              >
                {t.navServicesFees}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {openMenu === 'services' && (
                <div className="absolute left-0 top-full pt-1 w-56 z-50">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
                    {SERVICES_DROPDOWN.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpenMenu(null)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0F2547]"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setHelpdeskOpen(true);
                      }}
                      className="w-full text-left flex items-center gap-2 px-4 py-2 text-sm text-[#EA580C] font-semibold hover:bg-slate-50 cursor-pointer border-t border-slate-100 mt-1 pt-2"
                    >
                      <Headphones className="w-3.5 h-3.5" aria-hidden="true" />
                      Quick Grievance &amp; Track Ticket
                    </button>
                  </div>
                </div>
              )}
            </div>

            <NavLink
              to="/scholarships"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#0F2547] ${
                  isActive ? 'text-[#0F2547] font-semibold border-b-2 border-[#0F2547]' : ''
                }`
              }
            >
              {t.navScholarships}
            </NavLink>

            <div
              className="relative"
              onMouseEnter={() => setOpenMenu('academics')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === 'academics' ? null : 'academics'))}
                className="inline-flex items-center gap-1 py-1 hover:text-[#0F2547] whitespace-nowrap cursor-pointer"
                aria-expanded={openMenu === 'academics'}
              >
                {t.navCareersUpsc}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {openMenu === 'academics' && (
                <div className="absolute left-0 top-full pt-1 w-64 z-50">
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg py-1.5">
                    {ACADEMICS_DROPDOWN.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => setOpenMenu(null)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0F2547]"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <NavLink
              to="/about"
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#0F2547] ${
                  isActive ? 'text-[#0F2547] font-semibold border-b-2 border-[#0F2547]' : ''
                }`
              }
            >
              {t.navAbout}
            </NavLink>
          </nav>

          {/* Zone 3: Helpdesk + Auth / Workspace action */}
          <div className="hidden lg:flex items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setHelpdeskOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-[#0F2547] whitespace-nowrap cursor-pointer"
              aria-label="Open Student Helpdesk and Ticket Tracker"
            >
              <Headphones className="w-3.5 h-3.5 text-[#EA580C]" aria-hidden="true" />
              Helpdesk
            </button>
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  className="text-sm font-semibold text-[#0F2547] hover:text-[#1E3A8A] whitespace-nowrap shrink-0"
                >
                  {needsStudentOnboarding
                    ? 'Complete Registration'
                    : `Dashboard${unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}`}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-700 hover:text-slate-950 whitespace-nowrap shrink-0"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2547] hover:bg-[#1E3A8A] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile / Tablet menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile / Tablet Drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3">
            <nav className="grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="Mobile navigation">
              {[...DIRECT_NAV, ...DIRECTORY_DROPDOWN.slice(2), ...SERVICES_DROPDOWN, ...ACADEMICS_DROPDOWN].map((item) => (
                <Link
                  key={`${item.to}-${item.label}`}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm rounded-md text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="pt-3 border-t border-slate-200 flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg"
                  >
                    {needsStudentOnboarding
                      ? 'Complete Registration'
                      : `Open Dashboard${unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}`}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-900 rounded-lg"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-16 no-print">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-slate-600">
          <div>
            <p className="font-bold text-slate-900 text-base">{t.portalTitle} (ASH)</p>
            <p className="mt-2 leading-relaxed">
              Your Gateway to a Connected Higher Education Ecosystem. Official institutional records, fee transparency, scholarships, and grievance redressal across Andhra Pradesh.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/colleges" className="hover:text-slate-900">Colleges</Link>
            <Link to="/districts" className="hover:text-slate-900">26 AP Districts</Link>
            <Link to="/posters" className="hover:text-slate-900">ASH Posters</Link>
            <Link to="/services" className="hover:text-slate-900">Student Services</Link>
            <Link to="/fees" className="hover:text-slate-900">Fee Information</Link>
            <Link to="/scholarships" className="hover:text-slate-900">Scholarships</Link>
            <Link to="/upsc" className="hover:text-slate-900">UPSC &amp; APPSC</Link>
            <Link to="/career-exams" className="hover:text-slate-900">Competitive Exams</Link>
            <Link to="/nptel" className="hover:text-slate-900">NPTEL &amp; Learning</Link>
            <Link to="/assistant" className="hover:text-slate-900">AI Assistant</Link>
            <Link to="/privacy" className="hover:text-slate-900">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-900">Terms of Use</Link>
            <Link to="/contact" className="hover:text-slate-900">Contact</Link>
            <Link to="/help" className="hover:text-slate-900">Help &amp; Support</Link>
            <button
              type="button"
              onClick={() => setHelpdeskOpen(true)}
              className="text-left hover:text-slate-900 cursor-pointer"
            >
              Grievance Helpdesk
            </button>
            <button
              type="button"
              onClick={() => setCookieModalTrigger((n) => n + 1)}
              className="text-left hover:text-slate-900 cursor-pointer"
            >
              Cookie Preferences
            </button>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-slate-900">Official Reference Portals</p>
            <p className="text-xs leading-relaxed">
              Directory verification references APSCHE, APCCE, and institution portals. Always confirm final admissions and scholarship disbursements on official government websites.
            </p>
            <p className="text-xs text-slate-500 pt-2">
              © {new Date().getFullYear()} Andhra Student Hub · {t.portalSubtitle}
            </p>
          </div>
        </div>
      </footer>

      <CollegeCompareDrawer />
      <StudentHelpdeskModal isOpen={helpdeskOpen} onClose={() => setHelpdeskOpen(false)} />
      <CookieConsentBanner forceOpenTrigger={cookieModalTrigger} />
    </div>
  );
}
