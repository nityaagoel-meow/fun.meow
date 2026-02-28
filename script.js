
const DB = {
  get(k, def=[]) { try { return JSON.parse(localStorage.getItem('studyos_'+k)) ?? def; } catch(e) { return def; } },
  set(k, v) { localStorage.setItem('studyos_'+k, JSON.stringify(v)); },
  save(k, item) { const arr = DB.get(k); arr.push(item); DB.set(k, arr); return item; },
  del(k, id) { DB.set(k, DB.get(k).filter(x => x.id !== id)); }
};
const uid = () => Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().split('T')[0];

// ===========================
// NAVIGATION
// ===========================
const pageNames = {
  'dashboard': 'Dashboard', 'dsa-log': 'DSA Problem Log', 'dsa-analytics': 'Analytics',
  'syllabus': 'Syllabus Tracker', 'projects': 'Projects & Milestones',
  'pomodoro': 'Pomodoro Timer', 'goals': 'Goals'
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if(n.getAttribute('onclick')?.includes(page)) n.classList.add('active');
  });
  document.getElementById('page-title').textContent = pageNames[page] || page;
  renderPage(page);
}

function renderPage(page) {
  if(page === 'dashboard') renderDashboard();
  else if(page === 'dsa-log') renderDSALog();
  else if(page === 'dsa-analytics') renderAnalytics();
  else if(page === 'syllabus') renderSyllabus();
  else if(page === 'projects') renderProjects();
  else if(page === 'pomodoro') renderPomodoro();
  else if(page === 'goals') renderGoals();
}

// ===========================
// MODALS
// ===========================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if(e.target === m) m.classList.remove('open'); });
});

// ===========================
// TOAST
// ===========================
function toast(msg, type='success') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = (type==='success'?'✓ ':'⚠ ') + msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ===========================
// DATE DISPLAY
// ===========================
function initTopbar() {
  const d = new Date();
  document.getElementById('date-badge').textContent = d.toLocaleDateString('en-US', {weekday:'short',month:'short',day:'numeric'});
  updateStreak();
}

function updateStreak() {
  const probs = DB.get('dsa', []);
  const dates = [...new Set(probs.map(p=>p.date))].sort().reverse();
  let streak = 0;
  const now = new Date();
  for(let i=0;i<dates.length;i++){
    const d = new Date(dates[i]);
    const diff = Math.floor((now - d)/(1000*60*60*24));
    if(diff === i || (i===0 && diff===0)) streak++;
    else break;
  }
  document.getElementById('streak-badge').textContent = `🔥 ${streak} day streak`;
}

