import { Link } from '../router.jsx';
import { categoryLabel } from '../data/courses.js';
import { contact } from '../data/site.js';
import { firstLessons } from '../data/firstLessons.js';
import { ButtonLink, Eyebrow } from '../components/ContentBlocks.jsx';

const pounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function CourseDetailPage({ course }) {
  if (!course) return null;
  const status = course.status || 'available';
  const isComingSoon = status === 'coming-soon';
  const isPublishedUnconfirmed = status === 'published-check-details';
  const isPiano = course.slug === 'piano';
  const { bookingDetails } = course;
  const trialMessage = encodeURIComponent(`Hi Heeva, I’m interested in ${course.title}. Could you help me find a suitable teacher and arrange one free trial lesson?`);
  const trialUrl = `https://wa.me/${contact.whatsappLink}?text=${trialMessage}`;
  const lessonFormat = isComingSoon
    ? 'Online course planned. Session length, number of lessons and fees will be confirmed before bookings open.'
    : isPublishedUnconfirmed
      ? 'Online lessons. Check the existing Heeva course page for the current lesson length, number of sessions and fee.'
      : `Online lessons · ${course.lessonLength} per lesson · ${course.sessions} sessions listed. Ask Heeva to confirm the current fee before booking.`;
  const enquiryPath = `/consultation?interest=${course.slug}`;
  return (
    <>
      <div className="shell breadcrumbs"><Link to="/courses">Courses</Link><span aria-hidden="true">/</span><span>{course.title}</span></div>
      <section className={`course-detail-hero detail-${course.colour}`}>
        <div className="shell course-detail-layout">
          <div>
            <Eyebrow>{categoryLabel(course.category)} · {isComingSoon ? 'Coming soon' : isPublishedUnconfirmed ? 'Published course · check details' : 'Available on Heeva'}</Eyebrow>
            <h1>{isPiano ? 'Online piano lessons' : course.title}</h1>
            {isPiano ? (
              <>
                <p className="detail-lead">Whether your child is sitting at a keyboard for the first time or already plays, their teacher can help them build on what they know and choose what to learn next.</p>
                <p className="detail-lead"><strong>In the first lesson</strong><br />A complete beginner might learn to find middle C and play a short tune with one hand. If your child already plays, they can bring a piece they know so the teacher can see where to start.</p>
              </>
            ) : (
              <>
                <p className="detail-lead">{course.description}</p>
                <p className="detail-lead"><strong>{isComingSoon ? 'Example first activity' : 'In the first lesson'}</strong><br />{firstLessons[course.slug]}</p>
                {!bookingDetails && <><p className="detail-lead"><strong>Lesson format</strong><br />{lessonFormat}</p>
                <p className="detail-lead">
                  <strong>{isComingSoon ? 'Ask about availability' : 'Start with one free trial lesson'}</strong><br />
                  {isComingSoon
                    ? 'Ask Heeva when the course is expected to open and whether a free trial lesson will be available.'
                    : 'Ask Heeva about availability for one free trial lesson. It’s a chance to meet the teacher and try the course before deciding whether to continue.'}
                </p></>}
              </>
            )}
            {bookingDetails && (
              <>
                <p className="detail-lead"><strong>{pounds.format(course.price)} for {course.sessions} online lessons</strong><br />{course.lessonLength} per lesson · {pounds.format(course.price / course.sessions)} per lesson within the package</p>
                <p className="detail-lead"><strong>Ages {bookingDetails.minimumAge}+ · {bookingDetails.farsiLevel} understanding of Farsi</strong><br />{bookingDetails.learnerFit}</p>
                <p className="detail-lead"><strong>Start with one free trial lesson</strong><br />Tell us the learner’s level and when you’re available. Heeva can suggest a teacher and confirm the lesson language and trial time. After the trial, you can decide whether to book the package.</p>
                <a className="button button-whatsapp" href={trialUrl} target="_blank" rel="noreferrer">Request a free trial on WhatsApp <span aria-hidden="true">↗</span></a>
              </>
            )}
            {!isComingSoon && <a className="button" href={`https://heevacourses.com/online-courses/${course.liveSlug}`} target="_blank" rel="noreferrer">{isPublishedUnconfirmed ? 'Check current details on Heeva' : 'View details & book on Heeva'} <span aria-hidden="true">↗</span></a>}
            {!bookingDetails && <ButtonLink to={enquiryPath} variant="outline">{isComingSoon ? "Ask about availability" : "Request a free consultation"}</ButtonLink>}
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
          <div><span>{bookingDetails ? 'Package price' : 'Published fee'}</span><b>{course.price ? pounds.format(course.price) : 'To be confirmed'}</b></div>
        </div>
        <div className="course-information-grid">
          <article>
            <Eyebrow>About this course</Eyebrow>
            <h2>What you’ll explore</h2>
            <p>{course.description || 'Contact Heeva for the current course description.'}</p>
            <h3>Course outline</h3>
            {course.outline?.length ? <ul className="course-outline-list">{course.outline.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Confirm the current lesson plan with Heeva.</p>}
          </article>
          <aside className="course-audience-card">
            <Eyebrow>Who it is for</Eyebrow>
            <p>{bookingDetails?.learnerFit || course.audience || 'Audience and entry requirements will be confirmed by Heeva.'}</p>
            <b>Level</b><p>{course.level || 'To be confirmed'}</p>
            <b>Before you begin</b><p>{course.requirements || 'Please contact Heeva to confirm prerequisites.'}</p>
            {isComingSoon && <p className="coming-soon-note">This is a planned course. Tutor, timetable, final content and price will be confirmed before bookings open.</p>}
            {isPublishedUnconfirmed && <p className="coming-soon-note">This course has a published Heeva page. Check that page for current registration status, price and session details before booking.</p>}
          </aside>
        </div>
        <div className="detail-note-grid">
          <div><Eyebrow>{isComingSoon ? 'Be among the first to hear' : 'Continue with Heeva'}</Eyebrow><h2>{isComingSoon ? 'Interested in this course?' : 'Course details and booking.'}</h2><p>{isComingSoon ? 'Contact Heeva to ask when this course will be available.' : 'The existing Heeva course page provides current registration, account, free-trial and payment information. This preview does not process a booking or payment.'}</p></div>
          <aside className="detail-consult-card"><span className="consult-spark" aria-hidden="true">✳</span><h3>{isComingSoon ? 'Register interest' : 'Questions about fit?'}</h3><p>{isComingSoon ? 'Choose a topic you would like to discuss.' : 'Ask Heeva about learner needs, current course information and free-trial terms.'}</p>
            <ButtonLink to={enquiryPath} variant="outline">{isComingSoon ? "Ask about availability" : "Request a free consultation"}</ButtonLink>
          </aside>
        </div>
        <Link className="back-link" to="/courses"><span aria-hidden="true">←</span> Back to all courses</Link>
      </section>
    </>
  );
}
