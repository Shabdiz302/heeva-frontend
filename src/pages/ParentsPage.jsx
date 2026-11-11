import { Link } from '../router.jsx';
import { policies } from '../data/site.js';
import { CTASection, Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';

const parentTopics = [
  ['Course fit', 'Ask how the course content, format and current options relate to your learner. Suitability is discussed individually.'],
  ['Fees and trial terms', 'Ask for current fees and the terms for Heeva’s published trial sessions before you make a decision.'],
  ['Teacher onboarding', 'Heeva publishes that it has teacher onboarding and regular training. You can ask what the current process includes.'],
  ['Safeguarding', 'Ask about Heeva’s safeguarding arrangements and any checks relevant to your family before enrolment. This preview does not claim a particular check or accreditation.'],
];

export default function ParentsPage() {
  return (
    <>
      <PageIntro eyebrow="Information for parents" title={<>Good questions make for a more <em>confident start.</em></>}>
        <p>Here are useful topics to discuss with Heeva before choosing a course or teacher.</p>
      </PageIntro>
      <section className="shell page-content parent-topic-grid">
        {parentTopics.map(([title, text], index) => <article className="parent-topic" key={title}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{title}</h2><p>{text}</p></div></article>)}
      </section>
      <section className="privacy-callout">
        <div className="shell privacy-callout-inner"><span className="privacy-mark" aria-hidden="true">⌂</span><div><Eyebrow>Privacy & policies</Eyebrow><h2>Read the published policies.</h2><p>This preview links to Heeva’s existing terms and privacy policy. Replacement wording should be reviewed before it is published.</p><div className="policy-links"><a href={policies.privacy} target="_blank" rel="noreferrer">Privacy policy <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a><a href={policies.terms} target="_blank" rel="noreferrer">Terms of service <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></div></div></div>
      </section>
      <section className="shell parents-ask-section"><div><Eyebrow>Before enrolment</Eyebrow><h2>Ask what you need to feel <em>comfortable.</em></h2><p>No question is too small when you are choosing a learning environment for your child.</p></div><div className="parent-ask-card"><p>“What safeguarding information can you share with our family?”</p><Link to="/contact">Contact Heeva <span aria-hidden="true">↗</span></Link></div></section>
      <CTASection title="Talk it through, at your pace.">A free consultation is an opportunity to ask questions before choosing a course.</CTASection>
    </>
  );
}