// ===========================
// DASHBOARD
// ===========================
function renderDashboard() {
  const probs = DB.get('dsa', []);
  const pomos = DB.get('pomodoro', []);
  const tasks = DB.get('tasks', []);
  const todayTasks = tasks.filter(t=>t.date===today());
  const todayProbs = probs.filter(p=>p.date===today());
  const pomoToday = pomos.filter(p=>p.date===today());
  const totalPomMin = pomoToday.reduce((a,b)=>a+b.duration,0);

  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card" style="--accent-color:rgba(124,106,255,0.12)">
      <div class="stat-label">TODAY'S DSA</div>
      <div class="stat-value">${todayProbs.length}</div>
      <div class="stat-sub">Total: ${probs.length} solved</div>
    </div>
    <div class="stat-card" style="--accent-color:rgba(34,197,94,0.1)">
      <div class="stat-label">FOCUS TIME</div>
      <div class="stat-value">${Math.floor(totalPomMin/60)}h ${totalPomMin%60}m</div>
      <div class="stat-sub">${pomoToday.length} pomodoro sessions</div>
    </div>
    <div class="stat-card" style="--accent-color:rgba(234,179,8,0.1)">
      <div class="stat-label">TASKS TODAY</div>
      <div class="stat-value">${todayTasks.filter(t=>t.done).length}/${todayTasks.length}</div>
      <div class="stat-sub">Completed today</div>
    </div>
    <div class="stat-card" style="--accent-color:rgba(239,68,68,0.08)">
      <div class="stat-label">TOTAL PROBLEMS</div>
      <div class="stat-value">${probs.length}</div>
      <div class="stat-sub">All time</div>
    </div>
  `;

  // Today's tasks
  const tEl = document.getElementById('today-tasks');
  if(!todayTasks.length) {
    tEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:20px;text-align:center;">No tasks for today. Add one!</div>';
  } else {
    tEl.innerHTML = todayTasks.map(t=>`
      <div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;background:var(--bg3);margin-bottom:6px;border:1px solid ${t.done?'rgba(34,197,94,0.2)':'var(--border)'};">
        <input type="checkbox" ${t.done?'checked':''} onchange="toggleTask('${t.id}',this.checked)" style="width:16px;height:16px;accent-color:var(--green);cursor:pointer;">
        <div style="flex:1;">
          <div style="font-size:13px;${t.done?'text-decoration:line-through;color:var(--text3)':'color:var(--text)'}">${t.name}</div>
          <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;">${t.cat} · ${t.priority}</div>
        </div>
        <button onclick="deleteTask('${t.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;">✕</button>
      </div>
    `).join('');
  }

  // Upcoming deadlines
  const subs = DB.get('subjects', []);
  const projs = DB.get('projects', []);
  const goals = DB.get('goals', []);
  const deadlines = [];
  subs.forEach(s=>{ if(s.examDate){ deadlines.push({name:s.name+' Exam',date:s.examDate,type:'exam'}); }});
  projs.forEach(p=>{ if(p.endDate){ deadlines.push({name:p.name,date:p.endDate,type:'project'}); }
    (p.milestones||[]).forEach(m=>{ if(m.deadline){ deadlines.push({name:p.name+': '+m.name,date:m.deadline,type:'milestone'}); }});
  });
  goals.forEach(g=>{ if(g.deadline){ deadlines.push({name:g.title,date:g.deadline,type:'goal'}); }});
  deadlines.sort((a,b)=>a.date.localeCompare(b.date));
  const upcoming = deadlines.filter(d=>d.date>=today()).slice(0,5);
  const dEl = document.getElementById('upcoming-deadlines');
  if(!upcoming.length) {
    dEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:20px;text-align:center;">No upcoming deadlines 🎉</div>';
  } else {
    dEl.innerHTML = upcoming.map(d=>{
      const days = Math.ceil((new Date(d.date)-new Date())/(1000*60*60*24));
      const color = days<=3?'var(--red)':days<=7?'var(--yellow)':'var(--green)';
      const icons = {exam:'📚',project:'🏗',milestone:'🏁',goal:'🎯'};
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;background:var(--bg3);margin-bottom:6px;">
        <span style="font-size:16px;">${icons[d.type]}</span>
        <div style="flex:1;"><div style="font-size:13px;color:var(--text)">${d.name}</div>
        <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;">${d.date}</div></div>
        <div style="font-size:11px;font-weight:700;color:${color};font-family:'JetBrains Mono',monospace;">${days}d</div>
      </div>`;
    }).join('');
  }

  // Heatmap last 30 days
  const hEl = document.getElementById('dash-heatmap');
  hEl.innerHTML = buildHeatmap(probs, 30);

  // Syllabus progress
  const spEl = document.getElementById('dash-syllabus-progress');
  if(!subs.length) {
    spEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:20px;text-align:center;">No subjects added yet.</div>';
  } else {
    spEl.innerHTML = subs.map(s=>{
      const units = s.units||[];
      const done = units.filter(u=>u.status==='Completed').length;
      const pct = units.length ? Math.round(done/units.length*100) : 0;
      return `<div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:13px;color:var(--text)">${s.name}</span>
          <span style="font-size:11px;color:var(--text2);font-family:'JetBrains Mono',monospace;">${pct}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${s.color}"></div></div>
      </div>`;
    }).join('');
  }
}

function buildHeatmap(probs, days) {
  const counts = {};
  probs.forEach(p=>{ counts[p.date]=(counts[p.date]||0)+1; });
  const cells = [];
  for(let i=days-1;i>=0;i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    const n = counts[ds]||0;
    const cls = n===0?'':n<=1?'h1':n<=3?'h2':n<=5?'h3':'h4';
    cells.push(`<div class="heatmap-cell ${cls}" title="${ds}: ${n} problems"></div>`);
  }
  return cells.join('');
}

