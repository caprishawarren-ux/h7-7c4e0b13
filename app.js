(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const pd=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c)},fd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x},nice=d=>d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtT=t=>{if(!t)return"";let[h,m]=t.split(":").map(Number);const ap=h>=12?"pm":"am";h=h%12||12;return h+(m?":"+String(m).padStart(2,"0"):"")+ap};
const KEY="schoolhub_v1",TODAY=new Date();TODAY.setHours(0,0,0,0);const TS=fd(TODAY);
let D=JSON.parse(localStorage.getItem(KEY)||"null")||JSON.parse(JSON.stringify(window.SEED));
// v3: NCCS colors (only if user kept the old default kid colors)
if((D.version||1)<3){const c=D.settings.kids;if((c.jaylin.color||"").toLowerCase()==="#ff3d7f")c.jaylin.color="#0073A8";if((c.skyla.color||"").toLowerCase()==="#8b5cf6")c.skyla.color="#D94F70";}
// Add new school weeks without wiping completion, notes the user edited, cards, or older days.
const PREV_NOTES={
 jaylin:{"ELA":"The Outsiders unit; Flowers for Algernon next.","Bible":"Verse quiz Fri 10/30: Ephesians 2:1-8.","Science":"Unit 3: Atoms, Bonding, Periodic Table. Element Hero/Villain project. Bring Chromebook + Periodic Table daily."},
 skyla:{"ELA":"The City of Ember: annotate on post-its. Grammar Quiz covers L1-3 & L7-9 (Thu 10/29).","Math":"Volume of figures made of rectangular prisms (Lessons 9-13).","History":"Landforms pizza-box model: map and model MUST match.","Science":"Electricity & Magnetism unit: static electricity, electric circuits. Electricity Quiz Fri 11/6. Charge Chromebook nightly."}
};
function mergeKid(cur,seedKid,prev){
 if(!cur.waag)cur.waag={};
 Object.entries(seedKid.waag||{}).forEach(([d,w])=>{if(d>="2026-11-09"&&!cur.waag[d])cur.waag[d]=JSON.parse(JSON.stringify(w))});
 const addNew=(list,incoming,key)=>{(incoming||[]).forEach(item=>{
  if(list.some(x=>x.id===item.id))return;
  if((item[key]||"")<"2026-11-09")return;
  list.push(JSON.parse(JSON.stringify(item)));
 })};
 addNew(cur.events,seedKid.events,"date");
 addNew(cur.homework,seedKid.homework,"due");
 Object.entries(seedKid.materials||{}).forEach(([k,m])=>{
  const c=cur.materials[k];
  if(!c){cur.materials[k]=JSON.parse(JSON.stringify(m));return}
  if(!c.links)c.links=[];
  (m.links||[]).forEach(l=>{
   const hit=c.links.find(x=>x.url===l.url);
   if(!hit)c.links.push({label:l.label,url:l.url});
   else if(hit.label==="Bible WAAG slides"&&l.label!==hit.label)hit.label=l.label;
  });
  if(!c.notes||(prev&&c.notes===prev[k]))c.notes=m.notes;
  if(!c.cards)c.cards=[];
 });
}
if((D.version||1)<(window.SEED.version||1)){const S=window.SEED,j=D.kids.jaylin;
 const OLD=["Math (Pre-Algebra)","ELA","Science","Social Studies","PE / Health","Elective"];
 if(j.schedule.map(p=>p.subject).join("|")===OLD.join("|"))j.schedule=JSON.parse(JSON.stringify(S.kids.jaylin.schedule));
 mergeKid(D.kids.jaylin,S.kids.jaylin,PREV_NOTES.jaylin);
 mergeKid(D.kids.skyla,S.kids.skyla,PREV_NOTES.skyla);
 if(!D.settings.kids.jaylin.school)D.settings.kids.jaylin.school=S.settings.kids.jaylin.school;
 if(!D.settings.kids.skyla.school)D.settings.kids.skyla.school=S.settings.kids.skyla.school;}
