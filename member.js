const cfg = window.CHANGE_UK_CONFIG || {};
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_PUBLIC');
const sb = configured ? supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;
const $ = (id) => document.getElementById(id);
let session = null;
let profile = null;
let membership = null;
let announcements = [], events = [], briefings = [], resources = [], feedback = [], rsvps = [];

function esc(v=''){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));}
function fmtDate(v){if(!v)return 'Date TBC';const d=new Date(v);return d.toLocaleString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}
function audienceLabel(a){return a==='youth'?'Youth':'Adult';}
function initials(){const first=profile?.first_name||''; const last=profile?.last_name||''; return ((first[0]||'C')+(last[0]||'')).toUpperCase();}
function showStatus(el,msg,ok=false){el.textContent=msg;el.style.color=ok?'#2f7d44':'';}

function setTab(name){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
}
document.addEventListener('click',e=>{
  const tab=e.target.closest('.tab'); if(tab)setTab(tab.dataset.tab);
  const jump=e.target.closest('.jump'); if(jump)setTab(jump.dataset.jump);
});

async function showSession(s){
  session=s;
  if(!s){$('loginPanel').classList.remove('hidden');$('dashboard').classList.add('hidden');return;}
  $('loginPanel').classList.add('hidden');$('dashboard').classList.remove('hidden');
  const [{data:p},{data:m}] = await Promise.all([
    sb.from('profiles').select('*').eq('id',s.user.id).maybeSingle(),
    sb.from('memberships').select('*').eq('user_id',s.user.id).maybeSingle()
  ]);
  profile=p||{}; membership=m||{};
  $('welcome').textContent='Welcome'+(profile.first_name?`, ${profile.first_name}`:'')+'.';
  $('avatar').textContent=initials();
  $('memberType').textContent=(profile.membership_type||membership.membership_type||'member')+' member';
  await loadAll();
  renderAll();
}

async function loadAll(){
  const now = new Date().toISOString();
  const [a,e,b,r,f,rv] = await Promise.all([
    sb.from('member_announcements').select('*').eq('published',true).order('pinned',{ascending:false}).order('published_at',{ascending:false}),
    sb.from('events').select('*').eq('published',true).gte('event_date',now).order('event_date'),
    sb.from('policy_briefings').select('*').eq('published',true).order('updated_at',{ascending:false}),
    sb.from('member_resources').select('*').eq('published',true).order('sort_order'),
    sb.from('member_feedback').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false}),
    sb.from('event_rsvps').select('*').eq('user_id',session.user.id)
  ]);
  announcements=a.data||[]; events=e.data||[]; briefings=b.data||[]; resources=r.data||[]; feedback=f.data||[]; rsvps=rv.data||[];
}

function renderAll(){
  $('statAnnouncements').textContent=announcements.length;
  $('statEvents').textContent=events.length;
  $('statBriefings').textContent=briefings.length;
  $('statResources').textContent=resources.length+6;
  renderPinned(); renderHome(); renderAnnouncements(); renderEvents(); renderBriefings(); renderResources(); renderFeedback(); renderAccount();
}