// ===========================
// TASKS
// ===========================
function addTask() {
  const name = document.getElementById('task-name').value.trim();
  if(!name) { toast('Enter a task name','error'); return; }
  DB.save('tasks', { id:uid(), name, cat:document.getElementById('task-cat').value, priority:document.getElementById('task-priority').value, date:today(), done:false });
  closeModal('modal-daily-goal');
  document.getElementById('task-name').value = '';
  toast('Task added!');
  renderDashboard();
}
function toggleTask(id, done) {
  const tasks = DB.get('tasks');
  DB.set('tasks', tasks.map(t=>t.id===id?{...t,done}:t));
  renderDashboard();
}
function deleteTask(id) { DB.del('tasks',id); renderDashboard(); }

// ===========================
// DSA LOG
// ===========================
function renderDSALog() {
  document.getElementById('dsa-date').value = today();
  updateTopicFilter();
  renderDSATable();
}

function updateTopicFilter() {
  const probs = DB.get('dsa', []);
  const topics = [...new Set(probs.map(p=>p.topic))].sort();
  const sel = document.getElementById('filter-topic');
  const cur = sel.value;
  sel.innerHTML = '<option value="">All Topics</option>' + topics.map(t=>`<option ${t===cur?'selected':''}>${t}</option>`).join('');
}

function addDSAProblem() {
  const name = document.getElementById('dsa-name').value.trim();
  if(!name) { toast('Enter a problem name','error'); return; }
  const prob = {
    id: uid(),
    platform: document.getElementById('dsa-platform').value,
    name,
    topic: document.getElementById('dsa-topic').value,
    difficulty: document.getElementById('dsa-difficulty').value,
    time: parseInt(document.getElementById('dsa-time').value)||0,
    date: document.getElementById('dsa-date').value || today(),
    status: document.getElementById('dsa-status').value,
    notes: document.getElementById('dsa-notes').value.trim()
  };
  DB.save('dsa', prob);
  document.getElementById('dsa-name').value = '';
  document.getElementById('dsa-time').value = '';
  document.getElementById('dsa-notes').value = '';
  toast(`Logged: ${prob.name}`);
  updateStreak();
  renderDSATable();
  updateTopicFilter();
}

