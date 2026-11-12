import { Link } from '../router.jsx';
import { categoryLabel } from '../data/courses.js';

export function Eyebrow({ children, light = false, icon = '✳' }) {
  return <div className={`eyebrow${light ? ' eyebrow-light' : ''}`}><span aria-hidden="true">{icon}</span>{children}</div>;
}

export function PageIntro({ eyebrow, title, children, className = '' }) {
  return (
    <section className={`page-intro ${className}`}>
      <div className="shell">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        {children && <div className="page-intro-copy">{children}</div>}
      </div>
    </section>
  );
}

export function ButtonLink({ to, children, variant = 'primary', className = '', ...props }) {
  return <Link className={`button button-${variant} ${className}`.trim()} to={to} {...props}>{children}<span aria-hidden="true">↗</span></Link>;
}

export function SectionHeading({ eyebrow, title, children, light = false, align = 'left' }) {
  return (
    <div className={`section-heading${light ? ' section-heading-light' : ''} align-${align}`}>
      <div>
        {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
        <h2>{title}</h2>
      </div>
      {children && <div className="section-heading-side">{children}</div>}
    </div>
  );
}

export function CourseCard({ course }) {
  const status = course.status;
  const statusLabel = status === 'coming-soon' ? 'Coming soon' : status === 'available' ? 'Available' : 'Check availability';
  const meta = status === 'coming-soon' ? 'New course · details in development' : course.price ? `£${course.price} · ${course.sessions} sessions` : 'Ask Heeva for details';
  const action = status === 'coming-soon' ? 'See planned course' : 'View course details';
  return (
    <article className={`course-card card-${course.colour}${status === 'coming-soon' ? ' course-card-coming-soon' : ''}`}>
      <img className="course-card-photo" src={course.image} alt="" aria-hidden="true" width="112" height="112" loading="lazy" decoding="async" />
      <div className="course-card-top">
        <span className="course-mark" aria-hidden="true">{course.mark}</span>
        <span className="course-status-tag">{statusLabel}</span>
      </div>
      <span className="course-category">{categoryLabel(course.category)}</span>
      <h3>{course.title}</h3>
      <p className="course-meta">{meta}</p>
      <Link className="card-link" to={`/courses/${course.slug}`}>{action} <span aria-hidden="true">↗</span></Link>
    </article>
  );
}
export function TeacherCard({ teacher, index = 0 }) {
  return (
    <article className="teacher-card">
      <Link className="teacher-card-link" to={`/teachers/${teacher.slug}`} aria-label={`View ${teacher.name}'s teacher profile`}>
        <div className="teacher-photo" style={{ '--teacher-photo-origin': teacher.cardPhotoPosition, '--teacher-photo-scale': teacher.cardPhotoScale }}>
          <picture>
            <source srcSet={teacher.photo} type="image/webp" />
            <img src={teacher.originalPhoto} alt={`Portrait of ${teacher.name}, ${teacher.role}`} width="263" height="223" loading="lazy" decoding="async" style={{ objectPosition: teacher.imagePosition || 'center' }} />
          </picture>
        </div>
        <div className="teacher-card-copy">
          <div className="teacher-card-heading"><h3>{teacher.name}</h3><span className="teacher-card-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span></div>
          <p className="teacher-role">{teacher.role}</p>
          <p className="teacher-summary">{teacher.summary}</p>
          <span className="teacher-profile-link">View full profile <span aria-hidden="true">↗</span></span>
        </div>
      </Link>
    </article>
  );
}

export function TrustCard({ number, title, children, icon }) {
  return (
    <article className="trust-card">
      <span className="trust-icon" aria-hidden="true">{icon}</span>
      <span className="trust-number">{number}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  );
}

export function CTASection({ eyebrow = 'A thoughtful first step', title = 'Let’s talk about what could fit.', children, className = '' }) {
  return (
    <section className={`cta-section ${className}`}>
      <div className="shell cta-inner">
        <div className="cta-orbit cta-orbit-one" aria-hidden="true" />
        <div className="cta-orbit cta-orbit-two" aria-hidden="true" />
        <div className="cta-copy">
          <Eyebrow light>{eyebrow}</Eyebrow>
          <h2>{title}</h2>
          {children && <p>{children}</p>}
        </div>
        <ButtonLink to="/consultation" variant="cream">Request a free consultation</ButtonLink>
      </div>
    </section>
  );
}

export function ContactCards() {
  return (
    <div className="contact-cards">
      <Link to="/contact" className="contact-card"><span className="contact-card-icon" aria-hidden="true">✉</span><span><b>Email the team</b><small>info@heevacourses.com</small></span><span className="contact-arrow" aria-hidden="true">↗</span></Link>
      <Link to="/consultation" className="contact-card"><span className="contact-card-icon" aria-hidden="true">◷</span><span><b>Talk through course options</b><small>Start with a free consultation</small></span><span className="contact-arrow" aria-hidden="true">↗</span></Link>
    </div>
  );
}
