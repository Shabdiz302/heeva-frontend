import React, { useMemo, useState } from 'react';

const courses = [
  { id: 'music', title: 'Music', desc: 'Find their rhythm, build confidence and enjoy making music.', icon: '♫', tint: 'peach', tags: ['Piano', 'Guitar', 'Violin', 'Music discovery'], age: 'Ages 5+' },
  { id: 'languages', title: 'Languages', desc: 'Help them express themselves and connect with a wider world.', icon: 'あ', tint: 'lavender', tags: ['English', 'Farsi', 'Reading & writing'], age: 'Ages 5+' },
  { id: 'creative', title: 'Creative arts', desc: 'Make space for imagination, curiosity and creative confidence.', icon: '✳', tint: 'mint', tags: ['Drawing', 'Watercolour', 'Arts for children'], age: 'Ages 4+' },
  { id: 'school', title: 'Learning support', desc: 'Personalised guidance that meets each learner where they are.', icon: '✎', tint: 'yellow', tags: ['Study support', 'Skills development'], age: 'By consultation' },
];

const steps = [
  ['01', 'Tell us what they love', 'Share your child’s interests, age and what you hope they will discover.'],
  ['02', 'Meet the right teacher', 'We help you find a teacher and learning approach that feels right.'],
  ['03', 'Start with confidence', 'Begin a personalised learning journey with support along the way.'],
];

function Arrow({ light = false }) {
  return <span className={`arrow ${light ? 'arrow-light' : ''}`} aria-hidden="true">↗</span>;
}

function Header({ onConsult }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <a className="brand" href="#home" aria-label="Heeva home"><span className="brand-mark">h</span><span>heeva<span className="brand-dot">.</span></span></a>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>☰</button>
      <nav className={open ? 'nav nav-open' : 'nav'}>
        <a href="#courses" onClick={() => setOpen(false)}>Explore courses</a>
        <a href="#approach" onClick={() => setOpen(false)}>How it works</a>
        <a href="#teachers" onClick={() => setOpen(false)}>Our teachers</a>
        <a href="#parents" onClick={() => setOpen(false)}>For parents</a>
        <button className="button button-small" onClick={() => { setOpen(false); onConsult(); }}>Free consultation <Arrow /></button>
      </nav>
    </header>
  );
}

