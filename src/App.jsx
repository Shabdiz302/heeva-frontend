import { useEffect, useRef } from 'react';
import { courses } from './data/courses.js';
import { teachers } from './data/teachers.js';
import { contact } from './data/site.js';
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

const SITE_URL = 'https://heevacourses.com';
const SITE_NAME = 'Heeva Courses';

const pageMeta = {
  '/': [
    'Heeva Courses | Personalised Online Lessons for Curious Minds',
    'Explore personalised online music, language and creative arts lessons. Discover Heeva’s teachers, course information and a free consultation.',
  ],
  '/courses': [
    'Online Courses in Music, Languages & Creative Arts | Heeva',
    'Explore a selection of Heeva online courses. Visit the existing Heeva catalogue for all current courses, live availability, prices and booking.',
  ],
  '/teachers': [
    'Meet Our Online Teachers | Heeva Courses',
    'Meet Heeva’s published online teachers across music, languages and creative arts. Read teacher biographies and explore their subjects.',
  ],
  '/how-heeva-works': [
    'How Heeva Works | Online Lessons and Free Trial Information',
    'Find out how to explore Heeva courses, ask questions, create a student account and check the current free trial terms.',
  ],
  '/for-parents': [
    'Information for Parents | Heeva Courses',
    'Information for families about course suitability, fees, teacher information, safeguarding questions and how to contact Heeva.',
  ],
  '/about': [
    'About Heeva Courses | Personalised Online Learning',
    'Learn about Heeva Courses Ltd. and its approach to individual online lessons in music, languages and creative subjects.',
  ],
  '/for-organisations': [
    'Leadership Development & Healthcare Management Training | Heeva for Business',
    'Research-informed leadership development, healthcare management education, HRM, organisational development and scoped advisory for organisations.',
  ],
  '/consultation': [
    'Contact Heeva About Courses | Heeva Courses',
    'Contact Heeva to discuss course suitability, current course information, fees and the next steps for booking.',
  ],
  '/faq': [
    'Frequently Asked Questions | Heeva Courses',
    'Answers to common questions about Heeva courses, online lessons, consultations, student accounts and trial arrangements.',
  ],
  '/contact': [
    'Contact Heeva Courses | Get in Touch',
    'Contact Heeva Courses Ltd. in the UK about online courses, teachers, student registration or general enquiries.',
  ],
};

function upsertMeta(attribute, key, content) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertCanonical(url) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

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
    const fallback = ['Page not found | Heeva Courses', 'The requested page could not be found.'];
    const [baseTitle, baseDescription] = pageMeta[path] ?? fallback;
    const title = course
      ? `${course.title} | Heeva Courses`
      : teacher
        ? `${teacher.name} | Heeva Teachers`
        : baseTitle;
    const description = course
      ? `Published information about ${course.title}. Check the full Heeva catalogue for current availability, prices and booking information.`
      : teacher
        ? `${teacher.name}, ${teacher.role}. ${teacher.summary}`
        : baseDescription;
    const canonicalUrl = `${SITE_URL}${path}`;
    const isProductionHost = ['heevacourses.com', 'www.heevacourses.com'].includes(window.location.hostname);
    const isKnownRoute = Boolean(pageMeta[path] || course || teacher);
    const shouldIndex = isProductionHost && isKnownRoute && path !== '/consultation';

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', shouldIndex ? 'index,follow,max-image-preview:large' : 'noindex,nofollow');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', `${SITE_URL}/images/brand/heeva-logo.png`);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', `${SITE_URL}/images/brand/heeva-logo.png`);
    upsertCanonical(canonicalUrl);

    const structuredData = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Heeva Courses Ltd.',
        url: SITE_URL,
        logo: `${SITE_URL}/images/brand/heeva-logo.png`,
        email: contact.email,
        telephone: contact.telephone,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ];

    if (path === '/for-organisations') {
      structuredData.push({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: 'Heeva for Business',
        serviceType: 'Leadership development, healthcare management education, human resource management and organisational advisory',
        description: pageMeta[path][1],
        provider: { '@id': `${SITE_URL}/#organization` },
        url: canonicalUrl,
      });
    }

    let jsonLd = document.getElementById('heeva-structured-data');
    if (!jsonLd) {
      jsonLd = document.createElement('script');
      jsonLd.id = 'heeva-structured-data';
      jsonLd.type = 'application/ld+json';
      document.head.appendChild(jsonLd);
    }
    jsonLd.textContent = JSON.stringify(structuredData);

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
