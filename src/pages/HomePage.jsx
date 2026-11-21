import { Link } from '../router.jsx';
import { categories, courses } from '../data/courses.js';
import { teachers } from '../data/teachers.js';
import { contact, externalLinks } from '../data/site.js';
import { ButtonLink, CourseCard, Eyebrow, SectionHeading, TeacherCard, TrustCard } from '../components/ContentBlocks.jsx';

const categoryDescriptions = {
  music: 'Learn piano, guitar, violin and more with guided online lessons.',
  languages: 'Build practical speaking, reading and writing skills at your own pace.',
  'creative-arts': 'Explore drawing, painting and hands-on creative techniques.',
  'technology-ai': 'Explore planned AI, coding and digital-skills programmes.',
  'business-career': 'Explore planned courses in leadership, digital skills and careers.',
  wellbeing: 'Discover planned yoga, Pilates and movement courses.',
  'school-subjects': 'Explore planned primary, 11+, KS3, GCSE and A-level support.',
};

export default function HomePage() {
  const popularCourses = courses.slice(0, 4);
  const featuredTeachers = teachers.filter((teacher) => teacher.featured);
  const heroTeacher = featuredTeachers.find((teacher) => teacher.slug === 'maryam-m');

  return (
    <>
      <section className="hero-section">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <Eyebrow>Online courses for children and adults</Eyebrow>
            <h1>Learn new skills. Build <em>confidence.</em></h1>
            <p className="hero-lead">Explore online lessons in music, languages and creative subjects, plus developing programmes in school support, AI and professional skills. Find a course that fits your goals.</p>
            <div className="hero-actions">
              <ButtonLink to="/courses">Explore Courses</ButtonLink>
              <Link className="text-link" to="/consultation">Speak to Heeva <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="hero-note"><span className="note-mark" aria-hidden="true">✳</span><span><b>One free introductory lesson</b><small>For eligible learners, subject to availability and Heeva’s terms.</small></span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo-frame">
              <picture>
                <source srcSet={heroTeacher.photo} type="image/webp" />
                <img src={heroTeacher.originalPhoto} alt={`Portrait of ${heroTeacher.name}, ${heroTeacher.role}`} width="263" height="223" loading="eager" decoding="async" fetchpriority="high" />
              </picture>
            </div>
            <div className="hero-shape hero-shape-yellow" aria-hidden="true">✳</div>
            <div className="hero-shape hero-shape-coral" aria-hidden="true">♫</div>
            <div className="hero-label"><span className="hero-label-dot" /><span><b>{heroTeacher.name}</b><small>{heroTeacher.role}</small></span></div>
            <div className="hero-caption">Get to know our tutors.</div>
          </div>
        </div>
        <div className="shell hero-bottomline"><span>Curiosity</span><span className="bottomline-rule" /><span>Connection</span><span className="bottomline-rule" /><span>Confidence</span></div>
      </section>

      <section className="highlight-strip" aria-label="Learning at Heeva">
        <div className="shell highlight-inner">
          <div><span className="highlight-icon" aria-hidden="true">♡</span><span><b>Personalised learning</b><small>Talk about what suits your family</small></span></div>
          <div><span className="highlight-icon" aria-hidden="true">⌂</span><span><b>Online courses</b><small>Individual sessions from home</small></span></div>
          <div><span className="highlight-icon" aria-hidden="true">✳</span><span><b>Free consultation</b><small>Ask questions before deciding</small></span></div>
        </div>
      </section>

      <section className="shell section-space home-courses">
        <SectionHeading eyebrow="Find your next subject" title={<>Explore courses for every <em>stage.</em></>}>
          <p>Choose from established online courses and clearly labelled upcoming programmes. From a child's first music lesson to exam preparation and adult professional development, start with the subject that interests you.</p>
        </SectionHeading>
        <div className="category-grid">
          {categories.filter((category) => category.id !== 'all').map((category) => (
            <Link className={`category-tile category-${category.id}`} to={`/courses?category=${category.id}`} key={category.id}>
              <span className="category-icon" aria-hidden="true">{category.icon}</span>
              <span className="category-copy"><b>{category.label}</b><small>{categoryDescriptions[category.id]}</small></span>
              <span className="category-arrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
        <div className="course-preview-heading"><h3>Popular places to start</h3><Link className="text-link" to="/courses">See all courses <span aria-hidden="true">↗</span></Link></div>
        <div className="course-grid course-grid-four">
          {popularCourses.map((course) => <CourseCard course={course} key={course.slug} />)}
        </div>
      </section>

      <section className="why-section">
        <div className="shell why-layout">
          <div className="why-copy">
            <Eyebrow>Learning that feels personal</Eyebrow>
            <h2>There’s more to a good fit than a <em>subject.</em></h2>
            <p>Tell us what you want to learn, your experience and preferred lesson format. We’ll help you explore suitable courses and discuss tutor availability before you commit.</p>
            <ButtonLink to="/how-heeva-works" variant="outline">How Heeva works</ButtonLink>
          </div>
          <div className="trust-grid">
            <TrustCard number="01" icon="⌕" title="Begin by listening">Talk about interests, learning preferences and questions before choosing a course.</TrustCard>
            <TrustCard number="02" icon="↗" title="Learn online">Explore individual online lessons that fit around home, school or work.</TrustCard>
            <TrustCard number="03" icon="✳" title="One free introductory lesson">Eligible new learners can try a lesson before choosing whether to continue. Confirm the terms with Heeva.</TrustCard>
            <TrustCard number="04" icon="♡" title="Ask what matters">Discuss fees, suitability and safeguarding information directly with Heeva.</TrustCard>
          </div>
        </div>
      </section>

      <section className="trial-section">
        <div className="shell trial-grid">
          <div className="trial-art" aria-hidden="true">
            <span className="trial-sun">✳</span><span className="trial-ring" />
            <div className="trial-note"><small>A gentle first try</small><b>One free<br />trial lesson</b><span>Ask about current terms</span></div>
          </div>
          <div className="trial-copy">
            <Eyebrow>Try before you decide</Eyebrow>
            <h2>One lesson to get a <em>feel for it.</em></h2>
            <p>Eligible learners can request one free introductory lesson to experience the teaching approach before deciding whether to continue. We’ll confirm availability and the applicable terms.</p>
            <ButtonLink to="/consultation" variant="dark">Ask in a free consultation</ButtonLink>
          </div>
        </div>
      </section>

      <section className="shell section-space teacher-preview">
        <SectionHeading eyebrow="The people behind the lessons" title={<>Meet our <em>tutors.</em></>}>
          <p>Get to know the people behind the lessons, explore their teaching subjects and enquire about a suitable match.</p>
        </SectionHeading>
        <div className="teacher-grid teacher-grid-four">
          {featuredTeachers.map((teacher, index) => <TeacherCard teacher={teacher} index={index} key={teacher.slug} />)}
        </div>
        <div className="center-action"><ButtonLink to="/teachers" variant="outline">Meet Our Tutors</ButtonLink></div>
      </section>

      <section className="parent-trust-section">
        <div className="shell parent-trust-grid">
          <div className="parent-trust-ornament" aria-hidden="true"><span>✿</span><i /><b>For parents</b></div>
          <div className="parent-trust-copy">
            <Eyebrow>For the people cheering them on</Eyebrow>
            <h2>Clear answers make a more <em>confident start.</em></h2>
            <p>Heeva’s published teacher information describes onboarding and regular training. Ask about the current safeguarding arrangements and any checks relevant to your family before enrolment.</p>
            <div className="trust-links"><Link to="/for-parents">Read information for parents <span aria-hidden="true">↗</span></Link><Link to="/faq">Browse common questions <span aria-hidden="true">↗</span></Link></div>
          </div>
        </div>
      </section>

      <section className="shell org-home-promo section-space" aria-labelledby="org-home-title">
        <div>
          <Eyebrow>Heeva for Business</Eyebrow>
          <h2 id="org-home-title">Leadership development. Stronger organisations.</h2>
          <p>Explore leadership development, healthcare management, HR, organisational consultancy and AI-related services tailored to your organisation’s needs.</p>
        </div>
        <ButtonLink to="/for-organisations" variant="outline">Explore Heeva for Business</ButtonLink>
      </section>

      <section className="feedback-section shell section-space">
        <div className="feedback-mark" aria-hidden="true">“</div>
        <div><Eyebrow>Voices from the Heeva community</Eyebrow><h2>Read feedback where it was <em>published.</em></h2><p>See independently published feedback about Heeva on Trustpilot. Reviews reflect customers' experiences at the time they were written.</p><a className="text-link" href={externalLinks.reviews} target="_blank" rel="noreferrer">Read published reviews <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a></div>
        <div className="feedback-seal" aria-hidden="true"><span>LEARNER</span><b>feedback</b><span>INDEPENDENT REVIEWS</span></div>
      </section>

      <section className="home-faq-section">
        <div className="shell home-faq-grid">
          <div><Eyebrow>Good questions to start with</Eyebrow><h2>A few things parents often <em>wonder.</em></h2><Link className="text-link" to="/faq">See all FAQs <span aria-hidden="true">↗</span></Link></div>
          <div className="home-faq-list">
            <details><summary>How do we know which course might fit?</summary><p>Talk with Heeva during a free consultation. Suitability and course details are discussed directly.</p></details>
            <details><summary>How much do courses cost?</summary><p>Course pages show available package information where confirmed. Please contact Heeva for current prices, individual lesson options and availability.</p></details>
            <details><summary>How do I get started?</summary><p>Browse courses, choose a subject and contact Heeva to discuss tutor availability, lesson format and the next steps.</p></details>
          </div>
        </div>
      </section>

      <section className="shell final-cta section-space">
        <div className="final-cta-copy"><Eyebrow>Your first step is a conversation</Eyebrow><h2>Let’s find the right <em>starting point.</em></h2></div>
        <ButtonLink to="/consultation">Request a free consultation</ButtonLink>
      </section>

      <section className="home-whatsapp-support" aria-labelledby="home-whatsapp-title">
        <div className="shell home-whatsapp-inner">
          <div className="home-whatsapp-mark" aria-hidden="true">WA</div>
          <div className="home-whatsapp-copy">
            <Eyebrow>Questions or need support?</Eyebrow>
            <h2 id="home-whatsapp-title">Chat with Heeva on WhatsApp.</h2>
            <p>Ask our team about courses, teachers, registration or choosing the right next step.</p>
            <small>WhatsApp support: {contact.whatsapp}</small>
          </div>
          <a
            className="button button-whatsapp"
            href={`https://wa.me/${contact.whatsappLink}?text=${encodeURIComponent('Hello Heeva, I would like some help with your courses.')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Chat with us <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </>
  );
}
