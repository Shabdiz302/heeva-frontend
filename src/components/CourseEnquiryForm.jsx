import { useRef, useState } from 'react';
import { courses } from '../data/courses.js';
import { policies } from '../data/site.js';

const endpoint = import.meta.env.VITE_HEEVA_ENQUIRY_ENDPOINT?.trim();
const courseEnquiryEnabled = /^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint ?? '');

export default function CourseEnquiryForm({ course }) {
  const [status, setStatus] = useState('idle');
  const submitting = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || status === 'sent') return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const name = fields.get('name').trim();

    if (!name) {
      form.elements.namedItem('name').focus();
      setStatus('name-required');
      return;
    }

    if (!courseEnquiryEnabled) {
      setStatus('sent');
      return;
    }

    submitting.current = true;
    setStatus('sending');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: fields,
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Enquiry rejected');
      const result = await response.json();
      if (result.ok !== true) throw new Error('Enquiry acceptance unconfirmed');
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      submitting.current = false;
    }
  }

  if (status === 'sent') {
    return <div className="form-status" role="status"><b>{courseEnquiryEnabled ? 'Thank you. Your enquiry was submitted.' : 'Demo complete.'}</b><span>{courseEnquiryEnabled ? 'Heeva will reply using the contact details you provided.' : 'Your details were not sent or saved.'}</span></div>;
  }

  return (
    <form aria-labelledby="enquiry-heading" onSubmit={submit} action={courseEnquiryEnabled ? endpoint : undefined} method="post" aria-busy={status === 'sending'}>
      {!courseEnquiryEnabled && <p className="form-privacy"><strong>Demo only.</strong> Use sample details. This form does not send or save them.</p>}
      <label htmlFor="enquiry-name">Your name
        <input id="enquiry-name" name="name" autoComplete="name" required maxLength={120} />
      </label>
      <label htmlFor="enquiry-email">Email address
        <input id="enquiry-email" type="email" name="email" autoComplete="email" required maxLength={254} />
      </label>
      <label htmlFor="enquiry-phone">Phone number (optional)
        <input id="enquiry-phone" type="tel" name="phone" autoComplete="tel" maxLength={40} />
      </label>
      <label htmlFor="enquiry-course">Course of interest
        <select id="enquiry-course" name="course" defaultValue={course?.title ?? ''} required>
          <option value="" disabled>Choose a course</option>
          <option>I’m not sure yet</option>
          {courses.map(({ slug, title }) => <option key={slug}>{title}</option>)}
        </select>
      </label>
      <input type="text" name="_gotcha" hidden tabIndex={-1} autoComplete="off" />
      {courseEnquiryEnabled && <p className="form-privacy">Heeva uses these details to respond to your enquiry. The form is processed by Formspree. Read <a href={policies.privacy}>Heeva’s privacy policy</a>.</p>}
      <button className="button button-dark form-submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : courseEnquiryEnabled ? 'Send course enquiry' : 'Try demo submission'} <span aria-hidden="true">↗</span>
      </button>
      {status === 'name-required' && <p className="form-status" role="alert">Enter your name before sending.</p>}
      {status === 'error' && <p className="form-status" role="alert">We couldn’t confirm your submission. Please try again or contact Heeva on WhatsApp.</p>}
    </form>
  );
}
