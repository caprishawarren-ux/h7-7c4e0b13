(function(){
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const pd=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c)},fd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x},nice=d=>d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtT=t=>{if(!t)return"";let[h,m]=t.split(":").map(Number);const ap=h>=12?"pm":"am";h=h%12||12;return h+(m?":"+String(m).padStart(2,"0"):"")+ap};
const KEY="schoolhub_v1",TODAY=new Date();TODAY.setHours(0,0,0,0);const TS=fd(TODAY);
let D=JSON.parse(localStorage.getItem(KEY)||"null")||JSON.parse(JSON.stringify(window.SEED));
// v3: NCCS colors (only if user kept the old default kid colors)
if((D.version||1)<3){const c=D.settings.kids;if(c.jaylin.color==="#ff3d7f")c.jaylin.color="#0073A8";if(c.skyla.color==="#8b5cf6")c.skyla.color="#D94F70";}
// migrate older saved data to the newer seed without wiping user entries
if((D.version||1)<(window.SEED.version||1)){const S=window.SEED,sj=S.kids.jaylin,j=D.kids.jaylin;
 const OLD=["Math (Pre-Algebra)","ELA","Science","Social Studies","PE / Health","Elective"];
 if(j.schedule.map(p=>p.subject).join("|")===OLD.join("|"))j.schedule=sj.schedule;
 Object.assign(j.waag,sj.waag);
 sj.events.forEach(e=>{if(!j.events.some(x=>x.id===e.id))j.events.push(e)});
 sj.homework.forEach(h=>{if(!j.homework.some(x=>x.id===h.id))j.homework.push(h)});
 Object.entries(sj.materials).forEach(([k,m])=>{const c=j.materials[k];if(!c)j.materials[k]=m;else{m.links.forEach(l=>{if(!c.links.some(x=>x.url===l.url))c.links.push(l)});if(!c.notes)c.notes=m.notes}});
 if(!D.settings.kids.jaylin.school)D.settings.kids.jaylin.school=S.settings.kids.jaylin.school;
 D.unassigned=null;}
if((D.version||1)<window.SEED.version){D.version=window.SEED.version;localStorage.setItem(KEY,JSON.stringify(D))}
let kid=localStorage.getItem(KEY+"_kid")||"skyla";
const save=()=>localStorage.setItem(KEY,JSON.stringify(D));const K=()=>D.kids[kid];const uid=()=>Math.random().toString(36).slice(2,9);
const subjects=()=>[...new Set(K().schedule.map(p=>p.subject).filter(Boolean).concat(Object.keys(K().materials)))];

function applyKid(){const c=D.settings.kids[kid].color;document.documentElement.style.setProperty("--k",c);
 $("#kids").innerHTML=Object.entries(D.settings.kids).map(([id,k])=>`<button style="--c:${k.color}" class="${id===kid?"on":""}" data-k="${id}">${esc(k.name)}<small style="font-weight:400"> · ${esc(k.grade)}</small></button>`).join("");
 $$("#kids button").forEach(b=>b.onclick=()=>{kid=b.dataset.k;localStorage.setItem(KEY+"_kid",kid);renderAll()})}
function show(){const id=location.hash.slice(1)||"week";$$(".page").forEach(p=>p.classList.toggle("active",p.id===id));$$("nav a").forEach(a=>a.classList.toggle("active",a.hash==="#"+id))}
window.onhashchange=show;
const soccerOn=ds=>kid==="jaylin"&&D.settings.showSoccer?(window.SOCCER?.events||[]).filter(e=>e.date===ds):[];
const evOn=ds=>K().events.filter(e=>e.date===ds);const hwOn=ds=>K().homework.filter(h=>h.due===ds);

