const fallback = {
  stats:{mps:0,councillors:0,councils:0,members:'—'},
  hero_notice:'A different kind of political website.',
  policies:[
    {id:'cost',title:'Cost of Living',summary:'Reduce pressure on household costs through targeted affordability measures.',category:'Economy',detail:'A policy area focused on household costs, affordability and everyday living expenses.',quiz:'Government should take further targeted action to reduce household living costs.',position:5},
    {id:'bus',title:'Bus Fares',summary:'Lower and simplify local bus fares, with a focus on reliable everyday travel.',category:'Transport',detail:'A transport policy focused on fare affordability and access to local bus services.',quiz:'Local bus fares should be reduced and made simpler.',position:5},
    {id:'tuition',title:'University Tuition 18–21',summary:'Remove university tuition fees for eligible learners aged 18–21.',category:'Education',detail:'An education policy proposing no university tuition fees for eligible students aged 18 to 21.',quiz:'Eligible students aged 18–21 should not pay university tuition fees.',position:5},
    {id:'immigration',title:'Managed Immigration',summary:'Reduce the pace of immigration while maintaining managed legal routes.',category:'Immigration',detail:'An immigration policy focused on reducing overall pace while retaining managed legal routes.',quiz:'The overall pace of immigration should be reduced.',position:5}
  ],
  publicEvents:[],
  news:[
    {title:'Welcome to the new Change UK website',body:'Explore the manifesto, policy quiz, representation dashboard and free membership sections.',date:new Date().toISOString().slice(0,10)},
    {title:'Member area now available',body:'Registered members can access additional briefings, resources and member-only updates.',date:new Date().toISOString().slice(0,10)},
    {title:'Manifesto hub launched',body:'Policies are now presented in a clearer card-based format and can be updated from the control room.',date:new Date().toISOString().slice(0,10)}
  ]
};
let data = structuredClone(fallback);
const cfg = window.CHANGE_UK_CONFIG || {};
const configured = cfg.SUPABASE_URL && !cfg.SUPABASE_URL.includes('YOUR-PROJECT') && cfg.SUPABASE_ANON_KEY && !cfg.SUPABASE_ANON_KEY.includes('YOUR_PUBLIC');
const sb = configured ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY) : null;

async function loadPublic(){
  if(!sb){ renderAll(); return; }
  try{
    const [{data:settings},{data:policies},{data:news},{data:publicEvents},{count:members}] = await Promise.all([
      sb.from('site_settings').select('key,value'),
      sb.from('policies').select('*').eq('published',true).order('sort_order'),
      sb.from('news').select('*').eq('published',true).order('published_at',{ascending:false}).limit(9),
      sb.from('events').select('*').eq('published',true).eq('member_only',false).gte('event_date',new Date().toISOString()).order('event_date').limit(9),
      sb.from('memberships').select('*',{count:'exact',head:true}).eq('status','active')
    ]);
    if(settings) settings.forEach(s=>{if(s.key==='stats')data.stats={...data.stats,...s.value};if(s.key==='hero_notice')data.hero_notice=s.value?.text||data.hero_notice});
    if(policies?.length) data.policies=policies.map(p=>({id:p.id,title:p.title,summary:p.summary,category:p.category,detail:p.detail,quiz:p.quiz_question,position:p.quiz_position||3}));
    if(news?.length) data.news=news.map(n=>({title:n.title,body:n.body,date:(n.published_at||'').slice(0,10)}));
    data.publicEvents=(publicEvents||[]).map(e=>({title:e.title,body:[e.description,e.location].filter(Boolean).join(' · '),date:e.event_date}));
    if(Number.isFinite(members)) data.stats.members=members;
  }catch(e){ console.warn('Supabase load failed; using fallback content.',e); }
  renderAll();
}
function renderAll(){
  document.querySelectorAll('[data-stat]').forEach(el=>el.textContent=data.stats[el.dataset.stat]??0);
  document.getElementById('heroNotice').textContent=data.hero_notice;
  const pg=document.getElementById('policyGrid'); pg.innerHTML=data.policies.map((p,i)=>`<article class="policy-card reveal"><span class="num">0${i+1}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><footer><span class="tag">${esc(p.category||'Policy')}</span><span class="readmore">Read more →</span></footer></article>`).join('');
  const ng=document.getElementById('newsGrid'); ng.innerHTML=data.news.map(n=>`<article class="news-card reveal"><time>${fmt(n.date)}</time><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join('');
  const eg=document.getElementById('publicEventsGrid'); if(eg) eg.innerHTML=data.publicEvents.length?data.publicEvents.map(n=>`<article class="news-card reveal"><time>${fmt(n.date)}</time><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join(''):'<article class="news-card reveal"><h3>No public events announced</h3><p>Member-only events are available after sign-in.</p></article>'; 
  document.getElementById('manifestoFull').innerHTML=data.policies.map(p=>`<div class="manifesto-item"><span class="tag">${esc(p.category||'Policy')}</span><h3>${esc(p.title)}</h3><p>${esc(p.detail||p.summary)}</p></div>`).join('');
  setupReveal(); startQuiz();
}
function esc(s=''){return String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}function fmt(s){try{return new Date(s).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}catch{return s}}

const menu=document.getElementById('menuBtn');menu.onclick=()=>{document.getElementById('nav').classList.toggle('open');menu.setAttribute('aria-expanded',document.getElementById('nav').classList.contains('open'))};
window.addEventListener('scroll',()=>document.getElementById('topbar').classList.toggle('scrolled',scrollY>20));
document.getElementById('year').textContent=new Date().getFullYear();
function setupReveal(){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}}),{threshold:.12});document.querySelectorAll('.reveal:not(.on)').forEach(x=>io.observe(x));}

