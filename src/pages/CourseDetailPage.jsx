import { Link } from '../router.jsx';
import { categoryLabel } from '../data/courses.js';
import { ButtonLink, Eyebrow } from '../components/ContentBlocks.jsx';

export default function CourseDetailPage({ course }) {
  if (!course) return null;
  return (
    <>
      <div className="shell breadcrumbs"><Link to="/courses">Courses</Link><span aria-hidden="true">/</span><span>{course.title}</span></div>
      <section className={`course-detail-hero detail-${course.colour}`}>
        <div className="shell course-detail-layout">
          <div>
            <Eyebrow>{categoryLabel(course.category)}</Eyebrow>
            <h1>{course.title}</h1>
            <p className="detail-lead">A published Heeva online course. Discuss suitability, current fees and next steps in a free consultation.</p>
            <a className="button" href={`https://heevacourses.com/online-courses/${course.liveSlug}`} target="_blank" rel="noreferrer">
              View details and booking on HeevaCourses <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span>
            </a>
            <ButtonLink to={`/consultation?interest=${course.slug}`}>Ask about this course</ButtonLink>
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
          <div><span>Number of sessions</span><b>{course.sessions}</b></div>
          <div><span>Session length</span><b>{course.lessonLength}</b></div>
        </div>
        <div className="detail-note-grid">
          <div><Eyebrow>Continue with Heeva</Eyebrow><h2>Course details and booking.</h2><p>Continue to Heeva’s existing course page for its current price, availability, account and booking steps. This preview does not process a booking or payment.</p></div>
          <aside className="detail-consult-card"><span className="consult-spark" aria-hidden="true">✳</span><h3>Questions about fit?</h3><p>Heeva can discuss the learner’s needs and current course information with you.</p><ButtonLink to={`/consultation?interest=${course.slug}`} variant="outline">Book a free consultation</ButtonLink></aside>
        </div>
        <Link className="back-link" to="/courses"><span aria-hidden="true">←</span> Back to all courses</Link>
      </section>
    </>
  );
}
