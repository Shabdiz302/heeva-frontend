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
  const role = user?.role || 'student';
  const tabs = {
    student: [['overview','Overview','◫'],['courses','My courses','▤'],['lessons','Lessons & calendar','▦'],['trial','Free lesson','✳'],['profile','Family profiles','♙'],['billing','Payments','£'],['messages','Help & support','✉']],
    educator: [['overview','Overview','◫'],['profile','Professional profile','♙'],['courses','Course proposals','▤'],['lessons','Teaching calendar','▦'],['earnings','Earnings','£'],['media','AI profile studio','✳'],['messages','Heeva feedback','✉']],
    admin: [['overview','Overview','◫'],['profile','Educator approvals','♙'],['courses','Course & price reviews','▤'],['lessons','Lessons & bookings','▦'],['students','Students & parents','♙'],['billing','Finance & payouts','£'],['media','Content & AI review','✳'],['messages','Enquiries & support','✉']]
  };
  const metrics = {
    student: [['01','Active course request','Awaiting confirmation','▤'],['01','Free trial allowance','One per eligible learner','✳'],['00','Confirmed upcoming lessons','Nothing scheduled yet','▦'],['02','Learner profiles','Sample family account','♙']],
    educator: [['75%','Profile completion','Finish verification details','♙'],['02','Course proposals','One awaiting review','▤'],['00','Upcoming lessons','Booking not enabled','▦'],['—','Earnings','Not connected to payments','£']],
    admin: [['03','Educator applications','Awaiting identity checks','♙'],['02','Course proposals','Pricing review required','▤'],['05','Learner requests','Not confirmed bookings','✉'],['00','Confirmed lessons','Staging data only','▦']]
  };
  const activity = {
    student: [['Music course enquiry','Awaiting Heeva response','Review pending'],['One free introductory lesson','Available to request','Not scheduled'],['Account access','Parent/learner setup','Demo only']],
    educator: [['Professional biography','Draft saved locally in demo','Draft'],['Piano lesson offer','Ready for Heeva review','Pending'],['Media assets','Original portrait still required','Action needed']],
    admin: [['Samira Roberts','Piano profile · evidence review','Verification needed'],['GCSE Mathematics','Course pricing · draft','Awaiting pricing'],['Parent enquiry','Introductory lesson request','Unassigned']]
  };
  const quick = {
    student: [['Find a course','courses'],['View lesson plan','lessons'],['Free introductory lesson','trial']],
    educator: [['Complete profile','profile'],['Submit course offer','courses'],['Prepare media','media']],
    admin: [['Review educators','profile'],['Approve course pricing','courses'],['Review enquiries','messages']]
  };
  function displayTab() {
    if(tab==='overview') return <>
      <div className="demo-panel-heading"><div><span className="demo-eyebrow">YOUR WORKSPACE</span><h2>Overview</h2><p>Important information and next steps, all in one place.</p></div><span className="demo-status-pill">Preview data</span></div>
      <div className="demo-metrics">{metrics[role].map(([number,title,detail,symbol])=><article key={title}><span className="demo-metric-icon" aria-hidden="true">{symbol}</span><strong>{number}</strong><h3>{title}</h3><p>{detail}</p></article>)}</div>
      <div className="demo-bottom-grid">
        <section className="demo-panel"><h3>Recent activity</h3><div className="demo-activity">{activity[role].map(([title,detail,status])=><div className="demo-activity-item" key={title}><span className="demo-activity-dot" /><div><strong>{title}</strong><small>{detail}</small></div><em>{status}</em></div>)}</div></section>
        <section className="demo-panel"><h3>Quick actions</h3><p>Jump directly to the part of your portal you want to review.</p><div className="demo-quick">{quick[role].map(([title,target])=><button type="button" onClick={()=>setTab(target)} key={target}>{title} <span aria-hidden="true">↗</span></button>)}</div></section>
      </div>
      <div className="demo-tip"><strong>Preview only.</strong> These values are illustrative. The real dashboard will use verified account records and protected API permissions.</div>
    </>;
    if(tab==='profile') return <>
      <h2>{role==='student'?'Family & learner profiles':role==='educator'?'My professional profile':'Educator application review'}</h2>
      {role==='student'?<div className="demo-detail-grid">
        <article className="demo-panel"><span className="demo-profile-avatar">A</span><h3>Alex Morgan</h3><p>Account holder · Parent / guardian</p><p><strong>Contact:</strong> alex@example.invalid</p><span className="demo-status-pill">Sample account</span></article>
        <article className="demo-panel"><h3>Linked learners</h3><p>Jordan · age 13–17 · English</p><p>Taylor · age 8–12 · English</p><p>Only a parent or authorised guardian can manage a child's learner account.</p></article>
      </div>:role==='educator'?<div className="demo-panel"><div className="demo-progress-heading"><h3>Samira Roberts</h3><b>75% complete</b></div><div className="demo-progress-track"><span style={{width:'75%'}} /></div><p>Beginner piano · Music fundamentals · Online one-to-one</p><p><strong>About:</strong> “I help new learners build confidence at the piano through practical, encouraging lessons.”</p><div className="demo-checklist"><p>✓ Profile details and biography</p><p>✓ Proposed courses and lesson format</p><p>○ Identity and qualifications review</p><p>○ Approved public photograph</p></div><span className="demo-status-pill">Not yet public</span></div>:<div className="demo-course-list">{[['Samira Roberts','Music tutor · Profile complete','Check identity and teaching evidence'],['Jordan Patel','School mathematics · Awaiting documents','Review relevant safeguarding'],['Olivia Chen','Language tutor · Changes requested','Await corrected qualification details']].map(([name,detail,next])=><article key={name}><h3>{name}</h3><p>{detail}</p><span className="demo-status-pill">{next}</span></article>)}</div>}
    </>;
    if(tab==='courses') return <>
      <div className="demo-panel-heading"><div><h2>{role==='student'?'Courses and learning':role==='educator'?'My course proposals':'Course and price approvals'}</h2><p>Explore course status and review the associated next steps.</p></div></div>
      <div className="demo-course-list">{sampleCourses.map(c=><article key={c.slug}><div className="demo-course-row"><strong>{c.title}</strong><span className="demo-status-pill">{c.status==='coming-soon'?'Coming soon':'Availability unconfirmed'}</span></div><p>{role==='student'?'You can enquire about this programme. No demo booking will be created.':role==='educator'?'Draft a course offer and proposed lesson rate, then submit for Heeva review.':"Confirm tutor credentials, course content and customer price before publication."}</p></article>)}</div>
    </>;
    if(tab==='lessons') return <>
      <h2>{role==='educator'?'My teaching calendar':role==='admin'?'Bookings & schedules':'My lesson calendar'}</h2>
      <div className="demo-detail-grid"><div className="demo-panel"><h3>Weekly schedule — example</h3><div className="demo-week">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=><div key={day}><strong>{day}</strong><span className={i===1||i===3?'marked':''}>{24+i}</span></div>)}</div><p>Highlighted dates are illustrative, not real reservations.</p></div><div className="demo-panel"><h3>Upcoming lessons</h3><p>No real lessons have been scheduled in this preview.</p><p>In the connected platform, you will see tutor assignments, the learner's timezone, links and lesson materials.</p></div></div>
    </>;
    if(tab==='trial') return <><h2>One free introductory lesson</h2><div className="demo-panel"><span className="demo-status-pill">Eligibility subject to Heeva's terms</span><h3>Find the right starting point</h3><p>Eligible learners may request <strong>one free introductory lesson</strong> to explore a course. This allowance is per eligible learner, not one free session with each tutor.</p><p>Your example request is awaiting confirmation; it is not an actual booking.</p><button className="demo-outline" type="button" onClick={()=>setTab('courses')}>Explore available courses →</button></div></>;
    if(tab==='billing'||tab==='earnings') return <><h2>{role==='educator'?'Earnings and payouts':role==='admin'?'Payments and educator payouts':'Payments and receipts'}</h2><div className="demo-panel"><h3>Financial overview</h3><p>Payment processing, receipts, refunds and educator payouts are not connected to this demonstration.</p><div className="demo-metrics"><article><strong>—</strong><h3>Balance</h3><p>No financial records</p></article><article><strong>—</strong><h3>Transactions</h3><p>Requires secure payment integration</p></article></div></div></>;
    if(tab==='media') return <><h2>{role==='educator'?'AI profile studio':'Content and AI moderation'}</h2><div className="demo-detail-grid">{[['Profile writing','Polish your own factual biography in English or Persian. Review suggestions before accepting.'],['Professional portrait','Crop, adjust lighting and improve background while preserving real identity.'],['Introduction video','Prepare a real educator video with subtitles, editing and Heeva approval.']].map(([title,desc],i)=><article className="demo-panel" key={title}><div className="demo-media-icon" aria-hidden="true">{['✎','◉','▣'][i]}</div><h3>{title}</h3><p>{desc}</p><span className="demo-status-pill">{i===0?'Provider configuration required':'Media integration pending'}</span></article>)}</div></>;
    return <><h2>{role==='admin'?'Enquiries and support queue':role==='educator'?'Heeva review feedback':'Help & support'}</h2><div className="demo-panel"><h3>{role==='admin'?'Incoming requests':'Contact the Heeva team'}</h3><p>{role==='admin'?'Requests will appear here once the secure enquiry and staff backend is connected.':'For course questions, profile reviews and lesson issues, contact Heeva through the official support channel.'}</p><Link to="/contact" className="demo-outline">Contact Heeva ↗</Link></div></>;
  }
  return <main className="shell heeva-demo" aria-label="Heeva sample dashboard">
    <div className="demo-ribbon">DESIGN PREVIEW · SAMPLE DATA · NO REAL BOOKINGS, APPROVALS OR PAYMENTS</div>
    {!user ? <>
      <div className="demo-intro"><span className="demo-eyebrow">HEEVA DASHBOARD PREVIEW</span><h1>Explore the Heeva dashboards</h1><p>See how the Student/Parent, Educator and Admin experiences work. All data is fictional. These sample accounts never connect to real Heeva records.</p></div>
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
          <p>All three accounts use <code>HeevaDemo2026!</code>. Do not enter real personal information or passwords you use elsewhere.</p>
        </div>
      </div>
    </> : <>
      <div className="demo-dash-heading"><div><span className="demo-eyebrow">{labels[role].toUpperCase()} WORKSPACE</span><h1>Welcome, {user.name}</h1><p>Your learning and teaching workspace · illustrative data</p></div><button type="button" className="demo-logout" onClick={signOut}>Switch demo account</button></div>
      <div className="demo-dashboard-grid">
        <nav className="demo-dash-nav" aria-label="Demo dashboard navigation">
          {tabs[role].map(([id,label,symbol])=><button type="button" key={id} className={tab===id?'active':''} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}><span className="demo-nav-icon" aria-hidden="true">{symbol}</span>{label}</button>)}
        </nav>
        <section className="demo-dash-content" aria-live="polite">{displayTab()}</section>
      </div>
    </>}
  </main>;
}
