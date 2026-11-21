import { Link } from '../router.jsx';
import { Eyebrow, PageIntro, ButtonLink } from '../components/ContentBlocks.jsx';

const areas = [
  ['For children and families', 'Explore music, languages and creative learning, plus developing support for school subjects and examinations. Parents or guardians can discuss suitability and arrangements before committing.'],
  ['For adult learners', 'Develop practical skills for personal interests and work. Explore courses in languages, the arts, technology, AI and professional development as they become available.'],
  ['For educators', 'Apply to share your expertise, create a detailed profile and propose courses. Heeva reviews applications before publishing educator profiles or approving course offers.'],
  ['For organisations', 'Discuss tailored leadership and management development, healthcare-related professional education, organisational advice and practical AI applications.'],
];

export default function AboutPage() {
  return (
    <>
      <PageIntro eyebrow="About Heeva Courses" title={<>Learning made more <em>personal, accessible and practical.</em></>}>
        <p>Heeva Courses connects people who want to learn with educators who have skills to share. Our online course marketplace brings together lessons for children, young people and adults, alongside development and advisory services for organisations.</p>
      </PageIntro>
      <section className="shell about-story page-content">
        <div className="about-story-art" aria-hidden="true"><span className="about-sun">✳</span><span className="about-letter">h</span><i /></div>
        <div className="about-story-copy">
          <Eyebrow>What Heeva does</Eyebrow>
          <h2>Find a subject. Meet a tutor. <em>Keep growing.</em></h2>
          <p>Whether you are looking for your child's first music lesson, help developing language skills or a new skill for your career, we want the next step to feel clear. Browse courses, explore educator profiles and ask Heeva about availability, suitability and lesson arrangements.</p>
          <p>Heeva brings together its own courses and offerings proposed by independent educators. Each course page indicates whether a programme is available or still being developed. We do not open bookings for a proposed course until the relevant arrangements are confirmed.</p>
          <ButtonLink to="/courses" variant="outline">Explore Heeva courses</ButtonLink>
        </div>
      </section>
      <section className="about-values-section">
        <div className="shell about-values-grid">
          <article><span>01</span><h3>Start with your goals</h3><p>Explore subjects and discuss learning preferences, ability and objectives before choosing a course.</p></article>
          <article><span>02</span><h3>People behind the lessons</h3><p>Get to know our tutors and instructors. New educator profiles are reviewed by Heeva before appearing publicly.</p></article>
          <article><span>03</span><h3>Clear next steps</h3><p>Ask about lesson formats, current prices and availability. Eligible learners can request one free introductory lesson, subject to the published terms.</p></article>
        </div>
      </section>
      <section className="shell section-space about-audiences">
        <div className="section-heading"><div><Eyebrow>Who we work with</Eyebrow><h2>Learning for different stages of life</h2></div></div>
        <div className="about-audience-grid">
          {areas.map(([title,description])=><article className="about-audience-card" key={title}>
            <h3>{title}</h3><p>{description}</p>
          </article>)}
        </div>
        <div className="about-audience-links">
          <Link className="text-link" to="/teachers">Meet Our Tutors ↗</Link>
          <Link className="text-link" to="/teacher/apply">Teach with Heeva ↗</Link>
          <Link className="text-link" to="/for-organisations">Heeva for Business ↗</Link>
        </div>
      </section>
      <section className="shell section-space about-first-step">
        <Eyebrow>Getting started</Eyebrow>
        <h2>Try a lesson before you decide.</h2>
        <p>Heeva's introductory offer is one free lesson for eligible learners, not an unlimited series of trials. Please confirm eligibility, the tutor's availability and the current terms before booking.</p>
        <ButtonLink to="/consultation">Ask Heeva about your first lesson</ButtonLink>
      </section>
      <section className="shell about-company-section">
        <div><Eyebrow>Company information</Eyebrow><h2>Heeva Courses <em>Ltd.</em></h2></div>
        <div><p>Heeva Courses Ltd is based in London, United Kingdom.</p>
          <p>Registered address: 124 City Road, London, England, EC1V 2NX.</p>
          <Link className="text-link" to="/contact">Contact our team ↗</Link>
        </div>
      </section>
    </>
  );
}