const SR=()=>window.SchoolRewards;
function ensureRewards(){
 if(!D.settings.rewards)D.settings.rewards=SR().blankRule();
 const r=D.settings.rewards;
 if(r.points==null)r.points=10;if(r.earlyDays==null)r.earlyDays=1;if(!r.timezone)r.timezone=SR().TZ;if(!r.status)r.status="suggested";if(r.approved===undefined)r.approved=null;
 for(const k of Object.values(D.kids)){
  if(!k.rewards)k.rewards=SR().blankKid();
  else{if(typeof k.rewards.balance!=="number")k.rewards.balance=0;k.rewards.pending=k.rewards.pending||[];k.rewards.history=k.rewards.history||[];k.rewards.prizes=k.rewards.prizes||[];k.rewards.decisions=k.rewards.decisions||{}}
 }
}
if((D.version||1)<5){
 const theme={jaylin:{from:"#0073a8",color:"#5B21B6",ink:"#C4B5FD"},skyla:{from:"#d94f70",color:"#BE185D",ink:"#F9A8D4"}};
 for(const [id,m] of Object.entries(theme)){const k=D.settings.kids[id];if(!k)continue;const cur=(k.color||"").toLowerCase();if(cur===m.from){k.color=m.color;k.ink=m.ink}else if(!k.ink||((k.ink||"").toLowerCase()===m.ink.toLowerCase()&&cur!==m.color.toLowerCase()))k.ink=SR().inkFor(k.color)}
 if(!D.migrationBackup){D.migrationBackup={at:new Date().toISOString(),fromVersion:D.version||1,note:"Saved on this device before the rewards update.",kids:{}};
  for(const [id,k] of Object.entries(D.kids))D.migrationBackup.kids[id]={homework:JSON.parse(JSON.stringify(k.homework||[])),events:JSON.parse(JSON.stringify(k.events||[])),schedule:JSON.parse(JSON.stringify(k.schedule||[])),materials:JSON.parse(JSON.stringify(k.materials||{}))}}
}
ensureRewards();
if((D.version||1)<window.SEED.version){D.version=window.SEED.version;localStorage.setItem(KEY,JSON.stringify(D))}
let kid=localStorage.getItem(KEY+"_kid")||"skyla";
const save=()=>localStorage.setItem(KEY,JSON.stringify(D));const K=()=>D.kids[kid];const uid=()=>Math.random().toString(36).slice(2,9);
const subjects=()=>[...new Set(K().schedule.map(p=>p.subject).filter(Boolean).concat(Object.keys(K().materials)))];
function nowDate(){return window.SCHOOLHUB_NOW?new Date(window.SCHOOLHUB_NOW):new Date()}
function rewardCtx(){const rule=D.settings.rewards;const early=SR().ruleReady(rule)?Number(rule.approved.earlyDays):Number(rule.earlyDays)||1;return {today:SR().nyDay(nowDate(),rule.timezone),earlyDays:early,ids:uid,nowIso:nowDate().toISOString()}}
let prizeConfirm=null,rewardMsg="";

function applyKid(){const k=D.settings.kids[kid];if(!k.ink)k.ink=SR().inkFor(k.color);document.documentElement.style.setProperty("--k",k.color);document.documentElement.style.setProperty("--k-ink",k.ink);
 $("#kids").innerHTML=Object.entries(D.settings.kids).map(([id,k])=>`<button style="--c:${k.color}" class="${id===kid?"on":""}" data-k="${id}">${esc(k.name)}<small style="font-weight:400"> · ${esc(k.grade)}</small></button>`).join("");
 $$("#kids button").forEach(b=>b.onclick=()=>{kid=b.dataset.k;localStorage.setItem(KEY+"_kid",kid);renderAll()})}
