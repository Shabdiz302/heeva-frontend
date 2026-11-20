import { useEffect, useState } from 'react';
import './teacher-marketplace.css';

const empty = {
  displayName:'', headline:'', biography:'', subjects:'', languages:'',
  qualificationsSummary:'', teachingExperience:'', proposedRate:'', lessonDurationMinutes:'60'
};
const readProfile = (p) => p ? ({
  displayName:p.display_name || '', headline:p.headline || '', biography:p.biography || '',
  subjects:(p.subjects || []).join(', '), languages:(p.languages || []).join(', '),
  qualificationsSummary:p.qualifications_summary || '', teachingExperience:p.teaching_experience || '',
  proposedRate:p.proposed_rate_pence == null ? '' : (p.proposed_rate_pence / 100).toFixed(2),
  lessonDurationMinutes:String(p.lesson_duration_minutes || 60)
}) : empty;

export function TeacherMarketplacePanel({ api, staff }) {
  const [form,setForm] = useState({...empty,displayName:staff.displayName || ''});
  const [status,setStatus] = useState('draft');
  const [hasProfile,setHasProfile] = useState(false);
  const [hasPortrait,setHasPortrait] = useState(false);
  const [portraitFile,setPortraitFile] = useState(null);
  const [portraitVersion,setPortraitVersion] = useState(0);
  const [feedback,setFeedback] = useState('');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  async function reload() {
    const {profile} = await api('/api/staff/marketplace/profile');
    setForm(profile ? readProfile(profile) : {...empty,displayName:staff.displayName || ''});
    setStatus(profile?.review_status || 'draft');
    setHasProfile(Boolean(profile));
    setHasPortrait(Boolean(profile?.has_portrait));
    setFeedback(profile?.admin_feedback || '');
  }
  useEffect(() => {
    let active=true;
    api('/api/staff/marketplace/profile').then(({profile})=>{
      if(!active)return;
      setForm(profile ? readProfile(profile) : {...empty,displayName:staff.displayName || ''});
      setStatus(profile?.review_status || 'draft');
    setHasProfile(Boolean(profile));
    setHasPortrait(Boolean(profile?.has_portrait));
      setFeedback(profile?.admin_feedback || '');
    }).catch(err=>{if(active)setError(err.message)}).finally(()=>{if(active)setLoading(false)});
    return ()=>{active=false};
  },[api,staff.displayName]);
  const edit=(name)=>(e)=>setForm(old=>({...old,[name]:e.target.value}));
  async function save(e) {
    e.preventDefault();setBusy(true);setError('');setNotice('');
    const rate=form.proposedRate.trim()===''?null:Math.round(Number(form.proposedRate)*100);
    try {
      if(rate!==null&&(!Number.isFinite(rate)||rate<100)){throw Error('Enter a tutor rate of at least £1 or leave it empty for a draft.')}
      await api('/api/staff/marketplace/profile',{method:'PUT',body:JSON.stringify({
        displayName:form.displayName,headline:form.headline,biography:form.biography,
        subjects:form.subjects.split(',').map(s=>s.trim()).filter(Boolean),
        languages:form.languages.split(',').map(s=>s.trim()).filter(Boolean),
        qualificationsSummary:form.qualificationsSummary,teachingExperience:form.teachingExperience,
        proposedRatePence:rate,lessonDurationMinutes:Number(form.lessonDurationMinutes)
      })});
      await reload();setNotice('Private draft saved. Nothing has been published.');
    } catch(err){setError(err.message)}finally{setBusy(false)}
  }
  async function submit(){
    setBusy(true);setError('');setNotice('');
    try{await api('/api/staff/marketplace/submit',{method:'POST',body:'{}'});await reload();setNotice('Profile submitted for Heeva administrator review.');}
    catch(err){setError(err.message)}finally{setBusy(false)}
  }
  async function uploadPortrait() {
    if(!portraitFile || !hasProfile) return;
    if(!['image/jpeg','image/png','image/webp'].includes(portraitFile.type) || portraitFile.size > 5*1024*1024) {
      setError('Use a JPEG, PNG or WebP image smaller than 5 MB.'); return;
    }
    setBusy(true);setError('');setNotice('');
    try{
      const apiBase=import.meta.env.VITE_STUDENT_API_BASE || '/student-preview-api';
      const response=await fetch(apiBase+'/api/staff/marketplace/portrait',{
        method:'POST', credentials:'same-origin',
        headers:{'Content-Type':portraitFile.type},body:portraitFile
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw Error(result.error||'Portrait upload failed.');
      setPortraitFile(null);setPortraitVersion(x=>x+1);
      await reload();setNotice('Your portrait was saved privately. It is not published.');
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  const portraitUrl=(import.meta.env.VITE_STUDENT_API_BASE || '/student-preview-api')+'/api/staff/marketplace/portrait?v='+portraitVersion;
  if(loading)return <section className="staff-card">Loading your marketplace profile…</section>;
  return <section className="staff-card teacher-marketplace" aria-label="Teacher marketplace profile">
    <header className="marketplace-header"><div>
      <span className="marketplace-kicker">HEEVA TEACHER MARKETPLACE</span>
      <h3>My teaching profile</h3>
      <p>Build your professional listing. Heeva reviews your details before anything becomes public.</p>
    </div><span className="marketplace-status">{status.replaceAll('_',' ')}</span></header>
    {feedback&&<p className="marketplace-feedback"><strong>Heeva feedback:</strong> {feedback}</p>}
    {error&&<p role="alert" className="marketplace-error">{error}</p>}
    {notice&&<p role="status" className="marketplace-success">{notice}</p>}
    <div className="marketplace-steps" aria-label="Profile sections">
      <span>01 Profile</span><span>02 Expertise</span><span>03 Rate proposal</span><span>04 Admin review</span>
    </div>
    <form onSubmit={save} className="marketplace-form">
      <div className="marketplace-grid">
        <label>Public display name<input value={form.displayName} maxLength={120} onChange={edit('displayName')} required disabled={status==='pending_review'}/></label>
        <label>Professional headline<input value={form.headline} maxLength={160} placeholder="e.g. Online piano tutor for beginners" onChange={edit('headline')} disabled={status==='pending_review'}/></label>
        <label>Teaching subjects (comma separated)<input value={form.subjects} placeholder="Piano, Music theory" onChange={edit('subjects')} disabled={status==='pending_review'}/></label>
        <label>Languages (comma separated)<input value={form.languages} placeholder="English, Persian" onChange={edit('languages')} disabled={status==='pending_review'}/></label>
      </div>
      <label>Professional biography<textarea value={form.biography} maxLength={4000} rows={4} onChange={edit('biography')} placeholder="Describe your teaching approach and experience." disabled={status==='pending_review'}/></label>
      <div className="marketplace-grid">
        <label>Qualifications summary<textarea rows={3} value={form.qualificationsSummary} maxLength={2500} onChange={edit('qualificationsSummary')} disabled={status==='pending_review'}/></label>
        <label>Teaching experience<textarea rows={3} value={form.teachingExperience} maxLength={2500} onChange={edit('teachingExperience')} disabled={status==='pending_review'}/></label>
        <label>Tutor earnings proposal (GBP per lesson)<input type="number" min="1" max="1000" step="0.01" inputMode="decimal" value={form.proposedRate} onChange={edit('proposedRate')} placeholder="20.00" disabled={status==='pending_review'}/></label>
        <label>Lesson duration<select value={form.lessonDurationMinutes} onChange={edit('lessonDurationMinutes')} disabled={status==='pending_review'}>
          {[30,45,60,90].map(n=><option key={n} value={n}>{n} minutes</option>)}
        </select></label>
      </div>
      <p className="marketplace-hint">This is the amount you propose to earn, not the final customer price. Heeva determines its commission and must approve each public offer.</p>
      <div className="marketplace-disabled-media">
        <strong>Profile portrait (private staging upload)</strong>
        {hasPortrait&&<img className="marketplace-portrait" src={portraitUrl} alt="Your uploaded teacher portrait" />}
        <label className="marketplace-upload-label">JPEG, PNG or WebP (up to 5 MB)
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!hasProfile || status==='pending_review' || busy}
            onChange={e=>setPortraitFile(e.target.files?.[0]||null)}/>
        </label>
        <button type="button" className="button button-outline" disabled={!portraitFile||!hasProfile||status==='pending_review'||busy} onClick={uploadPortrait}>Upload private portrait</button>
        {!hasProfile&&<p>Save your profile draft before uploading a portrait.</p>}
        <p>Your photo stays private until the full verification, moderation and publishing process is available.</p>
      </div>
      <div className="marketplace-disabled-media">
        <strong>CV and introductory video — not yet available</strong>
        <p>These require additional private document controls and video processing. Please do not upload sensitive documents elsewhere.</p>
      </div>
      <div className="marketplace-actions">
        <button type="submit" className="button" disabled={busy||status==='pending_review'}>{busy?'Saving…':'Save private draft'}</button>
        <button type="button" className="button button-outline" onClick={submit} disabled={busy||status==='pending_review'}>Submit for review</button>
      </div>
    </form>
  </section>;
}

export function MarketplaceReviewPanel({api}) {
  const [profiles,setProfiles] = useState([]);
  const [feedback,setFeedback] = useState({});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  async function load(){
    const result=await api('/api/staff/marketplace/review');
    setProfiles(result.profiles||[]);
  }
  useEffect(()=>{let active=true;api('/api/staff/marketplace/review').then(r=>{if(active)setProfiles(r.profiles||[])}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[api]);
  async function decide(profile,decision){
    setBusy(true);setError('');setNotice('');
    try {
      await api('/api/staff/marketplace/review/'+profile.id,{
        method:'POST',body:JSON.stringify({decision,feedback:feedback[profile.id]||''})
      });
      await load();setNotice('Review saved. No public listing or payment has been created.');
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  return <section className="staff-card teacher-marketplace">
    <header className="marketplace-header"><div><span className="marketplace-kicker">ADMIN MODERATION</span><h3>Teacher applications</h3><p>Review submitted teaching profiles and proposed tutor earnings. Approval is internal only.</p></div>
    <span className="marketplace-status">{profiles.filter(p=>p.review_status==='pending_review').length} awaiting review</span></header>
    {error&&<p className="marketplace-error" role="alert">{error}</p>}
    {notice&&<p className="marketplace-success" role="status">{notice}</p>}
    {!profiles.length&&<p>No teacher profiles submitted yet.</p>}
    {profiles.map(p=><article key={p.id} className="marketplace-review-item">
      <div className="marketplace-review-heading"><div><h4>{p.display_name}</h4><p>{p.email} · {p.headline || 'No headline'}</p></div><span className="marketplace-status">{p.review_status.replaceAll('_',' ')}</span></div>
      <p>{p.biography || 'No biography yet.'}</p>
      {p.has_portrait && <img className="marketplace-portrait" src={(import.meta.env.VITE_STUDENT_API_BASE || '/student-preview-api')+'/api/staff/marketplace/review/'+p.id+'/portrait'} alt={'Uploaded private portrait of '+p.display_name} />}
      <div className="marketplace-review-meta"><span>Subjects: {(p.subjects||[]).join(', ')||'—'}</span><span>Languages: {(p.languages||[]).join(', ')||'—'}</span>
      <span>Teacher rate: {p.proposed_rate_pence==null?'Not set':'£'+(p.proposed_rate_pence/100).toFixed(2)} / {p.lesson_duration_minutes} min</span></div>
      <details><summary>Qualifications and experience</summary><p>{p.qualifications_summary||'No qualifications summary.'}</p><p>{p.teaching_experience||'No experience summary.'}</p></details>
      {p.review_status==='pending_review'&&<div className="marketplace-review-actions">
        <label>Review feedback<textarea rows={2} maxLength={1200} value={feedback[p.id]||''} onChange={e=>setFeedback(old=>({...old,[p.id]:e.target.value}))} placeholder="Reason or requested changes"/></label>
        <button type="button" className="button button-outline" disabled={busy} onClick={()=>decide(p,'changes_requested')}>Request changes</button>
        <button type="button" className="button" disabled={busy} onClick={()=>decide(p,'approved')}>Approve internal draft</button>
      </div>}
    </article>)}
  </section>;
}


export function TeacherApplicationsPanel({api}) {
  const [applications,setApplications]=useState([]);
  const [feedback,setFeedback]=useState({});
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const refresh=async()=>{const r=await api('/api/staff/marketplace/applications');setApplications(r.applications||[])};
  useEffect(()=>{let mounted=true;api('/api/staff/marketplace/applications')
    .then(r=>{if(mounted)setApplications(r.applications||[])})
    .catch(e=>{if(mounted)setError(e.message)});
    return()=>{mounted=false};
  },[api]);
  async function decide(item,decision){
    setBusy(true);setError('');setNotice('');
    try {
      await api('/api/staff/marketplace/applications/'+item.id+'/decision',{
        method:'POST',body:JSON.stringify({decision,feedback:feedback[item.id]||''})
      });
      await refresh();setNotice('Application decision saved. Teacher account access updated.');
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <section className="staff-card teacher-marketplace">
    <header className="marketplace-header"><div><span className="marketplace-kicker">ACCOUNT ONBOARDING</span>
      <h3>Teacher registrations</h3><p>Email-verified applications require a Heeva approval before tutor login can be activated.</p></div>
      <span className="marketplace-status">{applications.filter(a=>a.status==='pending_admin').length} awaiting approval</span>
    </header>
    {error&&<p role="alert" className="marketplace-error">{error}</p>}
    {notice&&<p role="status" className="marketplace-success">{notice}</p>}
    {!applications.length&&<p>No teacher applications yet.</p>}
    {applications.map(item=><article className="marketplace-review-item" key={item.id}>
      <div className="marketplace-review-heading"><div><h4>{item.display_name}</h4><p>{item.email}</p></div>
        <span className="marketplace-status">{item.status.replaceAll('_',' ')}</span></div>
      <p>Email: {item.email_verified_at?'Verified':'Not verified'} · Applied: {new Date(item.created_at).toLocaleDateString()}</p>
      {item.reviewer_feedback&&<p className="marketplace-feedback">{item.reviewer_feedback}</p>}
      {item.status==='pending_admin'&&<div className="marketplace-review-actions">
        <p className="marketplace-hint">Confirm identity, references and any safeguarding requirements outside this form before approving.</p>
        <label>Review notes<textarea rows={2} maxLength={1200} value={feedback[item.id]||''}
          onChange={e=>setFeedback(old=>({...old,[item.id]:e.target.value}))}/></label>
        <button className="button button-outline" type="button" disabled={busy||!feedback[item.id]?.trim()} onClick={()=>decide(item,'rejected')}>Reject application</button>
        <button className="button" type="button" disabled={busy} onClick={()=>decide(item,'approved')}>Approve teacher account</button>
      </div>}
    </article>)}
  </section>;
}