/* week */
let wk=add(TODAY,-((TODAY.getDay()+6)%7));if(TODAY.getDay()===6||TODAY.getDay()===0)wk=add(wk,7);
function renderWeek(){$("#wTitle").textContent="Week of "+wk.toLocaleDateString(undefined,{month:"long",day:"numeric"});
 $("#weekgrid").innerHTML=[0,1,2,3,4].map(i=>{const d=add(wk,i),ds=fd(d),w=K().waag[ds];
  let h=`<div class="day ${ds===TS?"today":""}"><h3>${nice(d)}</h3>`;
  evOn(ds).forEach(e=>h+=`<span class="chip t-${e.type}">${e.type==="test"?"📝":e.type==="project"?"🛠":"🏫"} ${esc(e.title)}</span>`);
  hwOn(ds).forEach(x=>h+=`<span class="chip t-hw ${x.done?"t-done":""}">✏️ ${esc(x.subject)}: ${esc(x.title)}</span>`);
  soccerOn(ds).forEach(e=>h+=`<span class="chip t-soccer">⚽ ${fmtT(e.start)} ${esc(e.type==="game"?e.title:"Practice")}</span>`);
  h+=K().schedule.filter(p=>p.subject).map(p=>`<p class="mini"><b>${esc(p.period)}</b> ${esc(p.subject)}${p.start?" · "+fmtT(p.start):""}${p.room?" · Rm "+esc(p.room):""}${p.teacher?" · "+esc(p.teacher):""}</p>`).join("");
  if(w)h+=`<details class="waag"><summary>📋 WAAG notes</summary>${w.sections.map(s=>`<b>${esc(s.subject)}</b><ul>${s.items.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>`).join("")}</details>`;
  return h+"</div>"}).join("")}
$("#wPrev").onclick=()=>{wk=add(wk,-7);renderWeek()};$("#wNext").onclick=()=>{wk=add(wk,7);renderWeek()};$("#wToday").onclick=()=>{wk=add(TODAY,-((TODAY.getDay()+6)%7));renderWeek()};

/* homework */
let hf="open";
function renderHW(){$("#hwSubj").innerHTML=subjects().map(s=>`<option>${esc(s)}</option>`).join("");
 const L=K().homework.filter(h=>hf==="all"||(hf==="done"?h.done:!h.done)).sort((a,b)=>a.due.localeCompare(b.due));
 $("#hwList").innerHTML=L.length?L.map(h=>{const over=!h.done&&h.due<TS,dl=h.due===TS?"Due today":(over?"Overdue · ":"Due ")+nice(pd(h.due));
  return`<div class="hw ${over?"over":""} ${h.done?"done":""}"><input type="checkbox" data-id="${h.id}" ${h.done?"checked":""}><div class="t"><b>${esc(h.subject)}</b> ${esc(h.title)}${h.src?`<div class="mini">from ${esc(h.src)}</div>`:""}</div><span class="badge d">${dl}</span><button class="danger" data-del="${h.id}">✕</button></div>`}).join(""):"<p class='mini'>Nothing here 🎉</p>";
 $$("#hwList input").forEach(c=>c.onchange=()=>{K().homework.find(h=>h.id===c.dataset.id).done=c.checked;save();renderAll()});
 $$("#hwList [data-del]").forEach(b=>b.onclick=()=>{K().homework=K().homework.filter(h=>h.id!==b.dataset.del);save();renderAll()})}
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
$("#setForm").onsubmit=e=>{e.preventDefault();$$("#setForm input[data-id]").forEach(i=>D.settings.kids[i.dataset.id][i.dataset.k]=i.value);D.settings.showSoccer=$("#showSoccer").checked;save();renderAll();alert("Saved")};
$("#exportBtn").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(D,null,1)],{type:"application/json"}));a.download="school-hub-backup-"+TS+".json";a.click()};
$("#importFile").onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const x=JSON.parse(t);if(!x.kids||!x.settings)throw 0;D=x;save();renderAll();alert("Backup imported")}catch(_){alert("That file isn't a valid School Hub backup.")}})};
$("#resetBtn").onclick=()=>{if(confirm("Replace ALL data with the starter data?")){D=JSON.parse(JSON.stringify(window.SEED));save();renderAll()}};

function renderAll(){applyKid();renderWeek();renderHW();renderCal();renderStudy();renderSched();renderSettings()}
renderAll();show();
})();
