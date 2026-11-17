import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from '../router.jsx';
import { PageIntro, Eyebrow } from '../components/ContentBlocks.jsx';
import './staff-workspace.css';

async function staffApi(path, options = {}) {
  const response = await fetch('/student-preview-api' + path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof File) ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The request could not be completed.');
  return payload;
}

function StaffNotice({ type = 'info', children }) {
  return children ? <div className={'staff-notice staff-notice-' + type} role="status">{children}</div> : null;
}

function StaffField({ label, ...props }) {
  return <label className="staff-field">{label}<input {...props} /></label>;
}

function dateTimeLocal(date) {
  const d = new Date(date);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function StaffWorkspacePage() {
  const { pathname, navigate } = useRouter();
  const isLogin = pathname.replace(/\/+$/, '') !== '/staff/dashboard';
  const [staff, setStaff] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [counts, setCounts] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [enrolments, setEnrolments] = useState([]);
  const [packageDrafts, setPackageDrafts] = useState({});
  const [lessonDrafts, setLessonDrafts] = useState({});
  const [lessonsByEnrolment, setLessonsByEnrolment] = useState({});
  const [expanded, setExpanded] = useState({});
  const [uploadDrafts, setUploadDrafts] = useState({});

  const loadWorkspace = useCallback(async () => {
    const [dashboard, teacherResult, enrolmentResult, requestResult] = await Promise.all([
      staffApi('/api/staff/dashboard'),
      staffApi('/api/staff/teachers'),
      staffApi('/api/staff/course-enrolments'),
      staff?.role === 'admin' ? staffApi('/api/staff/enrolment-requests') : Promise.resolve({ requests: [] }),
    ]);
    setCounts(dashboard.counts || {});
    setTeachers(teacherResult.teachers || []);
    setEnrolments(enrolmentResult.enrolments || []);
    setRequests(requestResult.requests || []);
  }, [staff?.role]);

  useEffect(() => {
    if (isLogin) return undefined;
    let active = true;
    staffApi('/api/staff/auth/me')
      .then((result) => {
        if (!active) return;
        setStaff(result.staff);
      })
      .catch(() => {
        if (active) navigate('/staff/login');
      });
    return () => { active = false; };
  }, [isLogin, navigate]);

  useEffect(() => {
    if (isLogin || !staff) return undefined;
    let active = true;
    Promise.all([
      staffApi('/api/staff/dashboard'),
      staffApi('/api/staff/teachers'),
      staffApi('/api/staff/course-enrolments'),
      staff.role === 'admin' ? staffApi('/api/staff/enrolment-requests') : Promise.resolve({ requests: [] }),
    ]).then(([dashboard, teacherResult, enrolmentResult, requestResult]) => {
      if (!active) return;
      setCounts(dashboard.counts || {});
      setTeachers(teacherResult.teachers || []);
      setEnrolments(enrolmentResult.enrolments || []);
      setRequests(requestResult.requests || []);
    }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [isLogin, staff]);

  async function submitLogin(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await staffApi('/api/staff/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });
      setStaff(result.staff);
      navigate('/staff/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try { await staffApi('/api/staff/auth/logout', { method: 'POST', body: '{}' }); }
    catch { /* The session may already have expired. */ }
    setStaff(null);
    setBusy(false);
    navigate('/staff/login');
  }

  async function activateRequest(request) {
    const draft = packageDrafts[request.id] || {};
    const totalLessons = Number(draft.totalLessons);
    if (!Number.isInteger(totalLessons) || totalLessons < 1) {
      setError('Enter the actual number of lessons agreed with the customer.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await staffApi('/api/staff/enrolment-requests/' + request.id + '/activate', {
        method: 'POST',
        body: JSON.stringify({ totalLessons, teacherSlug: draft.teacherSlug || null }),
      });
      setNotice('The course enrolment has been activated with the lesson package you entered.');
      await loadWorkspace();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleLessons(enrolmentId) {
    const next = !expanded[enrolmentId];
    setExpanded((old) => ({ ...old, [enrolmentId]: next }));
    if (next && !lessonsByEnrolment[enrolmentId]) {
      try {
        const result = await staffApi('/api/staff/course-enrolments/' + enrolmentId + '/lessons');
        setLessonsByEnrolment((old) => ({ ...old, [enrolmentId]: result.lessons || [] }));
      } catch (err) { setError(err.message); }
    }
  }

  async function addLesson(event, enrolment) {
    event.preventDefault();
    const draft = lessonDrafts[enrolment.id] || {};
    if (!draft.title?.trim()) {
      setError('Enter a title for this lesson.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await staffApi('/api/staff/course-enrolments/' + enrolment.id + '/lessons', {
        method: 'POST',
        body: JSON.stringify({
          title: draft.title,
          lessonNumber: Number(draft.lessonNumber),
          scheduledAt: draft.scheduledAt ? new Date(draft.scheduledAt).toISOString() : null,
        }),
      });
      setLessonDrafts((old) => ({ ...old, [enrolment.id]: { ...old[enrolment.id], title: '', scheduledAt: '' } }));
      const result = await staffApi('/api/staff/course-enrolments/' + enrolment.id + '/lessons');
      setLessonsByEnrolment((old) => ({ ...old, [enrolment.id]: result.lessons || [] }));
      setNotice('Lesson added to the course timetable.');
      await loadWorkspace();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function updateLesson(lesson, enrolmentId, status) {
    setBusy(true);
    setError('');
    try {
      await staffApi('/api/staff/lessons/' + lesson.id, {
        method: 'PUT',
        body: JSON.stringify({ status, tutorNote: lesson.tutor_note || '' }),
      });
      const result = await staffApi('/api/staff/course-enrolments/' + enrolmentId + '/lessons');
      setLessonsByEnrolment((old) => ({ ...old, [enrolmentId]: result.lessons || [] }));
      setNotice('Lesson status updated.');
      await loadWorkspace();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function uploadResource(event, enrolment) {
    event.preventDefault();
    const draft = uploadDrafts[enrolment.id] || {};
    const file = draft.file;
    if (!file) { setError('Choose a lesson document first.'); return; }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const headers = {
        'Content-Type': file.type,
        'X-File-Name': encodeURIComponent(file.name),
        'X-Resource-Title': encodeURIComponent(draft.title || file.name),
        'X-Resource-Description': encodeURIComponent(draft.description || ''),
      };
      if (draft.lessonId) headers['X-Lesson-Id'] = draft.lessonId;
      await staffApi('/api/staff/course-enrolments/' + enrolment.id + '/resources', {
        method: 'POST',
        body: file,
        headers,
      });
      setUploadDrafts((old) => ({ ...old, [enrolment.id]: { title: '', description: '', file: null, lessonId: '' } }));
      setNotice('The lesson document has been published to this course.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const requestCount = useMemo(() => requests.length, [requests]);

  if (isLogin) {
    return (
      <>
        <PageIntro eyebrow="Heeva staff workspace" title={<>Staff <em>sign in.</em></>}>
          <p>Authorised administrators and teachers only.</p>
        </PageIntro>
        <section className="shell staff-shell staff-login-layout">
          <div className="staff-login-aside">
            <Eyebrow>Heeva operations</Eyebrow>
            <h2>Manage learning with care.</h2>
            <p>Review enrolment requests, confirm lesson packages, manage schedules and publish learning documents.</p>
          </div>
          <div className="staff-card staff-login-card">
            <Eyebrow>Restricted access</Eyebrow><h3>Staff sign in</h3>
            <StaffNotice type="warning">Private staging workspace. Staff credentials are provisioned by a server administrator. Customer accounts cannot sign in here.</StaffNotice>
            <StaffNotice type="error">{error}</StaffNotice>
            <form className="staff-form" onSubmit={submitLogin}>
              <StaffField label="Staff email" type="email" autoComplete="username" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
              <StaffField label="Password" type="password" autoComplete="current-password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
              <button className="button staff-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to staff workspace'} <span aria-hidden="true">↗</span></button>
            </form>
          </div>
        </section>
      </>
    );
  }

  if (!staff) {
    return <section className="shell staff-shell"><StaffNotice type="info">Checking staff session…</StaffNotice></section>;
  }

  return (
    <>
      <PageIntro eyebrow="Heeva operations" title={<>Staff <em>workspace.</em></>}>
        <p>Manage enrolments, lesson schedules and private course materials.</p>
      </PageIntro>
      <section className="shell staff-shell">
        <div className="staff-topbar">
          <div><Eyebrow>{staff.role === 'admin' ? 'Administrator' : 'Teacher workspace'}</Eyebrow><h2>Welcome, {staff.displayName}.</h2><p>{staff.email}</p></div>
          <button className="button button-outline" type="button" onClick={logout} disabled={busy}>Sign out</button>
        </div>
        <StaffNotice type="error">{error}</StaffNotice>
        <StaffNotice type="success">{notice}</StaffNotice>
        <div className="staff-stats">
          <article><strong>{counts.pendingRequests ?? '—'}</strong><small>{staff.role === 'admin' ? 'Pending requests' : 'My active courses'}</small></article>
          <article><strong>{counts.activeEnrolments ?? '—'}</strong><small>Active enrolments</small></article>
          <article><strong>{counts.upcomingLessons ?? '—'}</strong><small>Upcoming lessons</small></article>
          <article><strong>{counts.publishedResources ?? '—'}</strong><small>Published resources</small></article>
        </div>

        {staff.role === 'admin' && (
          <section className="staff-card">
            <div className="staff-section-head"><div><Eyebrow>New customer activity</Eyebrow><h3>Enrolment requests</h3></div><span className="staff-count">{requestCount} awaiting action</span></div>
            {requests.length ? requests.map((request) => {
              const draft = packageDrafts[request.id] || {};
              const matchingTeachers = teachers.filter((teacher) => teacher.courseSlugs.includes(request.course_slug));
              return (
                <article className="staff-request" key={request.id}>
                  <div className="staff-record-heading"><div><strong>{request.course_title}</strong><small>{request.learner_name} · {request.account_first_name} {request.account_last_name} · {request.email}</small></div><span className="staff-state">{request.status.replaceAll('_',' ')}</span></div>
                  <div className="staff-inline-form">
                    <StaffField label="Agreed lesson package (number of lessons)" type="number" min="1" max="500" value={draft.totalLessons || ''} onChange={(e) => setPackageDrafts((old) => ({ ...old, [request.id]: { ...old[request.id], totalLessons: e.target.value } }))} placeholder="Enter agreed total" />
                    <label className="staff-field">Assign teacher<select value={draft.teacherSlug || ''} onChange={(e) => setPackageDrafts((old) => ({ ...old, [request.id]: { ...old[request.id], teacherSlug: e.target.value } }))}><option value="">Assign later</option>{matchingTeachers.map((teacher) => <option key={teacher.slug} value={teacher.slug}>{teacher.name}</option>)}</select></label>
                    <button className="button" type="button" disabled={busy || !draft.totalLessons} onClick={() => activateRequest(request)}>Confirm enrolment</button>
                  </div>
                </article>
              );
            }) : <p className="staff-empty">There are no course requests awaiting approval.</p>}
            <p className="staff-small-note">Activating a request records the lesson package you enter. Confirm the package and any payment arrangements with the customer before activation.</p>
          </section>
        )}

        <section className="staff-card">
          <div className="staff-section-head"><div><Eyebrow>Teaching operations</Eyebrow><h3>{staff.role === 'admin' ? 'Active course enrolments' : 'My assigned courses'}</h3></div><span className="staff-count">{enrolments.length} courses</span></div>
          {enrolments.length ? enrolments.map((enrolment) => {
            const lessons = lessonsByEnrolment[enrolment.id] || [];
            const draft = lessonDrafts[enrolment.id] || { lessonNumber: String(Math.min(enrolment.completed_lessons + lessons.length + 1, enrolment.total_lessons)), title: '', scheduledAt: '' };
            const upload = uploadDrafts[enrolment.id] || {};
            const assignedTeacher = teachers.find((teacher) => teacher.slug === enrolment.teacher_slug);
            return (
              <article className="staff-course" key={enrolment.id}>
                <div className="staff-record-heading"><div><strong>{enrolment.course_title}</strong><small>{enrolment.learner_name} · {enrolment.email} · {enrolment.completed_lessons}/{enrolment.total_lessons} lessons completed · {enrolment.total_lessons-enrolment.completed_lessons} remaining</small></div><span className="staff-state">{assignedTeacher?.name || 'Teacher unassigned'}</span></div>
                <div className="staff-course-actions"><button className="staff-text-button" type="button" onClick={() => toggleLessons(enrolment.id)}>{expanded[enrolment.id] ? 'Hide lessons' : 'Manage lessons'} <span aria-hidden="true">⌄</span></button></div>
                {expanded[enrolment.id] && (
                  <div className="staff-course-detail">
                    {lessons.length ? <div className="staff-lesson-list">{lessons.map((lesson) => (
                      <div className="staff-lesson-row" key={lesson.id}>
                        <div><strong>Lesson {lesson.lesson_number}: {lesson.title}</strong><small>{lesson.scheduled_at ? new Date(lesson.scheduled_at).toLocaleString() : 'Not scheduled'} · {lesson.status}</small></div>
                        <select aria-label={'Update lesson ' + lesson.lesson_number + ' status'} value={lesson.status} disabled={busy} onChange={(e) => updateLesson(lesson,enrolment.id,e.target.value)}>
                          <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="missed">Missed</option><option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    ))}</div> : <p className="staff-empty">No lessons have been added to this course yet.</p>}
                    <form className="staff-inline-form staff-add-lesson" onSubmit={(e) => addLesson(e,enrolment)}>
                      <StaffField label="Lesson number" type="number" min="1" max={enrolment.total_lessons} value={draft.lessonNumber} onChange={(e) => setLessonDrafts((old) => ({ ...old, [enrolment.id]: { ...draft, lessonNumber: e.target.value } }))} required />
                      <StaffField label="Lesson title" value={draft.title} onChange={(e) => setLessonDrafts((old) => ({ ...old, [enrolment.id]: { ...draft, title: e.target.value } }))} placeholder="e.g. Piano fundamentals" required />
                      <StaffField label="Date and time" type="datetime-local" value={draft.scheduledAt} onChange={(e) => setLessonDrafts((old) => ({ ...old, [enrolment.id]: { ...draft, scheduledAt: e.target.value } }))} />
                      <button className="button" type="submit" disabled={busy}>Add lesson</button>
                    </form>
                    <form className="staff-upload-form" onSubmit={(e) => uploadResource(e,enrolment)}>
                      <div><Eyebrow>Offline learning</Eyebrow><h4>Publish lesson document</h4><p>Files are stored privately and can be downloaded only by this course's student or parent account.</p></div>
                      <StaffField label="Document title" value={upload.title || ''} onChange={(e) => setUploadDrafts((old) => ({ ...old, [enrolment.id]: { ...upload, title: e.target.value } }))} placeholder="e.g. Lesson 1 practice sheet" />
                      <StaffField label="Description (optional)" value={upload.description || ''} onChange={(e) => setUploadDrafts((old) => ({ ...old, [enrolment.id]: { ...upload, description: e.target.value } }))} />
                      <label className="staff-field">Attach to lesson (optional)<select value={upload.lessonId || ''} onChange={(e) => setUploadDrafts((old) => ({ ...old, [enrolment.id]: { ...upload, lessonId: e.target.value } }))}><option value="">Course material</option>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>Lesson {lesson.lesson_number}: {lesson.title}</option>)}</select></label>
                      <label className="staff-field">Select file<input type="file" accept=".pdf,.docx,.pptx,.xlsx,.txt" onChange={(e) => setUploadDrafts((old) => ({ ...old, [enrolment.id]: { ...upload, file: e.target.files?.[0] || null } }))} /></label>
                      <p className="staff-small-note">Accepted: PDF, DOCX, PPTX, XLSX and TXT. Maximum file size: 20 MB.</p>
                      <button className="button" type="submit" disabled={busy || !upload.file}>Upload and publish document</button>
                    </form>
                  </div>
                )}
              </article>
            );
          }) : <p className="staff-empty">No active course enrolments are assigned yet.</p>}
        </section>
        <p className="staff-small-note">Every staff action is restricted by role and recorded in the staff audit log. Staging only; do not use real customer or child data until the required safeguarding and privacy reviews are complete.</p>
      </section>
    </>
  );
}
