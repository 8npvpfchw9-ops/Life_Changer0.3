/* ==========================================================================
   OS — a one-page operating system for one season at a time.
   Vanilla JS. No framework, no backend. Everything lives in localStorage
   under the key below, so it survives closing Safari / reopening from the
   Home Screen icon, but stays on this device only.
   ========================================================================== */

const STORAGE_KEY = 'chuckOS_v1';

const SEASONS = [
  { key: 'normal',   label: 'Normal semester' },
  { key: 'heavy',    label: 'Heavy semester' },
  { key: 'exam',     label: 'Exam period' },
  { key: 'summer',   label: 'Summer' },
  { key: 'business', label: 'Business-growth period' },
  { key: 'athletic', label: 'Athletic-development period' },
  { key: 'injury',   label: 'Injury / recovery period' },
];

const PRIORITY_DOMAINS = [
  { key: 'school',   label: 'School' },
  { key: 'business', label: 'Business' },
  { key: 'athlete',  label: 'Athletics' },
  { key: 'reading',  label: 'Reading' },
];

const DOMAIN_META = {
  school:    { label: 'School',    icon: '🏫' },
  business:  { label: 'Business',  icon: '📈' },
  athlete:   { label: 'Athlete',   icon: '🏈' },
  spiritual: { label: 'Spiritual', icon: '' },
  reading:   { label: 'Reading',   icon: '' },
  life:      { label: 'Life',      icon: '' },
};

const MVD_ITEMS = [
  { key: 'school',    label: 'Touch schoolwork for 20 minutes' },
  { key: 'business',  label: 'One meaningful business action' },
  { key: 'athlete',   label: 'Minimum movement — even 10 minutes' },
  { key: 'spiritual', label: 'Scripture study' },
  { key: 'life',       label: 'One real interaction with another person' },
];

const REVIEW_TYPES = {
  daily:     { label: 'Daily',     prompt: 'What were today\'s Top 3? Did they happen? What absolutely could not be missed, and did it get done?' },
  weekly:    { label: 'Weekly',    prompt: 'What worked? What failed? What created friction? What should be removed, simplified, or automated? Where was I overloaded?' },
  monthly:   { label: 'Monthly',   prompt: 'What deserves more attention next month? What should move to Not Now? Is the current priority still the right one?' },
  quarterly: { label: 'Quarterly', prompt: 'Zoom out. Am I becoming who I said I wanted to become? What should change about the whole system, not just this week?' },
};

/* ---------------------------------------------------------------- STATE */

function defaultState(){
  return {
    meta: { name: 'Chuck' },
    mode: 'green',
    season: { key: 'normal', priorities: ['school'] },
    today: { date: todayISO(), top3: ['', '', ''], top3Done: [false, false, false], windDown: '', mvd: {} },
    capacity: { weekOf: mondayISO(), hoursAvailable: null, commitments: [] },
    week: { weekOf: mondayISO(), school:'', business:'', training:'', spiritual:'', reading:'', social:'', buffer:'' },
    domains: {
      school:    { items: [] },
      business:  { items: [] },
      athlete:   { logs: [] },
      spiritual: { scriptureLog: [], templeLog: [] },
      reading:   { currentBook: '', progressNote: '', queue: [] },
      life:      { notes: [] },
    },
    goals: { active: [], notNow: [] },
    reviews: { daily: [], weekly: [], monthly: [], quarterly: [] },
  };
}

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // shallow-merge with defaults so new fields added later don't break old saves
    const d = defaultState();
    return { ...d, ...parsed,
      today: { ...d.today, ...parsed.today },
      capacity: { ...d.capacity, ...parsed.capacity },
      week: { ...d.week, ...parsed.week },
      domains: { ...d.domains, ...parsed.domains },
      goals: { ...d.goals, ...parsed.goals },
      reviews: { ...d.reviews, ...parsed.reviews },
      season: { ...d.season, ...parsed.season },
    };
  }catch(e){
    console.warn('Could not read saved data, starting fresh.', e);
    return defaultState();
  }
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------------------------------------------------------------- UTIL */

