import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { CollegeLogoMark } from '../components/CollegeLogoMark.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface CollegeOption {
  id: number;
  name: string;
  district: string;
  institutionCode: string | null;
  approvedLogoId?: number | null;
}

export function LoginPage() {
  const { user, needsStudentOnboarding, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'state_admin') navigate('/state-admin', { replace: true });
      else if (user.role === 'college_admin') navigate('/college-admin', { replace: true });
      else if (needsStudentOnboarding) navigate('/register', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [loading, user, needsStudentOnboarding, navigate]);

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-14">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Firebase Secure Sign-In</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Sign in to Andhra Student Hub</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Access your Student Dashboard, College Admin Console, or State Administration Desk using your verified Google identity.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full py-3 px-4 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
        >
          {submitting ? 'Connecting with Google...' : 'Sign in with Google'}
        </button>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-800">Role-Based Access Notice</p>
          <p>
            • <strong>Students:</strong> Sign in with Google to view your college portal or complete college-linked registration.
          </p>
          <p>
            • <strong>College Administrators:</strong> Sign in using the official email pre-provisioned by the State Administrator for your college.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <Link to="/setup" className="text-slate-600 hover:text-slate-900">
            Initial State Setup
          </Link>
          <Link to="/register" className="text-blue-900 hover:underline font-medium">
            New student? Register →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { user, needsStudentOnboarding, signInWithGoogle, refreshAuth, loading } = useAuth();
  const navigate = useNavigate();

  const [colleges, setColleges] = useState<CollegeOption[]>([]);
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    enrollmentNumber: '',
    mobile: '',
    collegeId: '',
    course: 'B.Tech',
    department: '',
    academicYear: '2025-2026',
    admissionYear: String(new Date().getFullYear()),
    currentSemester: 'Semester 1',
    dob: '',
    consentAccepted: false,
  });
  const [studentPhoto, setStudentPhoto] = useState<File | null>(null);

  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpNotice, setOtpNotice] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ colleges: CollegeOption[] }>('/api/colleges?limit=100')
      .then((res) => setColleges(res.colleges))
      .catch(() => setColleges([]));
    apiFetch<{ smsConfigured: boolean }>('/api/auth/integration-status')
      .then((res) => setSmsConfigured(res.smsConfigured))
      .catch(() => setSmsConfigured(false));
  }, []);

  useEffect(() => {
    if (user && !form.fullName) {
      setForm((prev) => ({ ...prev, fullName: user.fullName || '' }));
    }
    if (!loading && user && user.role === 'student' && !needsStudentOnboarding) {
      navigate('/dashboard', { replace: true });
    }
    if (!loading && user && user.role !== 'student') {
      navigate(user.role === 'state_admin' ? '/state-admin' : '/college-admin', { replace: true });
    }
  }, [loading, user, needsStudentOnboarding, navigate]);

  const selectedCollege = colleges.find((c) => String(c.id) === form.collegeId);

  const handleSendOtp = async () => {
    setOtpNotice('');
    setError('');
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setError('Enter a valid 10-digit Indian mobile number before requesting OTP.');
      return;
    }
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ mobile: form.mobile, purpose: 'registration' }),
      });
      setOtpSent(true);
      setOtpNotice(res.message);
    } catch (err) {
      setOtpNotice(err instanceof Error ? err.message : 'Unable to dispatch OTP');
    }
  };

  const handleVerifyOtp = async () => {
    setOtpNotice('');
    setError('');
    try {
      const res = await apiFetch<{ verified: boolean; message: string }>('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ mobile: form.mobile, otp: otpCode }),
      });
      if (res.verified) {
        setOtpVerified(true);
        setOtpNotice(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.collegeId) {
      setError('Please select your college.');
      return;
    }
    if (!form.consentAccepted) {
      setError('You must accept the privacy and college verification consent notice to register.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('fullName', form.fullName);
      fd.append('enrollmentNumber', form.enrollmentNumber);
      fd.append('mobile', form.mobile);
      fd.append('collegeId', form.collegeId);
      fd.append('course', form.course);
      fd.append('department', form.department);
      fd.append('academicYear', form.academicYear);
      fd.append('admissionYear', form.admissionYear);
      fd.append('currentSemester', form.currentSemester);
      if (form.dob) fd.append('dob', form.dob);
      fd.append('consentAccepted', 'true');
      if (studentPhoto) fd.append('studentPhoto', studentPhoto);

      await apiFetch('/api/auth/register-student', {
        method: 'POST',
        body: fd,
      });
      await refreshAuth();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Student College-Linked Registration</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Your account starts in <strong>College verification pending</strong> status until verified by your College Administrator or authorised college database. Mobile OTP alone never proves college enrolment.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm" role="alert">
            {error}
          </div>
        )}

        {!user ? (
          <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-4">
            <p className="text-sm font-semibold text-slate-900">Step 1 of 2: Authenticate Your Google Identity</p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sign in with Google via Firebase Authentication first, then link your Andhra Pradesh college, enrolment number, and academic details.
            </p>
            <button
              type="button"
              onClick={() => void signInWithGoogle().catch((e) => setError(e instanceof Error ? e.message : 'Sign-in failed'))}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              Continue with Google
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-xs text-blue-950 flex items-center justify-between">
              <span>
                Signed in as <strong>{user.email}</strong>
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> Identity Authenticated
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-800">Full Name (as per academic records)</label>
              <input
                type="text"
                required
                minLength={3}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-800">College / University</label>
              <select
                required
                value={form.collegeId}
                onChange={(e) => setForm({ ...form, collegeId: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select your institution in Andhra Pradesh</option>
                {colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.district} {c.institutionCode ? `(${c.institutionCode})` : ''}
                  </option>
                ))}
              </select>
              {selectedCollege && (
                <div className="mt-2.5 flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <CollegeLogoMark
                    name={selectedCollege.name}
                    institutionCode={selectedCollege.institutionCode}
                    approvedLogoId={selectedCollege.approvedLogoId}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{selectedCollege.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Code: {selectedCollege.institutionCode || 'Pending code'} · {selectedCollege.district} District
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Student ID / Enrolment Number</label>
              <input
                type="text"
                required
                minLength={4}
                value={form.enrollmentNumber}
                onChange={(e) => setForm({ ...form, enrollmentNumber: e.target.value })}
                placeholder="e.g. 24A91A0501"
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Mobile Number (10 digits)</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="tel"
                  required
                  pattern="[6-9][0-9]{9}"
                  value={form.mobile}
                  onChange={(e) => {
                    setForm({ ...form, mobile: e.target.value });
                    setOtpVerified(false);
                  }}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap cursor-pointer"
                >
                  {smsConfigured ? 'Send OTP' : 'Check OTP'}
                </button>
              </div>
              {otpVerified && <p className="mt-1 text-xs text-emerald-700 font-medium">Mobile OTP confirmed</p>}
            </div>

            {otpSent && !otpVerified && (
              <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  className="px-3 py-1.5 text-sm font-mono border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded-lg cursor-pointer"
                >
                  Verify OTP
                </button>
              </div>
            )}

            {otpNotice && (
              <div className="sm:col-span-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs">
                {otpNotice}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-800">Course / Programme</label>
              <input
                type="text"
                required
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                placeholder="B.Tech / B.Sc / B.Com / MCA"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Department / Branch</label>
              <input
                type="text"
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Computer Science & Engineering"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Academic Year</label>
              <input
                type="text"
                required
                value={form.academicYear}
                onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                placeholder="e.g. 2025-2026"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Current Year / Semester</label>
              <input
                type="text"
                required
                value={form.currentSemester}
                onChange={(e) => setForm({ ...form, currentSemester: e.target.value })}
                placeholder="e.g. Semester 3"
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Admission Year</label>
              <input
                type="number"
                required
                min={2015}
                max={2030}
                value={form.admissionYear}
                onChange={(e) => setForm({ ...form, admissionYear: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">Date of Birth (optional)</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-800">
                Student Photograph (optional, JPG/PNG/WebP max 5 MB — private)
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => setStudentPhoto(e.target.files?.[0] || null)}
                className="mt-1 w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:font-semibold"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
                <input
                  type="checkbox"
                  checked={form.consentAccepted}
                  onChange={(e) => setForm({ ...form, consentAccepted: e.target.checked })}
                  className="mt-0.5"
                />
                <span>
                  I confirm that my college details and enrolment number are accurate, and I consent to Andhra Student Hub processing my educational verification records with my assigned College Administrator in accordance with the{' '}
                  <Link to="/privacy" className="text-blue-900 underline">
                    Privacy & Data Protection Policy
                  </Link>
                  .
                </span>
              </label>
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting Student Profile...' : 'Complete Student Registration'}
              </button>
            </div>
          </form>
        )}

        <p className="text-xs text-slate-600 text-center">
          Already registered?{' '}
          <Link to="/login" className="text-blue-900 font-semibold hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}

export function SetupAdminPage() {
  const { user, needsStateAdminBootstrap, signInWithGoogle, refreshAuth } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    mobile: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !form.fullName) {
      setForm((prev) => ({ ...prev, fullName: user.fullName || '' }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiFetch('/api/setup/bootstrap-state-admin', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      await refreshAuth();
      navigate('/state-admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-blue-900 text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          One-Time Platform Initialization
        </div>
        <h1 className="text-2xl font-bold text-slate-950">Initialize State Administrator</h1>
        {!needsStateAdminBootstrap ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>A State Administrator account already exists on this deployment. This one-time setup endpoint is permanently locked.</p>
            <Link to="/login" className="inline-block font-semibold text-blue-900 hover:underline">
              Proceed to Sign In →
            </Link>
          </div>
        ) : !user ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Sign in with the primary Google account that will serve as the Andhra Pradesh State Administrator.
            </p>
            {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">{error}</div>}
            <button
              type="button"
              onClick={() => void signInWithGoogle().catch((e) => setError(e instanceof Error ? e.message : 'Sign-in failed'))}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              Sign in with Google to Initialize
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Authenticated as <strong>{user.email}</strong>. Confirm your official details to activate the primary State Administrator role.
            </p>
            {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-800">Full Name</label>
              <input
                type="text"
                required
                minLength={3}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-800">Official Mobile (10 digits)</label>
              <input
                type="tel"
                required
                pattern="[6-9][0-9]{9}"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="9876543210"
                className="mt-1 w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              {submitting ? 'Initializing...' : 'Activate Primary State Admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
