import { useState } from 'react';
import { Link } from '../router.jsx';
import { policies } from '../data/site.js';
import { PageIntro, Eyebrow } from '../components/ContentBlocks.jsx';
import './teacher-marketplace.css';

const apiBase = import.meta.env.VITE_STUDENT_API_BASE || '/student-preview-api';
async function request(path, body) {
  const response = await fetch(apiBase + path, {
    method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(json.error||'Unable to complete your application.');
  return json;
}

export default function TeacherApplyPage(){
  const [mode,setMode]=useState('register');
  const [form,setForm]=useState({displayName:'',email:'',password:'',termsAccepted:false,privacyAccepted:false,adultConfirmed:false});
  const [code,setCode]=useState('');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const update=(name,value)=>setForm(prev=>({...prev,[name]:value}));
  async function register(event){
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try {
      const response=await request('/api/teacher-applications/register',form);
      setMode('verify');setNotice(response.message);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  async function verify(event){
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      const response=await request('/api/teacher-applications/verify-email',{email:form.email,code});
      setMode('submitted');setNotice(response.message);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  async function resend(){
    setBusy(true);setError('');setNotice('');
    try{
      const response=await request('/api/teacher-applications/resend-code',{email:form.email});
      setNotice(response.message);
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  return <>
    <PageIntro eyebrow="Teach with Heeva" title={<>Become a Heeva <em>educator.</em></>}>
      <p>Teach school subjects, music, languages, creative skills, technology or professional courses online. Verify your email, complete your private profile and submit it for Heeva approval before publishing.</p>
    </PageIntro>
    <section className="shell staff-shell teacher-marketplace-apply">
      <div className="teacher-apply-promo">
        <Eyebrow>Teach with Heeva</Eyebrow>
        <h2>Share your expertise with more learners.</h2>
        <p>Build a professional profile, propose your own lesson rates and courses, and let Heeva support the booking and customer experience.</p>
        <div className="marketplace-steps"><span>01 Apply</span><span>02 Verify email</span><span>03 Build profile</span><span>04 Heeva review</span></div>
        <p className="marketplace-hint">Heeva reviews educators for suitability. Creating an account does not guarantee approval, assignments or income.</p>
      </div>
      <section className="staff-card teacher-marketplace">
        <header className="marketplace-header"><div><span className="marketplace-kicker">EDUCATOR APPLICATION</span>
          <h3>{mode==='register'?'Create your educator account':mode==='verify'?'Verify your email':'Email verified'}</h3></div></header>
        {error&&<p role="alert" className="marketplace-error">{error}</p>}
        {notice&&<p role="status" className="marketplace-success">{notice}</p>}
        {mode==='register'&&<form className="marketplace-form" onSubmit={register}>
          <label>Professional display name<input value={form.displayName} maxLength={120} minLength={2} required onChange={e=>update('displayName',e.target.value)} autoComplete="name"/></label>
          <label>Email<input type="email" value={form.email} required onChange={e=>update('email',e.target.value)} autoComplete="email"/></label>
          <label>Password (8+ characters, uppercase, lowercase and number)
            <input type="password" minLength={8} maxLength={128} value={form.password} required onChange={e=>update('password',e.target.value)} autoComplete="new-password"/></label>
          <label className="marketplace-check"><input type="checkbox" checked={form.adultConfirmed} onChange={e=>update('adultConfirmed',e.target.checked)} required/><span>I confirm I am at least 18.</span></label>
          <label className="marketplace-check"><input type="checkbox" checked={form.termsAccepted} onChange={e=>update('termsAccepted',e.target.checked)} required/><span>I agree to the <a href={policies.terms} target="_blank" rel="noreferrer">Heeva Terms of Service</a> and understand additional educator terms will be required.</span></label>
          <label className="marketplace-check"><input type="checkbox" checked={form.privacyAccepted} onChange={e=>update('privacyAccepted',e.target.checked)} required/><span>I have read the <a href={policies.privacy} target="_blank" rel="noreferrer">Heeva Privacy Policy</a>.</span></label>
          <button type="submit" className="button" disabled={busy}>{busy?'Submitting…':'Submit educator application'}</button>
          <p className="marketplace-hint">Development preview: educator terms and privacy links must be reviewed before public launch. Use test details only.</p>
        </form>}
        {mode==='verify'&&<form className="marketplace-form" onSubmit={verify}>
          <p>Enter the six-digit verification code sent to {form.email}. The code expires after ten minutes.</p>
          <label>Verification code<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required autoComplete="one-time-code"/></label>
          <button type="submit" className="button" disabled={busy||code.length!==6}>{busy?'Verifying…':'Verify my email'}</button>
          <button type="button" className="button button-outline" onClick={resend} disabled={busy}>Resend verification code</button>
          <p>Resend is limited for security. Wait at least 60 seconds after the previous code.</p>
        </form>}
        {mode==='submitted'&&<div><p>Your email has been verified. You can now sign in to complete your private educator profile. Heeva will review it after you submit it; nothing appears on the website before approval.</p>
          <Link className="button button-outline" to="/staff/login">Continue to my educator profile</Link></div>}
      </section>
    </section>
  </>;
}