function App() {
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ parent: '', email: '', childAge: '', interest: '', message: '' });
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(c => [c.title, c.desc, ...c.tags].join(' ').toLowerCase().includes(q));
  }, [query]);

  const scrollToConsult = () => document.getElementById('consultation')?.scrollIntoView({ behavior: 'smooth' });
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    setNotice('Thank you. This is a design preview: your enquiry has not been sent. We will connect this form to Heeva’s PHP system after the backend audit.');
  };

  return (
    <div id="home">
      <div className="topline"><span className="spark">✦</span> Learning that grows with them <span className="topline-sep">·</span> Personalised online lessons for curious minds</div>
      <Header onConsult={scrollToConsult} />

      <main>
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot"></span> A little curiosity goes a long way</div>
            <h1>Discover what makes your child <em>shine.</em></h1>
            <p className="hero-lead">Personalised online learning in music, languages and creative arts — guided by teachers who help every child find their own way.</p>
            <div className="hero-actions">
              <button className="button" onClick={scrollToConsult}>Book your free consultation <Arrow light /></button>
              <a className="text-link" href="#courses">Explore our courses <span>↓</span></a>
            </div>
            <div className="hero-proof"><div className="avatar-stack"><span>✿</span><span>♫</span><span>✎</span></div><div><strong>Made around your child</strong><small>One-to-one learning, personal attention</small></div></div>
          </div>
          <div className="hero-art">
            <div className="art-blob"></div>
            <div className="art-image"><img src="https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1000&q=85" alt="Child smiling while learning" /></div>
            <div className="floating-note note-one">♫</div>
            <div className="floating-note note-two">✳</div>
            <div className="floating-card"><span className="mini-star">✦</span><div><b>Every child is different.</b><small>So is every learning journey.</small></div></div>
            <div className="art-caption">Curiosity looks good on you.</div>
          </div>
          <div className="hero-bottom"><span>01 / 04</span><span className="hero-line"></span><span>Learn · Create · Grow</span></div>
        </section>

        <section className="trust-strip">
          <div><span className="trust-icon">♡</span><span><b>Personalised lessons</b><small>Built around each learner</small></span></div>
          <div><span className="trust-icon">☼</span><span><b>Carefully matched teachers</b><small>Supportive, experienced educators</small></span></div>
          <div><span className="trust-icon">⌂</span><span><b>Learn from home</b><small>Online, one-to-one sessions</small></span></div>
        </section>

        <section className="section-wrap courses-section" id="courses">
          <div className="section-heading">
            <div><div className="eyebrow">A world of possibilities</div><h2>What would they love<br/>to <em>explore?</em></h2></div>
            <p>Start with what sparks their interest. We’ll help you find a learning path that feels exciting, achievable and truly theirs.</p>
          </div>
          <div className="search-box"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search music, languages, art..." aria-label="Search courses"/><kbd>SEARCH</kbd></div>
          <div className="course-grid">
            {filtered.map((c, i) => <article className={`course-card ${c.tint}`} key={c.id}>
              <div className="course-top"><span className="course-icon">{c.icon}</span><span className="course-age">{c.age}</span></div>
              <h3>{c.title}</h3><p>{c.desc}</p>
              <div className="tag-list">{c.tags.map(t => <span key={t}>{t}</span>)}</div>
              <button className="card-link" onClick={scrollToConsult}>Find their class <Arrow /></button>
              <span className="card-number">0{i + 1}</span>
            </article>)}
          </div>
          {filtered.length === 0 && <p className="empty-state">No exact match yet. Tell us what they’re interested in and we’ll help you explore.</p>}
          <div className="course-note"><span>✦</span> Not sure where to begin? That’s what the free consultation is for. <button onClick={scrollToConsult}>Let’s talk <Arrow /></button></div>
        </section>

        <section className="approach-section" id="approach">
          <div className="section-wrap approach-inner">
            <div className="approach-visual">
              <div className="approach-photo"><img src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=85" alt="Parent supporting a child learning at home"/></div>
              <div className="round-stamp"><span>LEARN AT</span><b>their<br/>own pace</b><span>✦ WITH HEEVA ✦</span></div>
              <span className="doodle doodle-a">✳</span><span className="doodle doodle-b">〰</span>
            </div>
            <div className="approach-copy">
              <div className="eyebrow eyebrow-light">A thoughtful start</div>
              <h2>Good learning<br/>starts with <em>being heard.</em></h2>
              <p>Choosing a class is about more than a subject. It’s about finding the right person, pace and encouragement for your child.</p>
              <div className="steps">{steps.map(([n,t,d]) => <div className="step" key={n}><span className="step-num">{n}</span><div><h3>{t}</h3><p>{d}</p></div></div>)}</div>
              <button className="button button-cream" onClick={scrollToConsult}>Let’s find their fit <Arrow /></button>
            </div>
          </div>
        </section>

        <section className="section-wrap teacher-section" id="teachers">
          <div className="teacher-copy"><div className="eyebrow">The people behind the progress</div><h2>Meet the teachers<br/>who make learning <em>feel possible.</em></h2><p>Great teachers do more than explain a subject. They notice the small wins, build confidence and make room for questions.</p><button className="text-link" onClick={scrollToConsult}>Find the right teacher <Arrow /></button></div>
          <div className="teacher-visual"><img src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=1000&q=85" alt="Teacher working with a learner"/><div className="teacher-label"><span>✦</span><div><b>Expert guidance,</b><small>a personal connection.</small></div></div></div>
        </section>

        <section className="parent-section" id="parents">
          <div className="section-wrap parent-inner">
            <div className="parent-quote-mark">“</div>
            <div className="parent-content"><div className="eyebrow">For the people cheering them on</div><h2>Confidence is a wonderful<br/>thing to <em>grow.</em></h2><p>We believe learning should feel encouraging for children and reassuring for parents. We’ll help you understand the options, meet the teacher and choose the next step with confidence.</p><div className="parent-points"><span>✓ A conversation before you choose</span><span>✓ A learning plan shaped around your child</span><span>✓ Support as they make progress</span></div></div>
            <div className="parent-side"><div className="parent-illustration">✿</div><b>Small steps.<br/>Big possibilities.</b><small>Let’s make room for both.</small></div>
          </div>
        </section>

        <section className="section-wrap consultation-section" id="consultation">
          <div className="consult-copy"><div className="eyebrow">Your first step is a conversation</div><h2>Let’s find the<br/>right <em>starting point.</em></h2><p>Tell us a little about what your child enjoys. We’ll use the conversation to understand what you’re looking for and discuss suitable options.</p><div className="consult-aside"><span>✦</span><div><b>Free, friendly and no pressure.</b><small>Just a helpful conversation about what could work.</small></div></div></div>
          <form className="consult-form" onSubmit={submit}>
            <h3>Book a free consultation</h3><p>Share a few details and we’ll take it from there.</p>
            <label>Parent or guardian name<input name="parent" value={form.parent} onChange={update} placeholder="Your name" required/></label>
            <label>Email address<input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" required/></label>
            <div className="form-row"><label>Child’s age<select name="childAge" value={form.childAge} onChange={update} required><option value="">Choose age</option>{Array.from({length:15},(_,i)=><option key={i}>{i+4}</option>)}<option>19+</option></select></label><label>Area of interest<select name="interest" value={form.interest} onChange={update} required><option value="">Choose one</option><option>Music</option><option>Languages</option><option>Creative arts</option><option>Learning support</option><option>Not sure yet</option></select></label></div>
            <label>Anything you’d like us to know? <span className="optional">(optional)</span><textarea name="message" value={form.message} onChange={update} placeholder="A little about their interests or what you're looking for..." rows="3"/></label>
            <button className="button form-submit" type="submit">Request my consultation <Arrow light /></button>
            <small className="form-privacy">This preview does not transmit or store your details. A secure privacy notice and PHP form integration are required before launch.</small>
            {notice && <div className="form-notice" role="status">{notice}</div>}
          </form>
        </section>
      </main>

      <footer className="footer">
        <div className="section-wrap footer-main"><div className="footer-brand"><a className="brand brand-footer" href="#home"><span className="brand-mark">h</span><span>heeva<span className="brand-dot">.</span></span></a><p>Helping curious minds discover<br/>what makes them shine.</p></div><div><b>Explore</b><a href="#courses">Courses</a><a href="#teachers">Our teachers</a><a href="#approach">How it works</a></div><div><b>For families</b><a href="#parents">Why Heeva</a><a href="#consultation">Free consultation</a><a href="#consultation">Get in touch</a></div><div><b>Information</b><a href="#footer-note">Privacy policy</a><a href="#footer-note">Terms of service</a><a href="#footer-note">Safeguarding</a></div></div>
        <div className="section-wrap footer-bottom" id="footer-note"><span>© {new Date().getFullYear()} Heeva Courses Ltd. All rights reserved.</span><span>Made for curious minds <b>✦</b></span></div>
      </footer>
    </div>
  );
}

export default App;