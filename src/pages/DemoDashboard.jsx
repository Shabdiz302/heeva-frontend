import { useState } from 'react';
import { Link } from '../router.jsx';
import { courses } from '../data/courses.js';
import { teachers } from '../data/teachers.js';
import './demo-dashboard.css';

// Visual demonstration ONLY: these accounts grant no backend session or protected API access.
// The route is omitted from any live production build and refuses to render on production hosts.
const demos = {
  'student.demo@heeva.example': { password: 'HeevaDemo2026!', name: 'Alex Morgan', role: 'student' },
  'educator.demo@heeva.example': { password: 'HeevaDemo2026!', name: 'Samira Roberts', role: 'educator' },
  'admin.demo@heeva.example': { password: 'HeevaDemo2026!', name: 'Heeva Review Team', role: 'admin' },
};
const labels = { student: 'Student / Parent', educator: 'Educator', admin: 'Administrator' };
const sampleCourses = [courses.find(c=>c.slug==='piano'),courses.find(c=>c.slug==='general-english'),courses.find(c=>c.slug==='gcse-maths')].filter(Boolean);

export default function DemoDashboard() {
  const allowed = import.meta.env.DEV || (typeof window!=='undefined' && (
    window.location.hostname.endsWith('.workers.dev') || window.location.hostname.endsWith('.github.io')
  ));
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [user,setUser] = useState(null);
  const [error,setError] = useState('');
  const [tab,setTab] = useState('overview');
  if(!allowed) return <div className="shell demo-disabled"><h1>Demo unavailable</h1><p>This preview-only tool is not available on Heeva's live website.</p><Link to="/">Return home</Link></div>;
  const signIn=(event)=>{
    event.preventDefault();
    const found=demos[email.trim().toLowerCase()];
    if (!found || password!==found.password) { setError('Sample credentials do not match. Choose one of the demo accounts below.');return; }
    setUser(found);setError('');setTab('overview');setPassword('');
  };
  const signOut=()=>{setUser(null);setEmail('');setPassword('');setTab('overview')};
  const demoRows = user?.role==='student' ? [
    ['My learning','1 course request awaiting confirmation'],['Free introductory lesson','1 eligible request · not scheduled'],['Next lesson','Not confirmed yet'],['Course materials','Available after enrolment']
  ] : user?.role==='educator' ? [
    ['Profile','Sample biography ready for Heeva review'],['Course proposals','2 drafts · awaiting approval'],['Introductory video','Not uploaded'],['Upcoming lessons','No confirmed lessons']
  ] : [
    ['Educator applications','3 sample applications for review'],['Course approvals','2 sample proposals'],['Enrolment requests','5 sample requests'],['Confirmed lessons','0 in demo']
  ];
  return <main className="shell heeva-demo" aria-label="Heeva sample dashboard">
    <div className="demo-ribbon">DEMO ONLY · SAMPLE DATA · NO LIVE ACCOUNTS OR BOOKINGS</div>
    {!user ? <>
      <div className="demo-intro"><span className="demo-eyebrow">HEEVA DASHBOARD PREVIEW</span><h1>Explore the Heeva dashboards</h1><p>Use any sample account below to see how each dashboard is organised. This is a self-contained visual demonstration—not access to the live or staging database.</p></div>
      <div className="demo-layout">
        <form onSubmit={signIn} className="demo-login-panel">
          <h2>Sample sign in</h2>
          <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="off" required placeholder="student.demo@heeva.example"/></label>
          <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="off" required placeholder="Sample password"/></label>
          {error&&<p className="demo-error" role="alert">{error}</p>}
          <button className="button" type="submit">Enter demo dashboard</button>
        </form>
        <div className="demo-accounts">
          <h2>Choose a sample role</h2>
          {Object.entries(demos).map(([address,account])=><button key={address} type="button" className="demo-account-choice" onClick={()=>{setEmail(address);setPassword(account.password);setError('')}}><strong>{labels[account.role]}</strong><small>{address}</small><span>Fill sample credentials ↗</span></button>)}
          <p>All three accounts use <code>HeevaDemo2026!</code>. Do not enter personal information or passwords you use elsewhere.</p>
        </div>
      </div>
    </> : <>
      <div className="demo-dash-heading"><div><span className="demo-eyebrow">HEEVA {labels[user.role].toUpperCase()} PORTAL</span><h1>Welcome, {user.name}</h1><p>{labels[user.role]} dashboard — sample data only</p></div><button type="button" className="demo-logout" onClick={signOut}>Switch demo account</button></div>
      <div className="demo-dashboard-grid">
        <nav className="demo-dash-nav" aria-label="Demo dashboard navigation">
          {(user.role==='student'
            ? [['overview','Overview'],['courses','My courses'],['profile','Learner profiles'],['messages','Support']]
            : user.role==='educator'
              ? [['overview','Overview'],['profile','My educator profile'],['courses','My course offers'],['messages','Heeva feedback']]
              : [['overview','Overview'],['profile','Educator applications'],['courses','Course approvals'],['messages','Enrolment requests']]
          ).map(([id,label])=><button type="button" key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}
        </nav>
        <section className="demo-dash-content">
          {tab==='overview'?<>
            <h2>Dashboard overview</h2>
            <div className="demo-metrics">{demoRows.map(([title,value])=><article key={title}><span>{title}</span><strong>{value}</strong></article>)}</div>
            <p className="demo-tip">The real portal will display information from your account once the private API has been deployed and connected. This demo deliberately performs no account changes.</p>
          </>:tab==='profile'?<>
            <h2>{user.role==='student'?'Learner profiles':user.role==='educator'?'Professional educator profile':'Educator applications'}</h2>
            {user.role==='student'?<div className="demo-panel"><h3>Alex's learner profile</h3><p>Age group: 13–17 · Preferred language: English</p><p>Parent and guardian controls and privacy settings will be available in the connected platform.</p></div>:user.role==='educator'?<div className="demo-panel"><h3>Samira Roberts — Piano and beginner music</h3><p>Sample biography: “I help new learners build confidence at the piano through practical, encouraging lessons.”</p><p>Photo status: Draft · AI writing assistance: optional · Heeva review: Pending</p></div>:<div className="demo-panel"><h3>Pending applications</h3><p>Samira Roberts · Music · Needs profile review</p><p>Jordan Patel · School Maths · Awaiting qualifications check</p><p>Olivia Chen · Languages · Awaiting suitability checks</p></div>}
          </>:tab==='courses'?<>
            <h2>{user.role==='student'?'Courses and learning':user.role==='educator'?'Proposed course offers':'Course approval queue'}</h2>
            <div className="demo-course-list">{sampleCourses.map(c=><article key={c.slug}><strong>{c.title}</strong><span>{c.status==='coming-soon'?'Coming soon':'Availability to be confirmed'}</span><p>{user.role==='student'?'Contact Heeva to request a lesson.':user.role==='educator'?'Proposed teaching offer is private until approved.':'Review tutor suitability, course details and price before publishing.'}</p></article>)}</div>
          </>:<><h2>{user.role==='admin'?'Enrolment requests':'Messages and support'}</h2><div className="demo-panel"><p>{user.role==='admin'?'Sample enquiries are shown here after the secure backend is connected.':'For help with courses, availability or the approval process, contact Heeva support.'}</p></div></>}
        </section>
      </div>
    </>}
  </main>;
}
