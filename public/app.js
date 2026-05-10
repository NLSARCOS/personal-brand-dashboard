// ─── STATE ───────────────────────────────────────────────────────
const S = {
  posts:[], tasks:[], selectedPostId:null,
  proposals:[], selectedProposalId:null,
  hotAlerts:[], alertIdx:0,
  calDate: new Date(), calView:'month',
  plannerDate: new Date(), guidelines:'',
  formatMeta:{}, checklist:{}, postSources:[]
};

// ─── UTILS ───────────────────────────────────────────────────────
const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const pad = n => String(n).padStart(2,'0');

function api(path, opts={}){
  return fetch(path,{headers:{'Content-Type':'application/json',...(opts.headers||{})},...opts})
    .then(async r=>{ const t=await r.text(); const d=t?JSON.parse(t):{}; if(!r.ok) throw new Error(d.error||'API error'); return d; });
}

function parsePlatforms(raw){
  if(Array.isArray(raw)) return raw;
  if(!raw) return [];
  try{ return JSON.parse(raw); } catch{ return String(raw).split(',').map(x=>x.trim()).filter(Boolean); }
}

function fmt(bytes){ if(!bytes) return '0 B'; const u=['B','KB','MB','GB']; let i=0,n=bytes; while(n>=1024&&i<u.length-1){n/=1024;i++;} return `${n.toFixed(1)} ${u[i]}`; }

