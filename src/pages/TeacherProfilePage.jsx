import { Link } from '../router.jsx';
import { CTASection, Eyebrow } from '../components/ContentBlocks.jsx';

export default function TeacherProfilePage({ teacher }) {
  return (
    <>
      <div className="shell breadcrumbs"><Link to="/teachers">Our teachers</Link><span aria-hidden="true">/</span><span>{teacher.name}</span></div>
      <section className="shell teacher-profile-hero">
        <div className="teacher-profile-photo">
          <picture>
            <source srcSet={teacher.photo} type="image/webp" />
            <img src={teacher.originalPhoto} alt={`Portrait of ${teacher.name}, ${teacher.role}`} width="263" height="223" loading="eager" decoding="async" style={{ objectPosition: teacher.imagePosition || 'center' }} />
          </picture>
        </div>
        <div className="teacher-profile-copy">
          <Eyebrow>{teacher.role}</Eyebrow>
          <h1>{teacher.name}</h1>
          <p className="teacher-profile-subject">{teacher.subject}</p>
          <p>{teacher.bio}</p>
          <p className="teacher-source-note">Biography edited for clarity from Heeva’s published teacher profile. Experience and credentials are included only where stated in that profile.</p>
          <a className="text-link" href={teacher.source} target="_blank" rel="noreferrer">View Heeva’s teacher directory <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </section>
      <section className="shell teacher-profile-actions">
        <Link className="back-link" to="/teachers"><span aria-hidden="true">←</span> Back to all teachers</Link>
      </section>
      <CTASection title="Talk through the next step.">Ask Heeva about course fit, current availability, and which teachers may be suitable for your learner.</CTASection>
    </>
  );
}
