import { CTASection, Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';

const steps = [
  ['01', 'Start with a conversation', 'Talk about interests, questions and what you hope to learn. The consultation is free.'],
  ['02', 'Discuss possible course fit', 'Heeva describes a preliminary consultation and level discussion as part of finding a suitable course and teacher.'],
  ['03', 'Ask about a trial', 'Heeva publishes two free trial sessions. Confirm current terms and course details before making a decision.'],
  ['04', 'Choose your next step', 'Discuss current fees, scheduling and any remaining questions directly with Heeva.'],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro eyebrow="A considered first step" title={<>A learning journey that starts by <em>listening.</em></>}>
        <p>Every family’s questions are different. Begin with a free consultation and use it to understand the options before deciding.</p>
      </PageIntro>
      <section className="shell page-content process-section">
        <div className="process-intro"><Eyebrow>The steps</Eyebrow><h2>Four calm steps, with space for <em>questions.</em></h2><p>Course suitability and fees are discussed during the consultation.</p></div>
        <div className="process-list">{steps.map(([number, title, body]) => <article className="process-step" key={number}><span className="process-number">{number}</span><div><h3>{title}</h3><p>{body}</p></div><span className="process-arrow" aria-hidden="true">↘</span></article>)}</div>
      </section>
      <section className="trial-detail-section">
        <div className="shell trial-detail-grid"><div className="trial-detail-number">02<span>sessions</span></div><div><Eyebrow>Try before you decide</Eyebrow><h2>Ask about Heeva’s published <em>trial sessions.</em></h2><p>The existing Heeva site describes two free initial lessons. Current availability and terms should be confirmed with Heeva before you enrol.</p></div></div>
      </section>
      <CTASection title="Start with a free consultation.">Bring your questions and talk through course options, fees and next steps.</CTASection>
    </>
  );
}
