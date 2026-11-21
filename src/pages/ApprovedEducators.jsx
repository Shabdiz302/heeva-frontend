import { useEffect, useState } from 'react';
import { Link } from '../router.jsx';

const apiBase = import.meta.env.VITE_STUDENT_API_BASE || '/student-preview-api';

export function ApprovedEducators({ query = '' }) {
  const [educators,setEducators] = useState([]);
  useEffect(()=>{
    let mounted=true;
    const controller=new AbortController();
    fetch(apiBase+'/api/public/educators',{signal:controller.signal,credentials:'omit'})
      .then(async response=>response.ok?response.json():{educators:[]})
      .then(data=>{if(mounted)setEducators(Array.isArray(data.educators)?data.educators:[])})
      .catch(()=>{if(mounted)setEducators([])});
    return ()=>{mounted=false;controller.abort()};
  },[]);
  const search=query.trim().toLowerCase();
  const matches=educators.filter(item=>!search||
    [item.display_name,item.headline,item.biography,...(item.subjects||[])].join(' ').toLowerCase().includes(search));
  if (!matches.length) return null;
  return <section className="approved-educators">
    <h2>Recently approved Heeva educators</h2>
    <p>These profiles have been reviewed and approved by Heeva. Contact Heeva to confirm suitability and availability for your course.</p>
    <div className="approved-educator-grid">
      {matches.map(item=><article className="approved-educator-card" key={item.slug}>
        <div className="approved-educator-avatar" aria-hidden="true">{item.display_name?.trim().charAt(0)?.toUpperCase()||'H'}</div>
        <h3>{item.display_name}</h3>
        <p className="approved-educator-headline">{item.headline}</p>
        <p>{item.biography?.slice(0,220)}{item.biography?.length>220?'…':''}</p>
        <p className="approved-educator-subjects">{(item.subjects||[]).join(' · ')}</p>
        <Link className="text-link" to={'/educators/'+item.slug}>View educator profile <span aria-hidden="true">↗</span></Link>
      </article>)}
    </div>
  </section>;
}

export function ApprovedEducatorPage({ slug }) {
  const [educator,setEducator]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let mounted=true;const controller=new AbortController();
    fetch(apiBase+'/api/public/educators/'+encodeURIComponent(slug),{signal:controller.signal,credentials:'omit'})
      .then(async response=>response.ok?response.json():{educator:null})
      .then(data=>{if(mounted)setEducator(data.educator||null)})
      .catch(()=>{if(mounted)setEducator(null)})
      .finally(()=>{if(mounted)setLoading(false)});
    return ()=>{mounted=false;controller.abort()};
  },[slug]);
  return <section className="shell approved-educator-profile">
    <Link to="/teachers" className="text-link">← Back to educators</Link>
    {loading?<p>Loading profile…</p>:educator?<>
      <h1>{educator.display_name}</h1>
      <p className="approved-educator-headline">{educator.headline}</p>
      <p>{educator.biography}</p>
      <h2>Teaching subjects</h2><p>{(educator.subjects||[]).join(' · ')}</p>
      <h2>Languages</h2><p>{(educator.languages||[]).join(' · ')}</p>
      <p>Contact Heeva to discuss course suitability and current availability.</p>
      <Link to="/contact" className="button">Enquire with Heeva</Link>
    </>:<p>This educator profile is not available.</p>}
  </section>;
}
