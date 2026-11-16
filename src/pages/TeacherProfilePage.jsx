import { Link } from '../router.jsx';
import { courses } from '../data/courses.js';
import { CTASection, Eyebrow } from '../components/ContentBlocks.jsx';

export default function TeacherProfilePage({ teacher }) {
  const relatedCourses = courses.filter(({ slug }) => teacher.relatedCourses?.includes(slug));
  const hasCourseMatches = relatedCourses.length > 0;

  return (
    <>
      <div className="shell breadcrumbs"><Link to="/teachers">Our teachers</Link><span aria-hidden="true">/</span><span>{teacher.name}</span></div>

      <section className="shell teacher-profile-hero">
        <div className="teacher-profile-visual">
          <div className="teacher-profile-photo">
            <picture>
              <source srcSet={teacher.photo} type="image/webp" />
              <img src={teacher.originalPhoto} alt={`Portrait of ${teacher.name}, ${teacher.role}`} width="263" height="223" loading="eager" decoding="async" style={{ objectPosition: teacher.imagePosition || 'center' }} />
            </picture>
          </div>
          <div className="teacher-profile-visual-caption">
            <span className="teacher-profile-visual-mark">✳</span>
            <span><b>Meet your teacher</b><small>Heeva teacher directory</small></span>
          </div>
        </div>

        <div className="teacher-profile-copy">
          <Eyebrow>Heeva teacher profile</Eyebrow>
          <h1>{teacher.name}</h1>
          <p className="teacher-profile-role">{teacher.role}</p>
          <div className="teacher-profile-subjects">
            <span className="teacher-profile-subject-label">Teaching subject</span>
            <span className="teacher-subject-pill">{teacher.subject}</span>
          </div>
          <p className="teacher-profile-bio">{teacher.bio}</p>
          <div className="teacher-profile-facts">
            <div><span>Subject area</span><b>{teacher.category === 'music' ? 'Music' : teacher.category === 'language' ? 'Languages' : teacher.category === 'art' ? 'Creative arts' : teacher.category}</b></div>
            <div><span>Course matches</span><b>{relatedCourses.length ? `${relatedCourses.length} related ${relatedCourses.length === 1 ? 'course' : 'courses'}` : 'Contact Heeva'}</b></div>
          </div>
          <p className="teacher-source-note">Profile information is based on the teacher details published by Heeva. Qualifications and experience are shown only where stated. Course matches indicate subject relevance, not confirmed current teacher availability.</p>
          <a className="text-link" href={teacher.source} target="_blank" rel="noreferrer">View Heeva’s published teacher directory <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </section>

      <section className="teacher-profile-courses-section">
        <div className="shell">
          <div className="teacher-profile-section-heading">
            <div>
              <Eyebrow>Subject connection</Eyebrow>
              <h2>Courses related to <em>{teacher.name}</em></h2>
            </div>
            <p>Explore the Heeva courses that match this teacher’s listed subject. Contact Heeva to confirm current availability and suitability.</p>
          </div>
          {hasCourseMatches ? (
            <div className="teacher-profile-course-grid">
              {relatedCourses.map((course) => (
                <article className="teacher-profile-course-card" key={course.slug}>
                  <div className="teacher-profile-course-meta">
                    <span>{course.category.replaceAll('-', ' ')}</span>
                    <span className={course.status === 'coming-soon' ? 'is-coming-soon' : ''}>{course.status === 'coming-soon' ? 'Coming soon' : 'Course information'}</span>
                  </div>
                  <h3>{course.title}</h3>
                  <p>{course.description || course.imageAlt || 'Explore this subject with Heeva.'}</p>
                  <Link to={`/courses/${course.slug}`} className="text-link">Explore course <span aria-hidden="true">↗</span></Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="teacher-profile-no-courses">
              <p>Ask Heeva which current courses may be the best match for this teacher’s subject.</p>
              <Link className="text-link" to="/contact">Contact Heeva <span aria-hidden="true">↗</span></Link>
            </div>
          )}
        </div>
      </section>

      <section className="shell teacher-profile-actions">
        <Link className="back-link" to="/teachers"><span aria-hidden="true">←</span> Back to all teachers</Link>
      </section>
      <CTASection title="Find the right learning connection.">Tell Heeva what the learner wants to achieve. Our team can discuss course suitability and confirm which teachers are currently available.</CTASection>
    </>
  );
}