function show(){const id=location.hash.slice(1)||"week";$$(".page").forEach(p=>p.classList.toggle("active",p.id===id));$$("nav a").forEach(a=>a.classList.toggle("active",a.hash==="#"+id))}
window.onhashchange=show;
const soccerOn=ds=>kid==="jaylin"&&D.settings.showSoccer?(window.SOCCER?.events||[]).filter(e=>e.date===ds):[];
const evOn=ds=>K().events.filter(e=>e.date===ds);const hwOn=ds=>K().homework.filter(h=>h.due===ds);

/* week — Sat/Sun open the upcoming school week (Mon-Fri), not the weekend just ending */
function schoolWeekStart(today){const d=new Date(today);d.setHours(0,0,0,0);const monday=add(d,-((d.getDay()+6)%7));return (d.getDay()===6||d.getDay()===0)?add(monday,7):monday}
let wk=schoolWeekStart(TODAY);
function renderWeek(){$("#wTitle").textContent="Week of "+wk.toLocaleDateString(undefined,{month:"long",day:"numeric"});
 $("#weekgrid").innerHTML=[0,1,2,3,4].map(i=>{const d=add(wk,i),ds=fd(d),w=K().waag[ds];
  let h=`<div class="day ${ds===TS?"today":""}"><h3>${nice(d)}</h3>`;
  evOn(ds).forEach(e=>h+=`<span class="chip t-${e.type}">${e.type==="test"?"📝":e.type==="project"?"🛠":"🏫"} ${esc(e.title)}</span>`);
  hwOn(ds).forEach(x=>h+=`<span class="chip t-hw ${x.done?"t-done":""}">✏️ ${esc(x.subject)}: ${esc(x.title)}</span>`);
  soccerOn(ds).forEach(e=>h+=`<span class="chip t-soccer">⚽ ${fmtT(e.start)} ${esc(e.type==="game"?e.title:"Practice")}</span>`);
  h+=K().schedule.filter(p=>p.subject).map(p=>`<p class="mini"><b>${esc(p.period)}</b> ${esc(p.subject)}${p.start?" · "+fmtT(p.start):""}${p.room?" · Rm "+esc(p.room):""}${p.teacher?" · "+esc(p.teacher):""}</p>`).join("");
  if(w)h+=`<details class="waag"><summary>📋 WAAG notes</summary>${w.sections.map(s=>`<b>${esc(s.subject)}${s.stale?' <span class="stale">Stale</span>':''}</b><ul>${s.items.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`).join("")}</details>${w.note?`<p class="mini">${esc(w.note)}</p>`:""}`;
  return h+"</div>"}).join("")}
$("#wPrev").onclick=()=>{wk=add(wk,-7);renderWeek()};$("#wNext").onclick=()=>{wk=add(wk,7);renderWeek()};$("#wToday").onclick=()=>{wk=schoolWeekStart(TODAY);renderWeek()};

/* homework */
let hf="open";
function renderHW(){$("#hwSubj").innerHTML=subjects().map(s=>`<option>${esc(s)}</option>`).join("");
 const L=K().homework.filter(h=>hf==="all"||(hf==="done"?h.done:!h.done)).sort((a,b)=>a.due.localeCompare(b.due));
 $("#hwList").innerHTML=L.length?L.map(h=>{const over=!h.done&&h.due<TS,dl=h.due===TS?"Due today":(over?"Overdue · ":"Due ")+nice(pd(h.due));
  const mark=(()=>{const d=K().rewards.decisions[h.id];if(d==="pending")return `<div class="mini">Early finish · waiting for review</div>`;if(d==="awarded")return `<div class="mini">Points added</div>`;return ""})();
  return`<div class="hw ${over?"over":""} ${h.done?"done":""}"><input type="checkbox" data-id="${h.id}" ${h.done?"checked":""}><div class="t"><b>${esc(h.subject)}</b> ${esc(h.title)}${h.src?`<div class="mini">from ${esc(h.src)}</div>`:""}${mark}</div><span class="badge d">${dl}</span><button class="danger" data-del="${h.id}">✕</button></div>`}).join(""):"<p class='mini'>Nothing here 🎉</p>";
 $$("#hwList input").forEach(c=>c.onchange=()=>{const h=K().homework.find(x=>x.id===c.dataset.id);if(!h)return;const res=c.checked?SR().onCheck(K().rewards,h,rewardCtx()):SR().onUncheck(K().rewards,h);Object.assign(h,res.homework);K().rewards=res.rewards;save();renderAll()});
 $$("#hwList [data-del]").forEach(b=>b.onclick=()=>{K().rewards=SR().dropPending(K().rewards,b.dataset.del);K().homework=K().homework.filter(h=>h.id!==b.dataset.del);save();renderAll()})}
$$("#homework .bar button").forEach(b=>b.onclick=()=>{hf=b.dataset.f;$$("#homework .bar button").forEach(x=>x.classList.toggle("on",x===b));renderHW()});
$("#hwForm").onsubmit=e=>{e.preventDefault();const f=e.target;K().homework.push({id:uid(),subject:f.subject.value,title:f.title.value,due:f.due.value,done:false});save();f.reset();renderAll()};

/* calendar */
let cm=new Date(TODAY.getFullYear(),TODAY.getMonth(),1);
function renderCal(){$("#cTitle").textContent=cm.toLocaleDateString(undefined,{month:"long",year:"numeric"});const st=add(cm,-cm.getDay());
 let h=`<div class="cal">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>`<div class="h">${d}</div>`).join("")}`;
 for(let i=0;i<42;i++){const d=add(st,i),ds=fd(d);if(i===35&&d.getMonth()!==cm.getMonth())break;
  h+=`<div class="cell ${d.getMonth()!==cm.getMonth()?"out":""} ${ds===TS?"today":""}"><b>${d.getDate()}</b>`+
  evOn(ds).map(e=>`<span class="chip t-${e.type}" title="${esc(e.title)}">${esc(e.title)}</span>`).join("")+
  hwOn(ds).map(x=>`<span class="chip t-hw ${x.done?"t-done":""}" title="${esc(x.title)}">${esc(x.subject)}</span>`).join("")+
  soccerOn(ds).map(e=>`<span class="chip t-soccer" title="${esc(e.title)}">⚽ ${fmtT(e.start)} ${e.type==="game"?"Game":"Prac"}</span>`).join("")+"</div>"}
 $("#calgrid").innerHTML=h+"</div>"+(kid==="jaylin"&&D.settings.showSoccer?`<p class="mini">Soccer comes from the striker-site snapshot (${esc(window.SOCCER?.fetched||"")}).</p>`:"");
 $("#evList").innerHTML=K().events.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="hw"><span class="chip t-${e.type}">${e.type}</span><div class="t">${nice(pd(e.date))} · ${esc(e.title)}</div><button class="danger" data-id="${e.id}">✕</button></div>`).join("");
 $$("#evList button").forEach(b=>b.onclick=()=>{K().events=K().events.filter(e=>e.id!==b.dataset.id);save();renderAll()})}
$("#cPrev").onclick=()=>{cm=new Date(cm.getFullYear(),cm.getMonth()-1,1);renderCal()};$("#cNext").onclick=()=>{cm=new Date(cm.getFullYear(),cm.getMonth()+1,1);renderCal()};
$("#evForm").onsubmit=e=>{e.preventDefault();const f=e.target;K().events.push({id:uid(),date:f.date.value,type:f.type.value,title:f.title.value});save();f.reset();renderAll()};

/* study */
let subj=null,quiz=null;
function renderStudy(){const S=subjects();S.forEach(s=>K().materials[s]=K().materials[s]||{notes:"",links:[],cards:[]});if(!S.includes(subj))subj=S[0];
 $("#subjTabs").innerHTML=S.map(s=>`<button class="${s===subj?"on":""}">${esc(s)}</button>`).join("");
 $$("#subjTabs button").forEach((b,i)=>b.onclick=()=>{subj=S[i];quiz=null;renderStudy()});
 const M=K().materials[subj];
 $("#studyBody").innerHTML=`<div class="card"><h3>📝 Notes</h3><textarea id="notes">${esc(M.notes)}</textarea></div>
 <div class="card"><h3>🔗 Links</h3>${M.links.map((l,i)=>`<div class="hw"><a class="t" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a><button class="danger" data-l="${i}">✕</button></div>`).join("")||"<p class='mini'>No links yet.</p>"}
  <form id="lkForm" class="row"><label class="grow">Label<input name="label" required></label><label class="grow">URL<input name="url" type="url" required></label><button>Add</button></form></div>
 <div class="card"><h3>🃏 Flashcards (${M.cards.length})</h3><div id="quizArea"></div>
  ${M.cards.map((c,i)=>`<div class="hw"><div class="t"><b>${esc(c.q)}</b> → ${esc(c.a)}</div><button class="danger" data-c="${i}">✕</button></div>`).join("")}
  <form id="cdForm" class="row"><label class="grow">Front (question)<input name="q" required></label><label class="grow">Back (answer)<input name="a" required></label><button>Add card</button></form></div>`;
 $("#notes").oninput=e=>{M.notes=e.target.value;save()};
 $("#lkForm").onsubmit=e=>{e.preventDefault();M.links.push({label:e.target.label.value,url:e.target.url.value});save();renderStudy()};
 $("#cdForm").onsubmit=e=>{e.preventDefault();M.cards.push({q:e.target.q.value,a:e.target.a.value});save();renderStudy()};
 $$("[data-l]").forEach(b=>b.onclick=()=>{M.links.splice(b.dataset.l,1);save();renderStudy()});$$("[data-c]").forEach(b=>b.onclick=()=>{M.cards.splice(b.dataset.c,1);save();renderStudy()});
 renderQuiz(M)}
function renderQuiz(M){const A=$("#quizArea");if(!M.cards.length){A.innerHTML="<p class='mini'>Add cards below, then start a quiz.</p>";return}
 if(!quiz){A.innerHTML=`<button class="primary" id="qStart">▶ Start quiz</button>`;$("#qStart").onclick=()=>{quiz={order:M.cards.map((_,i)=>i).sort(()=>Math.random()-.5),i:0,flip:false,right:0};renderQuiz(M)};return}
 if(quiz.i>=quiz.order.length){A.innerHTML=`<div class="flash">Score: ${quiz.right} / ${quiz.order.length}</div><button class="primary" id="qAgain">Again</button>`;$("#qAgain").onclick=()=>{quiz=null;renderQuiz(M)};return}
 const c=M.cards[quiz.order[quiz.i]];
 A.innerHTML=`<p class="mini">Card ${quiz.i+1} of ${quiz.order.length} · tap the card to flip it</p><div class="flash" id="fc">${esc(quiz.flip?c.a:c.q)}</div>${quiz.flip?`<button class="primary" id="qR">✓ Got it</button> <button id="qW">✗ Missed</button>`:""} <button id="qEnd">End</button>`;
 $("#fc").onclick=()=>{quiz.flip=!quiz.flip;renderQuiz(M)};$("#qEnd").onclick=()=>{quiz=null;renderQuiz(M)};
 if(quiz.flip){$("#qR").onclick=()=>{quiz.right++;quiz.i++;quiz.flip=false;renderQuiz(M)};$("#qW").onclick=()=>{quiz.i++;quiz.flip=false;renderQuiz(M)}}}

/* schedule */
function renderSched(){$("#schedTable").innerHTML="<tr><th>Period</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Start</th><th>End</th><th></th></tr>"+K().schedule.map((p,i)=>`<tr>${["period","subject","teacher","room","start","end"].map(k=>`<td><input data-i="${i}" data-k="${k}" ${k==="start"||k==="end"?'type="time"':""} value="${esc(p[k])}"></td>`).join("")}<td><button class="danger" data-r="${i}">✕</button></td></tr>`).join("");
 $("#schedTable").parentElement.classList.add("sched-wrap");
 $$("#schedTable [data-r]").forEach(b=>b.onclick=()=>{K().schedule.splice(b.dataset.r,1);save();renderAll()})}
$("#addPeriod").onclick=()=>{K().schedule.push({period:String(K().schedule.length+1),subject:"",teacher:"",room:"",start:"",end:""});renderSched()};
$("#saveSched").onclick=()=>{$$("#schedTable input").forEach(i=>K().schedule[i.dataset.i][i.dataset.k]=i.value);save();renderAll();alert("Schedule saved")};

/* settings */
function renderSettings(){$("#setForm").innerHTML=Object.entries(D.settings.kids).map(([id,k])=>`<div class="card row"><h3 style="width:100%;margin:0">${esc(k.name)}</h3>
 <label>Name<input data-id="${id}" data-k="name" value="${esc(k.name)}"></label><label>Grade<input data-id="${id}" data-k="grade" value="${esc(k.grade)}"></label>
 <label class="grow">School<input data-id="${id}" data-k="school" value="${esc(k.school)}" placeholder="Not set yet"></label><label>Color<input type="color" data-id="${id}" data-k="color" value="${k.color}"></label></div>`).join("")+
 `<div class="card"><label style="flex-direction:row;gap:.5rem;color:var(--txt)"><input type="checkbox" id="showSoccer" ${D.settings.showSoccer?"checked":""}> Show Jaylin's soccer games/practices</label></div><button class="primary">Save settings</button>`;
 const U=D.unassigned;$("#unassigned").innerHTML=U&&Object.keys(U.waag||{}).length?`<h3>📥 Unassigned import</h3><p><b>${esc(U.label)}</b>: ${Object.keys(U.waag).length} daily WAAG notes and ${U.events.length} tests/due dates from Google Calendar. This one hasn't been assigned to a kid yet.</p>
 ${Object.keys(D.settings.kids).map(id=>`<button class="primary" data-as="${id}">Assign to ${esc(D.settings.kids[id].name)}</button>`).join(" ")} <button class="danger" id="discard">Discard</button>`:"";
 $$("[data-as]").forEach(b=>b.onclick=()=>{const k=D.kids[b.dataset.as];Object.assign(k.waag,U.waag);U.events.forEach(e=>k.events.push({...e,id:uid(),src:U.label}));D.unassigned=null;save();renderAll()});
 const dc=$("#discard");if(dc)dc.onclick=()=>{if(confirm("Discard this import?")){D.unassigned=null;save();renderAll()}}}
$("#setForm").onsubmit=e=>{e.preventDefault();$$("#setForm input[data-id]").forEach(i=>{D.settings.kids[i.dataset.id][i.dataset.k]=i.value;if(i.dataset.k==="color"){const seed=window.SEED.settings.kids[i.dataset.id];D.settings.kids[i.dataset.id].ink=seed&&i.value.toLowerCase()===seed.color.toLowerCase()?seed.ink:SR().inkFor(i.value)}});D.settings.showSoccer=$("#showSoccer").checked;save();renderAll();alert("Saved")};
$("#exportBtn").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,1)],{type:"application/json"}));a.download="school-hub-backup-"+TS+".json";a.click()};
$("#importFile").onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const x=JSON.parse(t);if(!x.kids||!x.settings)throw 0;D=x;ensureRewards();save();renderAll();alert("Backup imported")}catch(_){alert("That file isn't a valid School Hub backup.")}})};
$("#resetBtn").onclick=()=>{if(confirm("Replace ALL data with the starter data?")){D=JSON.parse(JSON.stringify(window.SEED));save();renderAll()}};

