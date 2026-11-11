import { contact } from '../data/site.js';
import { ButtonLink, Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';

export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow="Contact Heeva" title={<>We’re here for your <em>questions.</em></>}>
        <p>Use the published contact details below to speak with Heeva about courses, fees, safeguarding information or a consultation.</p>
      </PageIntro>
      <section className="shell contact-layout page-content">
        <div className="contact-main-card">
          <Eyebrow>Heeva Courses Ltd.</Eyebrow>
          <h2>Say hello.</h2>
          <div className="contact-detail"><span>Email</span><a href={`mailto:${contact.email}`}>{contact.email} <span aria-hidden="true">↗</span></a></div>
          {contact.regionalPhones.map(({ location, number, link }) => (
            <div className="contact-detail" key={location}><span>{location} phone</span><a href={`tel:${link}`}>{number} <span aria-hidden="true">↗</span></a></div>
          ))}
          <div className="contact-detail"><span>WhatsApp</span><a href={`https://wa.me/${contact.whatsappLink}`} target="_blank" rel="noreferrer">{contact.whatsapp} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></div>
          <div className="contact-detail"><span>Head office</span><p>{contact.address}</p></div>
          <ButtonLink to="/consultation">Book a free consultation</ButtonLink>
        </div>
        <aside className="contact-hours-card">
          <div className="hours-mark" aria-hidden="true">◷</div>
          <Eyebrow>Published opening hours</Eyebrow>
          <h2>When to reach us.</h2>
          <dl>{contact.hours.map(([day, hours]) => <div key={day}><dt>{day}</dt><dd>{hours}</dd></div>)}</dl>
          <p className="small-note">Contact details and hours are reproduced from Heeva’s published contact page. Please confirm if you need current availability.</p>
        </aside>
      </section>
    </>
  );
}
