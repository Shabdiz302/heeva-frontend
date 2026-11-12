import { useState } from 'react';
import { courses } from '../data/courses.js';
import { contact } from '../data/site.js';
import CourseEnquiryForm from '../components/CourseEnquiryForm.jsx';
import { Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';

export default function ConsultationPage() {
  const query = new URLSearchParams(window.location.search);
  if (query.get('audience') === 'business') return <BusinessEnquiryPreview />;

  const course = courses.find(({ slug }) => slug === query.get('interest'));
  const isComingSoon = course?.status === 'coming-soon';
  const request = isComingSoon
    ? `I'm interested in ${course.title}. Could you let me know when it will be available?`
    : course
      ? `I'm interested in ${course.title} and would like to request a free consultation.`
      : 'I would like to request a free consultation about your online courses.';
  const message = encodeURIComponent(`Hi Heeva, ${request}`);
  const whatsappUrl = `https://wa.me/${contact.whatsappLink}?text=${message}`;

  return (
    <>
      <PageIntro eyebrow="Heeva Courses" title={isComingSoon ? <>Ask about <em>{course.title}.</em></> : <>Request a <em>free consultation.</em></>}>
        <p>{isComingSoon ? 'Ask Heeva about availability for this upcoming course.' : 'Talk with Heeva about course options, current fees and how to arrange one free trial lesson.'}</p>
      </PageIntro>
      <section className="shell consultation-layout page-content">
        <aside className="consultation-aside">
          <div className="consultation-aside-art" aria-hidden="true"><span>✳</span><i /><b>Talk<br />it through</b></div>
          <Eyebrow>A friendly conversation</Eyebrow>
          <h2>Bring your questions. We’ll make space for them.</h2>
          <p>Heeva can help you choose a course that suits your learner.</p>
        </aside>
        <section className="consultation-form" aria-labelledby="enquiry-heading">
          <div className="form-heading">
            <h2 id="enquiry-heading">Course enquiry</h2>
          </div>
          <CourseEnquiryForm key={course?.slug ?? ''} course={course} />
          <p className="form-privacy">For a real enquiry, contact the Heeva support team directly.</p>
          <a className="button button-outline form-submit" href={whatsappUrl} target="_blank" rel="noreferrer">Chat with Heeva on WhatsApp <span aria-hidden="true">↗</span></a>
        </section>
      </section>
    </>
  );
}

function BusinessEnquiryPreview() {
  const [form, setForm] = useState({ question: '' });
  const [submitted, setSubmitted] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <PageIntro eyebrow="Heeva for Business" title={<>Preview a <em>business enquiry.</em></>}>
        <p>Choose a topic to try the enquiry form. Your selections stay on this page.</p>
      </PageIntro>
      <section className="shell consultation-layout page-content">
        <aside className="consultation-aside">
          <div className="consultation-aside-art" aria-hidden="true"><span>✳</span><i /><b>Talk<br />it through</b></div>
          <Eyebrow>A friendly conversation</Eyebrow>
          <h2>What would you like your team to develop?</h2>
          <p>Choose a training or advisory topic for your organisation.</p>
          <div className="preview-notice"><span aria-hidden="true">ⓘ</span><p><b>Preview only.</b> No personal information is requested, transmitted, or saved. The optional topic selection exists only in page memory and clear when you leave or reload.</p></div>
        </aside>
        <form className="consultation-form" onSubmit={submit}>
          <div className="form-heading"><span>PREVIEW</span><h2>What would you like to discuss?</h2><p>This form is for previewing the interaction only.</p></div>
          <label htmlFor="consult-question">Question topic (optional)<select id="consult-question" name="question" value={form.question} onChange={update}><option value="">Choose a topic</option>{['Leadership development', 'Healthcare management', 'Human resource management', 'Organisational advisory'].map((topic) => <option key={topic}>{topic}</option>)}<option>Other</option></select></label>
          <p className="form-privacy">Preview only. The choices above are not transmitted or saved, and this form does not ask for names, contact details, ages, or free-text personal information.</p>
          <button className="button button-dark form-submit" type="submit">Preview this selection <span aria-hidden="true">↗</span></button>
          {submitted && <div className="form-status" role="status" aria-live="polite"><b>Preview complete.</b><span>Your selections stayed on this page.</span></div>}
        </form>
      </section>
    </>
  );
}