function renderRewards(){
 ensureRewards();
 const name=D.settings.kids[kid].name,R=K().rewards,rule=D.settings.rewards,ready=SR().ruleReady(rule);
 const approvedTxt=rule.approved?`Last approved on this device: ${rule.approved.points} points, at least ${rule.approved.earlyDays} calendar day${rule.approved.earlyDays===1?"":"s"} before the due date.`:"No rule has been approved on this device yet.";
 const tag=ready?`<span class="tag approved">Approved on this device</span>`:`<span class="tag suggest">Suggested</span>`;
 const review=R.pending.length?R.pending.map(p=>{
  const meets=!rule.approved||p.daysEarly>=Number(rule.approved.earlyDays);
  const why=ready&&meets?`${rule.approved.points} points if you add them`:(ready?"This finish is early, but not by enough days for the approved rule.":`Suggested ${rule.points} points. Nothing is added until you approve the rule and this assignment.`);
  return `<div class="hw"><div class="t"><b>${esc(p.subject)}</b> ${esc(p.title)}<div class="mini">Checked off ${esc(nice(pd(p.completedOn)))} · due ${esc(nice(pd(p.due)))} · ${p.daysEarly} day${p.daysEarly===1?"":"s"} early</div><div class="mini">${esc(why)}</div><div class="confirm-row"><button type="button" class="primary" data-award="${esc(p.id)}" ${ready&&meets?"":"disabled"}>Add points</button><button type="button" data-skip="${esc(p.id)}">Not this time</button></div></div></div>`}).join(""):`<p class="mini">Nothing to review. When homework is checked off at least one day early, it shows up here. You choose whether to add points.</p>`;
 const hist=R.history.length?R.history.slice().reverse().map(h=>{
  const label=h.kind==="award"?`Added ${h.points} points · ${h.title}`:h.kind==="skip"?`Reviewed, no points · ${h.title}`:h.kind==="undo-award"?`Undid ${h.points} points · ${h.title||""}`:h.kind==="redeem"?`Recorded prize · ${h.prize} · ${h.points} points`:h.kind==="undo-redeem"?`Undid prize · ${h.prize||""}`:h.kind==="undo-skip"?`Put back for review · ${h.title||""}`:h.kind;
  const canUndo=!h.undone&&(h.kind==="award"||h.kind==="redeem"||h.kind==="skip");
  return `<div class="hw"><div class="t">${esc(label)}${h.undone?`<div class="mini">Undone</div>`:""}</div>${canUndo?`<button type="button" data-undo="${esc(h.id)}">Undo</button>`:""}</div>`}).join(""):`<p class="mini">No point history yet.</p>`;
 const prizes=R.prizes.length?R.prizes.map(p=>{
  const open=prizeConfirm===p.id;
  return `<div class="hw"><div class="t"><b>${esc(p.name)}</b><div class="mini">${p.cost} points</div>${open?`<div class="confirm-row"><span class="mini">Record “${esc(p.name)}” for ${esc(name)} and subtract ${p.cost} points? This does not buy or promise anything.</span><button type="button" class="primary" data-redeem="${esc(p.id)}">Record prize</button><button type="button" data-cancel-prize>Cancel</button></div>`:`<div class="confirm-row"><button type="button" data-ask-prize="${esc(p.id)}" ${R.balance>=p.cost?"":"disabled"}>Redeem</button><button type="button" data-del-prize="${esc(p.id)}">Remove</button></div>`}</div></div>`}).join(""):`<p class="mini">No prizes yet. Add a name and a point cost when you want one. Nothing here is bought, promised, or already chosen.</p>`;
 $("#rewardsBody").innerHTML=`<div class="notice">This browser only. School Hub has no parent login and does not share this phone or computer with another device. Approving a rule or adding points here is a record on this device, not a secure approval. Settings → Export JSON keeps a copy, including homework, notes, and flashcards.</div>
  <p class="reward-balance">${esc(name)} · ${R.balance} point${R.balance===1?"":"s"}</p>
  <div class="card" data-rule="${ready?"approved":"suggested"}"><div class="rule-head">${tag}<h3>Early homework rule</h3></div>
  <p>${ready?`Approved rule: <b>${rule.approved.points} points</b> when homework is checked off at least <b>${rule.approved.earlyDays} calendar day${rule.approved.earlyDays===1?"":"s"}</b> before the due date.`:`Suggested starting rule, not approved yet: <b>${esc(String(rule.points))} points</b> when homework is checked off at least <b>${esc(String(rule.earlyDays))} calendar day${Number(rule.earlyDays)===1?"":"s"}</b> before the due date.`}</p>
  <p class="mini">School dates use America/New_York. Quizzes, tests, exams, school events, and tasks without a due date are not included. Check-offs from before this update have no completion time, so they are not turned into points.</p>
  <p class="mini">${esc(approvedTxt)}</p>
  <form id="ruleForm" class="row"><label>Points<input id="rwPoints" name="points" type="number" min="1" max="1000" value="${esc(rule.points)}"></label><label>Days before the due date<input id="rwDays" name="days" type="number" min="1" max="30" value="${esc(rule.earlyDays)}"></label><button type="submit" class="primary">Approve this rule</button></form>
  <p class="mini">Approving saves your choice on this device. It does not add points by itself. You still review each assignment.</p></div>
  <div class="card"><h3>Waiting for review</h3>${review}</div>
  <div class="card"><h3>Prizes</h3>${prizes}<form id="prizeForm" class="row"><label class="grow">Prize name<input name="name" required maxlength="80" placeholder="Name you choose"></label><label>Point cost<input name="cost" type="number" min="1" max="100000" required></label><button>Add prize</button></form>
  <p class="mini">A prize is only a name and a point cost you choose. Recording one updates the balance on this device. It does not buy anything or promise a reward.</p></div>
  <div class="card"><h3>History</h3>${rewardMsg?`<p class="mini">${esc(rewardMsg)}</p>`:""}${hist}</div>`;
 $("#ruleForm").onsubmit=e=>{e.preventDefault();const points=Math.round(Number(e.target.points.value)),days=Math.round(Number(e.target.days.value));if(!Number.isInteger(points)||points<1||points>1000||!Number.isInteger(days)||days<1||days>30)return;rule.points=points;rule.earlyDays=days;rule.status="approved";rule.approved={points,earlyDays:days};save();renderRewards()};
 $$("[data-award]").forEach(b=>b.onclick=()=>{const res=SR().award(K().rewards,b.dataset.award,D.settings.rewards,rewardCtx());K().rewards=res.rewards;rewardMsg=res.ok?"":"";if(res.ok){save();renderAll()}});
 $$("[data-skip]").forEach(b=>b.onclick=()=>{const res=SR().skip(K().rewards,b.dataset.skip,rewardCtx());K().rewards=res.rewards;if(res.ok){save();renderAll()}});
 $$("[data-undo]").forEach(b=>b.onclick=()=>{const res=SR().undo(K().rewards,b.dataset.undo,rewardCtx());if(!res.ok&&res.reason==="spent"){rewardMsg="Those points are already recorded toward a prize. Undo that prize first.";K().rewards=res.rewards;renderRewards();return}K().rewards=res.rewards;rewardMsg="";if(res.ok){save();renderAll()}});
 $$("[data-ask-prize]").forEach(b=>b.onclick=()=>{prizeConfirm=b.dataset.askPrize;renderRewards()});
 const cancel=$("[data-cancel-prize]");if(cancel)cancel.onclick=()=>{prizeConfirm=null;renderRewards()};
 $$("[data-redeem]").forEach(b=>b.onclick=()=>{const res=SR().redeem(K().rewards,b.dataset.redeem,rewardCtx());prizeConfirm=null;K().rewards=res.rewards;if(res.ok){save();renderAll()}});
 $$("[data-del-prize]").forEach(b=>b.onclick=()=>{K().rewards=SR().removePrize(K().rewards,b.dataset.delPrize);prizeConfirm=null;save();renderRewards()});
 $("#prizeForm").onsubmit=e=>{e.preventDefault();const res=SR().addPrize(K().rewards,e.target.name.value,Math.round(Number(e.target.cost.value)),rewardCtx());if(!res.ok)return;K().rewards=res.rewards;save();e.target.reset();renderRewards()};
}
function renderAll(){applyKid();renderWeek();renderHW();renderCal();renderStudy();renderSched();renderSettings();renderRewards()}
renderAll();show();
})();
