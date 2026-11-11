import { useState } from 'react';
import { courses } from '../data/courses.js';
import { contact } from '../data/site.js';
import { Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';

const ageRanges = ['Under 5', '5–8', '9–12', '13–17', '18 or over', 'Prefer to discuss'];
const contactMethods = ['Email', 'Phone', 'WhatsApp'];

function courseFromQuery() {
  const slug = new URLSearchParams(window.location.search).get('interest');
  return courses.find((course) => course.slug === slug)?.title ?? '';
}

export default function ConsultationPage() {
  const [form, setForm] = useState({ parent: '', email: '', childAge: '', interest: courseFromQuery(), contactMethod: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <PageIntro eyebrow="Your first step is a conversation" title={<>Let’s find the right <em>starting point.</em></>}>
        <p>Share a few details for the consultation preview. This form is not connected to Heeva’s PHP system and will not send or save your information.</p>
      </PageIntro>
      <section className="shell consultation-layout page-content">
        <aside className="consultation-aside">
          <div className="consultation-aside-art" aria-hidden="true"><span>✳</span><i /><b>Talk<br />it through</b></div>
          <Eyebrow>A friendly conversation</Eyebrow>
          <h2>Bring your questions. We’ll make space for them.</h2>
          <p>Use the consultation to discuss interests, course suitability, current fees and next steps.</p>
          <div className="preview-notice"><span aria-hidden="true">ⓘ</span><p><b>Preview only.</b> Nothing is transmitted or stored. Details remain in this browser tab until you leave.</p></div>
          <div className="consultation-contact"><span>Prefer to contact Heeva directly?</span><a href={`mailto:${contact.email}`}>{contact.email} <span aria-hidden="true">↗</span></a></div>
        </aside>
        <form className="consultation-form" onSubmit={submit}>
          <div className="form-heading"><span>01 <i /> 03</span><h2>Tell us a little about your family.</h2><p>All fields marked with an asterisk are required.</p></div>
          <label htmlFor="parent-name">Parent or guardian name <span aria-hidden="true">*</span><input id="parent-name" name="parent" value={form.parent} onChange={update} autoComplete="name" required /></label>
          <label htmlFor="parent-email">Email address <span aria-hidden="true">*</span><input id="parent-email" type="email" name="email" value={form.email} onChange={update} autoComplete="email" required /></label>
          <div className="form-row">
            <label htmlFor="child-age">Child’s age range <span aria-hidden="true">*</span><select id="child-age" name="childAge" value={form.childAge} onChange={update} required><option value="">Choose a range</option>{ageRanges.map((range) => <option key={range}>{range}</option>)}</select><small>This is for the conversation, not a course eligibility promise.</small></label>
            <label htmlFor="course-interest">Course interest <span aria-hidden="true">*</span><select id="course-interest" name="interest" value={form.interest} onChange={update} required><option value="">Choose a subject</option>{courses.map((course) => <option value={course.title} key={course.slug}>{course.title}</option>)}<option>Not sure yet</option></select></label>
          </div>
          <label htmlFor="contact-method">Preferred contact method <span aria-hidden="true">*</span><select id="contact-method" name="contactMethod" value={form.contactMethod} onChange={update} required><option value="">Choose a method</option>{contactMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
          <label htmlFor="consult-message">Anything you’d like us to know? <span className="optional-label">Optional</span><textarea id="consult-message" name="message" value={form.message} onChange={update} rows="4" /></label>
          <button className="button button-dark form-submit" type="submit">Review consultation request <span aria-hidden="true">↗</span></button>
          <p className="form-privacy">This preview keeps the details in your browser memory only. Do not include sensitive information.</p>
          {submitted && <div className="form-status" role="status" aria-live="polite"><b>Preview complete.</b><span>Your details were not sent or saved. They remain visible above so you can review them.</span></div>}
        </form>
      </section>
    </>
  );
}