function renderDSATable() {
  const tf = document.getElementById('filter-topic')?.value;
  const df = document.getElementById('filter-diff')?.value;
  let probs = DB.get('dsa', []).slice().reverse();
  if(tf) probs = probs.filter(p=>p.topic===tf);
  if(df) probs = probs.filter(p=>p.difficulty===df);
  const tbody = document.getElementById('dsa-table-body');
  if(!tbody) return;
  if(!probs.length) { tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:30px;">No problems logged yet</td></tr>`; return; }
  tbody.innerHTML = probs.map(p=>`
    <tr>
      <td>${p.date}</td>
      <td><span style="font-size:11px;color:var(--text3);">${p.platform}</span></td>
      <td style="color:var(--text);font-weight:600;">${p.name}</td>
      <td><span style="color:var(--cyan);font-size:12px;">${p.topic}</span></td>
      <td><span class="tag tag-${p.difficulty.toLowerCase()}">${p.difficulty}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;">${p.time}m</td>
      <td><span class="tag ${p.status==='Solved'?'tag-done':p.status==='Revisit'?'tag-pending':'tag-progress'}">${p.status}</span></td>
      <td style="color:var(--text3);font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.notes||'—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteDSA('${p.id}')">del</button></td>
    </tr>
  `).join('');
}

function deleteDSA(id) { DB.del('dsa',id); renderDSATable(); updateTopicFilter(); updateStreak(); toast('Removed','error'); }

// ===========================
// ANALYTICS
// ===========================
function renderAnalytics() {
  const probs = DB.get('dsa', []);
  const topics = {};
  const diffs = {Easy:0,Medium:0,Hard:0};
  let totalTime = 0;
  probs.forEach(p=>{
    topics[p.topic] = (topics[p.topic]||0)+1;
    diffs[p.difficulty]++;
    totalTime += p.time||0;
  });
  const dates = [...new Set(probs.map(p=>p.date))].sort();

  document.getElementById('analytics-stats').innerHTML = `
    <div class="stat-card"><div class="stat-label">TOTAL SOLVED</div><div class="stat-value">${probs.length}</div><div class="stat-sub">All time</div></div>
    <div class="stat-card"><div class="stat-label">TOPICS COVERED</div><div class="stat-value">${Object.keys(topics).length}</div><div class="stat-sub">Unique topics</div></div>
    <div class="stat-card"><div class="stat-label">AVG TIME</div><div class="stat-value">${probs.length?Math.round(totalTime/probs.length):0}m</div><div class="stat-sub">Per problem</div></div>
    <div class="stat-card"><div class="stat-label">ACTIVE DAYS</div><div class="stat-value">${dates.length}</div><div class="stat-sub">Days practiced</div></div>
  `;

  // Donut difficulty
  drawDonut('donut-difficulty', [
    {label:'Easy',value:diffs.Easy,color:'var(--green)'},
    {label:'Medium',value:diffs.Medium,color:'var(--yellow)'},
    {label:'Hard',value:diffs.Hard,color:'var(--red)'},
  ], 'donut-diff-legend');

  // Topic bars
  const sorted = Object.entries(topics).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxV = Math.max(...sorted.map(t=>t[1]),1);
  document.getElementById('topic-bars').innerHTML = sorted.map(([topic,cnt])=>`
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text)">${topic}</span>
        <span style="font-size:11px;color:var(--text2);font-family:'JetBrains Mono',monospace;">${cnt}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${cnt/maxV*100}%"></div></div>
    </div>
  `).join('');

  // Full heatmap
  document.getElementById('full-heatmap').innerHTML = buildHeatmap(probs, 120);

  // Weak topics (less than 5 problems)
  const weak = Object.entries(topics).filter(([,c])=>c<5).sort((a,b)=>a[1]-b[1]).slice(0,6);
  const allTopics = ['Array','String','Linked List','Tree','Graph','DP','Backtracking','Greedy','Binary Search','Stack','Queue','Heap'];
  const untouched = allTopics.filter(t=>!topics[t]);
  const wEl = document.getElementById('weak-topics');
  if(!probs.length) { wEl.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:20px;">Log problems to see weak topics.</div>'; return; }
  wEl.innerHTML = [
    ...untouched.slice(0,4).map(t=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:8px;margin-bottom:6px;">
      <span style="font-size:13px;color:var(--text)">${t}</span><span style="font-size:10px;color:var(--red);font-family:'JetBrains Mono',monospace;">NOT STARTED</span></div>`),
    ...weak.map(([t,c])=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(234,179,8,0.05);border:1px solid rgba(234,179,8,0.15);border-radius:8px;margin-bottom:6px;">
      <span style="font-size:13px;color:var(--text)">${t}</span><span style="font-size:10px;color:var(--yellow);font-family:'JetBrains Mono',monospace;">${c} solved</span></div>`)
  ].join('') || '<div style="color:var(--green);font-size:13px;padding:10px;">No weak topics! Great job 🎉</div>';

  // Daily bar chart last 14 days
  const dailyCounts = [];
  for(let i=13;i>=0;i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toISOString().split('T')[0];
    dailyCounts.push({day:d.toLocaleDateString('en',{weekday:'short'}).slice(0,2), count:probs.filter(p=>p.date===ds).length});
  }
  const maxD = Math.max(...dailyCounts.map(d=>d.count),1);
  document.getElementById('daily-bar-chart').innerHTML = dailyCounts.map(d=>`
    <div class="bar-col">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text3)">${d.count||''}</div>
      <div class="bar" style="height:${d.count/maxD*80}px;"></div>
      <div class="bar-label">${d.day}</div>
    </div>
  `).join('');
}

function drawDonut(canvasId, data, legendId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const total = data.reduce((a,b)=>a+b.value,0)||1;
  let startAngle = -Math.PI/2;
  ctx.clearRect(0,0,120,120);
  const cx=60,cy=60,r=50,inner=32;
  data.forEach(d=>{
    const slice = (d.value/total)*2*Math.PI;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,startAngle,startAngle+slice);
    ctx.closePath();
    const color = d.color.replace('var(--green)','#22c55e').replace('var(--yellow)','#eab308').replace('var(--red)','#ef4444').replace('var(--accent)','#7c6aff').replace('var(--cyan)','#06b6d4');
    ctx.fillStyle = color; ctx.fill();
    startAngle += slice;
  });
  ctx.beginPath(); ctx.arc(cx,cy,inner,0,2*Math.PI);
  ctx.fillStyle='#111118'; ctx.fill();
  if(legendId) {
    document.getElementById(legendId).innerHTML = data.map(d=>`
      <div class="legend-item">
        <div class="legend-dot" style="background:${d.color.replace('var(--green)','#22c55e').replace('var(--yellow)','#eab308').replace('var(--red)','#ef4444').replace('var(--accent)','#7c6aff').replace('var(--cyan)','#06b6d4')}"></div>
        ${d.label}: <strong style="color:var(--text);margin-left:4px;">${d.value}</strong>
      </div>
    `).join('');
  }
}

// ===========================
// SYLLABUS
// ===========================
function renderSyllabus() {
  const subs = DB.get('subjects', []);
  const el = document.getElementById('syllabus-list');
  if(!subs.length) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:40px;margin-bottom:12px;">📚</div><div style="color:var(--text2);">No subjects added yet. Add your first subject!</div></div>`;
    return;
  }
  el.innerHTML = subs.map(s=>{
    const units = s.units||[];
    const done = units.filter(u=>u.status==='Completed').length;
    const inprog = units.filter(u=>u.status==='In Progress').length;
    const pct = units.length?Math.round(done/units.length*100):0;
    const examDays = s.examDate ? Math.ceil((new Date(s.examDate)-new Date())/(1000*60*60*24)) : null;
    return `
    <div class="card" style="margin-bottom:16px;border-left:3px solid ${s.color};">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="font-size:16px;font-weight:700;color:#fff;">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:2px;">
            ${done}/${units.length} units completed · ${inprog} in progress
            ${examDays!==null?` · 📅 Exam in ${examDays} days`:''}
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openAddUnit('${s.id}')">+ Unit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSubject('${s.id}')">Remove</button>
        </div>
      </div>
      <div class="progress-bar" style="margin-bottom:16px;"><div class="progress-fill" style="width:${pct}%;background:${s.color}"></div></div>
      ${units.map(u=>`
        <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:8px;margin-bottom:6px;border:1px solid var(--border);">
          <div style="flex:1;">
            <div style="font-size:13px;color:var(--text);font-weight:600;">${u.name}</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px;">${u.topics||''}</div>
            <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:4px;">Revisions: ${u.revisions||0}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <select style="padding:4px 8px;border-radius:6px;background:var(--bg4);border:1px solid var(--border2);color:var(--text);font-size:11px;cursor:pointer;"
              onchange="updateUnitStatus('${s.id}','${u.id}',this.value)">
              <option ${u.status==='Not Started'?'selected':''}>Not Started</option>
              <option ${u.status==='In Progress'?'selected':''}>In Progress</option>
              <option ${u.status==='Completed'?'selected':''}>Completed</option>
            </select>
            <button class="btn btn-ghost btn-sm" onclick="addRevision('${s.id}','${u.id}')" title="Mark revision">↺</button>
          </div>
        </div>
      `).join('')}
    </div>`;
  }).join('');
}

