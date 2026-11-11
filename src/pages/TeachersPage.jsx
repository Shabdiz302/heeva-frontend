import { useMemo, useState } from 'react';
import { teachers, teacherCategories } from '../data/teachers.js';
import { CTASection, Eyebrow, PageIntro, TeacherCard } from '../components/ContentBlocks.jsx';

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
      <PageIntro eyebrow="The people behind the lessons" title={<>Meet the Heeva <em>teachers.</em></>}>
        <p>Explore the teachers currently listed in Heeva’s public directory. Names, roles, portraits, and biographies come from their published profiles.</p>
      </PageIntro>
      <section className="shell page-content teacher-directory-content">
        <div className="teacher-directory-controls">
          <label className="search-control">
            <span className="sr-only">Search teachers</span><span aria-hidden="true">⌕</span>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, subject, or keyword" />
          </label>
          <div className="filter-row" role="group" aria-label="Filter teachers by subject">
            {teacherCategories.map((item) => <button className={`filter-chip${category === item.id ? ' is-active' : ''}`} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)} key={item.id}>{item.label}</button>)}
          </div>
        </div>
        <p className="results-count" aria-live="polite">Showing {filteredTeachers.length} of {teachers.length} published teachers</p>
        {filteredTeachers.length ? (
          <div className="teacher-grid teacher-grid-directory">
            {filteredTeachers.map((teacher, index) => <TeacherCard teacher={teacher} index={index} key={teacher.slug} />)}
          </div>
        ) : (
          <div className="empty-results"><span aria-hidden="true">⌕</span><h2>No teacher found</h2><p>Try a different name, subject, or search term.</p><button className="text-link" type="button" onClick={() => { setQuery(''); setCategory('all'); }}>Show all teachers <span aria-hidden="true">↗</span></button></div>
        )}
      </section>
      <section className="teacher-practice-section">
        <div className="shell teacher-practice-grid">
          <div className="practice-bigmark" aria-hidden="true">✳</div>
          <div>
            <Eyebrow>Teacher onboarding & training</Eyebrow>
            <h2>Ask us about the process behind the <em>people.</em></h2>
            <p>Heeva’s public information describes teacher onboarding and regular training. Families can ask about current safeguarding arrangements and any checks relevant to them before enrolment.</p>
            <p className="small-note">Experience and credentials appear on profiles only where the published biography states them. Please confirm current information with Heeva.</p>
          </div>
        </div>
      </section>
      <CTASection title="Let’s find a good place to begin.">Book a free consultation to discuss course fit and the teachers who may be available.</CTASection>
    </>
  );
}