function uid(){ return Math.random().toString(36).slice(2, 9); }
function todayISO(){ const d = new Date(); return d.toISOString().slice(0,10); }
function mondayISO(){
  const d = new Date();
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0,10);
}
function fmtDate(iso){
  if(!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month:'short', day:'numeric' });
}
function esc(s){
  return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(()=>t.classList.remove('show'), 2200);
}
function rollWeekIfNeeded(){
  const mon = mondayISO();
  if(state.capacity.weekOf !== mon){
    state.capacity.weekOf = mon;
    state.capacity.hoursAvailable = null;
    state.capacity.commitments = [];
  }
  if(state.week.weekOf !== mon){
    state.week = { weekOf: mon, school:'', business:'', training:'', spiritual:'', reading:'', social:'', buffer:'' };
  }
  if(state.today.date !== todayISO()){
    state.today = { date: todayISO(), top3: ['', '', ''], top3Done: [false,false,false], windDown: '', mvd: {} };
  }
}

/* ---------------------------------------------------------------- NAV */

let currentDomainTab = 'school';
let currentReviewTab = 'daily';

function go(tab){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + tab).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  window.scrollTo(0,0);
  if(tab === 'domains') renderDomains();
  if(tab === 'review') renderReview();
  if(tab === 'more') renderMoreHome();
}

/* ---------------------------------------------------------------- RENDER: shared mode/season chrome */

function renderChrome(){
  document.getElementById('modeBand').dataset.mode = state.mode;
  document.getElementById('modePillBtn').dataset.mode = state.mode;
  document.getElementById('modePillText').textContent = state.mode.toUpperCase();

  const hr = new Date().getHours();
  document.getElementById('greeting').textContent = hr < 12 ? 'Morning.' : hr < 18 ? 'Afternoon.' : 'Evening.';

  const seasonLabel = SEASONS.find(s => s.key === state.season.key)?.label || 'Normal semester';
  const priLabels = state.season.priorities.map(k => PRIORITY_DOMAINS.find(p=>p.key===k)?.label).filter(Boolean);
  document.getElementById('todaySubline').textContent =
    `${seasonLabel} · priority: ${priLabels.join(' + ') || 'none set'}`;
  document.getElementById('seasonName').textContent = seasonLabel;
  document.getElementById('seasonPriority').textContent = 'Current priority: ' + (priLabels.join(' + ') || 'none set — set one in More → Season');
}

function cycleMode(){
  const order = ['green','yellow','red'];
  const i = order.indexOf(state.mode);
  state.mode = order[(i+1) % order.length];
  save();
  renderAll();
  toast('Mode set to ' + state.mode.toUpperCase());
}
document.getElementById('modePillBtn').addEventListener('click', cycleMode);

/* ---------------------------------------------------------------- RENDER: TODAY */

function renderToday(){
  renderChrome();

  // Top 3
  const top3Card = document.getElementById('top3Card');
  top3Card.innerHTML = state.today.top3.map((val, i) => `
    <div class="top3-item ${state.today.top3Done[i] ? 'done' : ''}">
      <span class="num mono">${i+1}</span>
      <input type="checkbox" ${state.today.top3Done[i] ? 'checked' : ''} onchange="toggleTop3Done(${i})" />
      <input type="text" value="${esc(val)}" placeholder="${i===0?'the one that actually matters':'—'}" oninput="setTop3Text(${i}, this.value)" />
    </div>
  `).join('');

  document.getElementById('windDownInput').value = state.today.windDown;

  // Minimum viable day
  const mvdCard = document.getElementById('mvdCard');
  mvdCard.innerHTML = MVD_ITEMS.map(item => `
    <label class="checkline" style="margin:0; text-transform:none; letter-spacing:0; font-weight:400; color:var(--ink);">
      <input type="checkbox" ${state.today.mvd[item.key] ? 'checked' : ''} onchange="toggleMvd('${item.key}')" />
      <span style="font-size:14px;">${esc(item.label)}</span>
    </label>
  `).join('');

  // Overload banner
  const banner = document.getElementById('overloadBanner');
  const overload = computeOverload();
  if(overload){
    banner.style.display = '';
    document.getElementById('overloadTitle').textContent = overload.title;
    document.getElementById('overloadBody').textContent = overload.body;
  } else {
    banner.style.display = 'none';
  }
}

function toggleTop3Done(i){ state.today.top3Done[i] = !state.today.top3Done[i]; save(); renderToday(); }
function setTop3Text(i, val){ state.today.top3[i] = val; save(); }
function toggleMvd(key){ state.today.mvd[key] = !state.today.mvd[key]; save(); }
document.getElementById('windDownInput').addEventListener('input', e => { state.today.windDown = e.target.value; save(); });

