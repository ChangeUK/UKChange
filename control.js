const cfg=window.CHANGE_UK_CONFIG||{};
const configured=cfg.SUPABASE_URL&&!cfg.SUPABASE_URL.includes('YOUR-PROJECT')&&cfg.SUPABASE_ANON_KEY&&!cfg.SUPABASE_ANON_KEY.includes('YOUR_PUBLIC');
const sb=configured?supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
const $=id=>document.getElementById(id);
const esc=(v='')=>String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
let currentUser=null;

function status(id,msg,ok=false){const el=$(id);if(!el)return;el.textContent=msg;el.style.color=ok?'#7fd397':'';}
function slugify(v){return String(v).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||('policy-'+Date.now());}
function setTab(name){document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===name));document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===`section-${name}`));}
document.addEventListener('click',e=>{const t=e.target.closest('.tab');if(t)setTab(t.dataset.tab);});

async function isAdmin(userId){const {data,error}=await sb.from('profiles').select('is_admin').eq('id',userId).maybeSingle();return !error&&data?.is_admin===true;}
async function sessionChanged(session){
  if(!session){currentUser=null;$('adminLogin').classList.remove('hidden');$('adminUI').classList.add('hidden');return;}
  if(!(await isAdmin(session.user.id))){await sb.auth.signOut();status('aStatus','This account is not marked as an administrator.');return;}
  currentUser=session.user;$('adminLogin').classList.add('hidden');$('adminUI').classList.remove('hidden');await loadAll();
}
async function loadAll(){await Promise.all([loadSettings(),loadPolicies(),loadAnnouncements(),loadEvents(),loadBriefings(),loadResources(),loadFeedback()]);}

async function loadSettings(){
  const {data}=await sb.from('site_settings').select('*').in('key',['stats','hero_notice']);
  const map=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  $('sMps').value=map.stats?.mps??0;$('sCouncillors').value=map.stats?.councillors??0;$('sCouncils').value=map.stats?.councils??0;$('sNotice').value=map.hero_notice?.text??'';
}
$('saveStats').onclick=async()=>{
  status('siteStatus','Saving…');
  const updates=[{key:'stats',value:{mps:+$('sMps').value||0,councillors:+$('sCouncillors').value||0,councils:+$('sCouncils').value||0},updated_at:new Date().toISOString()},{key:'hero_notice',value:{text:$('sNotice').value.trim()},updated_at:new Date().toISOString()}];
  const {error}=await sb.from('site_settings').upsert(updates,{onConflict:'key'});status('siteStatus',error?error.message:'Saved.',!error);
};

async function loadPolicies(){const {data}=await sb.from('policies').select('*').order('sort_order');renderPolicies(data||[]);}
function renderPolicies(rows){
  $('policyEditor').innerHTML=rows.map(p=>`<div class="item" data-policy="${p.id}"><div class="grid"><label>Title<input class="p-title" value="${esc(p.title)}"></label><label>Category<input class="p-category" value="${esc(p.category||'')}"></label><label>Order<input class="p-order" type="number" value="${p.sort_order??0}"></label></div><label>Summary<input class="p-summary" value="${esc(p.summary||'')}"></label><label>Detail<textarea class="p-detail" rows="4">${esc(p.detail||'')}</textarea></label><div class="grid2"><label>Quiz question<input class="p-question" value="${esc(p.quiz_question||'')}"></label><label>Quiz position (1–5)<input class="p-position" type="number" min="1" max="5" value="${p.quiz_position??3}"></label></div><div class="checkrow"><label><input class="p-published" type="checkbox" ${p.published?'checked':''}> Published</label></div><div class="toolbar"><button class="btn primary save-policy">Save</button><button class="btn danger delete-policy">Delete</button></div></div>`).join('');
}
$('newPolicy').onclick=async()=>{const title='New policy';const {error}=await sb.from('policies').insert({slug:slugify(title+'-'+Date.now()),title,category:'General',summary:'',detail:'',quiz_question:'',quiz_position:3,sort_order:99,published:false});if(error)alert(error.message);else loadPolicies();};
document.addEventListener('click',async e=>{
  const box=e.target.closest('[data-policy]');if(!box)return;const id=box.dataset.policy;
  if(e.target.closest('.save-policy')){const patch={title:box.querySelector('.p-title').value,category:box.querySelector('.p-category').value,summary:box.querySelector('.p-summary').value,detail:box.querySelector('.p-detail').value,quiz_question:box.querySelector('.p-question').value,quiz_position:+box.querySelector('.p-position').value||3,sort_order:+box.querySelector('.p-order').value||0,published:box.querySelector('.p-published').checked,updated_at:new Date().toISOString()};const {error}=await sb.from('policies').update(patch).eq('id',id);if(error)alert(error.message);else alert('Policy saved.');}
  if(e.target.closest('.delete-policy')){if(confirm('Delete this policy?')){const {error}=await sb.from('policies').delete().eq('id',id);if(error)alert(error.message);else loadPolicies();}}
});