const joinDialog=document.getElementById('joinDialog');document.querySelectorAll('[data-join]').forEach(b=>b.onclick=()=>{const type=b.dataset.join;document.getElementById('membershipType').value=type;document.getElementById('joinTitle').textContent=type==='youth'?'Join Youth Membership':'Join Adult Membership';joinDialog.showModal()});document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.getElementById('openManifesto').onclick=()=>document.getElementById('manifestoDialog').showModal();

document.getElementById('joinForm').addEventListener('submit',async e=>{e.preventDefault();const st=document.getElementById('joinStatus');if(!sb){st.textContent='Add your Supabase URL and public anon key to config.js first.';return}const payload={first_name:firstName.value.trim(),last_name:lastName.value.trim(),dob:dob.value,membership_type:membershipType.value};st.textContent='Creating account…';const {data:auth,error}=await sb.auth.signUp({email:email.value.trim(),password:password.value,options:{data:payload}});if(error){st.textContent=error.message;return}if(auth.user){const {error:pe}=await sb.from('profiles').upsert({id:auth.user.id,...payload});if(!pe)await sb.from('memberships').upsert({user_id:auth.user.id,membership_type:payload.membership_type,status:'active'});}st.textContent='Account created. Check your email if confirmation is enabled, then use the Member Area to sign in.';e.target.reset();});

let qi=0,answers=[];function startQuiz(){qi=0;answers=[];showQ()}function showQ(){const qs=data.policies.filter(p=>p.quiz);const body=document.getElementById('quizBody');if(!qs.length){body.innerHTML='<p>No quiz questions are published yet.</p>';return}if(qi>=qs.length){const score=Math.round(answers.reduce((a,v)=>a+v,0)/answers.length);body.innerHTML=`<div class="quiz-result"><span class="eyebrow">YOUR COMPARISON</span><div class="quiz-score">${score}%</div><h3>Manifesto position match</h3><p>This score only compares your answers with the policy positions published on this site. It is not a voting recommendation.</p><button class="btn primary" onclick="startQuiz()">Take it again</button></div>`;document.getElementById('quizProgress').textContent='Complete';document.getElementById('quizBar').style.width='100%';return}const q=qs[qi];document.getElementById('quizProgress').textContent=`Question ${qi+1} of ${qs.length}`;document.getElementById('quizBar').style.width=`${((qi+1)/qs.length)*100}%`;body.innerHTML=`<div class="quiz-q"><span class="tag">${esc(q.category||'Policy')}</span><h3>${esc(q.quiz)}</h3><div class="quiz-options">${['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'].map((x,i)=>`<button onclick="answerQ(${i+1})">${x}</button>`).join('')}</div></div>`}window.answerQ=function(v){const qs=data.policies.filter(p=>p.quiz),p=Number(qs[qi].position||3),distance=Math.abs(v-p),score=Math.max(0,100-distance*25);answers.push(score);qi++;showQ()}
loadPublic();
