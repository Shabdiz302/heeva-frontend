import { useMemo, useState } from 'react';
import { categories, courses } from '../data/courses.js';
import { CourseCard, Eyebrow, PageIntro, ButtonLink } from '../components/ContentBlocks.jsx';

export default function CoursesPage() {
  const [category, setCategory] = useState(() => new URLSearchParams(window.location.search).get('category') || 'all');
  const [search, setSearch] = useState('');
  const visibleCourses = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return courses.filter((course) => {
      const matchesCategory = category === 'all' || course.category === category;
      return matchesCategory && (!term || `${course.title} ${course.category} ${course.description || ''}`.toLocaleLowerCase().includes(term));
    });
  }, [category, search]);

  return (
    <>
      <PageIntro eyebrow="Explore Heeva" title={<>Courses to <em>discover.</em></>}>
        <p>Explore Heeva’s published courses and new subjects planned for launch. Existing courses link to their current Heeva pages; upcoming programmes are clearly marked.</p>
      </PageIntro>
      <section className="shell page-content courses-page-content">
        <div className="course-controls">
          <label className="search-control"><span className="sr-only">Search courses</span><span aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by course or subject" /></label>
          <div className="filter-row" role="group" aria-label="Filter courses by category">
            {categories.map((item) => <button className={`filter-chip${category === item.id ? ' is-active' : ''}`} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)} key={item.id}>{item.label}</button>)}
          </div>
        </div>
        <p className="results-count" aria-live="polite">{visibleCourses.length} {visibleCourses.length === 1 ? 'course' : 'courses'} shown · {visibleCourses.filter((course) => !course.status || course.status === 'available').length} available · {visibleCourses.filter((course) => course.status === 'published-check-details').length} published to check · {visibleCourses.filter((course) => course.status === 'coming-soon').length} coming soon</p>
        {visibleCourses.length > 0 ? <div className="course-grid course-grid-four">{visibleCourses.map((course) => <CourseCard course={course} key={course.slug} />)}</div> : <div className="empty-results"><span aria-hidden="true">⌕</span><h2>No course found</h2><p>Try another search or choose a different category.</p><button className="text-link" type="button" onClick={() => { setSearch(''); setCategory('all'); }}>Show all courses <span aria-hidden="true">↗</span></button></div>}
        <div className="page-cta-band"><div><Eyebrow>Need a little help choosing?</Eyebrow><h2>Talk it through with Heeva.</h2><p>Use a free consultation to discuss course fit and current fees.</p></div><ButtonLink to="/consultation">Book a consultation</ButtonLink></div>
      </section>
    </>
  );
}