function addSubject() {
  const name = document.getElementById('sub-name').value.trim();
  const totalUnits = parseInt(document.getElementById('sub-units').value)||1;
  if(!name) { toast('Enter a subject name','error'); return; }
  DB.save('subjects', {
    id:uid(), name,
    examDate: document.getElementById('sub-exam').value,
    color: document.getElementById('sub-color').value,
    units: []
  });
  closeModal('modal-add-subject');
  document.getElementById('sub-name').value = '';
  toast(`Added: ${name}`);
  renderSyllabus();
}

function deleteSubject(id) {
  if(!confirm('Remove this subject?')) return;
  DB.del('subjects',id); renderSyllabus(); toast('Removed','error');
}

function openAddUnit(subId) {
  document.getElementById('unit-sub-id').value = subId;
  openModal('modal-add-unit');
}

function addUnit() {
  const subId = document.getElementById('unit-sub-id').value;
  const name = document.getElementById('unit-name').value.trim();
  if(!name) { toast('Enter a unit name','error'); return; }
  const subs = DB.get('subjects');
  DB.set('subjects', subs.map(s=>{
    if(s.id!==subId) return s;
    return {...s, units:[...(s.units||[]), {id:uid(), name, topics:document.getElementById('unit-topics').value.trim(), status:'Not Started', revisions:0}]};
  }));
  closeModal('modal-add-unit');
  document.getElementById('unit-name').value = '';
  document.getElementById('unit-topics').value = '';
  toast('Unit added!');
  renderSyllabus();
}