function renderPinned(){
  const p=announcements.find(x=>x.pinned);
  $('pinnedAnnouncement').innerHTML=p?`<div class="announcement-strip"><div class="card-meta" style="color:#eadcf6">PINNED MEMBER ANNOUNCEMENT</div><h3>${esc(p.title)}</h3><div>${esc(p.body)}</div></div>`:'';
}
function renderHome(){
  const a=announcements[0]; $('homeAnnouncement').innerHTML=a?`<h3>${esc(a.title)}</h3><p>${esc(a.body).slice(0,220)}</p>`:'No private announcements yet.';
  const e=events[0]; $('homeEvent').innerHTML=e?`<h3>${esc(e.title)}</h3><p>${fmtDate(e.event_date)}</p><p>${esc(e.location||'Location TBC')}</p>`:'No upcoming events yet.';
  const b=briefings[0]; $('homeBriefing').innerHTML=b?`<h3>${esc(b.title)}</h3><p>${esc(b.summary||'')}</p>`:'No policy briefings yet.';
}
function renderAnnouncements(){
  $('announcementList').innerHTML=announcements.length?announcements.map(a=>`<article class="card ${a.pinned?'pin':''}"><div class="card-meta">${a.pinned?'PINNED · ':''}${new Date(a.published_at).toLocaleDateString('en-GB')}</div><h3>${esc(a.title)}</h3><p>${esc(a.body)}</p><span class="pill">${esc(a.audience||'all')}</span></article>`).join(''):'<div class="empty">No member announcements have been published.</div>';
}
function eventDay(v){const d=new Date(v);return {day:d.getDate(),mon:d.toLocaleDateString('en-GB',{month:'short'}).toUpperCase()};}
function renderEvents(){
  $('eventList').innerHTML=events.length?events.map(e=>{const d=eventDay(e.event_date);const r=rsvps.find(x=>x.event_id===e.id);return `<article class="card"><div class="row"><div class="event-date"><strong>${d.day}</strong>${d.mon}</div><div><div class="card-meta">${esc(e.event_type||'Member event')}</div><h3>${esc(e.title)}</h3><div class="muted">${fmtDate(e.event_date)} · ${esc(e.location||'Location TBC')}</div></div></div><p>${esc(e.description||'')}</p><div class="row"><span class="pill">${esc(e.audience||'all')}</span><span class="spacer"></span><button class="btn ${r?.status==='going'?'primary':''}" onclick="setRsvp('${e.id}','going')">${r?.status==='going'?'Going ✓':'RSVP going'}</button><button class="btn" onclick="setRsvp('${e.id}','not_going')">Can't attend</button></div></article>`;}).join(''):'<div class="empty">No upcoming member events are published.</div>';
}
window.setRsvp=async function(eventId,status){
  const {error}=await sb.from('event_rsvps').upsert({event_id:eventId,user_id:session.user.id,status},{onConflict:'event_id,user_id'});
  if(error){alert(error.message);return;} const {data}=await sb.from('event_rsvps').select('*').eq('user_id',session.user.id); rsvps=data||[]; renderEvents();
}
function renderBriefings(){
  $('briefingList').innerHTML=briefings.length?briefings.map((b,i)=>`<article class="card"><div class="card-meta">${esc(b.topic||'Policy briefing')} · ${new Date(b.updated_at).toLocaleDateString('en-GB')}</div><h3>${esc(b.title)}</h3><p>${esc(b.summary||'')}</p><details class="expand"><summary><b>Read full briefing</b></summary><div class="briefing-body">${esc(b.body||'')}</div></details></article>`).join(''):'<div class="empty">No member policy briefings are published yet.</div>';
}
function renderResources(){
  $('resourceList').innerHTML=resources.length?resources.map(r=>`<article class="card"><div class="card-meta">${esc(r.resource_type||'Resource')}</div><h3>${esc(r.title)}</h3><p class="muted">${esc(r.description||'')}</p>${r.file_url?`<a class="download-link" href="${esc(r.file_url)}" target="_blank" rel="noopener">Open resource</a>`:''}</article>`).join(''):'<div class="empty">No extra resources have been published. The Brand Kit already contains six downloadable logo files.</div>';
}
function renderFeedback(){
  $('feedbackList').innerHTML=feedback.length?feedback.map(f=>`<div class="feedback-item"><div class="row"><strong>${esc(f.subject)}</strong><span class="pill">${esc(f.status||'received')}</span><span class="spacer"></span><small class="muted">${new Date(f.created_at).toLocaleDateString('en-GB')}</small></div><div class="muted">${esc(f.message)}</div></div>`).join(''):'<div class="empty">You have not sent any feedback yet.</div>';
}
function renderAccount(){
  const type=profile?.membership_type||membership?.membership_type||'member';
  $('accountDetails').innerHTML=`<p><b>Email:</b> ${esc(session.user.email)}</p><p><b>Membership:</b> ${esc(type)}</p><p><b>Status:</b> ${esc(membership?.status||'active')}</p><p><b>Joined:</b> ${membership?.joined_at?new Date(membership.joined_at).toLocaleDateString('en-GB'):'Not recorded'}</p>`;
  $('accessExplain').textContent=type==='youth'?'Your account receives content marked for all members or Youth members.':'Your account receives content marked for all members or Adult members.';
}

$('sendFeedback').onclick=async()=>{
  const subject=$('feedbackSubject').value.trim(), message=$('feedbackMessage').value.trim();
  if(!subject||!message){showStatus($('feedbackStatus'),'Please enter both a subject and message.');return;}
  showStatus($('feedbackStatus'),'Sending…');
  const {error}=await sb.from('member_feedback').insert({user_id:session.user.id,subject,message});
  if(error){showStatus($('feedbackStatus'),error.message);return;}
  $('feedbackSubject').value='';$('feedbackMessage').value='';showStatus($('feedbackStatus'),'Sent privately.',true);
  const {data}=await sb.from('member_feedback').select('*').eq('user_id',session.user.id).order('created_at',{ascending:false});feedback=data||[];renderFeedback();
};

if(sb){
  sb.auth.getSession().then(({data})=>showSession(data.session));
  sb.auth.onAuthStateChange((_e,s)=>showSession(s));
}else $('mStatus').textContent='Configure Supabase in config.js first.';
$('mLogin').onclick=async()=>{if(!sb)return;showStatus($('mStatus'),'Signing in…');const {error}=await sb.auth.signInWithPassword({email:$('mEmail').value,password:$('mPass').value});showStatus($('mStatus'),error?error.message:'Signed in.',!error);};
$('logout').onclick=()=>sb?.auth.signOut();