$('publishNews').onclick=async()=>{const title=$('nTitle').value.trim(),body=$('nBody').value.trim();if(!title)return status('newsStatus','Enter a headline.');const {error}=await sb.from('news').insert({title,body,published:true,published_at:new Date().toISOString()});status('newsStatus',error?error.message:'Published.',!error);if(!error){$('nTitle').value='';$('nBody').value='';}};

async function loadAnnouncements(){const {data}=await sb.from('member_announcements').select('*').order('published_at',{ascending:false});$('announcementAdminList').innerHTML=(data||[]).map(x=>`<div class="item"><div class="grid2"><div><b>${esc(x.title)}</b><div class="mini">${esc(x.audience)} · ${x.pinned?'Pinned · ':''}${x.published?'Published':'Draft'}</div></div><div class="toolbar" style="justify-content:flex-end"><button class="btn danger" onclick="removeRow('member_announcements','${x.id}',loadAnnouncements)">Delete</button></div></div><p>${esc(x.body)}</p></div>`).join('')||'<p class="mini">No announcements yet.</p>';}
$('addAnnouncement').onclick=async()=>{const row={title:$('anTitle').value.trim(),body:$('anBody').value.trim(),audience:$('anAudience').value,pinned:$('anPinned').checked,published:$('anPublished').checked,published_at:new Date().toISOString()};if(!row.title||!row.body)return status('announcementStatus','Enter a title and announcement.');const {error}=await sb.from('member_announcements').insert(row);status('announcementStatus',error?error.message:'Announcement saved.',!error);if(!error){$('anTitle').value='';$('anBody').value='';loadAnnouncements();}};

async function loadEvents(){const {data}=await sb.from('events').select('*').order('event_date',{ascending:false});$('eventAdminList').innerHTML=(data||[]).map(x=>`<div class="item"><div class="grid2"><div><b>${esc(x.title)}</b><div class="mini">${new Date(x.event_date).toLocaleString('en-GB')} · ${esc(x.audience)} · ${x.published?'Published':'Draft'}</div></div><div class="toolbar" style="justify-content:flex-end"><button class="btn danger" onclick="removeRow('events','${x.id}',loadEvents)">Delete</button></div></div><p>${esc(x.location||'')} ${x.description?'— '+esc(x.description):''}</p></div>`).join('')||'<p class="mini">No events yet.</p>';}
$('addEvent').onclick=async()=>{const row={title:$('evTitle').value.trim(),event_date:$('evDate').value?new Date($('evDate').value).toISOString():null,location:$('evLocation').value.trim(),event_type:$('evType').value.trim(),audience:$('evAudience').value,capacity:$('evCapacity').value?+$('evCapacity').value:null,description:$('evDescription').value.trim(),member_only:$('evMemberOnly').checked,published:$('evPublished').checked};if(!row.title||!row.event_date)return status('eventStatus','Enter an event title and date.');const {error}=await sb.from('events').insert(row);status('eventStatus',error?error.message:'Event added.',!error);if(!error){$('evTitle').value='';$('evDate').value='';$('evDescription').value='';loadEvents();}};

