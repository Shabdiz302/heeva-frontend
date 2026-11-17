import { useEffect, useMemo, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { policies } from '../data/site.js';
import { courses as siteCourses } from '../data/courses.js';
import { teachers } from '../data/teachers.js';
import { assetPath } from '../utils/assets.js';
import { PageIntro, Eyebrow } from '../components/ContentBlocks.jsx';
import './student-portal.css';

async function api(path, options = {}) {
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`/student-preview-api${apiPath}`, {
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

function courseImage(path) {
  if (!path) return '';
  return assetPath(path.replace(/^\/heeva-frontend\//, '/'));
}

function TeacherMatches({ enrolments }) {
  const matches = useMemo(() => {
    const result = new Map();
    for (const enrolment of enrolments) {
      const course = siteCourses.find((item) => item.slug === enrolment.courseSlug);
      if (!course) continue;
      for (const teacher of teachers.filter((item) => item.relatedCourses?.includes(course.slug))) {
        if (!result.has(teacher.slug)) result.set(teacher.slug, { teacher, course });
      }
    }
    return [...result.values()];
  }, [enrolments]);

  if (!matches.length) return null;
  return (
    <section className="student-panel student-panel-wide student-teacher-matches">
      <Eyebrow>Teacher and course connection</Eyebrow>
      <h3>Teachers whose subjects match your course requests</h3>
      <p className="student-fineprint">These matches are based on each teacher’s published Heeva profile and course subjects. They are not confirmed assignments or availability.</p>
      <div className="student-teacher-grid">
        {matches.map(({ teacher, course }) => (
          <article className="student-teacher-card" key={`${teacher.slug}-${course.slug}`}>
            <Link to={`/teachers/${teacher.slug}`} className="student-teacher-photo" aria-label={`View ${teacher.name}'s profile`}>
              <picture>
                <source srcSet={teacher.photo} type="image/webp" />
                <img src={teacher.originalPhoto} alt={`Portrait of ${teacher.name}`} loading="lazy" decoding="async" />
              </picture>
            </Link>
            <div className="student-teacher-copy">
              <span className="student-match-label">Subject match · {course.title}</span>
              <h4><Link to={`/teachers/${teacher.slug}`}>{teacher.name}</Link></h4>
              <p className="student-teacher-role">{teacher.role}</p>
              <p>{teacher.summary}</p>
              <Link className="text-link" to={`/teachers/${teacher.slug}`}>View professional profile <span aria-hidden="true">↗</span></Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function StudentPortalPage() {
  const { pathname, navigate } = useRouter();
  const mode = pathname.endsWith('/register') ? 'register'
    : pathname.endsWith('/dashboard') ? 'dashboard' : 'login';
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    preferredLanguage: 'en', accountType: 'adult_learner',
    adultAccountConfirmed: false, termsAccepted: false, privacyAccepted: false,
  });
  const [learnerForm, setLearnerForm] = useState({
    displayName: '', ageBand: '8_12', preferredLanguage: 'en', guardianAuthorityConfirmed: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [account, setAccount] = useState(null);
  const [courses, setCourses] = useState([]);
  const [learners, setLearners] = useState([]);
  const [enrolments, setEnrolments] = useState([]);
  const [trialLessons, setTrialLessons] = useState([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [trialLearnerId, setTrialLearnerId] = useState('');
  const [trialCourse, setTrialCourse] = useState('');
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '', preferredLanguage: 'en' });

  const bookableCourses = useMemo(
    () => courses.filter((course) => course.status === 'available' && course.enrolmentOpen),
    [courses],
  );
  const trialLearnerIds = useMemo(() => new Set(trialLessons.map((item) => item.learnerId)), [trialLessons]);
  const learnersWithoutTrial = useMemo(
    () => learners.filter((learner) => !trialLearnerIds.has(learner.id)),
    [learners, trialLearnerIds],
  );

  async function refreshDashboard() {
    const [dashboard, catalogue] = await Promise.all([
      api('/api/student/dashboard'),
      api('/api/courses'),
    ]);
    setAccount(dashboard.student);
    setProfile({
      firstName: dashboard.student.firstName || '',
      lastName: dashboard.student.lastName || '',
      phone: dashboard.student.phone || '',
      preferredLanguage: dashboard.student.preferredLanguage || 'en',
    });
    setLearners(dashboard.learners || []);
    setEnrolments(dashboard.enrolments || []);
    setTrialLessons(dashboard.trialLessons || []);
    setCourses(catalogue.courses || []);
    const firstLearnerId = dashboard.learners?.[0]?.id || '';
    setSelectedLearnerId((current) => current || firstLearnerId);
    setTrialLearnerId((current) => current || dashboard.learners?.find((item) =>
      !(dashboard.trialLessons || []).some((trial) => trial.learnerId === item.id)
    )?.id || firstLearnerId);
  }

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
        setLearners(dashboard.learners || []);
        setEnrolments(dashboard.enrolments || []);
        setTrialLessons(dashboard.trialLessons || []);
        setCourses(catalogue.courses || []);
        const firstLearnerId = dashboard.learners?.[0]?.id || '';
        setSelectedLearnerId(firstLearnerId);
        setTrialLearnerId(dashboard.learners?.find((item) =>
          !(dashboard.trialLessons || []).some((trial) => trial.learnerId === item.id)
        )?.id || firstLearnerId);
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
      await refreshDashboard();
      setNotice('Your account details have been updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function addLearner(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/student/learners', {
        method: 'POST',
        body: JSON.stringify(learnerForm),
      });
      setLearnerForm({ displayName: '', ageBand: '8_12', preferredLanguage: 'en', guardianAuthorityConfirmed: false });
      await refreshDashboard();
      setNotice('The learner profile has been added to your family account.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestCourse(event) {
    event.preventDefault();
    if (!selectedCourse || !selectedLearnerId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/student/enrolments', {
        method: 'POST',
        body: JSON.stringify({ courseSlug: selectedCourse, learnerId: selectedLearnerId }),
      });
      await refreshDashboard();
      setNotice('Your course request has been recorded for the selected learner. Heeva will confirm the next steps.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestTrial(event) {
    event.preventDefault();
    if (!trialCourse || !trialLearnerId) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api('/api/student/trial-lesson', {
        method: 'POST',
        body: JSON.stringify({ courseSlug: trialCourse, learnerId: trialLearnerId }),
      });
      await refreshDashboard();
      setNotice('The selected learner’s one free introductory lesson request has been received. Heeva will contact you to discuss arrangements.');
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
          <p>Manage your family learner profiles, course requests and introductory lesson requests.</p>
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
              <Eyebrow>Account holder</Eyebrow><h3>Account details</h3>
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
              <p className="student-fineprint">Account type: {account?.accountType === 'parent_guardian' ? 'Parent / guardian' : 'Adult learner'}</p>
            </section>

            <section className="student-panel">
              <Eyebrow>Family and learner profiles</Eyebrow><h3>{account?.accountType === 'parent_guardian' ? 'Learners in your family' : 'Your learner profile'}</h3>
              {learners.length ? (
                <ul className="student-learner-list">
                  {learners.map((learner) => (
                    <li key={learner.id}>
                      <span className="student-learner-avatar" aria-hidden="true">{learner.displayName.slice(0,1).toUpperCase()}</span>
                      <span className="student-learner-details"><strong>{learner.displayName}</strong><small>{learner.relationshipType === 'self' ? 'Adult learner' : 'Child learner'} · {learner.ageBand.replaceAll('_', ' ')}</small></span>
                    </li>
                  ))}
                </ul>
              ) : <p className="student-empty">No learner profiles have been added yet.</p>}
              {account?.accountType === 'parent_guardian' && (
                <form className="student-form" onSubmit={addLearner}>
                  <h4 className="student-form-subheading">Add a learner</h4>
                  <Field label="Learner first name or preferred name" value={learnerForm.displayName} onChange={(e) => setLearnerForm({ ...learnerForm, displayName: e.target.value })} maxLength={80} required />
                  <label className="student-field">Age band
                    <select value={learnerForm.ageBand} onChange={(e) => setLearnerForm({ ...learnerForm, ageBand: e.target.value })}>
                      <option value="under_8">Under 8</option><option value="8_12">8–12</option><option value="13_17">13–17</option>
                    </select>
                  </label>
                  <label className="student-field">Preferred learning language
                    <select value={learnerForm.preferredLanguage} onChange={(e) => setLearnerForm({ ...learnerForm, preferredLanguage: e.target.value })}>
                      <option value="en">English</option><option value="fa">فارسی</option>
                    </select>
                  </label>
                  <label className="student-check"><input type="checkbox" checked={learnerForm.guardianAuthorityConfirmed} onChange={(e) => setLearnerForm({ ...learnerForm, guardianAuthorityConfirmed: e.target.checked })} required />I confirm that I am the child's parent or authorised legal guardian and may create this profile.</label>
                  <button className="button" type="submit" disabled={busy}>Add learner <span aria-hidden="true">↗</span></button>
                  <p className="student-fineprint">For this staging phase, we only collect a first/preferred name and broad age band. Do not enter dates of birth, health information or other sensitive details.</p>
                </form>
              )}
            </section>

            <section className="student-panel student-panel-wide">
              <Eyebrow>Course activity</Eyebrow><h3>Course requests</h3>
              {enrolments.length ? (
                <ul className="student-record-list">
                  {enrolments.map((item) => (
                    <li key={item.id}>
                      <div><strong>{item.courseTitle}</strong><small>For {item.learnerName} · {new Date(item.createdAt).toLocaleDateString()}</small></div>
                      <span className="student-status">{item.status.replaceAll('_', ' ')}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="student-empty">No course requests yet.</p>}
              {learners.length > 0 && (
                <form className="student-form student-enrolment-form" onSubmit={requestCourse}>
                  <label className="student-field">Learner
                    <select value={selectedLearnerId} onChange={(e) => setSelectedLearnerId(e.target.value)} required>
                      <option value="">Choose a learner</option>
                      {learners.map((learner) => <option key={learner.id} value={learner.id}>{learner.displayName}</option>)}
                    </select>
                  </label>
                  <label className="student-field">Course
                    <select value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} required>
                      <option value="">Choose a confirmed available course</option>
                      {bookableCourses.map((course) => <option value={course.slug} key={course.slug}>{course.title}</option>)}
                    </select>
                  </label>
                  <button className="button" type="submit" disabled={busy || !selectedCourse || !selectedLearnerId}>Request enrolment <span aria-hidden="true">↗</span></button>
                </form>
              )}
              <p className="student-fineprint">A request is not a confirmed enrolment, timetable or payment. Heeva will confirm availability and next steps.</p>
            </section>

            <section className="student-panel student-panel-wide">
              <Eyebrow>One free introductory lesson per learner</Eyebrow><h3>Introductory lesson requests</h3>
              {trialLessons.length ? (
                <ul className="student-record-list">
                  {trialLessons.map((trial) => (
                    <li key={trial.learnerId}>
                      <div><strong>{trial.courseTitle}</strong><small>For {trial.learnerName} · Requested {new Date(trial.requestedAt).toLocaleDateString()}</small></div>
                      <span className="student-status">{trial.status}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="student-empty">No introductory lesson requests yet.</p>}
              {learnersWithoutTrial.length > 0 && (
                <form className="student-form student-trial-form" onSubmit={requestTrial}>
                  <label className="student-field">Learner
                    <select value={trialLearnerId} onChange={(e) => setTrialLearnerId(e.target.value)} required>
                      <option value="">Choose a learner</option>
                      {learnersWithoutTrial.map((learner) => <option key={learner.id} value={learner.id}>{learner.displayName}</option>)}
                    </select>
                  </label>
                  <label className="student-field">Course
                    <select value={trialCourse} onChange={(e) => setTrialCourse(e.target.value)} required>
                      <option value="">Choose a confirmed available course</option>
                      {bookableCourses.map((course) => <option value={course.slug} key={course.slug}>{course.title}</option>)}
                    </select>
                  </label>
                  <button className="button" type="submit" disabled={busy || !trialCourse || !trialLearnerId}>Request one free lesson <span aria-hidden="true">↗</span></button>
                </form>
              )}
              <p className="student-fineprint">One introductory lesson is permitted per learner profile. Requests are subject to teacher availability and confirmation by Heeva.</p>
            </section>

            <TeacherMatches enrolments={enrolments} />
          </div>
          <p className="student-fineprint">Staging only. Email verification, password recovery, safeguarding review, confirmed scheduling and payments are not enabled. Use test data only; do not add real children or sensitive personal information.</p>
        </section>
      </>
    );
  }

  const registering = mode === 'register';
  return (
    <>
      <PageIntro eyebrow="Heeva student portal" title={registering ? <>Create your <em>account.</em></> : <>Welcome <em>back.</em></>}>
        <p>{registering ? 'Create a parent/guardian account for your family or an adult learner account.' : 'Sign in to your new Heeva staging account.'}</p>
      </PageIntro>
      <section className="shell student-portal student-auth-layout">
        <aside className="student-auth-aside">
          <Eyebrow>Learning with Heeva</Eyebrow>
          <h2>{registering ? 'A thoughtful start to learning.' : 'Your learning journey continues.'}</h2>
          <p>Parent/guardian accounts can manage separate learner profiles. Adult learners have their own profile. Each learner can have one free introductory lesson request.</p>
          <div className="student-assurance"><span>✳</span><div><strong>One free introductory lesson per learner</strong><small>Subject to teacher availability and confirmation by Heeva.</small></div></div>
        </aside>
        <section className="student-panel student-auth-panel">
          <Eyebrow>{registering ? 'New account' : 'Secure sign in'}</Eyebrow>
          <h2>{registering ? 'Create an account' : 'Sign in to Heeva'}</h2>
          <Notice type="warning">Staging preview only. Use test details, a test email and a unique password. Do not enter real children's personal information or payment details.</Notice>
          <Notice type="error">{error}</Notice>
          {registering ? (
            <form className="student-form" onSubmit={submitAuth}>
              <fieldset className="student-account-type">
                <legend>What type of account do you need?</legend>
                <label><input type="radio" name="accountType" value="parent_guardian" checked={form.accountType === 'parent_guardian'} onChange={(e) => update('accountType', e.target.value)} /> Parent or guardian managing child learner profiles</label>
                <label><input type="radio" name="accountType" value="adult_learner" checked={form.accountType === 'adult_learner'} onChange={(e) => update('accountType', e.target.value)} /> Adult learner managing my own profile</label>
              </fieldset>
              <div className="student-form-row">
                <Field label="Account holder first name" autoComplete="given-name" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} maxLength={80} required />
                <Field label="Account holder last name" autoComplete="family-name" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} maxLength={80} required />
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
