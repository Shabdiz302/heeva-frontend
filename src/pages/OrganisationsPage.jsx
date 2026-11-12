import { businessServices } from '../data/businessServices.js';
import { assetPath } from '../utils/assets.js';
import { ButtonLink, Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';
import '../styles/organisations.css';

const enquiryPath = '/consultation?audience=business';
const academicProfile = 'https://pure.royalholloway.ac.uk/en/persons/maryam-zahmatkesh/';
const engagementFormats = [
  ['Focused workshop', 'Work through a specific challenge with a team and leave with practical steps to apply.'],
  ['Tailored development programme', 'Build skills over several sessions, with exercises and feedback linked to your team’s work.'],
  ['Scoped consultancy project', 'Agree the question, outputs and timetable upfront. Deliverables might include a review, an action plan or a pilot proposal.'],
];

export default function OrganisationsPage() {
  return (
    <div className="org-page">
      <PageIntro eyebrow="Heeva for Business" title={<>Business consultancy and <em>leadership development</em></>}>
        <p>Training and advisory support for employers and healthcare organisations. Develop your managers, improve how teams work and assess where AI can help with everyday tasks.</p>
        <ButtonLink to={enquiryPath}>Discuss your project</ButtonLink>
      </PageIntro>

      <section className="shell org-services section-space" aria-labelledby="business-services">
        <div className="org-section-heading">
          <h2 id="business-services">How Heeva can help</h2>
          <p>Choose the area that fits your brief, or tell us the problem you’re trying to solve.</p>
        </div>
        <div className="org-service-grid">
          {businessServices.map(({ id, title, brief, deliverables }) => (
            <article className="org-service-card" key={id}>
              <h3>{title}</h3>
              <p>{brief}</p>
              <ul>{deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="org-programme-band">
        <div className="shell org-programme-layout">
          <div className="org-programme-heading">
            <h2>Ways to work together</h2>
            <p>We start with a conversation about your objectives and agree the scope, outputs, timing and fee before work begins.</p>
          </div>
          <div className="org-format-list">
            {engagementFormats.map(([title, description], index) => (
              <article key={title}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{description}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell org-profile section-space">
        <div className="org-profile-aside">
          <a className="org-profile-image-link" href={academicProfile} target="_blank" rel="noreferrer" aria-label="Open Dr Maryam Zahmatkesh’s academic profile">
            <img className="org-profile-photo" src={assetPath('/images/brand/maryam-zahmatkesh-approved-final.webp')} alt="Dr Maryam Zahmatkesh" width="212" height="227" loading="lazy" decoding="async" />
          </a>
        </div>
        <div className="org-profile-copy">
          <Eyebrow>Management expertise</Eyebrow>
          <h2>Dr Maryam Zahmatkesh</h2>
          <p>Maryam’s background spans hospital management, human resource management and leadership education. Before moving into academia, she held general management responsibilities in public and private hospitals, covering workforce matters, service access, quality standards and strategic planning.</p>
          <p>She has taught HRM and healthcare leadership in higher education. Her doctoral research examined how middle managers in healthcare organisations make decisions and exercise autonomy.</p>
          <a className="text-link" href={academicProfile} target="_blank" rel="noreferrer">View Dr Maryam’s academic profile <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
          <p className="org-profile-note">Heeva provides these services independently of Royal Holloway and Aston University.</p>
        </div>
      </section>

      <section className="shell org-enquiry section-space">
        <div className="org-enquiry-copy"><h2>Discuss your project</h2><p>Tell us what you want to improve, who is involved and when you’d like to start. We can then discuss a suitable scope and format.</p></div>
        <div className="org-enquiry-card">
          <h3>Business enquiries</h3>
          <p>Use the enquiry preview to see what we ask for, or email Heeva with a short brief.</p>
          <ButtonLink to={enquiryPath} variant="cream">Open business enquiry</ButtonLink>
        </div>
      </section>
    </div>
  );
}
