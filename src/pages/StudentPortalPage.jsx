import { useEffect, useMemo, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { policies } from '../data/site.js';
import { PageIntro, Eyebrow } from '../components/ContentBlocks.jsx';
import './student-portal.css';

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || (response.status === 401
      ? 'Please sign in again to continue.'
      : 'We could not complete that request. Please try again.'));
  }
  return payload;
}

function Notice({ type = 'info', children }) {
  if (!children) return null;
  return <div className={`student-notice student-notice-${type}`} role="status">{children}</div>;
}

function Field({ label, ...props }) {
  return <label className="student-field">{label}<input {...props} /></label>;
}

export default function StudentPortalPage() {
  const { pathname, navigate } = useRouter();
  const mode = pathname.endsWith('/register') ? 'register'
    : pathname.endsWith('/dashboard') ? 'dashboard' : 'login';
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    preferredLanguage: 'en', adultAccountConfirmed: false,
    termsAccepted: false, privacyAccepted: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [account, setAccount] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrolments, setEnrolments] = useState([]);
  const [trialLesson, setTrialLesson] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '', preferredLanguage: 'en' });

  const bookableCourses = useMemo(
    () => courses.filter((course) => course.status === 'available' && course.enrolmentOpen),
    [courses],
  );

  useEffect(() => {
    if (mode !== 'dashboard') return undefined;
    let active = true;
    async function load() {
      try {
        const [dashboard, catalogue] = await Promise.all([
          api('/api/student/dashboard'),
          api('/api/courses'),
        ]);
        if (!active) return;
        setAccount(dashboard.student);
        setProfile({
          firstName: dashboard.student.firstName || '',
          lastName: dashboard.student.lastName || '',
          phone: dashboard.student.phone || '',
          preferredLanguage: dashboard.student.preferredLanguage || 'en',
        });
        setEnrolments(dashboard.enrolments || []);
        setTrialLesson(dashboard.trialLesson || null);
        setCourses(catalogue.courses || []);
      } catch (err) {
        if (active) {
          setError(err.message);
          if (/sign in/i.test(err.message)) navigate('/student/login');
        }
      }
    }
    load();
    return () => { active = false; };
  }, [mode, navigate]);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'register'
        ? { ...form, adultAccountConfirmed: form.adultAccountConfirmed }
        : { email: form.email, password: form.password };
      await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api('/api/student/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      setAccount(result.profile);
      setNotice('Your account details have been updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestCourse(event) {
    event.preventDefault();
    if (!selectedCourse) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/student/enrolments', {
        method: 'POST',
        body: JSON.stringify({ courseSlug: selectedCourse }),
      });
      const result = await api('/api/student/dashboard');
      setEnrolments(result.enrolments || []);
      setNotice('Your course request has been recorded. Heeva will confirm the next steps.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestTrial(event) {
    event.preventDefault();
    if (!selectedCourse) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await api('/api/student/trial-lesson', {
        method: 'POST',
        body: JSON.stringify({ courseSlug: selectedCourse }),
      });
      setTrialLesson(result.trialLesson);
      setNotice('Your one introductory lesson request has been received. Heeva will contact you to discuss arrangements.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {
      // Clear the local view even when the session has already expired.
    } finally {
      setBusy(false);
      navigate('/student/login');
    }
  }

  if (mode === 'dashboard') {
    return (
      <>
        <PageIntro eyebrow="Student portal" title={<>Your learning, <em>in one place.</em></>}>
          <p>Review your account, course requests and introductory lesson request.</p>
        </PageIntro>
        <section className="shell student-portal student-dashboard">
          <div className="student-dashboard-heading">
            <div><Eyebrow>Account overview</Eyebrow><h2>Hello, {account?.firstName || 'there'}.</h2><p>{account?.email || 'Loading your account…'}</p></div>
            <button className="button button-outline" type="button" onClick={logout} disabled={busy}>Sign out</button>
          </div>
          <Notice type="error">{error}</Notice>
          <Notice type="success">{notice}</Notice>
          <div className="student-dashboard-grid">
            <section className="student-panel">
              <Eyebrow>Personal details</Eyebrow><h3>Account profile</h3>
              <form className="student-form" onSubmit={submitProfile}>
                <Field label="Account holder first name" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} maxLength={80} required />
                <Field label="Account holder last name" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} maxLength={80} required />
                <Field label="Phone (optional)" type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} maxLength={40} />
                <label className="student-field">Preferred language
                  <select value={profile.preferredLanguage} onChange={(e) => setProfile({ ...profile, preferredLanguage: e.target.value })}>
                    <option value="en">English</option><option value="fa">فارسی</option>
                  </select>
                </label>
                <button className="button" type="submit" disabled={busy}>Save account details <span aria-hidden="true">↗</span></button>
              </form>
            </section>
            <section className="student-panel">
              <Eyebrow>Course activity</Eyebrow><h3>Your course requests</h3>
              {enrolments.length ? <ul className="student-record-list">{enrolments.map((item) => <li key={item.id}><div><strong>{item.courseTitle}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></div><span className="student-status">{item.status.replaceAll('_', ' ')}</span></li>)}</ul> : <p className="student-empty">You have not requested a course yet.</p>}
              <form className="student-form" onSubmit={requestCourse}>
                <label className="student-field">Request a course
                  <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required>
                    <option value="">Choose an available course</option>
                    {bookableCourses.map((course) => <option value={course.slug} key={course.slug}>{course.title}</option>)}
                  </select>
                </label>
                <button className="button" type="submit" disabled={busy || !selectedCourse}>Request enrolment <span aria-hidden="true">↗</span></button>
              </form>
              <p className="student-fineprint">A request is not a confirmed enrolment or payment. Heeva will confirm availability and next steps.</p>
            </section>
            <section className="student-panel student-panel-wide">
              <Eyebrow>One free introductory lesson</Eyebrow><h3>Your introductory lesson</h3>
              {trialLesson ? (
                <div className="student-trial-record"><strong>{trialLesson.courseTitle}</strong><span className="student-status">{trialLesson.status}</span><p>Requested {new Date(trialLesson.requestedAt).toLocaleDateString()}. Heeva will contact you to discuss arrangements.</p></div>
              ) : (
                <>
                  <p className="student-empty">You have not requested your one introductory lesson yet.</p>
                  <form className="student-form student-trial-form" onSubmit={requestTrial}>
                    <label className="student-field">Choose a course
                      <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required>
                        <option value="">Choose an available course</option>
                        {bookableCourses.map((course) => <option value={course.slug} key={course.slug}>{course.title}</option>)}
                      </select>
                    </label>
                    <button className="button" type="submit" disabled={busy || !selectedCourse}>Request my one free lesson <span aria-hidden="true">↗</span></button>
                  </form>
                </>
              )}
              <p className="student-fineprint">Only one introductory lesson request is permitted per account. A request is subject to teacher availability and confirmation by Heeva.</p>
            </section>
          </div>
          <p className="student-fineprint">This is a staging account experience. Email verification, password recovery, guardian/learner profiles, confirmed scheduling and payments are not yet enabled. Do not enter children's identifying details or payment information.</p>
        </section>
      </>
    );
  }

  const registering = mode === 'register';
  return (
    <>
      <PageIntro eyebrow="Heeva student portal" title={registering ? <>Create your <em>account.</em></> : <>Welcome <em>back.</em></>}>
        <p>{registering ? 'Create a parent/guardian or adult learner account to begin using the new Heeva staging platform.' : 'Sign in to your new Heeva staging account.'}</p>
      </PageIntro>
      <section className="shell student-portal student-auth-layout">
        <aside className="student-auth-aside">
          <Eyebrow>Learning with Heeva</Eyebrow>
          <h2>{registering ? 'A thoughtful start to learning.' : 'Your learning journey continues.'}</h2>
          <p>Explore courses, submit a course request and ask Heeva about the next steps. Your account is separate from the previous Heeva website.</p>
          <div className="student-assurance"><span>✳</span><div><strong>One free introductory lesson</strong><small>One per account, subject to arrangement and availability.</small></div></div>
        </aside>
        <section className="student-panel student-auth-panel">
          <Eyebrow>{registering ? 'New account' : 'Secure sign in'}</Eyebrow>
          <h2>{registering ? 'Create an account' : 'Sign in to Heeva'}</h2>
          <Notice type="warning">Staging preview only. Use test details, a test email and a unique password. Do not enter real children's personal information or payment details.</Notice>
          <Notice type="error">{error}</Notice>
          {registering ? (
            <form className="student-form" onSubmit={submitAuth}>
              <div className="student-form-row">
                <Field label="Parent/guardian or adult learner first name" autoComplete="given-name" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} maxLength={80} required />
                <Field label="Last name" autoComplete="family-name" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} maxLength={80} required />
              </div>
              <Field label="Email address" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} maxLength={254} required />
              <Field label="Phone (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} maxLength={40} />
              <label className="student-field">Preferred language
                <select value={form.preferredLanguage} onChange={(e) => update('preferredLanguage', e.target.value)}>
                  <option value="en">English</option><option value="fa">فارسی</option>
                </select>
              </label>
              <Field label="Password (12+ characters, upper/lowercase and a number)" type="password" autoComplete="new-password" value={form.password} onChange={(e) => update('password', e.target.value)} minLength={12} maxLength={128} required />
              <label className="student-check"><input type="checkbox" checked={form.adultAccountConfirmed} onChange={(e) => update('adultAccountConfirmed', e.target.checked)} required />I confirm I am 18 or over and am creating this account as a parent/guardian or adult learner.</label>
              <label className="student-check"><input type="checkbox" checked={form.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)} required />I agree to the <a href={policies.terms} target="_blank" rel="noreferrer">Terms of Service</a>.</label>
              <label className="student-check"><input type="checkbox" checked={form.privacyAccepted} onChange={(e) => update('privacyAccepted', e.target.checked)} required />I have read the <a href={policies.privacy} target="_blank" rel="noreferrer">Privacy Policy</a>.</label>
              <button className="button student-submit" type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Create staging account'} <span aria-hidden="true">↗</span></button>
            </form>
          ) : (
            <form className="student-form" onSubmit={submitAuth}>
              <Field label="Email address" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
              <Field label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
              <button className="button student-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">↗</span></button>
              <p className="student-fineprint">Password recovery is not yet available on this staging build.</p>
            </form>
          )}
          <p className="student-auth-switch">
            {registering ? <>Already have an account? <Link to="/student/login">Sign in</Link></> : <>New to Heeva? <Link to="/student/register">Create a staging account</Link></>}
          </p>
        </section>
      </section>
    </>
  );
}
