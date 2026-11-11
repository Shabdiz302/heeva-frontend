import { contact } from '../data/site.js';
import { Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';
import '../styles/organisations.css';

const services = [
  {
    number: '01',
    icon: '↗',
    title: 'Leadership & management development',
    intro: 'Practical development for senior leaders, team managers and the people moving into management roles.',
    topics: ['Leading teams and managing performance', 'Decision-making, delegation and accountability', 'Developing confident middle managers'],
  },
  {
    number: '02',
    icon: '⌂',
    title: 'Healthcare management & leadership',
    intro: 'Management education shaped around the realities of healthcare organisations and service delivery.',
    topics: ['Healthcare leadership and operational management', 'Service access, targets and quality standards', 'Working effectively with managers and clinicians'],
  },
  {
    number: '03',
    icon: '◎',
    title: 'Human resource management',
    intro: 'Learning for organisations that want to strengthen how they lead, support and develop their people.',
    topics: ['People management and employee engagement', 'Workforce capability and development', 'HRM practice and organisational behaviour'],
  },
  {
    number: '04',
    icon: '✳',
    title: 'Organisational advisory',
    intro: 'Scoped advisory work to help organisations examine management challenges and identify practical next steps.',
    topics: ['Management roles, autonomy and decision rights', 'Organisational change and management capability', 'Evidence-informed review and recommendations'],
  },
];

const programmeFormats = [
  ['Executive and leadership workshops', 'Focused sessions for senior leaders and leadership teams.'],
  ['Middle-manager programmes', 'Structured learning for managers working between strategy and day-to-day delivery.'],
  ['Bespoke corporate courses', 'Learning pathways shaped around your organisation, sector and development priorities.'],
  ['Advisory engagements', 'A defined project with agreed scope, outputs, timing and review points.'],
];

const steps = [
  ['Listen and understand', 'A first conversation to understand your organisation, context and the challenge you want to address.'],
  ['Agree the scope', 'Define the audience, objectives, format, deliverables, timetable and measures of progress.'],
  ['Design and deliver', 'Build a focused programme or advisory engagement around the agreed brief.'],
  ['Review and learn', 'Review participant feedback, outputs and agreed indicators to identify the next steps.'],
];

const enquiries = `mailto:${contact.email}?subject=${encodeURIComponent('Heeva for Organisations — enquiry')}&body=${encodeURIComponent('Hello Heeva,\n\nI would like to discuss a corporate training or consultancy enquiry.\n\nOrganisation:\nMy role:\nArea of interest:\nWhat we would like to achieve:\nPreferred timing:\n\nThank you.')}`;

export default function OrganisationsPage() {
  return (
    <div className="org-page">
      <PageIntro eyebrow="Heeva for Business" title={<>Develop confident leaders. <em>Strengthen organisations.</em></>}>
        <p>Management development, corporate learning and carefully scoped advisory work for organisations. Our focus is leadership, human resource management and healthcare management, grounded in academic knowledge and practical management experience.</p>
      </PageIntro>

      <section className="org-hero-band">
        <div className="shell org-hero-grid">
          <div className="org-hero-copy">
            <Eyebrow light>For employers and leadership teams</Eyebrow>
            <h2>Training that starts with the <em>real challenge.</em></h2>
            <p>From a focused management workshop to a tailored organisational programme, begin with a conversation about what your people and organisation need.</p>
            <a className="button button-cream" href={enquiries}>Discuss a corporate programme <span aria-hidden="true">↗</span></a>
          </div>
          <div className="org-hero-art" aria-hidden="true">
            <span className="org-art-orbit org-art-orbit-one" />
            <span className="org-art-orbit org-art-orbit-two" />
            <span className="org-art-spark">✳</span>
            <div className="org-art-card"><small>HEEVA FOR ORGANISATIONS</small><b>People.<br />Leadership.<br /><em>Progress.</em></b><span>Learning & advisory</span></div>
          </div>
        </div>
      </section>

      <section className="shell org-intro-strip">
        <div><span>01</span><b>Academic insight</b><small>Research-informed thinking</small></div>
        <div><span>02</span><b>Practical experience</b><small>Understanding management in practice</small></div>
        <div><span>03</span><b>Tailored delivery</b><small>Designed around your brief</small></div>
      </section>

      <section className="shell org-services section-space">
        <div className="org-section-heading">
          <Eyebrow>What we can work on</Eyebrow>
          <h2>Focused on the capabilities that help organisations <em>move forward.</em></h2>
          <p>Programme themes are agreed around your context and objectives. The examples below describe areas for discussion, not a fixed or accredited course catalogue.</p>
        </div>
        <div className="org-service-grid">
          {services.map((service) => (
            <article className="org-service-card" key={service.number}>
              <div className="org-service-top"><span>{service.icon}</span><small>{service.number}</small></div>
              <h3>{service.title}</h3>
              <p>{service.intro}</p>
              <ul>{service.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      <section className="org-programme-band">
        <div className="shell org-programme-layout">
          <div className="org-programme-heading">
            <Eyebrow light>Ways to work together</Eyebrow>
            <h2>One organisation. A programme shaped around <em>your needs.</em></h2>
            <p>We start by understanding the brief. The right format, scope and fee are agreed before work begins.</p>
          </div>
          <div className="org-format-list">
            {programmeFormats.map(([title, description], index) => (
              <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{description}</p></div><b aria-hidden="true">↗</b></article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell org-profile section-space">
        <div className="org-profile-aside">
          <span className="org-profile-monogram" aria-hidden="true">MZ</span>
          <div><small>ACADEMIC & PRACTICAL EXPERIENCE</small><b>Dr Maryam<br />Zahmatkesh</b></div>
        </div>
        <div className="org-profile-copy">
          <Eyebrow>Professional expertise</Eyebrow>
          <h2>Academic understanding, informed by <em>management practice.</em></h2>
          <p>Dr Maryam Zahmatkesh is a Lecturer in Health Management at Royal Holloway, University of London, in its School of Business and Management. Her academic background includes human resource management, organisation studies and healthcare management.</p>
          <p>Before joining academia, she held general management roles in public and private hospitals. Her responsibilities included human resources, finance, access, performance targets, quality standards and contributing to strategic planning.</p>
          <div className="org-credentials">
            <div><b>PhD</b><span>Autonomy in healthcare organisations</span></div>
            <div><b>MSc</b><span>Leadership and Management in Health</span></div>
            <div><b>BSc</b><span>Healthcare Management</span></div>
          </div>
          <p className="org-profile-note">Her previous academic roles include teaching HRM at Aston Business School and course direction and teaching in Medical Management and Leadership at Aston Medical School. Her university appointments are provided as professional background only. Heeva is an independent business; no university partnership, endorsement or delivery on behalf of either university is implied.</p>
          <a className="text-link" href="https://pure.royalholloway.ac.uk/en/persons/maryam-zahmatkesh/" target="_blank" rel="noreferrer">View the public academic profile <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </section>

      <section className="org-process-band">
        <div className="shell org-process-layout">
          <div><Eyebrow>How an engagement begins</Eyebrow><h2>A clear brief before <em>the work begins.</em></h2><p>For organisations of different sizes, from growing teams to established employers. The work is scoped individually rather than sold as a one-size-fits-all package.</p></div>
          <div className="org-process-list">
            {steps.map(([title, description], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="shell org-enquiry section-space">
        <div className="org-enquiry-copy"><Eyebrow>Start a conversation</Eyebrow><h2>Tell us what your organisation is <em>working towards.</em></h2><p>Share a short outline of your organisation, the people you want to support and the challenge you would like to explore. We can then discuss whether there is a suitable fit.</p></div>
        <div className="org-enquiry-card">
          <span aria-hidden="true">✳</span>
          <h3>Corporate enquiries</h3>
          <p>For leadership development, corporate training and organisational advisory enquiries.</p>
          <a className="button" href={enquiries}>Email Heeva’s team <span aria-hidden="true">↗</span></a>
          <small>{contact.email}</small>
        </div>
      </section>

      <section className="org-disclaimer">
        <div className="shell"><b>A note on scope</b><p>Heeva for Organisations is a developing service area. Specific programmes, delivery arrangements, fees and outcomes are agreed individually. Services are management education and organisational advisory; they are not legal, regulatory, clinical or financial advice. No client results, corporate partnerships or institutional endorsements are claimed on this page.</p></div>
      </section>
    </div>
  );
}