function updateUnitStatus(subId, unitId, status) {
  const subs = DB.get('subjects');
  DB.set('subjects', subs.map(s=>{
    if(s.id!==subId) return s;
    return {...s, units:s.units.map(u=>u.id===unitId?{...u,status}:u)};
  }));
  renderSyllabus();
}

function addRevision(subId, unitId) {
  const subs = DB.get('subjects');
  DB.set('subjects', subs.map(s=>{
    if(s.id!==subId) return s;
    return {...s, units:s.units.map(u=>u.id===unitId?{...u,revisions:(u.revisions||0)+1}:u)};
  }));
  renderSyllabus();
  toast('Revision marked!');
}

// ===========================
// PROJECTS
// ===========================
function renderProjects() {
  const projs = DB.get('projects', []);
  const el = document.getElementById('projects-list');
  if(!projs.length) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:40px;margin-bottom:12px;">🏗</div><div style="color:var(--text2);">No projects yet. Create your first one!</div></div>`;
    return;
  }
  el.innerHTML = projs.map(p=>{
    const ms = p.milestones||[];
    const donems = ms.filter(m=>m.done).length;
    const progress = p.progress||0;
    const today_str = today();
    // Gantt visualization
    const ganttHTML = ms.length ? `
      <div style="margin-top:16px;">
        <div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-bottom:10px;">MILESTONE TIMELINE</div>
        ${ms.map(m=>{
          const daysLeft = m.deadline ? Math.ceil((new Date(m.deadline)-new Date())/(1000*60*60*24)) : null;
          const colors = ['var(--accent)','var(--cyan)','var(--green)','var(--yellow)','var(--pink)','var(--orange)'];
          const col = colors[ms.indexOf(m)%colors.length];
          return `<div class="gantt-row">
            <div class="gantt-label">${m.name}</div>
            <div class="gantt-track">
              <div class="gantt-bar" style="width:${m.done?100:Math.max(10,100-(daysLeft||50))}%;background:${m.done?'var(--green)':col};">
                ${m.done?'✓ Done':daysLeft!==null?`${daysLeft}d left`:''}
              </div>
            </div>
            <div style="width:60px;text-align:right;">
              <input type="checkbox" ${m.done?'checked':''} onchange="toggleMilestone('${p.id}','${m.id}',this.checked)" style="accent-color:var(--green);cursor:pointer;">
            </div>
          </div>`;
        }).join('')}
      </div>
    ` : '';
    return `
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div>
          <div style="font-size:16px;font-weight:700;color:#fff;">${p.name}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:4px;">${p.desc||''}</div>
          <div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:4px;">
            ${p.startDate?p.startDate:''} → ${p.endDate?p.endDate:'Open'} · ${donems}/${ms.length} milestones
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openAddMilestone('${p.id}')">+ Milestone</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProject('${p.id}')">Remove</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
        <div class="progress-bar" style="flex:1;"><div class="progress-fill ${progress>70?'green':progress>40?'yellow':''}" style="width:${progress}%"></div></div>
        <input type="range" value="${progress}" min="0" max="100"
          onchange="updateProjectProgress('${p.id}',this.value)"
          style="width:100px;accent-color:var(--accent);">
        <span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent);width:36px;">${progress}%</span>
      </div>
      ${ganttHTML}
    </div>`;
  }).join('');
}

function addProject() {
  const name = document.getElementById('proj-name').value.trim();
  if(!name) { toast('Enter a project name','error'); return; }
  DB.save('projects', {
    id:uid(), name, desc:document.getElementById('proj-desc').value.trim(),
    startDate:document.getElementById('proj-start').value,
    endDate:document.getElementById('proj-end').value,
    progress:0, milestones:[]
  });
  closeModal('modal-add-project');
  document.getElementById('proj-name').value = '';
  document.getElementById('proj-desc').value = '';
  toast('Project created!');
  renderProjects();
}

function deleteProject(id) { if(!confirm('Remove project?')) return; DB.del('projects',id); renderProjects(); toast('Removed','error'); }

