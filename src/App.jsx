import { useEffect, useRef } from 'react';
import { courses } from './data/courses.js';
import { teachers } from './data/teachers.js';
import { RouterProvider, useRouter } from './router.jsx';
import { SiteLayout } from './components/SiteLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import CoursesPage from './pages/CoursesPage.jsx';
import CourseDetailPage from './pages/CourseDetailPage.jsx';
import TeachersPage from './pages/TeachersPage.jsx';
import TeacherProfilePage from './pages/TeacherProfilePage.jsx';
import HowItWorksPage from './pages/HowItWorksPage.jsx';
import ParentsPage from './pages/ParentsPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ConsultationPage from './pages/ConsultationPage.jsx';
import FaqPage from './pages/FaqPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import OrganisationsPage from './pages/OrganisationsPage.jsx';
import './styles/organisations.css';

const pageMeta = {
  '/': ['Heeva Courses | Discover what makes your child possible', 'Personalised online courses, a free consultation and room to discuss the right next step with Heeva.'],
  '/courses': ['Courses | Heeva Courses', 'Explore Heeva’s published online courses in music, languages and creative arts. Discuss fees and suitability in a free consultation.'],
  '/teachers': ['Our teachers | Heeva Courses', 'Search the current Heeva teacher directory by name, subject, or biography and open individual teacher profiles.'],
  '/how-heeva-works': ['How Heeva works | Heeva Courses', 'Learn how to begin with a free consultation and discuss course information, trial terms and next steps.'],
  '/for-parents': ['For parents | Heeva Courses', 'Information for families about course fit, fees, teacher onboarding, safeguarding and published policies.'],
  '/about': ['About Heeva | Heeva Courses', 'Learn about Heeva Courses and its published focus on individual online learning.'],
  '/for-organisations': ['Heeva for Organisations | Leadership, HRM & Healthcare Management', 'Management development, corporate training and organisational advisory shaped around your organisation.'],
  '/consultation': ['Free consultation | Heeva Courses', 'Preview the Heeva consultation journey. This form does not send or save personal information.'],
  '/faq': ['Frequently asked questions | Heeva Courses', 'Answers about online courses, free consultations, course details, safeguarding questions and this preview form.'],
  '/contact': ['Contact Heeva | Heeva Courses', 'Published contact information for Heeva Courses Ltd. in London.'],
};

function CurrentPage() {
  const { pathname } = useRouter();
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return <HomePage />;
  if (path === '/courses') return <CoursesPage />;
  if (path === '/teachers') return <TeachersPage />;
  const teacherMatch = path.match(/^\/teachers\/([^/]+)$/);
  if (teacherMatch) {
    const teacher = teachers.find((item) => item.slug === teacherMatch[1]);
    return teacher ? <TeacherProfilePage teacher={teacher} /> : <NotFoundPage />;
  }
  if (path === '/how-heeva-works') return <HowItWorksPage />;
  if (path === '/for-parents') return <ParentsPage />;
  if (path === '/about') return <AboutPage />;
  if (path === '/for-organisations') return <OrganisationsPage />;
  if (path === '/consultation') return <ConsultationPage />;
  if (path === '/faq') return <FaqPage />;
  if (path === '/contact') return <ContactPage />;
  const match = path.match(/^\/courses\/([^/]+)$/);
  if (match) {
    const course = courses.find((item) => item.slug === match[1]);
    return course ? <CourseDetailPage course={course} /> : <NotFoundPage />;
  }
  return <NotFoundPage />;
}

function SeoAndFocus() {
  const { pathname } = useRouter();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/';
    const course = path.startsWith('/courses/') ? courses.find((item) => item.slug === path.split('/')[2]) : null;
    const teacher = path.startsWith('/teachers/') ? teachers.find((item) => item.slug === path.split('/')[2]) : null;
    const title = course
      ? `${course.title} | Heeva Courses`
      : teacher
        ? `${teacher.name} | Heeva Teachers`
        : (pageMeta[path]?.[0] ?? 'Page not found | Heeva Courses');
    const description = course
      ? `Published session information for ${course.title}. Ask about course suitability and current fees in a free consultation.`
      : teacher
        ? `${teacher.name}, ${teacher.role}. ${teacher.summary}`
        : (pageMeta[path]?.[1] ?? 'The requested page could not be found.');
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    if (previousPath.current !== pathname) {
      document.getElementById('main-content')?.focus({ preventScroll: true });
      previousPath.current = pathname;
    }
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <RouterProvider>
      <SeoAndFocus />
      <SiteLayout><CurrentPage /></SiteLayout>
    </RouterProvider>
  );
}
