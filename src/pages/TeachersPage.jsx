import { useMemo, useState } from 'react';
import { Link } from '../router.jsx';
import { teachers, teacherCategories } from '../data/teachers.js';
import { CTASection, Eyebrow, PageIntro, TeacherCard } from '../components/ContentBlocks.jsx';
import { ApprovedEducators } from './ApprovedEducators.jsx';

export default function TeachersPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const filteredTeachers = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return teachers.filter((teacher) => {
      const matchesCategory = category === 'all' || teacher.category === category;
      const searchable = `${teacher.name} ${teacher.role} ${teacher.subject} ${teacher.bio}`.toLocaleLowerCase();
      return matchesCategory && (!term || searchable.includes(term));
    });
  }, [category, query]);

  return (
    <>
      <PageIntro eyebrow="The people behind the lessons" title={<>Meet our Heeva <em>tutors.</em></>}>
        <p>Browse tutor profiles, see their subjects and teaching experience, and contact Heeva to discuss a suitable match. Availability and suitability are confirmed before booking.</p>
      </PageIntro>
      <section className="shell page-content teacher-directory-content">
        <div className="teacher-directory-controls">
          <label className="search-control">
            <span className="sr-only">Search tutors</span><span aria-hidden="true">⌕</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, subject, or keyword" />
          </label>
          <div className="filter-row" role="group" aria-label="Filter tutors by subject">
            {teacherCategories.map((item) => <button className={`filter-chip${category === item.id ? ' is-active' : ''}`} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)} key={item.id}>{item.label}</button>)}
          </div>
        </div>
        <p className="results-count" aria-live="polite">Showing {filteredTeachers.length} of {teachers.length} listed tutors</p>
        {filteredTeachers.length ? (
          <div className="teacher-grid teacher-grid-directory">
            {filteredTeachers.map((teacher, index) => <TeacherCard teacher={teacher} index={index} key={teacher.slug} />)}
          </div>
        ) : (
          <div className="empty-results"><span aria-hidden="true">⌕</span><h2>No tutors found</h2><p>Try a different name, subject, or search term.</p><button className="text-link" type="button" onClick={() => { setQuery(''); setCategory('all'); }}>Show all tutors <span aria-hidden="true">↗</span></button></div>
        )}
      </section>
      <section className="shell page-content"><ApprovedEducators query={query}/></section>
      <section className="teacher-practice-section">
        <div className="shell teacher-practice-grid">
          <div className="practice-bigmark" aria-hidden="true">✳</div>
          <div>
            <Eyebrow>Educator applications and review</Eyebrow>
            <h2>Ask us about the process behind the <em>people.</em></h2>
            <p>New educators create profiles and submit them to Heeva for review. Ask about qualifications, suitability and applicable safeguarding checks before arranging lessons for a child.</p>
            <p className="small-note">A public profile is not a guarantee of current availability or a specific qualification. Heeva can discuss the checks relevant to your needs.</p>
            <p><Link className="button button-outline" to="/teacher/apply">Apply to teach with Heeva</Link></p>
          </div>
        </div>
      </section>
      <CTASection title="Let’s find a good place to begin.">Request a free consultation to discuss course fit and tutors who may be available.</CTASection>
    </>
  );
}