function openAddMilestone(projId) {
  document.getElementById('ms-proj-id').value = projId;
  openModal('modal-add-milestone');
}

function addMilestone() {
  const projId = document.getElementById('ms-proj-id').value;
  const name = document.getElementById('ms-name').value.trim();
  if(!name) { toast('Enter a milestone name','error'); return; }
  const projs = DB.get('projects');
  DB.set('projects', projs.map(p=>{
    if(p.id!==projId) return p;
    return {...p, milestones:[...(p.milestones||[]), {id:uid(), name, deadline:document.getElementById('ms-deadline').value, blockers:document.getElementById('ms-blockers').value.trim(), done:false}]};
  }));
  closeModal('modal-add-milestone');
  document.getElementById('ms-name').value = '';
  document.getElementById('ms-deadline').value = '';
  document.getElementById('ms-blockers').value = '';
  toast('Milestone added!');
  renderProjects();
}

function toggleMilestone(projId, msId, done) {
  const projs = DB.get('projects');
  DB.set('projects', projs.map(p=>{
    if(p.id!==projId) return p;
    return {...p, milestones:p.milestones.map(m=>m.id===msId?{...m,done}:m)};
  }));
  renderProjects();
}

function updateProjectProgress(projId, val) {
  const projs = DB.get('projects');
  DB.set('projects', projs.map(p=>p.id===projId?{...p,progress:parseInt(val)}:p));
  renderProjects();
}

// ===========================
// POMODORO
// ===========================
let pomoState = { running:false, seconds:25*60, totalSeconds:25*60, mode:'FOCUS', interval:null, sessionCount:0, totalMin:0 };

function setPomoMode(mins, label) {
  if(pomoState.running) togglePomo();
  pomoState.seconds = mins*60;
  pomoState.totalSeconds = mins*60;
  pomoState.mode = label;
  document.getElementById('pomo-phase').textContent = label;
  updatePomoDisplay();
  updatePomoRing();
}

function togglePomo() {
  if(pomoState.running) {
    clearInterval(pomoState.interval);
    pomoState.running = false;
    document.getElementById('pomo-start-btn').textContent = '▶ Resume';
  } else {
    pomoState.running = true;
    document.getElementById('pomo-start-btn').textContent = '⏸ Pause';
    pomoState.interval = setInterval(()=>{
      pomoState.seconds--;
      if(pomoState.seconds<=0) {
        clearInterval(pomoState.interval);
        pomoState.running = false;
        if(pomoState.mode==='FOCUS') {
          pomoState.sessionCount++;
          const duration = Math.round(pomoState.totalSeconds/60);
          pomoState.totalMin += duration;
          const label = document.getElementById('pomo-label').value || 'Focus Session';
          DB.save('pomodoro', {id:uid(), label, duration, date:today(), ts:new Date().toISOString()});
          document.getElementById('pomo-count').textContent = pomoState.sessionCount;
          document.getElementById('pomo-total-min').textContent = pomoState.totalMin;
          renderPomoHistory();
          toast(`Session complete! +${duration}m`);
        } else {
          toast('Break over!');
        }
        document.getElementById('pomo-start-btn').textContent = '▶ Start';
        pomoState.seconds = 0;
      }
      updatePomoDisplay();
      updatePomoRing();
    }, 1000);
  }
}

function resetPomo() {
  clearInterval(pomoState.interval);
  pomoState.running = false;
  pomoState.seconds = pomoState.totalSeconds;
  document.getElementById('pomo-start-btn').textContent = '▶ Start';
  updatePomoDisplay();
  updatePomoRing();
}

