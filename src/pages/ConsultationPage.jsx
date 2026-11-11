import { useState } from 'react';
import { courses } from '../data/courses.js';
import { contact } from '../data/site.js';
import { Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';

function courseFromQuery() {
  const slug = new URLSearchParams(window.location.search).get('interest');
  return courses.find((course) => course.slug === slug)?.title ?? '';
}

export default function ConsultationPage() {
  const [form, setForm] = useState({ interest: courseFromQuery(), question: '' });
  const [submitted, setSubmitted] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <PageIntro eyebrow="Your first step is a conversation" title={<>Let’s find the right <em>starting point.</em></>}>
        <p>Try this non-personal consultation preview. It is not connected to Heeva’s existing booking system and sends no enquiry.</p>
      </PageIntro>
      <section className="shell consultation-layout page-content">
        <aside className="consultation-aside">
          <div className="consultation-aside-art" aria-hidden="true"><span>✳</span><i /><b>Talk<br />it through</b></div>
          <Eyebrow>A friendly conversation</Eyebrow>
          <h2>Bring your questions. We’ll make space for them.</h2>
          <p>Use the consultation to discuss interests, course suitability, current fees and next steps.</p>
          <div className="preview-notice"><span aria-hidden="true">ⓘ</span><p><b>Preview only.</b> No personal information is requested, transmitted, or saved. The optional course and topic selections exist only in page memory and clear when you leave or reload.</p></div>
          <div className="consultation-contact"><span>Prefer to contact Heeva directly?</span><a href={`mailto:${contact.email}`}>{contact.email} <span aria-hidden="true">↗</span></a></div>
        </aside>
        <form className="consultation-form" onSubmit={submit}>
          <div className="form-heading"><span>PREVIEW</span><h2>What would you like to discuss?</h2><p>This form is for previewing the interaction only.</p></div>
          <label htmlFor="course-interest">Course or subject (optional)<select id="course-interest" name="interest" value={form.interest} onChange={update}><option value="">Choose a subject</option>{courses.map((course) => <option value={course.title} key={course.slug}>{course.title}</option>)}<option>Not sure yet</option></select></label>
          <label htmlFor="consult-question">Question topic (optional)<select id="consult-question" name="question" value={form.question} onChange={update}><option value="">Choose a topic</option><option>Course suitability</option><option>Current fees</option><option>Trial terms</option><option>Booking steps</option><option>Other</option></select></label>
          <p className="form-privacy">Preview only. The choices above are not transmitted or saved, and this form does not ask for names, contact details, ages, or free-text personal information.</p>
          <button className="button button-dark form-submit" type="submit">Preview this selection <span aria-hidden="true">↗</span></button>
          {submitted && <div className="form-status" role="status" aria-live="polite"><b>Preview complete.</b><span>Nothing was sent or saved. Contact Heeva directly to make a real enquiry.</span></div>}
        </form>
      </section>
    </>
  );
}
