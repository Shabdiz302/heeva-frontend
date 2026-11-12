import { useState } from 'react';
import { businessServices } from '../data/businessServices.js';
import { courses } from '../data/courses.js';
import { contact, policies } from '../data/site.js';
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
  const [service, setService] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isAiEnquiry = service === 'ai-business' || service === 'ai-healthcare';
  const emailUrl = `mailto:${contact.email}?subject=Heeva%20for%20Business%20enquiry`;

  function previewSubmission(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <PageIntro eyebrow="Heeva for Business" title={<>Discuss your <em>project</em></>}>
        <p>Share the challenge you want to address and the people you want to support.</p>
      </PageIntro>
      <section className="shell consultation-layout page-content">
        <aside className="consultation-aside">
          <h2>Talk to Heeva</h2>
          <p>For a real enquiry, email us with a short project brief.</p>
          <a className="button button-dark" href={emailUrl}>Email Heeva <span aria-hidden="true">↗</span></a>
        </aside>
        <form className="consultation-form" onSubmit={previewSubmission} aria-labelledby="business-enquiry-heading">
          <div className="form-heading">
            <h2 id="business-enquiry-heading">Business enquiry demo</h2>
            <p>Use sample details. This form does not send or save your information.</p>
          </div>
          <label>Your name<input required maxLength={120} autoComplete="off" /></label>
          <label>Work email<input required type="email" maxLength={254} autoComplete="off" /></label>
          <label>Organisation<input required maxLength={160} autoComplete="off" /></label>
          <label>Service of interest
            <select required value={service} onChange={(event) => setService(event.target.value)}>
              <option value="" disabled>Select a service</option>
              {businessServices.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
              <option value="help-me-choose">Help me choose</option>
            </select>
          </label>
          <p className="form-privacy" id="business-brief-note">Leave out patient information and confidential documents.</p>
          <label>Short project brief<textarea required maxLength={1500} aria-describedby="business-brief-note" /></label>
          {isAiEnquiry && <label>Which task or workflow would you like to improve? (optional)<textarea maxLength={600} /></label>}
          <div className="form-row">
            <label>Job title (optional)<input maxLength={120} autoComplete="off" /></label>
            <label>Phone (optional)<input type="tel" maxLength={40} autoComplete="off" /></label>
            <label>Team size (optional)<input type="number" min={1} step={1} /></label>
            <label>Desired start date (optional)<input type="date" /></label>
          </div>
          <p className="form-privacy"><a href={policies.privacy}>Heeva privacy policy</a></p>
          <button className="button button-dark form-submit" type="submit">Try demo submission <span aria-hidden="true">↗</span></button>
          {submitted && <div className="form-status" role="status"><b>Demo complete.</b><span>Your details were not sent or saved.</span></div>}
        </form>
      </section>
    </>
  );
}
