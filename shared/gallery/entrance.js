(() => {
 const root=new URL('../../',document.currentScript.src);
 const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 async function load(){

  const r=await fetch(new URL('data/events/index.json',root));if(!r.ok)return null;return r.json();
 }
 load().then(data=>{
  const event=data?.events?.find(e=>e.id==='la-ola-de-amor-2026');
  const visible=event?.photos?.filter(p=>data.preview||(event.publicationStatus==='approved'&&p.publicationStatus==='approved'))||[];const p=visible.find(p=>p.id===event.coverId)||visible[0];if(!p)return;
  const update=()=>document.querySelectorAll('.memories-preview img').forEach(img=>{const src=new URL(p.thumbnail,root);if(!['http:','https:'].includes(src.protocol))return;img.src=src.href;img.alt=p.caption;});
  update();window.addEventListener('hashchange',update);
 }).catch(()=>{});
})();
