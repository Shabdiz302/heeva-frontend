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
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const endpoint = import.meta.env.VITE_HEEVA_BUSINESS_ENQUIRY_ENDPOINT?.trim() || '';
  const canSend = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint);
  const isAiEnquiry = service === 'ai-business' || service === 'ai-healthcare';
  const emailUrl = `mailto:${contact.email}?subject=Heeva%20for%20Business%20enquiry`;

  async function submitEnquiry(event) {
    event.preventDefault();
    if (status === 'sending' || status === 'sent') return;
    setError('');
    const fields = new FormData(event.currentTarget);
    if (!canSend) {
      const details = [
        'Heeva for Business enquiry',
        'Name: '+String(fields.get('name')||''),
        'Work email: '+String(fields.get('email')||''),
        'Organisation: '+String(fields.get('organisation')||''),
        'Service: '+String(fields.get('service')||''),
        'Job title: '+String(fields.get('jobTitle')||''),
        'Phone: '+String(fields.get('phone')||''),
        'Team size: '+String(fields.get('teamSize')||''),
        'Desired start: '+String(fields.get('desiredStart')||''),
        '',
        'Project brief:',
        String(fields.get('brief')||''),
        '',
        'AI-related request:',
        String(fields.get('workflow')||'')
      ].join('\n');
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent('Heeva for Business enquiry')}&body=${encodeURIComponent(details)}`;
      setStatus('email-draft');
      return;
    }
    setStatus('sending');
    try {
      const response = await fetch(endpoint,{method:'POST',body:fields,headers:{Accept:'application/json'}});
      const payload = await response.json().catch(()=>({}));
      if (!response.ok || payload.ok !== true) throw new Error('Unconfirmed enquiry delivery');
      setStatus('sent');
    } catch {
      setError('We could not confirm delivery. Please use the email link instead.');
      setStatus('idle');
    }
  }

  return (
    <>
      <PageIntro eyebrow="Heeva for Business" title={<>Discuss your <em>project</em></>}>
        <p>Share the challenge you want to address and the people you want to support.</p>
      </PageIntro>
      <section className="shell consultation-layout page-content">
        <aside className="consultation-aside">
          <h2>Talk to Heeva</h2>
          <p>We welcome enquiries about leadership, professional development, organisational advice and AI.</p>
          <a className="button button-dark" href={emailUrl}>Email Heeva <span aria-hidden="true">↗</span></a>
        </aside>
        <form className="consultation-form" onSubmit={submitEnquiry} aria-labelledby="business-enquiry-heading">
          <div className="form-heading">
            <h2 id="business-enquiry-heading">Business enquiry</h2>
            <p>{canSend ? 'Send your enquiry securely to Heeva.' : 'Complete this form to prepare an email to Heeva. You will need to send the email from your mail app.'}</p>
          </div>
          <label>Your name<input name="name" required maxLength={120} autoComplete="name" /></label>
          <label>Work email<input name="email" required type="email" maxLength={254} autoComplete="email" /></label>
          <label>Organisation<input name="organisation" required maxLength={160} autoComplete="organization" /></label>
          <label>Service of interest
            <select name="service" required value={service} onChange={(event) => setService(event.target.value)}>
              <option value="" disabled>Select a service</option>
              {businessServices.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
              <option value="help-me-choose">Help me choose</option>
            </select>
          </label>
          <p className="form-privacy" id="business-brief-note">Please do not include patient information, passwords, children's personal data or confidential documents.</p>
          <label>Short project brief<textarea name="brief" required maxLength={1500} aria-describedby="business-brief-note" /></label>
          {isAiEnquiry && <label>Which task or workflow would you like to improve? (optional)<textarea name="workflow" maxLength={600} /></label>}
          <div className="form-row">
            <label>Job title (optional)<input name="jobTitle" maxLength={120} autoComplete="organization-title" /></label>
            <label>Phone (optional)<input name="phone" type="tel" maxLength={40} autoComplete="tel" /></label>
            <label>Team size (optional)<input name="teamSize" type="number" min={1} step={1} /></label>
            <label>Desired start date (optional)<input name="desiredStart" type="date" /></label>
          </div>
          <label className="student-check"><input name="consent" type="checkbox" value="yes" required />I have read Heeva’s <a href={policies.privacy} target="_blank" rel="noreferrer">privacy policy</a> and agree to be contacted about this enquiry.</label>
          <button className="button button-dark form-submit" type="submit" disabled={status==='sending'||status==='sent'}>{status==='sending'?'Sending…':canSend?'Send business enquiry':'Open email draft'} <span aria-hidden="true">↗</span></button>
          {status==='sent' && <div className="form-status" role="status"><b>Your enquiry was sent.</b><span>Thank you. Heeva will respond using the details you provided.</span></div>}
          {status==='email-draft' && <div className="form-status" role="status"><b>Email draft prepared.</b><span>Please check your email app and press Send. Heeva has not yet received your enquiry.</span></div>}
          {error && <div className="form-status" role="alert"><b>Delivery not confirmed.</b><span>{error}</span></div>}
        </form>
      </section>
    </>
  );
}
