import { Link } from '../router.jsx';
import { categoryLabel } from '../data/courses.js';
import { contact } from '../data/site.js';
import { ButtonLink, Eyebrow } from '../components/ContentBlocks.jsx';

export default function CourseDetailPage({ course }) {
  if (!course) return null;
  const status = course.status || 'available';
  const isComingSoon = status === 'coming-soon';
  const isPublishedUnconfirmed = status === 'published-check-details';
  const interestLink = `https://wa.me/${contact.whatsappLink}?text=${encodeURIComponent(`Hello Heeva, I am interested in ${course.title}. Please let me know when it is available.`)}`;
  return (
    <>
      <div className="shell breadcrumbs"><Link to="/courses">Courses</Link><span aria-hidden="true">/</span><span>{course.title}</span></div>
      <section className={`course-detail-hero detail-${course.colour}`}>
        <div className="shell course-detail-layout">
          <div>
            <Eyebrow>{categoryLabel(course.category)} · {isComingSoon ? 'Coming soon' : isPublishedUnconfirmed ? 'Published course · check details' : 'Available on Heeva'}</Eyebrow>
            <h1>{course.title}</h1>
            <p className="detail-lead">{course.description || 'A published Heeva online course. Please check the live page for current details.'}</p>
            {isComingSoon ? <a className="button" href={interestLink} target="_blank" rel="noreferrer">Register interest on WhatsApp <span aria-hidden="true">↗</span></a> : <a className="button" href={`https://heevacourses.com/online-courses/${course.liveSlug}`} target="_blank" rel="noreferrer">{isPublishedUnconfirmed ? 'Check current details on Heeva' : 'View details & book on Heeva'} <span aria-hidden="true">↗</span></a>}
            <ButtonLink to={`/consultation?interest=${course.slug}`} variant="outline">Ask Heeva about this course</ButtonLink>
          </div>
          <div className="detail-art" aria-label={`Illustration for ${course.title}`}>
            <img className="detail-course-photo" src={course.image} alt={course.imageAlt} width="180" height="180" loading="eager" decoding="async" />
            <small>{categoryLabel(course.category)}</small>
          </div>
        </div>
      </section>
      <section className="shell course-detail-body">
        <div className="detail-facts">
          <div><span>Course format</span><b>Online sessions</b></div>
          <div><span>Sessions</span><b>{course.sessions ?? 'To be confirmed'}</b></div>
          <div><span>Session length</span><b>{course.lessonLength || 'To be confirmed'}</b></div>
          <div><span>Published fee</span><b>{course.price ? `£${course.price}` : 'To be confirmed'}</b></div>
        </div>
        <div className="course-information-grid">
          <article>
            <Eyebrow>About this course</Eyebrow>
            <h2>What you’ll explore</h2>
            <p>{course.description || 'Contact Heeva for the current course description.'}</p>
            <h3>Course outline</h3>
            <ul className="course-outline-list">{(course.outline || []).map((item) => <li key={item}>{item}</li>)}</ul>
          </article>
          <aside className="course-audience-card">
            <Eyebrow>Who it is for</Eyebrow>
            <p>{course.audience || 'Audience and entry requirements will be confirmed by Heeva.'}</p>
            <b>Level</b><p>{course.level || 'To be confirmed'}</p>
            <b>Before you begin</b><p>{course.requirements || 'Please contact Heeva to confirm prerequisites.'}</p>
            {isComingSoon && <p className="coming-soon-note">This is a planned course. Tutor, timetable, final content and price will be confirmed before bookings open.</p>}
            {isPublishedUnconfirmed && <p className="coming-soon-note">This course has a published Heeva page. Check that page for current registration status, price and session details before booking.</p>}
          </aside>
        </div>
        <div className="detail-note-grid">
          <div><Eyebrow>{isComingSoon ? 'Be among the first to hear' : 'Continue with Heeva'}</Eyebrow><h2>{isComingSoon ? 'Interested in this course?' : 'Course details and booking.'}</h2><p>{isComingSoon ? 'Tell us you are interested. This does not reserve a place or create an order; we will contact you when the course is ready to launch.' : 'The existing Heeva course page provides current registration, account, free-trial and payment information. This preview does not process a booking or payment.'}</p></div>
          <aside className="detail-consult-card"><span className="consult-spark" aria-hidden="true">✳</span><h3>{isComingSoon ? 'Register interest' : 'Questions about fit?'}</h3><p>{isComingSoon ? 'Send a WhatsApp message to the Heeva team.' : 'Ask Heeva about learner needs, current course information and free-trial terms.'}</p>
            {isComingSoon ? <a className="button button-outline" href={interestLink} target="_blank" rel="noreferrer">WhatsApp Heeva <span aria-hidden="true">↗</span></a> : <ButtonLink to={`/consultation?interest=${course.slug}`} variant="outline">Book a free consultation</ButtonLink>}
          </aside>
        </div>
        <Link className="back-link" to="/courses"><span aria-hidden="true">←</span> Back to all courses</Link>
      </section>
    </>
  );
}