function toLocal(v){ if(!v) return ''; const d=new Date(v); if(isNaN(d)) return ''; return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fromLocal(v){ return v ? new Date(v).toISOString() : null; }

function statusChip(st){ return `<span class="chip status-${st}">${st}</span>`; }
function formatChip(f){ return `<span class="chip format-${f}">${f}</span>`; }

const FORMAT_ICONS = {'text-only':'📝','single-image':'🖼️','carousel':'📱','gif':'🎬','lead-magnet-pdf':'📄'};

// ─── TABS ─────────────────────────────────────────────────────────
function switchTab(name){
  $$('.nav-tab').forEach(t=>t.classList.toggle('active', t.dataset.view===name));
  $$('.view').forEach(v=>v.classList.toggle('active', v.id===`view-${name}`));
  if(name==='calendar') loadCalendar();
  if(name==='proposals') loadProposals();
  if(name==='guidelines') loadGuidelines();
  if(name==='planner') loadPlanner();
}
$$('.nav-tab').forEach(t=>t.onclick=()=>switchTab(t.dataset.view));

// ─── STATS ────────────────────────────────────────────────────────
async function loadStats(){
  const s = await api('/api/stats');
  const by = Object.fromEntries((s.byStatus||[]).map(x=>[x.status,x.count]));
  $('#stats').innerHTML = [
    ['Total posts', s.total||0, 'base completa'],
    ['Published', by.published||0, 'publicados'],
    ['Scheduled', (by.scheduled||0)+(by.approved||0), 'próximos'],
    ['Esta semana', s.thisWeek||0, 'creados'],
    ['Propuestas', s.pendingProposals||0, 'pendientes', s.pendingProposals>0?'var(--orange)':''],
    ['🔥 Alertas', s.activeAlerts||0, 'activas', s.activeAlerts>0?'var(--red)':'']
  ].map(([l,v,n,c])=>`<div class="card stat"><div class="label">${l}</div><div class="value" style="${c?`color:${c}`:''}}">${v}</div><small>${n}</small></div>`).join('');

  // update badge
  const badge = $('#proposalsBadge');
  if(s.pendingProposals>0){ badge.textContent=s.pendingProposals; badge.style.display=''; }
  else badge.style.display='none';
}

// ─── POSTS LIST ───────────────────────────────────────────────────
async function loadPosts(){
  const p = new URLSearchParams();
  if($('#searchInput').value) p.set('search',$('#searchInput').value);
  if($('#statusFilter').value) p.set('status',$('#statusFilter').value);
  if($('#formatFilter').value) p.set('format',$('#formatFilter').value);
  S.posts = await api('/api/posts?'+p.toString());
  renderPosts();
}

function renderPosts(){
  $('#postCount').textContent=`${S.posts.length} piezas`;
  if(!S.posts.length){ $('#postsList').innerHTML='<div class="empty">Sin posts.</div>'; return; }
  $('#postsList').innerHTML = S.posts.map(p=>{
    const plats = parsePlatforms(p.platforms).map(pl=>`<span class="chip platform">${pl}</span>`).join('');
    const fmtChip = formatChip(p.format||'text-only');
    const warn = validateFormat(p) ? `<span class="warn-badge">${validateFormat(p)}</span>` : '';
    return `<article class="post-item ${S.selectedPostId===p.id?'active':''}" data-id="${p.id}">
      <div class="post-top"><div><div class="post-slug mono">${esc(p.slug)}</div><div class="post-title">${esc(p.title||p.slug)}</div></div>${statusChip(p.status)}</div>
      <div class="chips">${plats}${fmtChip}${warn}</div>
      <div class="post-preview">${esc(p.content||p.notes||'')}</div>
    </article>`;
  }).join('');
  $$('.post-item').forEach(el=>el.onclick=()=>selectPost(Number(el.dataset.id)));
}

function validateFormat(p){
  const f=p.format||'text-only'; const mc=p.media_count||0;
  if(f==='carousel'&&mc<2) return 'Faltan slides';
  if(f==='single-image'&&mc===0) return 'Falta imagen';
  return null;
}

// ─── POST EDITOR ──────────────────────────────────────────────────
async function selectPost(id, repaint=true){
  S.selectedPostId=id;
  const p = await api('/api/posts/'+id);
  if(repaint) renderPosts();
  $('#editorNotice').textContent=`Editando: ${p.slug}`;
  $('#postSlug').value=p.slug||'';
  $('#postTitle').value=p.title||'';
  $('#postStatus').value=p.status||'draft';
  $('#postStyle').value=p.style||'';
  $('#postPlatforms').value=parsePlatforms(p.platforms).join(',');
  $('#postScheduledAt').value=toLocal(p.scheduled_at);
  $('#postContent').value=p.content||'';
  $('#postNotes').value=p.notes||'';
  $('#postInsight').value=p.research_insight||'';
  $('#postAngle').value=p.editorial_angle||'';

  // format selector
  S.formatMeta = p.format_meta||{};
  setFormat(p.format||'text-only');

  // checklist
  S.checklist = S.formatMeta.checklist||{};
  renderChecklist();

  // media
  renderMedia(p.media||[]);
  updateMediaWarning(p.format||'text-only', (p.media||[]).length);

  // sources
  S.postSources = p.sources||[];
  renderSources();
  updateResearchBadge();
}

function setFormat(f){
  $$('.format-card').forEach(c=>c.classList.toggle('selected',c.dataset.format===f));
  renderFormatMeta(f);
}

function renderFormatMeta(f){
  const sec=$('#formatMetaSection');
  if(f==='carousel'){
    const count=S.formatMeta.slide_count||4;
    sec.style.display='';
    sec.innerHTML=`<div><label class="lbl">Número de slides</label><input class="field" type="number" id="slideCount" value="${count}" min="2" max="20" oninput="S.formatMeta.slide_count=+this.value;renderSlides()"/></div><div id="slideTitles"></div>`;
    renderSlides();
  } else if(f==='lead-magnet-pdf'){
    sec.style.display='';
    sec.innerHTML=`<div class="detail-grid"><div><label class="lbl">URL del PDF</label><input class="field" type="url" id="pdfUrl" placeholder="https://..." value="${esc(S.formatMeta.pdf_url||'')}"/></div><div><label class="lbl">Copy del landing</label><input class="field" type="text" id="landingCopy" placeholder="Descarga el PDF..." value="${esc(S.formatMeta.landing_copy||'')}"/></div></div>`;
  } else { sec.style.display='none'; }
}

function renderSlides(){
  const n=S.formatMeta.slide_count||4;
  const titles=S.formatMeta.slide_titles||[];
  const el=$('#slideTitles'); if(!el) return;
  el.innerHTML=`<label class="lbl">Títulos de slides</label>`+Array.from({length:n},(_,i)=>
    `<input class="field" style="margin-bottom:6px" type="text" placeholder="Slide ${i+1}" value="${esc(titles[i]||'')}" oninput="S.formatMeta.slide_titles=S.formatMeta.slide_titles||[];S.formatMeta.slide_titles[${i}]=this.value"/>`
  ).join('');
}

function collectFormatMeta(f){
  if(f==='carousel'){
    S.formatMeta.slide_count=$('#slideCount')?+$('#slideCount').value:S.formatMeta.slide_count;
  } else if(f==='lead-magnet-pdf'){
    S.formatMeta.pdf_url=$('#pdfUrl')?$('#pdfUrl').value:S.formatMeta.pdf_url;
    S.formatMeta.landing_copy=$('#landingCopy')?$('#landingCopy').value:S.formatMeta.landing_copy;
  }
  S.formatMeta.checklist=S.checklist;
  return S.formatMeta;
}

function currentFormat(){ return $$('.format-card.selected')[0]?.dataset.format||'text-only'; }

function collectPostForm(){
  const f=currentFormat();
  return {
    slug:$('#postSlug').value.trim(),
    title:$('#postTitle').value.trim(),
    status:$('#postStatus').value,
    style:$('#postStyle').value||null,
    platforms:$('#postPlatforms').value.split(',').map(x=>x.trim()).filter(Boolean),
    scheduled_at:fromLocal($('#postScheduledAt').value),
    content:$('#postContent').value,
    notes:$('#postNotes').value,
    format:f,
    format_meta:collectFormatMeta(f),
    research_insight:$('#postInsight').value,
    editorial_angle:$('#postAngle').value
  };
}

async function savePost(){
  const d=collectPostForm();
  if(!d.slug){ alert('Ponle un slug al post'); return; }
  if(S.selectedPostId){
    if(d.status==='published'&&!d.published_at) d.published_at=new Date().toISOString();
    await api('/api/posts/'+S.selectedPostId,{method:'PUT',body:JSON.stringify(d)});
  } else {
    const c=await api('/api/posts',{method:'POST',body:JSON.stringify(d)});
    S.selectedPostId=c.id;
  }
  await refreshAll();
  if(S.selectedPostId) await selectPost(S.selectedPostId);
}

async function deletePost(){
  if(!S.selectedPostId) return alert('Selecciona un post.');
  if(!confirm('¿Eliminar post?')) return;
  await api('/api/posts/'+S.selectedPostId,{method:'DELETE'});
  clearEditor(); await refreshAll();
}

function clearEditor(){
  S.selectedPostId=null; S.formatMeta={}; S.checklist={}; S.postSources=[];
  $('#editorNotice').textContent='Selecciona un post o crea uno nuevo.';
  ['#postSlug','#postTitle','#postPlatforms','#postScheduledAt','#postInsight','#postAngle'].forEach(s=>$(s).value='');
  ['#postContent','#postNotes'].forEach(s=>$(s).value='');
  $('#postStatus').value='draft'; $('#postStyle').value='';
  setFormat('text-only');
  $('#mediaGrid').innerHTML='<div class="empty">Sin imágenes.</div>';
  $('#sourcesList').innerHTML='';
  renderChecklist();
  renderPosts();
}

// ─── FORMAT CARDS ─────────────────────────────────────────────────
$$('.format-card').forEach(c=>c.onclick=()=>{
  S.formatMeta={}; setFormat(c.dataset.format);
  updateMediaWarning(c.dataset.format,0);
});

// ─── MEDIA ────────────────────────────────────────────────────────
function renderMedia(items){
  const g=$('#mediaGrid');
  if(!items.length){ g.innerHTML='<div class="empty">Sin imágenes.</div>'; return; }
  g.innerHTML=items.map(m=>{
    const url=m.url||(m.file_path ? '/'+m.file_path.replace(/^\//,'') : `/uploads/${m.file_name}`);
    return `<div class="media-card"><img src="${url}" alt="${esc(m.original_name||m.file_name)}"/>
      <div class="media-meta"><b>${esc(m.original_name||m.file_name)}</b><span>${fmt(m.file_size)}</span></div>
      <div class="media-actions"><a class="btn sm" href="${url}" target="_blank">Ver</a><button class="btn red sm" data-mid="${m.id}">×</button></div></div>`;
  }).join('');
  $$('[data-mid]').forEach(b=>b.onclick=async()=>{ if(confirm('¿Eliminar?')){ await api('/api/media/'+b.dataset.mid,{method:'DELETE'}); await selectPost(S.selectedPostId); } });
}

function updateMediaWarning(f,count){
  const w=$('#mediaWarning'); if(!w) return;
  if(f==='carousel'&&count<2) w.innerHTML='<span class="warn-badge">Faltan slides</span>';
  else if(f==='single-image'&&count===0) w.innerHTML='<span class="warn-badge">Falta imagen</span>';
  else w.innerHTML='';
}

$('#imageUpload').onchange=async e=>{
  if(!S.selectedPostId) return alert('Guarda el post primero.');
  const form=new FormData(); [...e.target.files].forEach(f=>form.append('images',f));
  await fetch('/api/posts/'+S.selectedPostId+'/media',{method:'POST',body:form});
  await selectPost(S.selectedPostId);
  e.target.value='';
};

// ─── RESEARCH SOURCES ─────────────────────────────────────────────
function renderSources(){
  const c=$('#sourcesList'); if(!c) return;
  if(!S.postSources.length){ c.innerHTML='<div class="muted" style="font-size:13px">Sin fuentes.</div>'; return; }
  c.innerHTML=S.postSources.map(s=>`
    <div class="source-item">
      <div class="source-info">
        <a href="${esc(s.url)}" target="_blank">${esc(s.title||s.url)}</a>
        <span class="chip platform" style="margin-top:4px;display:inline-block">${s.source_type}</span>
        ${s.excerpt?`<div class="excerpt">${esc(s.excerpt)}</div>`:''}
      </div>
      <button class="btn red sm" data-sid="${s.id}">×</button>
    </div>`).join('');
  $$('[data-sid]').forEach(b=>b.onclick=async()=>{
    await api('/api/sources/'+b.dataset.sid,{method:'DELETE'});
    S.postSources=S.postSources.filter(x=>x.id!=b.dataset.sid);
    renderSources(); updateResearchBadge();
  });
}

function updateResearchBadge(){
  const el=$('#researchCompleteness'); if(!el) return;
  const primary=S.postSources.filter(s=>['blog','github','paper','docs'].includes(s.source_type));
  if(primary.length>=2) el.innerHTML='<span class="chip ok">Investigación completa ✓</span>';
  else if(S.postSources.length>0) el.innerHTML='<span class="chip warn">Investigación parcial</span>';
  else el.innerHTML='<span class="chip warn">Sin fuentes</span>';
}

function showAddSourceForm(){ $('#addSourceForm').style.display=''; }
function hideAddSourceForm(){ $('#addSourceForm').style.display='none'; }

async function saveSource(){
  if(!S.selectedPostId) return alert('Guarda el post primero.');
  const d={url:$('#srcUrl').value,title:$('#srcTitle').value,source_type:$('#srcType').value,excerpt:$('#srcExcerpt').value};
  if(!d.url) return alert('Pon la URL.');
  const r=await api('/api/posts/'+S.selectedPostId+'/sources',{method:'POST',body:JSON.stringify(d)});
  S.postSources.push({...d,id:r.id});
  renderSources(); updateResearchBadge(); hideAddSourceForm();
  ['#srcUrl','#srcTitle','#srcExcerpt'].forEach(s=>$(s).value='');
}

// ─── CHECKLIST ────────────────────────────────────────────────────
function renderChecklist(){
  $$('#analysisChecklist .check-item').forEach(el=>{
    const done=!!S.checklist[el.dataset.key];
    el.classList.toggle('done',done);
    el.querySelector('.cbox').textContent=done?'✓':'';
  });
}

function toggleCheck(el){
  const k=el.dataset.key; S.checklist[k]=!S.checklist[k];
  el.classList.toggle('done',S.checklist[k]);
  el.querySelector('.cbox').textContent=S.checklist[k]?'✓':'';
}

function toggleSection(id){ const b=$('#'+id); b.classList.toggle('hidden'); }

// ─── TASKS ────────────────────────────────────────────────────────
async function loadTasks(){
  S.tasks=await api('/api/tasks');
  const l=$('#tasksList');
  if(!S.tasks.length){ l.innerHTML='<div class="empty">Sin tareas.</div>'; return; }
  const pmap={low:'#64748b',medium:'#38bdf8',high:'#f97316',urgent:'#ef4444'};
  l.innerHTML=S.tasks.map(t=>`<div class="todo">
    <span style="width:10px;height:10px;border-radius:50%;background:${pmap[t.priority]};display:inline-block;flex-shrink:0"></span>
    <div><strong>${esc(t.title)}</strong><small>${esc(t.description||'')}</small></div>
    <select data-task-status="${t.id}" class="field" style="padding:6px;width:auto">
      ${['pending','in_progress','done','cancelled'].map(s=>`<option${t.status===s?' selected':''}>${s}</option>`).join('')}
    </select>
    <button class="btn red sm" data-task-del="${t.id}">×</button>
  </div>`).join('');
  $$('[data-task-status]').forEach(el=>el.onchange=async()=>{ await api('/api/tasks/'+el.dataset.taskStatus,{method:'PUT',body:JSON.stringify({status:el.value})}); await loadTasks(); });
  $$('[data-task-del]').forEach(el=>el.onclick=async()=>{ if(confirm('¿Eliminar?')){ await api('/api/tasks/'+el.dataset.taskDel,{method:'DELETE'}); await loadTasks(); } });
}

async function createTask(){
  const t=$('#taskTitle').value.trim(); if(!t) return alert('Ponle título.');
  await api('/api/tasks',{method:'POST',body:JSON.stringify({title:t,description:$('#taskDescription').value,priority:$('#taskPriority').value,status:$('#taskStatus').value,due_date:$('#taskDueDate').value||null,linked_post_id:S.selectedPostId||null})});
  $('#taskTitle').value=''; $('#taskDescription').value=''; $('#taskDueDate').value='';
  await loadTasks();
}

// ─── HOT ALERTS ───────────────────────────────────────────────────
let alertPollTimer=null;
async function pollHotAlerts(){
  try{
    const alerts=await api('/api/hot-alerts/active');
    S.hotAlerts=alerts;
    renderAlertBanner();
  }catch(e){}
  alertPollTimer=setTimeout(pollHotAlerts,30000);
}

function renderAlertBanner(){
  const banner=$('#hotAlertBanner');
  if(!S.hotAlerts.length){ banner.style.display='none'; return; }
  banner.style.display='';
  const a=S.hotAlerts[S.alertIdx]||S.hotAlerts[0];
  S.alertIdx=Math.min(S.alertIdx,S.hotAlerts.length-1);
  $('#alertTitle').textContent=a.title;
  $('#alertReason').textContent=a.urgency_reason;
  $('#alertCounter').textContent=`${S.alertIdx+1}/${S.hotAlerts.length}`;
  // play sound if new
  if(!a._notified){ a._notified=true; playChime(); }
}

function playChime(){
  try{
    const ctx=new AudioContext();
    const o=ctx.createOscillator(); const g=ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880,ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(440,ctx.currentTime+0.3);
    g.gain.setValueAtTime(0.3,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
    o.start(); o.stop(ctx.currentTime+0.4);
  }catch(e){}
}

$('#alertPrev').onclick=()=>{ S.alertIdx=Math.max(0,S.alertIdx-1); renderAlertBanner(); };
$('#alertNext').onclick=()=>{ S.alertIdx=Math.min(S.hotAlerts.length-1,S.alertIdx+1); renderAlertBanner(); };

$('#btnAlertPublish').onclick=async()=>{
  const a=S.hotAlerts[S.alertIdx]; if(!a) return;
  if(!confirm(`¿Publicar ahora: "${a.title}"?`)) return;
  const r=await api('/api/hot-alerts/'+a.id+'/publish',{method:'PUT'});
  alert(`✅ Post publicado (ID ${r.postId})`);
  await pollHotAlerts(); await loadStats(); await loadPosts();
};

$('#btnAlertDismiss').onclick=async()=>{
  const a=S.hotAlerts[S.alertIdx]; if(!a) return;
  await api('/api/hot-alerts/'+a.id+'/dismiss',{method:'PUT'});
  S.hotAlerts.splice(S.alertIdx,1); S.alertIdx=Math.max(0,S.alertIdx-1);
  renderAlertBanner(); await loadStats();
};

$('#btnAlertEdit').onclick=()=>{
  const a=S.hotAlerts[S.alertIdx]; if(!a) return;
  switchTab('posts'); clearEditor();
  setTimeout(()=>{
    $('#postTitle').value=a.title;
    $('#postContent').value=a.suggested_copy||a.summary;
    $('#postStatus').value='draft';
    setFormat(a.suggested_format||'text-only');
    $('#editorNotice').textContent=`Editando alerta en caliente: ${a.title}`;
    // store alert id for publish
    S._pendingAlertId=a.id;
  },100);
};

// ─── CALENDAR ─────────────────────────────────────────────────────
let calView='month';

function setCalView(v){
  calView=v;
  $('#calMonthBtn').classList.toggle('active',v==='month');
  $('#calWeekBtn').classList.toggle('active',v==='week');
  loadCalendar();
}

async function loadCalendar(){
  const d=S.calDate;
  if(calView==='month') await renderMonthCalendar(d);
  else await renderWeekCalendar(d);
}

async function renderMonthCalendar(d){
  const year=d.getFullYear(), month=d.getMonth();
  const label=d.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
  $('#calTitle').textContent=label.charAt(0).toUpperCase()+label.slice(1);
  const monthStr=`${year}-${pad(month+1)}`;
  const grouped=await api('/api/posts/calendar?month='+monthStr);
  const first=new Date(year,month,1).getDay(); // 0=Sun
  const offset=(first+6)%7; // Mon=0
  const days=new Date(year,month+1,0).getDate();
  const today=new Date();
  const dayNames=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  let html=`<div class="calendar-grid">${dayNames.map(n=>`<div class="cal-day-name">${n}</div>`).join('')}`;
  // prev month fill
  const prevDays=new Date(year,month,0).getDate();
  for(let i=offset-1;i>=0;i--){
    html+=`<div class="cal-cell other-month"><div class="cal-date">${prevDays-i}</div></div>`;
  }
  for(let day=1;day<=days;day++){
    const dateStr=`${year}-${pad(month+1)}-${pad(day)}`;
    const isToday=today.getFullYear()===year&&today.getMonth()===month&&today.getDate()===day;
    const dayPosts=grouped[dateStr]||[];
    html+=`<div class="cal-cell${isToday?' today':''}" data-date="${dateStr}" ondragover="event.preventDefault()" ondrop="calDrop(event,'${dateStr}')">
      <div class="cal-date">${day}<span class="add-btn" onclick="calAddPost('${dateStr}')">+</span></div>
      ${dayPosts.map(p=>`<div class="cal-post-card" draggable="true" data-pid="${p.id}" ondragstart="calDragStart(event,${p.id})" onclick="openPostModal(${p.id})">
        <div class="cal-post-title">${esc(p.title||p.slug)}</div>
        <div class="cal-chips">${statusChip(p.status)}${formatChip(p.format||'text-only')}</div>
      </div>`).join('')}
    </div>`;
  }
  // fill remaining
  const total=offset+days; const remain=(7-total%7)%7;
  for(let i=1;i<=remain;i++) html+=`<div class="cal-cell other-month"><div class="cal-date">${i}</div></div>`;
  html+='</div>';
  $('#calendarContainer').innerHTML=html;
}

async function renderWeekCalendar(d){
  const monday=new Date(d);
  monday.setDate(d.getDate()-((d.getDay()+6)%7));
  const dateStr=`${monday.getFullYear()}-${pad(monday.getMonth()+1)}-${pad(monday.getDate())}`;
  const weekPosts=await api('/api/posts/week?date='+dateStr);
  const days=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const label=monday.toLocaleDateString('es-ES',{day:'numeric',month:'short'})+' – ';
  const sun=new Date(monday); sun.setDate(monday.getDate()+6);
  $('#calTitle').textContent=label+sun.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
  let html='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:var(--line)">';
  for(let i=0;i<7;i++){
    const dt=new Date(monday); dt.setDate(monday.getDate()+i);
    const ds=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
    const dp=weekPosts.filter(p=>(p.scheduled_at||p.created_at).startsWith(ds));
    const isToday=ds===new Date().toISOString().slice(0,10);
    html+=`<div class="cal-cell${isToday?' today':''}" style="min-height:200px" data-date="${ds}" ondragover="event.preventDefault()" ondrop="calDrop(event,'${ds}')">
      <div class="cal-date"><b>${days[i]} ${dt.getDate()}</b><span class="add-btn" onclick="calAddPost('${ds}')">+</span></div>
      ${dp.map(p=>`<div class="cal-post-card" draggable="true" data-pid="${p.id}" ondragstart="calDragStart(event,${p.id})" onclick="openPostModal(${p.id})" style="margin-bottom:6px">
        <div class="cal-post-title">${esc(p.title||p.slug)}</div>
        <div style="font-size:12px;color:var(--soft);margin-top:4px;white-space:normal">${esc((p.content||'').slice(0,80))}${p.content?.length>80?'…':''}</div>
        <div class="cal-chips">${statusChip(p.status)}${formatChip(p.format||'text-only')}</div>
      </div>`).join('')}
    </div>`;
  }
  html+='</div>';
  $('#calendarContainer').innerHTML=html;
}

let _dragPid=null;
function calDragStart(e,pid){ _dragPid=pid; e.currentTarget.classList.add('dragging'); }
async function calDrop(e,dateStr){
  if(!_dragPid) return;
  await api('/api/posts/'+_dragPid,{method:'PUT',body:JSON.stringify({scheduled_at:new Date(dateStr+'T08:00:00').toISOString()})});
  _dragPid=null; loadCalendar();
}
function calAddPost(dateStr){
  switchTab('posts'); clearEditor();
  setTimeout(()=>{ $('#postScheduledAt').value=dateStr+'T08:00'; },100);
}
async function openPostModal(id){
  const p=await api('/api/posts/'+id);
  $('#modalTitle').textContent=p.title||p.slug;
  const plats=parsePlatforms(p.platforms).join(', ');
  $('#modalBody').innerHTML=`
    <div class="chips" style="margin-bottom:12px">${statusChip(p.status)}${formatChip(p.format||'text-only')}<span class="chip platform">${plats}</span></div>
    ${p.scheduled_at?`<p style="color:var(--soft);font-size:13px">📅 ${new Date(p.scheduled_at).toLocaleString('es-ES')}</p>`:''}
    <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;background:#09111d;border:1px solid var(--line);border-radius:12px;padding:14px;max-height:300px;overflow:auto">${esc(p.content)}</div>
    ${p.media?.length?`<div class="media-grid" style="margin-top:12px">${p.media.map(m=>{const u=m.url||(m.file_path?'/'+m.file_path.replace(/^\//,''):`/uploads/${m.file_name}`);return `<img src="${u}" style="width:100%;height:140px;object-fit:cover;border-radius:10px"/>`;}).join('')}</div>`:''}
    <div class="inline" style="margin-top:14px;gap:8px">
      <button class="btn primary" onclick="closeModal();switchTab('posts');selectPost(${p.id})">Editar</button>
      <select onchange="quickStatusChange(${p.id},this.value)" class="field" style="width:auto">
        ${['research','draft','review','approved','scheduled','published','archived'].map(s=>`<option${p.status===s?' selected':''}>${s}</option>`).join('')}
      </select>
    </div>`;
  $('#modalOverlay').classList.add('open');
}

async function quickStatusChange(id,status){
  await api('/api/posts/'+id,{method:'PUT',body:JSON.stringify({status})});
  closeModal(); loadCalendar(); loadStats();
}

$('#calPrev').onclick=()=>{ if(calView==='month') S.calDate.setMonth(S.calDate.getMonth()-1); else S.calDate.setDate(S.calDate.getDate()-7); loadCalendar(); };
$('#calNext').onclick=()=>{ if(calView==='month') S.calDate.setMonth(S.calDate.getMonth()+1); else S.calDate.setDate(S.calDate.getDate()+7); loadCalendar(); };

function closeModal(e){ if(!e||e.target===$('#modalOverlay')) $('#modalOverlay').classList.remove('open'); }

// ─── PROPOSALS ────────────────────────────────────────────────────
async function loadProposals(){
  const status=$('#proposalStatusFilter').value;
  const d=await api('/api/proposals'+(status?'?status='+status:''));
  S.proposals=d.proposals||[];
  const today=d.todayCount||0; const target=d.dailyTarget||2;
  const pct=Math.min(100,Math.round(today/target*100));
  $('#deliveryFill').style.width=pct+'%';
  const ok=today>=target;
  $('#deliveryLabel').innerHTML=`<span class="${ok?'freq-ok':'freq-warn'}">${today}/${target} propuestas hoy</span>`;
  renderProposalsList();
  // update badge
  const pending=S.proposals.filter(p=>p.status==='pending').length;
  const badge=$('#proposalsBadge');
  badge.textContent=pending; badge.style.display=pending?'':'none';
}

function renderProposalsList(){
  const l=$('#proposalsList');
  if(!S.proposals.length){ l.innerHTML='<div class="empty">Sin propuestas.</div>'; return; }
  l.innerHTML=S.proposals.map(p=>{
    const hot=p.priority==='hot'||p.status==='pending';
    return `<div class="proposal-card ${p.status} ${p.priority==='hot'?'hot-priority':''} ${S.selectedProposalId===p.id?'active':''}" data-pid="${p.id}">
      <div class="inline" style="justify-content:space-between">
        <div class="prop-title">${esc(p.title)}</div>
        <div class="chips">${statusChip(p.status)}</div>
      </div>
      <div class="chips" style="margin-top:6px">${formatChip(p.suggested_format||'text-only')}${p.priority==='hot'?'<span class="chip" style="background:rgba(239,68,68,.2);color:#fecaca">🔥 HOT</span>':''}</div>
      <div class="prop-preview">${esc(p.research_summary||'')}</div>
      <div class="muted" style="font-size:11px;margin-top:6px">${new Date(p.created_at).toLocaleString('es-ES')}</div>
    </div>`;
  }).join('');
  $$('#proposalsList .proposal-card').forEach(el=>el.onclick=()=>selectProposal(Number(el.dataset.pid)));
}

async function selectProposal(id){
  S.selectedProposalId=id;
  const p=await api('/api/proposals/'+id);
  renderProposalsList();
  const imgs=p.imageUrls||[];
  const imgHtml=imgs.length?`<div class="prop-images">${imgs.map(u=>`<img class="prop-img" src="${u}" onclick="window.open('${u}','_blank')"/>`).join('')}</div>`:'';
  const srcs=(p.sourcesData||[]).map(s=>`<div class="source-item"><div class="source-info"><a href="${esc(s.url)}" target="_blank">${esc(s.title||s.url)}</a><span class="chip platform">${s.source_type}</span></div></div>`).join('');
  const plats=(p.suggested_platforms||[]).map(pl=>`<span class="chip platform">${pl}</span>`).join('');
  const canAct=p.status==='pending';
  $('#proposalDetail').innerHTML=`
    <div class="inline" style="justify-content:space-between;flex-wrap:wrap">
      <h2 style="margin:0;font-size:19px;letter-spacing:-.04em">${esc(p.title)}</h2>
      <div class="chips">${statusChip(p.status)}${formatChip(p.suggested_format||'text-only')}</div>
    </div>
    <div class="chips">${plats}</div>
    ${p.research_summary?`<div><label class="lbl">Resumen investigación</label><div style="font-size:13px;color:#bcc7dd;line-height:1.6;background:#09111d;border:1px solid var(--line);border-radius:12px;padding:12px">${esc(p.research_summary)}</div></div>`:''}
    ${p.agent_notes?`<div><label class="lbl">Notas del agente</label><div style="font-size:13px;color:var(--soft)">${esc(p.agent_notes)}</div></div>`:''}
    <div><label class="lbl">Copy sugerido</label><div class="prop-copy-preview" id="propCopyEdit">${esc(p.suggested_copy)}</div></div>
    ${imgs.length?`<div><label class="lbl">Imágenes (${imgs.length})</label>${imgHtml}</div>`:''}
    ${srcs?`<div><label class="lbl">Fuentes</label>${srcs}</div>`:''}
    ${canAct?`
    <div class="inline" style="flex-wrap:wrap;gap:8px">
      <button class="btn green" onclick="approveProposal(${p.id})">✅ Aprobar</button>
      <button class="btn" onclick="editAndApprove(${p.id})">✏️ Editar y aprobar</button>
      <button class="btn red" onclick="rejectProposal(${p.id})">✗ Rechazar</button>
    </div>`:`<div class="notice">Estado: ${p.status}${p.post_id?` · <a href="#" onclick="switchTab('posts');selectPost(${p.post_id});return false">Ver post</a>`:''}</div>`}
  `;
}

async function approveProposal(id){
  const detail=$('#proposalDetail');
  if(detail){
    detail.innerHTML='<div class="empty">Aprobando propuesta y creando post...</div>';
  }
  const r=await api('/api/proposals/'+id+'/approve',{method:'PUT'});
  S.selectedProposalId=null;
  await loadProposals();
  await loadStats();
  await loadPosts();
  $('#proposalDetail').innerHTML=`<div class="empty">✅ Propuesta aprobada correctamente. Post creado (ID ${r.postId}). <a href="#" onclick="switchTab('posts');selectPost(${r.postId});return false">Ver post</a></div>`;
}

async function rejectProposal(id){
  $('#proposalDetail').innerHTML='<div class="empty">Rechazando propuesta...</div>';
  await api('/api/proposals/'+id,{method:'PUT',body:JSON.stringify({status:'rejected'})});
  S.selectedProposalId=null;
  await loadProposals();
  await loadStats();
  $('#proposalDetail').innerHTML='<div class="empty">✅ Propuesta rechazada correctamente.</div>';
}

function editAndApprove(id){
  const detail=$('#proposalDetail');
  const copyEl=$('#propCopyEdit');
  if(!copyEl) return;
  const textarea=document.createElement('textarea');
  textarea.className='field'; textarea.id='propCopyEdit';
  textarea.style.minHeight='200px'; textarea.value=copyEl.textContent;
  copyEl.replaceWith(textarea);
  detail.querySelector('.inline:last-child').innerHTML=`
    <button class="btn primary" onclick="confirmEditApprove(${id})">✅ Confirmar y crear post</button>
    <button class="btn" onclick="selectProposal(${id})">Cancelar</button>`;
}

async function confirmEditApprove(id){
  const copy=$('#propCopyEdit')?.value||'';
  $('#proposalDetail').innerHTML='<div class="empty">Guardando cambios y creando post...</div>';
  const r=await api('/api/proposals/'+id+'/approve',{method:'PUT',body:JSON.stringify({suggested_copy:copy})});
  S.selectedProposalId=null;
  await loadProposals();
  await loadStats();
  await loadPosts();
  $('#proposalDetail').innerHTML=`<div class="empty">✅ Propuesta aprobada con copia editada. Post creado (ID ${r.postId}). <a href="#" onclick="switchTab('posts');selectPost(${r.postId});return false">Ver post</a></div>`;
}

async function showAlertHistory(){
  const alerts=await api('/api/hot-alerts');
  openModal('Historial de alertas en caliente', alerts.map(a=>`
    <div style="padding:12px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px">
      <div style="font-weight:700">${esc(a.title)}</div>
      <div class="chips" style="margin:6px 0">${statusChip(a.status)}</div>
      <div style="font-size:12px;color:var(--soft)">${esc(a.urgency_reason)}</div>
      <div style="font-size:11px;color:var(--soft);margin-top:4px">${new Date(a.created_at).toLocaleString('es-ES')}</div>
    </div>`).join('')||'<div class="empty">Sin historial.</div>');
}

function openModal(title,bodyHtml){ $('#modalTitle').textContent=title; $('#modalBody').innerHTML=bodyHtml; $('#modalOverlay').classList.add('open'); }

// ─── GUIDELINES ───────────────────────────────────────────────────
let _guidelinesRaw='';
async function loadGuidelines(){
  const d=await api('/api/settings/editorial_guidelines');
  _guidelinesRaw=d.value||'Sin lineamientos cargados.';
  renderGuidelinesView(_guidelinesRaw,'');
}

function renderGuidelinesView(md,keyword){
  // Parse markdown into sections
  const sections=[]; let curr=null;
  md.split('\n').forEach(line=>{
    if(line.startsWith('## ')){
      if(curr) sections.push(curr);
      curr={title:line.replace('## ',''),body:[]};
    } else if(curr){ curr.body.push(line); }
  });
  if(curr) sections.push(curr);
  if(!sections.length){ $('#guidelinesView').innerHTML=`<div style="white-space:pre-wrap;font-size:14px;line-height:1.7;color:#bcc7dd">${esc(md)}</div>`; return; }

  const kw=keyword.toLowerCase();
  const visible=kw?sections.filter(s=>s.title.toLowerCase().includes(kw)||s.body.join(' ').toLowerCase().includes(kw)):sections;

  const hl=(text)=>kw?text.replace(new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'), '<mark class="highlight">$1</mark>'):text;

  function renderMd(lines){
    let html=''; const joined=lines.join('\n');
    const parts=joined.split(/```[\s\S]*?```/);
    const codes=joined.match(/```[\s\S]*?```/g)||[];
    return parts.map((p,i)=>{
      let h=p.replace(/^### (.+)$/gm,'<h3>$1</h3>')
        .replace(/^#### (.+)$/gm,'<h3 style="font-size:13px">$1</h3>')
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/`([^`]+)`/g,'<code>$1</code>')
        .replace(/^[-*] (.+)$/gm,'<li>$1</li>')
        .replace(/(<li>.*<\/li>)+/gs,'<ul>$&</ul>')
        .replace(/\n{2,}/g,'</p><p>');
      h=hl(h);
      return h+(codes[i]?`<pre style="background:#09111d;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px;overflow:auto">${esc(codes[i].replace(/```\w*\n?/g,''))}</pre>`:'');
    }).join('');
  }

  $('#guidelinesView').innerHTML=visible.map((s,i)=>`
    <div class="gl-section${i===0?' open':''}">
      <div class="gl-section-head" onclick="this.parentElement.classList.toggle('open')">
        <h2>${hl(esc(s.title))}</h2><span class="gl-arrow">▾</span>
      </div>
      <div class="gl-body">${renderMd(s.body)}</div>
    </div>`).join('');
}

function searchGuidelines(v){ renderGuidelinesView(_guidelinesRaw,v); }

$('#btnEditGuidelines').onclick=()=>{
  $('#guidelinesEditor').value=_guidelinesRaw;
  $('#guidelinesView').style.display='none';
  $('#guidelinesEditor').style.display='';
  $('#guidelinesSearch').closest('.guidelines-search').style.display='none';
  $('#btnEditGuidelines').style.display='none';
  $('#btnSaveGuidelines').style.display='';
  $('#btnCancelGuidelines').style.display='';
};

$('#btnSaveGuidelines').onclick=async()=>{
  const v=$('#guidelinesEditor').value;
  await api('/api/settings/editorial_guidelines',{method:'PUT',body:JSON.stringify({value:v})});
  _guidelinesRaw=v; restoreGuidelinesView(); renderGuidelinesView(v,'');
};

$('#btnCancelGuidelines').onclick=()=>{ restoreGuidelinesView(); renderGuidelinesView(_guidelinesRaw,''); };

function restoreGuidelinesView(){
  $('#guidelinesView').style.display=''; $('#guidelinesEditor').style.display='none';
  $('#guidelinesSearch').closest('.guidelines-search').style.display='';
  $('#btnEditGuidelines').style.display=''; $('#btnSaveGuidelines').style.display='none'; $('#btnCancelGuidelines').style.display='none';
}

// ─── PLANNER ──────────────────────────────────────────────────────
async function loadPlanner(){
  const d=S.plannerDate;
  const mon=new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7));
  const sun=new Date(mon); sun.setDate(mon.getDate()+6);
  const label=mon.toLocaleDateString('es-ES',{day:'numeric',month:'short'})+' – '+sun.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
  $('#plannerTitle').textContent=label;
  const dateStr=`${mon.getFullYear()}-${pad(mon.getMonth()+1)}-${pad(mon.getDate())}`;
  const weekPosts=await api('/api/posts/week?date='+dateStr);
  const days=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  let pubDays=0,totalPosts=0;
  const formatCounts={},platformCounts={};
  let html='';
  for(let i=0;i<7;i++){
    const dt=new Date(mon); dt.setDate(mon.getDate()+i);
    const ds=`${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
    const dp=weekPosts.filter(p=>(p.scheduled_at||'').startsWith(ds)||(p.created_at||'').startsWith(ds));
    if(dp.length){pubDays++;totalPosts+=dp.length;}
    dp.forEach(p=>{
      const f=p.format||'text-only'; formatCounts[f]=(formatCounts[f]||0)+1;
      (parsePlatforms(p.platforms)||[]).forEach(pl=>{ platformCounts[pl]=(platformCounts[pl]||0)+1; });
    });
    const isToday=ds===new Date().toISOString().slice(0,10);
    html+=`<div class="planner-day${dp.length?' has-posts':''}${isToday?' today':''}">
      <div class="planner-day-name">${days[i]}</div>
      <div class="planner-day-date">${dt.getDate()}</div>
      ${dp.map(p=>`<div class="planner-post-card" onclick="openPostModal(${p.id})">
        <div class="pp-title">${esc(p.title||p.slug)}</div>
        <div class="chips" style="margin-top:4px">${formatChip(p.format||'text-only')}</div>
      </div>`).join('')}
      <div class="planner-add" onclick="plannerAddDay('${ds}')">+</div>
    </div>`;
  }
  $('#plannerGrid').innerHTML=html;
  // Frequency validation
  const freqOk=pubDays>=2&&pubDays<=3;
  const postsOk=pubDays===0||Math.round(totalPosts/pubDays)>=2;
  let msg='';
  if(pubDays===0) msg=`<span class="freq-warn">⚠ Sin publicaciones esta semana</span>`;
  else if(!freqOk) msg=`<span class="freq-warn">⚠ ${pubDays} día(s) con posts — ideal: 2-3 días/semana</span>`;
  else if(!postsOk) msg=`<span class="freq-warn">⚠ Cadencia: ~${(totalPosts/pubDays).toFixed(1)} posts/día — ideal: 2/día</span>`;
  else msg=`<span class="freq-ok">✓ Cadencia correcta: ${pubDays} días, ${totalPosts} posts</span>`;
  $('#plannerFreqMsg').innerHTML=msg;
  // Distribution bars
  $('#formatDistrib').innerHTML=Object.entries(formatCounts).map(([k,v])=>`<div class="distrib-item chip format-${k}">${FORMAT_ICONS[k]||''} ${k.replace('-',' ')}: <b>${v}</b></div>`).join('')||'<span class="muted">Sin datos</span>';
  $('#platformDistrib').innerHTML=Object.entries(platformCounts).map(([k,v])=>`<div class="distrib-item chip platform">${k}: <b>${v}</b></div>`).join('')||'<span class="muted">Sin datos</span>';
}

function plannerAddDay(ds){ switchTab('posts'); clearEditor(); setTimeout(()=>{ $('#postScheduledAt').value=ds+'T08:00'; },100); }

async function generateWeeklySummary(){
  const d=S.plannerDate;
  const mon=new Date(d); mon.setDate(d.getDate()-((d.getDay()+6)%7));
  const ds=`${mon.getFullYear()}-${pad(mon.getMonth()+1)}-${pad(mon.getDate())}`;
  const r=await api('/api/weekly-summary?date='+ds);
  $('#weeklySummaryContent').textContent=r.summary;
  $('#weeklySummaryBlock').style.display='';
}

function copyWeeklySummary(){
  navigator.clipboard.writeText($('#weeklySummaryContent').textContent).then(()=>alert('📋 Copiado al portapapeles'));
}

$('#plannerPrev').onclick=()=>{ S.plannerDate.setDate(S.plannerDate.getDate()-7); loadPlanner(); };
$('#plannerNext').onclick=()=>{ S.plannerDate.setDate(S.plannerDate.getDate()+7); loadPlanner(); };

// ─── WIRING BUTTONS ───────────────────────────────────────────────
$('#btnNewPost').onclick=clearEditor;
$('#btnSavePost').onclick=savePost;
$('#btnDeletePost').onclick=deletePost;
$('#btnAddTask').onclick=createTask;
$('#btnRefresh').onclick=refreshAll;
$('#btnClearFilters').onclick=()=>{ $('#searchInput').value=''; $('#statusFilter').value=''; $('#formatFilter').value=''; loadPosts(); };
$('#btnQuickPublished').onclick=()=>{ $('#statusFilter').value='published'; loadPosts(); };
$('#btnQuickDraft').onclick=()=>{ $('#statusFilter').value='draft'; loadPosts(); switchTab('posts'); };
$('#btnQuickApproved').onclick=()=>{ $('#statusFilter').value='approved'; loadPosts(); switchTab('posts'); };
$('#btnDuplicateStatus').onclick=async()=>{ if(!S.selectedPostId) return; await api('/api/posts/'+S.selectedPostId,{method:'PUT',body:JSON.stringify({status:'published',published_at:new Date().toISOString()})}); await refreshAll(); };
$('#btnImport').onclick=async()=>{ if(!confirm('Importar queue?')) return; const r=await api('/api/import/queue',{method:'POST'}); alert(`Importados: ${r.imported}, Omitidos: ${r.skipped}`); await refreshAll(); };
$('#btnImportAgain').onclick=$('#btnImport').onclick;
$('#btnOpenHealth').onclick=()=>window.open('/health','_blank');
$('#btnExportHint').onclick=()=>alert('DB: '+location.origin+'\nRuta local: data/dashboard.db');
$('#btnReloadMedia').onclick=refreshAll;

$('#searchInput').oninput=debounce(loadPosts,300);
$('#statusFilter').onchange=loadPosts;
$('#formatFilter').onchange=loadPosts;

function debounce(fn,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a),ms); }; }

async function refreshAll(){
  await Promise.all([loadStats(), loadPosts(), loadTasks()]);
}

// ─── INIT ─────────────────────────────────────────────────────────
(async()=>{
  await refreshAll();
  pollHotAlerts();
})();

// ─── LIGHTBOX ─────────────────────────────────────────────────────
let _lbImages=[], _lbIdx=0;

function lbOpen(images, idx=0){
  // images = [{url, name}]
  _lbImages=images; _lbIdx=idx;
  lbRender();
  $('#lightbox').classList.add('open');
  document.addEventListener('keydown', lbKey);
}

function lbRender(){
  const img=_lbImages[_lbIdx]||{};
  $('#lbImg').src=img.url||'';
  $('#lbImg').alt=img.name||'';
  $('#lbFilename').textContent=img.name||'';
  $('#lbCounter').textContent=_lbImages.length>1?`${_lbIdx+1} / ${_lbImages.length}`:'';
  $('#lbPrev').style.display=_lbImages.length>1?'flex':'none';
  $('#lbNext').style.display=_lbImages.length>1?'flex':'none';
}

function lbNav(dir){
  _lbIdx=(_lbIdx+dir+_lbImages.length)%_lbImages.length;
  lbRender();
}

function lbClose(){
  $('#lightbox').classList.remove('open');
  document.removeEventListener('keydown',lbKey);
}

function lbKey(e){
  if(e.key==='Escape') lbClose();
  if(e.key==='ArrowRight') lbNav(1);
  if(e.key==='ArrowLeft') lbNav(-1);
}

// Lightbox: use event delegation instead of monkey-patching
document.addEventListener('click', function(e){
  const img = e.target.closest('img');
  if(!img) return;
  // Only lightbox images inside media-grid, modal, or proposal detail
  const container = img.closest('#mediaGrid, #modalBody, #proposalDetail, .prop-images');
  if(!container) return;
  e.stopPropagation();
  const allImgs = [...container.querySelectorAll('img')];
  const imgs = allImgs.map(el=>({url:el.src, name:el.alt||''}));
  const idx = allImgs.indexOf(img);
  lbOpen(imgs, idx >= 0 ? idx : 0);
});

// Make all lightbox-eligible images show zoom cursor
new MutationObserver(()=>{
  document.querySelectorAll('#mediaGrid img, #modalBody img, #proposalDetail img, .prop-images img').forEach(el=>{
    el.style.cursor='zoom-in';
  });
}).observe(document.body, {childList:true, subtree:true});
