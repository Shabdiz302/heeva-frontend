import { useState } from 'react';
import { courses } from '../data/courses.js';
import { Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';

function courseFromQuery() {
  const slug = new URLSearchParams(window.location.search).get('interest');
  return courses.find((course) => course.slug === slug)?.title ?? '';
}

export default function ConsultationPage() {
  const isBusiness = new URLSearchParams(window.location.search).get('audience') === 'business';
  const [form, setForm] = useState({ interest: courseFromQuery(), question: '' });
  const [submitted, setSubmitted] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <PageIntro eyebrow={isBusiness ? "Heeva for Business" : "Heeva Courses"} title={isBusiness ? <>Preview a <em>business enquiry.</em></> : <>Let’s find the right <em>starting point.</em></>}>
        <p>Choose a topic to try the enquiry form. Your selections stay on this page.</p>
      </PageIntro>
      <section className="shell consultation-layout page-content">
        <aside className="consultation-aside">
          <div className="consultation-aside-art" aria-hidden="true"><span>✳</span><i /><b>Talk<br />it through</b></div>
          <Eyebrow>A friendly conversation</Eyebrow>
          <h2>{isBusiness ? 'What would you like your team to develop?' : 'Bring your questions. We’ll make space for them.'}</h2>
          <p>{isBusiness ? 'Choose a training or advisory topic for your organisation.' : 'Choose a course and a topic to discuss.'}</p>
          <div className="preview-notice"><span aria-hidden="true">ⓘ</span><p><b>Preview only.</b> No personal information is requested, transmitted, or saved. The optional course and topic selections exist only in page memory and clear when you leave or reload.</p></div>
        </aside>
        <form className="consultation-form" onSubmit={submit}>
          <div className="form-heading"><span>PREVIEW</span><h2>What would you like to discuss?</h2><p>This form is for previewing the interaction only.</p></div>
          {!isBusiness && <label htmlFor="course-interest">Course or subject (optional)<select id="course-interest" name="interest" value={form.interest} onChange={update}><option value="">Choose a subject</option>{courses.map((course) => <option value={course.title} key={course.slug}>{course.title}</option>)}<option>Not sure yet</option></select></label>}
          <label htmlFor="consult-question">Question topic (optional)<select id="consult-question" name="question" value={form.question} onChange={update}><option value="">Choose a topic</option>{(isBusiness ? ['Leadership development', 'Healthcare management', 'Human resource management', 'Organisational advisory'] : ['Course suitability', 'Current fees', 'Trial terms', 'Booking steps']).map((topic) => <option key={topic}>{topic}</option>)}<option>Other</option></select></label>
          <p className="form-privacy">Preview only. The choices above are not transmitted or saved, and this form does not ask for names, contact details, ages, or free-text personal information.</p>
          <button className="button button-dark form-submit" type="submit">Preview this selection <span aria-hidden="true">↗</span></button>
          {submitted && <div className="form-status" role="status" aria-live="polite"><b>Preview complete.</b><span>Your selections stayed on this page.</span></div>}
        </form>
      </section>
    </>
  );
}
