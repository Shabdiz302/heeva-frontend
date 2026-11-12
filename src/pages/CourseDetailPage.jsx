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
  const whatsappRequest = isComingSoon
    ? 'Could you let me know when this course opens?'
    : isPublishedUnconfirmed
      ? 'Could you confirm teacher availability, lesson duration and whether I can arrange one free trial lesson?'
      : 'Could you help me find a suitable teacher and arrange one free trial lesson?';
  const whatsappMessage = encodeURIComponent(`Hi Heeva, I’m interested in ${course.title}. ${whatsappRequest}`);
  const whatsappUrl = `https://wa.me/${contact.whatsappLink}?text=${whatsappMessage}`;
  const whatsappLabel = isComingSoon ? 'Register interest on WhatsApp' : isPublishedUnconfirmed ? 'Ask about availability on WhatsApp' : 'Request a free trial on WhatsApp';
  const ageLabel = bookingDetails?.ageLabel ?? (bookingDetails ? `Ages ${bookingDetails.minimumAge}+` : null);
  const languageRequirement = bookingDetails?.languageRequirement ?? (bookingDetails?.farsiLevel ? `${bookingDetails.farsiLevel} understanding of Farsi` : null);
  const hasPublishedDuration = !isPublishedUnconfirmed && course.lessonLength;
  const lessonFormat = isComingSoon
    ? 'Online course planned. Session length, number of lessons and fees will be confirmed before bookings open.'
    : isPublishedUnconfirmed
      ? 'Online lessons. Ask Heeva to confirm lesson duration, package details and availability.'
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
              </>
            )}
            {bookingDetails && (
              <>
                <p className="detail-lead"><strong>{pounds.format(course.price)} for {course.sessions} online lessons</strong><br />{hasPublishedDuration && `${course.lessonLength} per lesson · `}{pounds.format(course.price / course.sessions)} per lesson within the package</p>
                <p className="detail-lead"><strong>{ageLabel}{languageRequirement && ` · ${languageRequirement}`}</strong>{bookingDetails.learnerFit && <><br />{bookingDetails.learnerFit}</>}</p>
              </>
            )}
            {!bookingDetails && <p className="detail-lead"><strong>Lesson format</strong><br />{lessonFormat}</p>}
            <p className="detail-lead">
              <strong>{isComingSoon ? 'Interested in this course?' : isPublishedUnconfirmed ? 'Confirm availability with Heeva' : 'Start with one free trial lesson'}</strong><br />
              {isComingSoon
                ? 'Send Heeva a message to register your interest and ask when the course will open.'
                : isPublishedUnconfirmed
                  ? 'Ask Heeva to confirm teacher availability, lesson duration and whether you can arrange one free trial lesson.'
                  : 'Tell us the learner’s level and when you’re available. Heeva can suggest a teacher and confirm the lesson language and trial time. After the trial, you can decide whether to book the package.'}
            </p>
            <a className="button button-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">{whatsappLabel} <span aria-hidden="true">↗</span></a>
            {!isComingSoon && course.slug !== 'introduction-to-farsi' && <a className="button" href={`https://heevacourses.com/online-courses/${course.liveSlug}`} target="_blank" rel="noreferrer">{isPublishedUnconfirmed ? 'Check current details on Heeva' : 'View details & book on Heeva'} <span aria-hidden="true">↗</span></a>}
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
            {isPublishedUnconfirmed && <p className="coming-soon-note">Ask Heeva to confirm the current timetable and available teachers before booking.</p>}
          </aside>
        </div>
        <div className="detail-note-grid">
          <div><Eyebrow>{isComingSoon ? 'Be among the first to hear' : 'Continue with Heeva'}</Eyebrow><h2>{isComingSoon ? 'Interested in this course?' : 'Course details and booking.'}</h2><p>{isComingSoon ? 'Contact Heeva to ask when this course will be available.' : 'Contact Heeva to confirm the current booking and payment steps.'}</p></div>
          <aside className="detail-consult-card"><span className="consult-spark" aria-hidden="true">✳</span><h3>{isComingSoon ? 'Register interest' : 'Questions about fit?'}</h3><p>{isComingSoon ? 'Choose a topic you would like to discuss.' : 'Ask Heeva about learner needs, current course information and free-trial terms.'}</p>
            {isComingSoon || isPublishedUnconfirmed
              ? <a className="button button-outline" href={whatsappUrl} target="_blank" rel="noreferrer">{whatsappLabel}</a>
              : <ButtonLink to={enquiryPath} variant="outline">Request a free consultation</ButtonLink>}
          </aside>
        </div>
        <Link className="back-link" to="/courses"><span aria-hidden="true">←</span> Back to all courses</Link>
      </section>
    </>
  );
}
