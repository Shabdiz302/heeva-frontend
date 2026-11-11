import { useEffect, useState } from 'react';
import { Link, useRouter } from '../router.jsx';
import { policies } from '../data/site.js';

const primaryNav = [
  ['Courses', '/courses'],
  ['Our teachers', '/teachers'],
  ['How it works', '/how-heeva-works'],
  ['For parents', '/for-parents'],
  ['About', '/about'],
];

function Brand({ footer = false }) {
  return (
    <Link className={`brand${footer ? ' brand-footer' : ''}`} to="/" aria-label="Heeva Courses home">
      <img className="brand-logo" src="/images/brand/heeva-logo.png" width="160" height="81" alt="Heeva Courses" />
    </Link>
  );
}

export function SiteHeader() {
  const { pathname } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const courseActive = pathname.startsWith('/courses');

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="utility-bar">
        <div className="shell utility-inner">
          <span><span className="utility-spark">✳</span> A little curiosity goes a long way</span>
          <span className="utility-note">Personalised online lessons · Start with a free consultation</span>
          <Link to="/contact" className="utility-contact">Get in touch <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Brand />
          <button
            className="menu-toggle"
            type="button"
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span /><span />
          </button>
          <nav id="primary-navigation" className={`primary-nav${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation">
            {primaryNav.map(([label, to]) => {
              const active = to === '/courses' ? courseActive : pathname === to;
              return <Link key={to} to={to} aria-current={active ? 'page' : undefined} onClick={closeMenu}>{label}</Link>;
            })}
            <Link className="button button-nav" to="/consultation" onClick={closeMenu}>Book a free consultation <span aria-hidden="true">↗</span></Link>
          </nav>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-main">
        <div className="footer-intro">
          <Brand footer />
          <p>Good learning starts with a conversation. Let’s find a thoughtful next step for your family.</p>
          <Link className="footer-email" to="/contact">Get in touch <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="footer-col">
          <h2>Explore</h2>
          <Link to="/courses">All courses</Link>
          <Link to="/teachers">Our teachers</Link>
          <Link to="/how-heeva-works">How Heeva works</Link>
        </div>
        <div className="footer-col">
          <h2>For families</h2>
          <Link to="/for-parents">Information for parents</Link>
          <Link to="/faq">Frequently asked questions</Link>
          <Link to="/consultation">Free consultation</Link>
        </div>
        <div className="footer-col">
          <h2>Heeva</h2>
          <Link to="/about">About Heeva</Link>
          <Link to="/contact">Contact</Link>
          <a href={policies.privacy} target="_blank" rel="noreferrer">Privacy policy <span aria-hidden="true">↗</span></a>
          <a href={policies.terms} target="_blank" rel="noreferrer">Terms of service <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Heeva Courses Ltd. All rights reserved.</span>
        <span>Made for curious minds <b aria-hidden="true">✳</b></span>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader />
      <main id="main-content" tabIndex="-1">{children}</main>
      <SiteFooter />
    </>
  );
}