async function loadBriefings(){const {data}=await sb.from('policy_briefings').select('*').order('updated_at',{ascending:false});$('briefingAdminList').innerHTML=(data||[]).map(x=>`<div class="item"><div class="grid2"><div><b>${esc(x.title)}</b><div class="mini">${esc(x.topic||'Policy')} · ${esc(x.audience)} · ${x.published?'Published':'Draft'}</div></div><div class="toolbar" style="justify-content:flex-end"><button class="btn danger" onclick="removeRow('policy_briefings','${x.id}',loadBriefings)">Delete</button></div></div><p>${esc(x.summary||'')}</p></div>`).join('')||'<p class="mini">No briefings yet.</p>';}
$('addBriefing').onclick=async()=>{const row={title:$('brTitle').value.trim(),topic:$('brTopic').value.trim(),summary:$('brSummary').value.trim(),body:$('brBody').value.trim(),audience:$('brAudience').value,published:$('brPublished').checked,updated_at:new Date().toISOString()};if(!row.title||!row.body)return status('briefingStatus','Enter a title and full briefing.');const {error}=await sb.from('policy_briefings').insert(row);status('briefingStatus',error?error.message:'Briefing published.',!error);if(!error){$('brTitle').value='';$('brSummary').value='';$('brBody').value='';loadBriefings();}};

async function loadResources(){const {data}=await sb.from('member_resources').select('*').order('sort_order');$('resourceAdminList').innerHTML=(data||[]).map(x=>`<div class="item"><div class="grid2"><div><b>${esc(x.title)}</b><div class="mini">${esc(x.resource_type||'Resource')} · ${esc(x.audience)} · ${x.published?'Published':'Draft'}</div></div><div class="toolbar" style="justify-content:flex-end"><button class="btn danger" onclick="removeRow('member_resources','${x.id}',loadResources)">Delete</button></div></div><p>${esc(x.description||'')}</p></div>`).join('')||'<p class="mini">No resources yet.</p>';}
$('addResource').onclick=async()=>{const row={title:$('rsTitle').value.trim(),resource_type:$('rsType').value.trim(),description:$('rsDescription').value.trim(),file_url:$('rsUrl').value.trim(),audience:$('rsAudience').value,published:$('rsPublished').checked};if(!row.title)return status('resourceStatus','Enter a title.');const {error}=await sb.from('member_resources').insert(row);status('resourceStatus',error?error.message:'Resource added.',!error);if(!error){$('rsTitle').value='';$('rsDescription').value='';$('rsUrl').value='';loadResources();}};

async function loadFeedback(){const {data}=await sb.from('member_feedback').select('*').order('created_at',{ascending:false});$('feedbackAdminList').innerHTML=(data||[]).map(x=>`<div class="item"><div class="grid2"><div><b>${esc(x.subject)}</b><div class="mini">${new Date(x.created_at).toLocaleString('en-GB')} · ${esc(x.status||'received')}</div></div><div class="toolbar" style="justify-content:flex-end"><button class="btn" onclick="markFeedback('${x.id}','reviewed')">Mark reviewed</button><button class="btn" onclick="markFeedback('${x.id}','closed')">Close</button></div></div><p>${esc(x.message)}</p></div>`).join('')||'<p class="mini">No member feedback yet.</p>';}
window.markFeedback=async(id,statusValue)=>{const {error}=await sb.from('member_feedback').update({status:statusValue}).eq('id',id);if(error)alert(error.message);else loadFeedback();};
window.removeRow=async(table,id,reload)=>{if(!confirm('Delete this item?'))return;const {error}=await sb.from(table).delete().eq('id',id);if(error)alert(error.message);else reload();};

if(sb){sb.auth.getSession().then(({data})=>sessionChanged(data.session));sb.auth.onAuthStateChange((_e,s)=>sessionChanged(s));}else status('aStatus','Configure Supabase in config.js first.');
$('aLogin').onclick=async()=>{if(!sb)return;status('aStatus','Signing in…');const {error}=await sb.auth.signInWithPassword({email:$('aEmail').value,password:$('aPass').value});status('aStatus',error?error.message:'Signed in.',!error);};
$('aLogout').onclick=()=>sb?.auth.signOut();
