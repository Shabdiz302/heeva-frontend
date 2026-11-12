import { CTASection, Eyebrow, PageIntro } from '../components/ContentBlocks.jsx';

const steps = [
  ['01', 'Explore the course', 'Review the course information, current price and registration status on Heeva’s existing course page.'],
  ['02', 'Create or sign in to a student account', 'Heeva’s published site directs learners to its existing student registration and login pages.'],
  ['03', 'Register and book your free lesson', 'Book one free initial lesson. Confirm the lesson format and availability with Heeva before registering.'],
  ['04', 'Continue if you choose', 'The published flow says payment is due only if a learner chooses to continue after the initial lessons. Use the existing Heeva checkout and contact Heeva if anything is unclear.'],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro eyebrow="A considered first step" title={<>A learning journey that starts by <em>listening.</em></>}>
        <p>Browse a course, check its current terms, then continue through Heeva’s existing student account and booking pages.</p>
      </PageIntro>
      <section className="shell page-content process-section">
        <div className="process-intro"><Eyebrow>The steps</Eyebrow><h2>Four calm steps, with space for <em>questions.</em></h2><p>Booking and payment are handled by Heeva’s existing website, not this preview.</p><div className="process-account-links"><a href="https://heevacourses.com/student/registration" target="_blank" rel="noreferrer">Create a student account ↗<span className="sr-only"> (opens in a new tab)</span></a><a href="https://heevacourses.com/student/login" target="_blank" rel="noreferrer">Student login ↗<span className="sr-only"> (opens in a new tab)</span></a></div></div>
        <div className="process-list">{steps.map(([number, title, body]) => <article className="process-step" key={number}><span className="process-number">{number}</span><div><h3>{title}</h3><p>{body}</p></div><span className="process-arrow" aria-hidden="true">↘</span></article>)}</div>
      </section>
      <section className="trial-detail-section">
        <div className="shell trial-detail-grid"><div className="trial-detail-number">01<span>free lesson</span></div><div><Eyebrow>Try before you decide</Eyebrow><h2>Start with one <em>free lesson.</em></h2><p>Heeva offers one free initial lesson so you can meet the teacher, try the learning format and decide whether the course is right for you. Confirm availability with Heeva before booking.</p></div></div>
      </section>
      <CTASection title="Need help with your next step?">Contact Heeva about suitability or current terms. Course registration and any payment take place on the existing Heeva website.</CTASection>
    </>
  );
}