function computeOverload(){
  const c = state.capacity;
  if(c.hoursAvailable !== null && c.hoursAvailable !== ''){
    const total = c.commitments.reduce((s,x)=>s + (Number(x.hours)||0), 0);
    if(total > Number(c.hoursAvailable)){
      return {
        title: `Over capacity by ${(total - Number(c.hoursAvailable)).toFixed(1)}h this week`,
        body: `You've logged ${total.toFixed(1)}h of commitments against ${Number(c.hoursAvailable).toFixed(1)}h of realistic flexible capacity. Something on the list has to be delayed, reduced, delegated, or dropped — a denser schedule is not the fix.`,
      };
    }
  }
  if(state.goals.active.length > 2){
    return {
      title: `${state.goals.active.length} active growth priorities`,
      body: `This system is built to run on 1–2 at a time. Move the rest to Not Now.`,
    };
  }
  if(state.mode === 'red'){
    return {
      title: 'Red mode',
      body: 'Major exam, illness, injury flare, or a real crisis. Today is minimum-viable-day only. Everything else waits.',
    };
  }
  return null;
}

/* ---------------------------------------------------------------- RENDER: WEEK */

function renderWeek(){
  document.getElementById('capHoursAvailable').value = state.capacity.hoursAvailable ?? '';
  const total = state.capacity.commitments.reduce((s,x)=>s + (Number(x.hours)||0), 0);
  document.getElementById('capTotalHint').textContent = total ? `${total.toFixed(1)}h logged` : '';

  const list = document.getElementById('commitmentsCard');
  if(state.capacity.commitments.length === 0){
    list.innerHTML = `<div class="empty">Nothing logged yet. Add whatever's actually taking time this week.</div>`;
  } else {
    list.innerHTML = state.capacity.commitments.map(c => `
      <div class="card-row">
        <div>
          <div style="font-weight:600;">${esc(c.name)}</div>
          <div class="faint">${esc(c.category || '')}</div>
        </div>
        <div class="row" style="align-items:center; flex:0 0 auto;">
          <span class="mono" style="margin-right:8px;">${Number(c.hours).toFixed(1)}h</span>
          <button class="btn ghost small" onclick="removeCommitment('${c.id}')">Remove</button>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('weekSchool').value = state.week.school;
  document.getElementById('weekBusiness').value = state.week.business;
  document.getElementById('weekTraining').value = state.week.training;
  document.getElementById('weekSpiritual').value = state.week.spiritual;
  document.getElementById('weekReading').value = state.week.reading;
  document.getElementById('weekSocial').value = state.week.social;
  document.getElementById('weekBuffer').value = state.week.buffer;
}

document.getElementById('capHoursAvailable').addEventListener('input', e => {
  state.capacity.hoursAvailable = e.target.value === '' ? null : Number(e.target.value);
  save(); renderToday();
});
['weekSchool','weekBusiness','weekTraining','weekSpiritual','weekReading','weekSocial','weekBuffer'].forEach(id=>{
  const field = id.replace('week','').replace(/^./, c=>c.toLowerCase());
  document.getElementById(id).addEventListener('input', e => { state.week[field] = e.target.value; save(); });
});

function addCommitment(){
  const name = prompt('What is it?');
  if(!name) return;
  const hours = Number(prompt('Roughly how many hours this week?', '2')) || 0;
  state.capacity.commitments.push({ id: uid(), name, hours, category: '' });
  save(); renderWeek(); renderToday();
}
function removeCommitment(id){
  state.capacity.commitments = state.capacity.commitments.filter(c => c.id !== id);
  save(); renderWeek(); renderToday();
}

/* ---------------------------------------------------------------- RENDER: DOMAINS */

function renderDomains(){
  const chips = document.getElementById('domainChips');
  const keys = ['school','business','athlete','spiritual','reading','life'];
  chips.innerHTML = keys.map(k => `
    <button class="chip ${currentDomainTab===k?'active':''}" onclick="setDomainTab('${k}')">${DOMAIN_META[k].label}${state.season.priorities.includes(k) ? ' •' : ''}</button>
  `).join('');
  renderDomainBody();
}
function setDomainTab(k){ currentDomainTab = k; renderDomains(); }

function priorityTagFor(key){
  return state.season.priorities.includes(key)
    ? `<span class="tag">current priority</span>`
    : `<span class="tag maint">maintenance</span>`;
}

function renderDomainBody(){
  const body = document.getElementById('domainBody');
  const k = currentDomainTab;

  if(k === 'school' || k === 'business'){
    const items = state.domains[k].items;
    body.innerHTML = `
      <div class="section-head"><h2>${DOMAIN_META[k].label}</h2>${priorityTagFor(k)}</div>
      <div class="card" id="domainListCard">
        ${items.length === 0 ? `<div class="empty">Nothing here. Add ${k==='school'?'an assignment or exam':'a lead or task'}.</div>` :
          items.slice().sort((a,b)=> (a.done - b.done) || (a.due||'').localeCompare(b.due||'')).map(it => `
            <div class="list-item">
              <div class="list-item-head">
                <label class="checkline" style="padding:0;">
                  <input type="checkbox" ${it.done?'checked':''} onchange="toggleDomainItem('${k}','${it.id}')" />
                  <span style="${it.done?'text-decoration:line-through;color:var(--ink-faint);':''}">${esc(it.title)}</span>
                </label>
                <button class="btn ghost small" onclick="removeDomainItem('${k}','${it.id}')">✕</button>
              </div>
              <div class="faint" style="margin-left:28px;">${esc(it.type)}${it.due ? ' · due ' + fmtDate(it.due) : ''}</div>
            </div>
          `).join('')}
      </div>
      <button class="btn secondary block mt8" onclick="addDomainItem('${k}')">+ Add</button>
    `;
  }

  else if(k === 'athlete'){
    const logs = state.domains.athlete.logs.slice().sort((a,b)=>b.date.localeCompare(a.date));
    const latest = logs[0], prev = logs[1];
    function delta(field){
      if(!latest || !prev || latest[field]==null || prev[field]==null || latest[field]==='' || prev[field]==='') return '';
      const d = Number(latest[field]) - Number(prev[field]);
      if(d===0) return '';
      const cls = field==='sprint40' || field==='sprint10' ? (d<0?'up':'down') : (d>0?'up':'down'); // faster = lower = good
      return `<div class="delta ${cls}">${d>0?'+':''}${d}</div>`;
    }
    body.innerHTML = `
      <div class="section-head"><h2>Athlete</h2>${priorityTagFor('athlete')}</div>
      <div class="stat-grid">
        <div class="stat"><div class="v mono">${latest?.bodyweight ?? '—'}</div><div class="l">Bodyweight (lb)</div>${delta('bodyweight')}</div>
        <div class="stat"><div class="v mono">${latest?.vertical ?? '—'}</div><div class="l">Vertical (in)</div>${delta('vertical')}</div>
        <div class="stat"><div class="v mono">${latest?.sprint10 ?? '—'}</div><div class="l">10-yd (sec)</div>${delta('sprint10')}</div>
        <div class="stat"><div class="v mono">${latest?.sprint40 ?? '—'}</div><div class="l">40-yd (sec)</div>${delta('sprint40')}</div>
      </div>
      <div class="faint mt8">Test trends, not every session. Weekly or biweekly is plenty — daily testing creates noise and obsession, not signal.</div>
      <button class="btn secondary block mt12" onclick="openAthleteLogForm()">+ Log a session / test</button>
      <div class="section-head mt16"><h2>History</h2></div>
      <div class="card">
        ${logs.length===0 ? `<div class="empty">No logs yet.</div>` : logs.slice(0,10).map(l => `
          <div class="card-row">
            <div class="faint">${fmtDate(l.date)}</div>
            <div class="mono" style="text-align:right; font-size:12.5px; color:var(--ink-soft);">
              ${l.bodyweight?`bw ${l.bodyweight} `:''}${l.vertical?`vert ${l.vertical} `:''}${l.sprint10?`10y ${l.sprint10} `:''}${l.sprint40?`40y ${l.sprint40}`:''}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="faint mt8">Managing patellar tendon / hip-groin load: keep warm-ups non-negotiable, don't push through sharp pain, and treat persistent pain as a reason to see a professional — not a target to train through.</div>
    `;
  }

  else if(k === 'spiritual'){
    const scriptureToday = state.domains.spiritual.scriptureLog.includes(todayISO());
    const weekOf = mondayISO();
    const templeThisWeek = state.domains.spiritual.templeLog.includes(weekOf);
    const scriptureCount30 = state.domains.spiritual.scriptureLog.filter(d => d >= addDaysISO(todayISO(), -30)).length;
    body.innerHTML = `
      <div class="section-head"><h2>Spiritual</h2><span class="tag">protected — not competing for priority</span></div>
      <div class="card">
        <div class="card-row">
          <div><div style="font-weight:600;">Scripture study today</div><div class="faint">target 30–60 min</div></div>
          <button class="btn ${scriptureToday?'secondary':''} small" onclick="toggleScriptureToday()">${scriptureToday?'Done ✓':'Mark done'}</button>
        </div>
        <div class="card-row">
          <div><div style="font-weight:600;">Temple this week</div><div class="faint">target ~2 hrs / week</div></div>
          <button class="btn ${templeThisWeek?'secondary':''} small" onclick="toggleTempleThisWeek()">${templeThisWeek?'Done ✓':'Mark done'}</button>
        </div>
      </div>
      <div class="faint mt8">${scriptureCount30}/30 days in the last month — a fact, not a score. No streak pressure, no gamification.</div>
    `;
  }

  else if(k === 'reading'){
    const q = state.domains.reading.queue;
    body.innerHTML = `
      <div class="section-head"><h2>Reading</h2>${priorityTagFor('reading')}</div>
      <div class="card">
        <div class="field"><label>Current book</label><input id="readingCurrent" type="text" value="${esc(state.domains.reading.currentBook)}" placeholder="what you're actually reading" /></div>
        <div class="field" style="margin-bottom:0;"><label>Where you are / notes</label><textarea id="readingNote" rows="2" placeholder="chapter, page, an idea worth keeping">${esc(state.domains.reading.progressNote)}</textarea></div>
      </div>
      <div class="faint mt8">Normal target 20–30 min/day. Busy day: read one page. That still counts.</div>
      <div class="section-head mt16"><h2>Queue</h2></div>
      <div class="card">
        ${q.length===0 ? `<div class="empty">Nothing queued.</div>` : q.map(b => `
          <div class="card-row"><div>${esc(b.title)}</div><button class="btn ghost small" onclick="removeQueueBook('${b.id}')">✕</button></div>
        `).join('')}
      </div>
      <button class="btn secondary block mt8" onclick="addQueueBook()">+ Add to queue</button>
    `;
  }

  else if(k === 'life'){
    const notes = state.domains.life.notes.slice().sort((a,b)=>b.date.localeCompare(a.date));
    body.innerHTML = `
      <div class="section-head"><h2>Life</h2><span class="tag maint">friends · family · rest · spontaneity</span></div>
      <div class="card">
        ${notes.length===0 ? `<div class="empty">Nothing logged. This tab isn't for tracking people — it's a place to note plans, so social life doesn't quietly get crowded out.</div>` :
          notes.map(n => `<div class="list-item"><div>${esc(n.text)}</div><div class="faint">${fmtDate(n.date)}</div></div>`).join('')}
      </div>
      <button class="btn secondary block mt8" onclick="addLifeNote()">+ Add a plan / note</button>
    `;
  }
}

function addDaysISO(iso, days){
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}

function addDomainItem(k){
  const title = prompt(k==='school' ? 'Assignment / exam name:' : 'Lead / task name:');
  if(!title) return;
  const type = prompt(k==='school' ? 'Type — assignment, exam, or course?' : 'Type — lead, task, or follow-up?', k==='school'?'assignment':'task') || '';
  const due = prompt('Due date (YYYY-MM-DD), or leave blank:') || '';
  state.domains[k].items.push({ id: uid(), title, type, due, done:false });
  save(); renderDomainBody();
}
function toggleDomainItem(k,id){
  const it = state.domains[k].items.find(i=>i.id===id);
  if(it){ it.done = !it.done; save(); renderDomainBody(); }
}
function removeDomainItem(k,id){
  state.domains[k].items = state.domains[k].items.filter(i=>i.id!==id);
  save(); renderDomainBody();
}

function openAthleteLogForm(){
  const bodyweight = prompt('Bodyweight (lb) — blank to skip:');
  const vertical = prompt('Vertical jump (in) — blank to skip:');
  const sprint10 = prompt('10-yd sprint (sec) — blank to skip:');
  const sprint40 = prompt('40-yd sprint (sec) — blank to skip:');
  const notes = prompt('Notes — blank to skip:');
  if(bodyweight===null && vertical===null && sprint10===null && sprint40===null) return;
  state.domains.athlete.logs.push({
    id: uid(), date: todayISO(),
    bodyweight: bodyweight || null, vertical: vertical || null,
    sprint10: sprint10 || null, sprint40: sprint40 || null,
    notes: notes || '',
  });
  save(); renderDomainBody();
}

function toggleScriptureToday(){
  const log = state.domains.spiritual.scriptureLog;
  const t = todayISO();
  const i = log.indexOf(t);
  if(i===-1) log.push(t); else log.splice(i,1);
  save(); renderDomainBody();
}
function toggleTempleThisWeek(){
  const log = state.domains.spiritual.templeLog;
  const w = mondayISO();
  const i = log.indexOf(w);
  if(i===-1) log.push(w); else log.splice(i,1);
  save(); renderDomainBody();
}

function addQueueBook(){
  const title = prompt('Book title:');
  if(!title) return;
  state.domains.reading.queue.push({ id: uid(), title });
  save(); renderDomainBody();
}
function removeQueueBook(id){
  state.domains.reading.queue = state.domains.reading.queue.filter(b=>b.id!==id);
  save(); renderDomainBody();
}
document.addEventListener('input', e => {
  if(e.target.id === 'readingCurrent'){ state.domains.reading.currentBook = e.target.value; save(); }
  if(e.target.id === 'readingNote'){ state.domains.reading.progressNote = e.target.value; save(); }
});

function addLifeNote(){
  const text = prompt('What\'s the plan / note?');
  if(!text) return;
  state.domains.life.notes.push({ id: uid(), text, date: todayISO() });
  save(); renderDomainBody();
}

/* ---------------------------------------------------------------- RENDER: REVIEW */

function setReviewTab(t){ currentReviewTab = t; renderReview(); }

function renderReview(){
  document.querySelectorAll('#screen-review .chip').forEach(c => c.classList.toggle('active', c.dataset.rt === currentReviewTab));
  const meta = REVIEW_TYPES[currentReviewTab];
  const entries = state.reviews[currentReviewTab].slice().sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('reviewBody').innerHTML = `
    <div class="section">
      <div class="card">
        <div class="muted">${meta.prompt}</div>
        <textarea id="reviewInput" rows="5" class="mt12" placeholder="Write freely — this isn't graded."></textarea>
        <button class="btn block mt12" onclick="saveReview()">Save entry</button>
      </div>
    </div>
    <div class="section">
      <div class="section-head"><h2>Past entries</h2></div>
      ${entries.length===0 ? `<div class="empty">No ${meta.label.toLowerCase()} entries yet.</div>` :
        entries.map(e => `
          <div class="card">
            <div class="faint">${fmtDate(e.date)}</div>
            <div class="mt8" style="white-space:pre-wrap;">${esc(e.text)}</div>
          </div>
        `).join('')}
    </div>
  `;
}
function saveReview(){
  const text = document.getElementById('reviewInput').value.trim();
  if(!text) return;
  state.reviews[currentReviewTab].push({ id: uid(), date: todayISO(), text });
  save(); renderReview();
  toast('Saved.');
}

/* ---------------------------------------------------------------- RENDER: MORE (Season / Goals / Not Now / Settings) */

function renderMoreHome(){
  document.getElementById('moreGrid').style.display = '';
  document.getElementById('moreBody').innerHTML = '';
}

function openMoreScreen(which){
  go('more');
  document.getElementById('moreGrid').style.display = 'none';
  const body = document.getElementById('moreBody');

  if(which === 'season'){
    body.innerHTML = `
      <button class="btn ghost" onclick="renderMoreHome()">‹ Back</button>
      <div class="section-head mt12"><h2>Season</h2></div>
      <div class="card">
        ${SEASONS.map(s => `
          <label class="checkline" style="text-transform:none; font-weight:${state.season.key===s.key?'700':'400'};">
            <input type="radio" name="season" ${state.season.key===s.key?'checked':''} onchange="setSeason('${s.key}')" />
            ${s.label}
          </label>
        `).join('')}
      </div>
      <div class="section-head mt16"><h2>Current growth priority</h2><span class="hint">max 2</span></div>
      <div class="card">
        ${PRIORITY_DOMAINS.map(p => `
          <label class="checkline" style="text-transform:none; font-weight:400;">
            <input type="checkbox" ${state.season.priorities.includes(p.key)?'checked':''} onchange="togglePriority('${p.key}')" />
            ${p.label}
          </label>
        `).join('')}
      </div>
      <div class="faint mt8">Everything not checked here runs in maintenance mode — kept alive, not maximized. Spiritual life and sleep are protected outside this competition entirely.</div>
      <div class="section-head mt16"><h2>Mode</h2></div>
      <div class="card">
        ${['green','yellow','red'].map(m => `
          <label class="checkline" style="text-transform:none; font-weight:${state.mode===m?'700':'400'};">
            <input type="radio" name="mode" ${state.mode===m?'checked':''} onchange="setMode('${m}')" />
            ${m.toUpperCase()} — ${m==='green'?'normal capacity':m==='yellow'?'busy, tired, temporarily limited':'exam crunch, illness, injury flare, or a real crisis'}
          </label>
        `).join('')}
      </div>
    `;
  }

  else if(which === 'goals'){
    body.innerHTML = `
      <button class="btn ghost" onclick="renderMoreHome()">‹ Back</button>
      <div class="section-head mt12"><h2>Active growth priorities</h2><span class="hint">${state.goals.active.length}/2</span></div>
      ${state.goals.active.length===0 ? `<div class="empty">Nothing active. That's allowed.</div>` :
        `<div class="card">${state.goals.active.map(g => `
          <div class="card-row">
            <div>
              <div style="font-weight:600;">${esc(g.title)}</div>
              <div class="faint">added ${fmtDate(g.addedDate)}</div>
            </div>
            <button class="btn ghost small" onclick="retireGoal('${g.id}')">Retire</button>
          </div>
        `).join('')}</div>`}
      <button class="btn block mt12" onclick="openGoalModal()">+ Run a new commitment through the system</button>
    `;
  }

  else if(which === 'notnow'){
    const items = state.goals.notNow.slice().sort((a,b)=>b.dateParked.localeCompare(a.dateParked));
    body.innerHTML = `
      <button class="btn ghost" onclick="renderMoreHome()">‹ Back</button>
      <div class="section-head mt12"><h2>Not Now</h2><span class="hint">parked, not forgotten</span></div>
      ${items.length===0 ? `<div class="empty">Nothing parked yet.</div>` :
        `<div class="card">${items.map(n => `
          <div class="list-item">
            <div class="list-item-head">
              <div style="font-weight:600;">${esc(n.title)}</div>
              <button class="btn ghost small" onclick="deleteNotNow('${n.id}')">✕</button>
            </div>
            <div class="faint">${esc(n.reason || '')} · parked ${fmtDate(n.dateParked)}</div>
          </div>
        `).join('')}</div>`}
      <button class="btn secondary block mt12" onclick="quickParkIdea()">+ Park an idea directly</button>
    `;
  }

  else if(which === 'settings'){
    body.innerHTML = `
      <button class="btn ghost" onclick="renderMoreHome()">‹ Back</button>
      <div class="section-head mt12"><h2>Settings</h2></div>
      <div class="card">
        <div class="field"><label>Name</label><input id="settingsName" type="text" value="${esc(state.meta.name)}" /></div>
      </div>
      <div class="faint mt12">Data lives only in this browser, on this device. Nothing is sent anywhere.</div>
      <button class="btn danger block mt16" onclick="resetAll()">Reset all data</button>
    `;
    document.getElementById('settingsName').addEventListener('input', e => { state.meta.name = e.target.value; save(); });
  }
}

function setSeason(key){ state.season.key = key; save(); openMoreScreen('season'); renderChrome(); }
function setMode(m){ state.mode = m; save(); openMoreScreen('season'); renderAll(); }
function togglePriority(key){
  const p = state.season.priorities;
  const i = p.indexOf(key);
  if(i>-1){ p.splice(i,1); }
  else{
    if(p.length >= 2){ toast('Already at 2. Remove one first.'); return; }
    p.push(key);
  }
  save(); openMoreScreen('season'); renderChrome();
}

function retireGoal(id){
  state.goals.active = state.goals.active.filter(g=>g.id!==id);
  save(); openMoreScreen('goals'); renderToday();
}
function deleteNotNow(id){
  state.goals.notNow = state.goals.notNow.filter(n=>n.id!==id);
  save(); openMoreScreen('notnow');
}
function quickParkIdea(){
  const title = prompt('What is it?');
  if(!title) return;
  const reason = prompt('Why not now? (one line)') || '';
  state.goals.notNow.push({ id: uid(), title, reason, dateParked: todayISO() });
  save(); openMoreScreen('notnow');
}
function resetAll(){
  if(!confirm('This clears everything on this device. Are you sure?')) return;
  state = defaultState();
  save(); renderAll(); go('today');
  toast('Reset.');
}

/* ---------------------------------------------------------------- GOAL MODAL — the decision engine */

function openGoalModal(){
  document.getElementById('gTitle').value = '';
  document.getElementById('gWhy').value = '';
  document.getElementById('gSupports').value = 'value';
  document.getElementById('gAligned').value = 'yes';
  document.getElementById('gHours').value = '';
  document.getElementById('gRecovery').value = 'low';
  document.getElementById('gRemove').value = '';
  document.getElementById('gWait').value = 'yes';
  document.getElementById('goalVerdict').innerHTML = '';
  document.getElementById('goalModalBackdrop').classList.add('open');
}
function closeGoalModal(){ document.getElementById('goalModalBackdrop').classList.remove('open'); }

function evaluateGoal(){
  const title = document.getElementById('gTitle').value.trim();
  if(!title){ toast('Give it a name first.'); return; }
  const supports = document.getElementById('gSupports').value;
  const aligned = document.getElementById('gAligned').value;
  const wait = document.getElementById('gWait').value;
  const hours = Number(document.getElementById('gHours').value) || 0;

  let denied = false, reason = '';
  if(aligned === 'no'){ denied = true; reason = "Not aligned with the current season."; }
  else if(supports === 'exciting' && wait === 'yes'){ denied = true; reason = "Exciting, not essential right now, and it can wait."; }
  else if(wait === 'yes' && state.goals.active.length >= 2){ denied = true; reason = "You're already running 2 active priorities and this can wait."; }

  const verdictEl = document.getElementById('goalVerdict');

  if(denied){
    verdictEl.innerHTML = `
      <div class="stamp-wrap"><div class="stamp">NOT NOW</div></div>
      <div class="muted" style="text-align:center;">${esc(reason)}</div>
      <button class="btn block mt16" onclick="parkFromModal('${esc(title).replace(/'/g,"&#39;")}')">Park it in Not Now</button>
    `;
    return;
  }

  if(state.goals.active.length >= 2){
    verdictEl.innerHTML = `
      <div class="stamp-wrap"><div class="stamp approved">APPROVED — BUT FULL</div></div>
      <div class="muted" style="text-align:center;">It qualifies, but you're already at 2 active priorities. Retire one in Goals before adding this, or park it.</div>
      <button class="btn secondary block mt16" onclick="parkFromModal('${esc(title).replace(/'/g,"&#39;")}')">Park it in Not Now instead</button>
    `;
    return;
  }

  verdictEl.innerHTML = `
    <div class="stamp-wrap"><div class="stamp approved">APPROVED</div></div>
    <div class="muted" style="text-align:center;">Hours needed: ${hours}/wk. Check the Week tab — that time has to come from somewhere specific, not from thin air.</div>
    <button class="btn block mt16" onclick="addGoalFromModal('${esc(title).replace(/'/g,"&#39;")}')">Add as active priority</button>
  `;
}
function addGoalFromModal(title){
  state.goals.active.push({ id: uid(), title, addedDate: todayISO() });
  save(); closeGoalModal(); renderToday();
  toast('Added.');
}
function parkFromModal(title){
  const reason = document.getElementById('goalVerdict').querySelector('.muted')?.textContent || '';
  state.goals.notNow.push({ id: uid(), title, reason, dateParked: todayISO() });
  save(); closeGoalModal();
  toast('Parked in Not Now.');
}

/* ---------------------------------------------------------------- INIT */

function renderAll(){
  rollWeekIfNeeded();
  renderChrome();
  renderToday();
  renderWeek();
  if(document.getElementById('screen-domains').classList.contains('active')) renderDomains();
  if(document.getElementById('screen-review').classList.contains('active')) renderReview();
}

renderAll();
save();

// Register service worker for offline / home-screen use
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(()=>{ /* offline support is a nice-to-have, not required */ });
  });
}
