import { useEffect, useState } from 'react';
import { courses } from '../data/courses.js';
import './teacher-marketplace.css';

const money = pence => Number.isInteger(pence) ? '£'+(pence/100).toFixed(2) : '—';
const choices = courses.filter(course => course.slug && course.title);

export function TeacherOffersPanel({api}) {
  const [offers,setOffers] = useState([]);
  const [draft,setDraft] = useState({courseSlug:'',offerTitle:'',offerDescription:'',duration:'60',rate:''});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const load = async () => {
    const result=await api('/api/staff/marketplace/offers');
    setOffers(result.offers || []);
  };
  useEffect(()=>{let active=true;api('/api/staff/marketplace/offers').then(r=>{if(active)setOffers(r.offers||[])}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[api]);
  async function create(e){
    e.preventDefault();setBusy(true);setError('');setNotice('');
    try {
      const numeric=Number(draft.rate);
      if(!Number.isFinite(numeric) || numeric<1 || numeric>1000) throw Error('Tutor rate must be between £1 and £1,000.');
      await api('/api/staff/marketplace/offers',{method:'POST',body:JSON.stringify({
        courseSlug:draft.courseSlug,offerTitle:draft.offerTitle,offerDescription:draft.offerDescription,
        lessonDurationMinutes:Number(draft.duration),proposedTutorRatePence:Math.round(numeric*100)
      })});
      await load();setDraft({courseSlug:'',offerTitle:'',offerDescription:'',duration:'60',rate:''});
      setNotice('Private course offer saved. Submit it separately for Heeva review.');
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function submit(id){
    setBusy(true);setError('');setNotice('');
    try {
      await api('/api/staff/marketplace/offers/'+id+'/submit',{method:'POST',body:'{}'});
      await load();setNotice('Your course offer has been sent to Heeva for approval.');
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <section className="staff-card teacher-marketplace">
    <header className="marketplace-header"><div><span className="marketplace-kicker">MY MARKETPLACE COURSES</span><h3>Course offers &amp; lesson rates</h3>
      <p>Propose a teaching subject and your earnings per session. Heeva approves the selling price before any public listing.</p></div></header>
    {error&&<p role="alert" className="marketplace-error">{error}</p>}
    {notice&&<p role="status" className="marketplace-success">{notice}</p>}
    <form className="marketplace-form" onSubmit={create}>
      <div className="marketplace-grid">
        <label>Heeva course
          <select required value={draft.courseSlug} onChange={e=>setDraft(x=>({...x,courseSlug:e.target.value,offerTitle:choices.find(c=>c.slug===e.target.value)?.title||''}))}>
            <option value="">Choose a course</option>
            {choices.map(c=><option value={c.slug} key={c.slug}>{c.title}</option>)}
          </select>
        </label>
        <label>Public offer title<input required minLength={3} maxLength={180} value={draft.offerTitle} onChange={e=>setDraft(x=>({...x,offerTitle:e.target.value}))}/></label>
        <label>Lesson duration
          <select value={draft.duration} onChange={e=>setDraft(x=>({...x,duration:e.target.value}))}>
            {[30,45,60,90].map(n=><option key={n} value={n}>{n} minutes</option>)}
          </select>
        </label>
        <label>Proposed tutor earnings per lesson (GBP)<input required type="number" min="1" max="1000" step="0.01" value={draft.rate} onChange={e=>setDraft(x=>({...x,rate:e.target.value}))} placeholder="25.00"/></label>
      </div>
      <label>Course approach and objectives<textarea maxLength={2500} rows={3} value={draft.offerDescription} onChange={e=>setDraft(x=>({...x,offerDescription:e.target.value}))}/></label>
      <p className="marketplace-hint">Your rate is not the customer price. Admin review sets the retail price and Heeva's gross margin. Approved offers are not publicly listed in this development version.</p>
      <div><button type="submit" className="button" disabled={busy||!draft.courseSlug}>{busy?'Saving…':'Create private offer'}</button></div>
    </form>
    <div className="marketplace-list"><h4>My proposals</h4>
      {offers.length===0&&<p>No course offers yet.</p>}
      {offers.map(offer=><article className="marketplace-review-item" key={offer.id}>
        <div className="marketplace-review-heading"><div><h4>{offer.offer_title}</h4><p>{offer.course_slug} · {offer.lesson_duration_minutes} minutes</p></div><span className="marketplace-status">{offer.review_status.replaceAll('_',' ')}</span></div>
        <p>Tutor earnings: <strong>{money(offer.proposed_tutor_rate_pence)}</strong> per session</p>
        {offer.review_status==='approved'&&<p>Approved customer price: <strong>{money(offer.approved_customer_price_pence)}</strong> (internal record; not publicly listed)</p>}
        {offer.admin_feedback&&<p className="marketplace-feedback">Heeva feedback: {offer.admin_feedback}</p>}
        {['draft','changes_requested'].includes(offer.review_status)&&<button type="button" className="button button-outline" disabled={busy} onClick={()=>submit(offer.id)}>Submit offer for review</button>}
      </article>)}
    </div>
  </section>;
}

export function OfferReviewPanel({api}) {
  const [offers,setOffers]=useState([]);
  const [margin,setMargin]=useState({});
  const [feedback,setFeedback]=useState({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const load=async()=>{const response=await api('/api/staff/marketplace/offer-review');setOffers(response.offers||[])};
  useEffect(()=>{let active=true;api('/api/staff/marketplace/offer-review').then(r=>{if(active)setOffers(r.offers||[])}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[api]);
  async function review(offer,decision){
    setBusy(true);setError('');setNotice('');
    try {
      const percent=margin[offer.id]??'25';
      const bps=Math.round(Number(percent)*100);
      if(decision==='approved'&&(!Number.isFinite(bps)||bps<0||bps>5000))throw Error('Choose a margin between 0 and 50%.');
      await api('/api/staff/marketplace/offer-review/'+offer.id,{method:'POST',
        body:JSON.stringify({decision,marginBasisPoints:bps,feedback:feedback[offer.id]||''})});
      await load();setNotice('Offer review recorded. No listing or payment was published.');
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <section className="staff-card teacher-marketplace">
    <header className="marketplace-header"><div><span className="marketplace-kicker">MARKETPLACE PRICING</span><h3>Course offers awaiting approval</h3>
      <p>Set a gross margin on customer price. Rates are snapshots for approved proposals, not net profit.</p></div></header>
    {error&&<p role="alert" className="marketplace-error">{error}</p>}
    {notice&&<p role="status" className="marketplace-success">{notice}</p>}
    {!offers.length&&<p>No course offers submitted yet.</p>}
    {offers.map(offer=>{
      const percent=margin[offer.id]??'25';
      const marginRate=Number(percent)/100;
      const customerPrice=Number.isFinite(marginRate)&&marginRate>=0&&marginRate<=.5
        ? Math.ceil(offer.proposed_tutor_rate_pence/(1-marginRate)):null;
      return <article key={offer.id} className="marketplace-review-item">
        <div className="marketplace-review-heading"><div><h4>{offer.offer_title}</h4><p>{offer.tutor_name} · {offer.email} · {offer.lesson_duration_minutes} minutes</p></div>
          <span className="marketplace-status">{offer.review_status.replaceAll('_',' ')}</span></div>
        <p>Course: {offer.course_slug} · Proposed tutor earnings: <strong>{money(offer.proposed_tutor_rate_pence)}</strong></p>
        {offer.review_status==='approved'&&<p>Approved retail price: <strong>{money(offer.approved_customer_price_pence)}</strong></p>}
        {offer.review_status==='pending_review'&&<div className="marketplace-review-actions">
          <label>Heeva gross margin (% of customer price)
            <input type="number" min="0" max="50" step=".01" value={percent} onChange={e=>setMargin(old=>({...old,[offer.id]:e.target.value}))}/>
          </label>
          <p className="marketplace-hint">Preview customer price: <strong>{money(customerPrice)}</strong>. Before tax, payment fees and other costs.</p>
          <label>Reason / approval note<textarea rows={2} maxLength={1200} value={feedback[offer.id]||''} onChange={e=>setFeedback(old=>({...old,[offer.id]:e.target.value}))}/></label>
          <button type="button" className="button button-outline" disabled={busy} onClick={()=>review(offer,'changes_requested')}>Request changes</button>
          <button type="button" className="button" disabled={busy} onClick={()=>review(offer,'approved')}>Approve internal price</button>
        </div>}
      </article>;
    })}
  </section>;
}
