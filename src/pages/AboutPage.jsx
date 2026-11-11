import { Link } from '../router.jsx';
import { Eyebrow, PageIntro, ButtonLink } from '../components/ContentBlocks.jsx';

export default function AboutPage() {
  return (
    <>
      <PageIntro eyebrow="A little about Heeva" title={<>Learning begins with the <em>learner.</em></>}>
        <p>Heeva Courses is an online learning platform that describes its approach as individual, one-to-one learning shaped around learner needs and preferences.</p>
      </PageIntro>
      <section className="shell about-story page-content">
        <div className="about-story-art" aria-hidden="true"><span className="about-sun">✳</span><span className="about-letter">h</span><i /></div>
        <div className="about-story-copy">
          <Eyebrow>How we think about learning</Eyebrow>
          <h2>Make room for a more <em>personal path.</em></h2>
          <p>Heeva’s published about page describes a focus on one-to-one online classes and a preliminary consultation to help discuss a suitable course and teacher.</p>
          <p>This new frontend is a preview. Course details and fees should be confirmed directly with Heeva, and the consultation form does not yet connect to the existing PHP platform.</p>
          <ButtonLink to="/how-heeva-works" variant="outline">How Heeva works</ButtonLink>
        </div>
      </section>
      <section className="about-values-section"><div className="shell about-values-grid"><article><span>01</span><h3>Listen first</h3><p>Make time for a conversation before choosing a learning path.</p></article><article><span>02</span><h3>Stay individual</h3><p>Discuss course fit around the learner and the family’s questions.</p></article><article><span>03</span><h3>Keep it clear</h3><p>Ask about fees, availability and safeguarding before enrolment.</p></article></div></section>
      <section className="shell about-company-section"><div><Eyebrow>Company information</Eyebrow><h2>Heeva Courses <em>Ltd.</em></h2></div><div><p>Head office: 124 City Road, London, England, EC1V 2NX.</p><Link className="text-link" to="/contact">Contact details <span aria-hidden="true">↗</span></Link></div></section>
    </>
  );
}