function updatePomoDisplay() {
  const m = Math.floor(pomoState.seconds/60), s = pomoState.seconds%60;
  document.getElementById('pomo-display').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function updatePomoRing() {
  const circumference = 2*Math.PI*88;
  const offset = circumference * (1 - pomoState.seconds/pomoState.totalSeconds);
  document.getElementById('pomo-progress-ring').style.strokeDashoffset = circumference - offset;
}

function renderPomodoro() {
  renderPomoHistory();
  const sessions = DB.get('pomodoro',[]);
  pomoState.sessionCount = sessions.length;
  pomoState.totalMin = sessions.reduce((a,b)=>a+b.duration,0);
  document.getElementById('pomo-count').textContent = pomoState.sessionCount;
  document.getElementById('pomo-total-min').textContent = pomoState.totalMin;
}

function renderPomoHistory() {
  const sessions = DB.get('pomodoro',[]).slice().reverse().slice(0,20);
  const el = document.getElementById('pomo-history');
  if(!el) return;
  if(!sessions.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:20px;text-align:center;">No sessions yet</div>'; return; }
  el.innerHTML = sessions.map(s=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg3);border-radius:8px;margin-bottom:6px;border:1px solid var(--border);">
      <span style="font-size:16px;">🍅</span>
      <div style="flex:1;">
        <div style="font-size:13px;color:var(--text);">${s.label}</div>
        <div style="font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;">${s.date}</div>
      </div>
      <div style="font-size:12px;color:var(--accent);font-family:'JetBrains Mono',monospace;">${s.duration}m</div>
    </div>
  `).join('');
}

// ===========================
// GOALS
// ===========================
function renderGoals() {
  const goals = DB.get('goals', []);
  const probs = DB.get('dsa', []);
  const pomos = DB.get('pomodoro', []);
  const el = document.getElementById('goals-list');
  if(!goals.length) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:40px;"><div style="font-size:40px;margin-bottom:12px;">🎯</div><div style="color:var(--text2);">No goals set. Create your first goal!</div></div>`;
    return;
  }
  el.innerHTML = goals.map(g=>{
    let current = 0;
    if(g.type==='dsa') {
      current = g.deadline ? probs.filter(p=>p.date>=g.createdAt&&p.date<=g.deadline).length : probs.filter(p=>p.date>=g.createdAt).length;
    } else if(g.type==='pomodoro') {
      current = pomos.filter(p=>p.date>=g.createdAt).length;
    } else if(g.type==='study') {
      current = Math.floor(pomos.filter(p=>p.date>=g.createdAt).reduce((a,b)=>a+b.duration,0)/60);
    } else {
      current = g.current||0;
    }
    const pct = Math.min(100,Math.round(current/g.target*100));
    const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline)-new Date())/(1000*60*60*24)) : null;
    const done = pct>=100;
    const icons = {dsa:'⌨',study:'⏱',pomodoro:'🍅',custom:'✦'};
    return `
    <div class="card" style="margin-bottom:12px;border:1px solid ${done?'rgba(34,197,94,0.3)':'var(--border)'};">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:24px;">${icons[g.type]||'✦'}</span>
          <div>
            <div style="font-size:14px;font-weight:700;color:#fff;">${g.title}</div>
            <div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:2px;">
              ${current} / ${g.target} · ${daysLeft!==null?`${daysLeft}d left`:'No deadline'}
              ${done?' · ✓ COMPLETE':''}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          ${g.type==='custom'?`<button class="btn btn-ghost btn-sm" onclick="incrementGoal('${g.id}')">+1</button>`:''}
          <button class="btn btn-danger btn-sm" onclick="deleteGoal('${g.id}')">✕</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="progress-bar" style="flex:1;height:8px;">
          <div class="progress-fill ${done?'green':pct>60?'yellow':''}" style="width:${pct}%"></div>
        </div>
        <span style="font-size:12px;color:${done?'var(--green)':'var(--accent)'};font-family:'JetBrains Mono',monospace;width:40px;text-align:right;">${pct}%</span>
      </div>
    </div>`;
  }).join('');
}

function addGoal() {
  const title = document.getElementById('goal-title').value.trim();
  const target = parseInt(document.getElementById('goal-target').value);
  if(!title||!target) { toast('Fill all fields','error'); return; }
  DB.save('goals', {
    id:uid(), title, type:document.getElementById('goal-type').value,
    target, deadline:document.getElementById('goal-deadline').value,
    createdAt:today(), current:0
  });
  closeModal('modal-add-goal');
  document.getElementById('goal-title').value='';
  document.getElementById('goal-target').value='';
  toast('Goal set!');
  renderGoals();
}

function deleteGoal(id) { DB.del('goals',id); renderGoals(); toast('Goal removed','error'); }

function incrementGoal(id) {
  const goals = DB.get('goals');
  DB.set('goals', goals.map(g=>g.id===id?{...g,current:(g.current||0)+1}:g));
  renderGoals();
}

// ===========================
// INIT
// ===========================
initTopbar();
renderDashboard();
