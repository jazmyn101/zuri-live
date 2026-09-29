import { PoseCam } from './camera.js';
import { EX, setupTip, RepTracker, HoldTracker, MeasureTracker, MoveTracker } from './exercises.js';
import { SCAN, QUALITY, levelOf, describe, GOALS, readiness, focusAreas, buildPlan, seedTargets, buildSteps, minutes, progress, RESCAN_DAYS } from './program.js';
import { Figure } from './fig.js';
import { missingParts } from './geom.js';

/* ================= storage ================= */
const KEY = 'zuri-live.v1';
const blank = () => ({ scans: [], plan: null, T: {}, log: [], hist: {}, settings: { voice: true, beep: true, facing: 'user', photos: true } });
let D = blank();
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') D = Object.assign(blank(), s, { settings: Object.assign(blank().settings, s.settings || {}) }); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} };

const photoDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open('zuri-photos', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' });
        r.onsuccess = () => { this.db = r.result; res(this.db); };
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
  },
  async put(rec) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('p', 'readwrite'); tx.objectStore('p').put(rec); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
  async all() { const db = await this.open(); return new Promise((res, rej) => { const q = db.transaction('p').objectStore('p').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }); }
};

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const dkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fmt = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + pad(s % 60); };
const DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const daysSince = iso => Math.floor((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 864e5);
const latestScan = () => D.scans[D.scans.length - 1] || null;
const valText = (ex, v) => EX[ex].kind === 'hold' || EX[ex].kind === 'timed' ? v + 's' : v + ' reps';

const ICON = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="9" r="3"/><path d="M6 20c1-3.5 3.3-5 6-5s5 1.5 6 5"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16"/><circle cx="12" cy="8.5" r="2"/><path d="M12 10.5v5M9 12.5h6M10 20l2-4.5 2 4.5"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0014.5 4h-9A1.5 1.5 0 004 5.5v9A1.5 1.5 0 005.5 16H8"/></svg>'
};
const AVATAR = '<svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="40" fill="var(--surface2)"/><circle cx="40" cy="11" r="8" fill="var(--hair)"/><path d="M10 80C12 63 25 58 40 58s28 5 30 22z" fill="var(--shirt)"/><rect x="34" y="47" width="12" height="15" rx="5" fill="var(--skin)"/><ellipse cx="40" cy="36" rx="15" ry="17.5" fill="var(--skin)"/><path d="M24.5 35C23 15 57 15 55.5 35 51 26 29 26 24.5 35z" fill="var(--hair)"/><rect x="24" y="26" width="32" height="4.5" rx="2.2" fill="var(--accent)"/><ellipse class="eye" cx="34" cy="39" rx="1.9" ry="2.3" fill="var(--hair)"/><ellipse class="eye" cx="46" cy="39" rx="1.9" ry="2.3" fill="var(--hair)"/><path d="M30.5 34.5q3.5-2 7 0M42.5 34.5q3.5-2 7 0" stroke="var(--hair)" stroke-width="1.3" fill="none" stroke-linecap="round"/><path class="mouth-closed" d="M34 47q6 5 12 0" stroke="var(--hair)" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse class="mouth-open" cx="40" cy="48" rx="4.5" ry="2.6" fill="var(--hair)"/></svg>';
document.querySelectorAll('[data-av]').forEach(e => { e.innerHTML = AVATAR; });

/* ================= voice & sound ================= */
let voice = null;
function pickVoice() {
  if (voice || !('speechSynthesis' in window)) return voice;
  const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
  for (const n of ['Samantha', 'Aria', 'Jenny', 'Google UK English Female', 'Karen', 'Moira', 'Tessa', 'Serena', 'Female']) { const v = vs.find(x => x.name.includes(n)); if (v) return (voice = v); }
  return (voice = vs[0] || null);
}
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { voice = null; };
function speaking(on) { document.querySelectorAll('.avatar').forEach(a => a.classList.toggle('speaking', on)); }
/** Speak. Counts are short and never captioned; coaching lines go on screen too. */
function say(text, o = {}) {
  if (!text) return;
  if (!o.count) $('#lvCap').textContent = text;
  if (!D.settings.voice || !('speechSynthesis' in window)) return;
  try {
    if (o.interrupt !== false) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = o.rate || 1.05; const v = pickVoice(); if (v) u.voice = v;
    u.onstart = () => speaking(true); u.onend = u.onerror = () => speaking(false);
    speechSynthesis.speak(u);
  } catch (e) {}
}
let ac = null;
function beep(f = 880, d = 0.09, v = 0.12) {
  if (!D.settings.beep) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d); o.stop(ac.currentTime + d + 0.03);
  } catch (e) {}
}
function unlockAudio() { beep(660, 0.04, 0.03); try { if (D.settings.voice) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } } catch (e) {} }

/* ================= screens ================= */
const SCREENS = ['boot', 'welcome', 'home', 'results', 'summary', 'live'];
function show(id) { SCREENS.forEach(s => { $('#' + s).hidden = s !== id; }); if (id !== 'live') window.scrollTo(0, 0); }
function openSheet(id) { $('#' + id).hidden = false; }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { b.closest('.sheet').hidden = true; });

/* ================= home ================= */
let sel = new Date().getDay();
function streak() {
  let n = 0; const d = new Date(); d.setHours(12, 0, 0, 0);
  if (!D.hist[dkey(d)]) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) { const k = dkey(d); if (D.hist[k]) n++; else if (d.getDay() !== 0) break; d.setDate(d.getDate() - 1); }
  return n;
}
function homeLine() {
  const sc = latestScan(), dow = new Date().getDay();
  if (sc && daysSince(sc.date) >= RESCAN_DAYS) return 'It has been ' + daysSince(sc.date) + ' days since your last scan. Rescan this week and let us see what changed.';
  if (dow === 0) return 'Sunday. Full rest. No training, no screens. Come back tomorrow.';
  const last = D.log[D.log.length - 1];
  if (last && last.changes && last.changes.some(c => c.dir === 'up')) return 'Last time you earned a new target. Today we make it feel normal.';
  if (DN[dow] === 'Wednesday') return 'Easy day. Move, open up, breathe. This is where recovery happens.';
  return pick(['Phone up, side-on, and let me see you. I count, you move.', 'Two reps in the tank on every set. Strong, not wrecked.', 'Show up, move well, go home. That is the whole plan.']);
}
function renderHome() {
  if (!D.plan) { show('welcome'); return; }
  const h = new Date().getHours(), now = new Date();
  $('#greet').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', Jazzy';
  $('#hBubble').textContent = homeLine();
  // today
  const card = $('#todayCard');
  const chips = '<div class="row" style="flex-wrap:wrap;gap:6px">' + [1, 2, 3, 4, 5, 6].map(d => '<button class="ghostb" data-d="' + d + '" aria-pressed="' + (sel === d) + '" style="' + (sel === d ? 'background:var(--fg);color:var(--bg);border-color:var(--fg)' : '') + '">' + DN[d].slice(0, 3) + '</button>').join('') + '</div>';
  if (sel === 0) {
    card.innerHTML = '<div class="eyebrow">Today · Sunday</div><h2 class="disp">Rest day</h2><p class="muted">No workout, no screens. Recover like you train.</p><div class="eyebrow">Or train another day</div>' + chips;
  } else {
    const day = D.plan[sel], st = buildSteps(day, D.T);
    card.innerHTML = '<div><div class="eyebrow">' + (sel === now.getDay() ? 'Today · ' : '') + DN[sel] + '</div><h2 class="disp" style="margin-top:6px">' + esc(day.name) + '</h2></div>' +
      '<div class="meta"><span><b>' + minutes(st) + '</b> min</span><span><b>' + st.filter(s => s.kind === 'work').length + '</b> sets</span><span>' + day.tags.join(' · ') + '</span></div>' +
      '<button class="btn primary" id="btnStart">' + ICON.play + 'Start with Zuri</button>' +
      '<details><summary class="linkbtn" style="list-style:none;cursor:pointer;display:flex;align-items:center">See the full plan</summary><div class="loglist">' +
      day.blocks.map(b => '<div><b style="font-weight:600">' + esc(b.name) + '</b><span>' + (b.circuit ? b.circuit.rounds + ' rounds · ' + b.circuit.work + 's on, ' + b.circuit.rest + 's off' : b.items.map(it => EX[it.ex].name + ' ' + (it.sets > 1 ? it.sets + '×' : '') + valText(it.ex, (D.T[it.ex] || it).v)).join(' · ')) + '</span></div>').join('') +
      '</div></details><div class="eyebrow">Train a different day</div>' + chips;
    $('#btnStart').onclick = () => startSession(sel);
  }
  card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { sel = +b.dataset.d; renderHome(); });
  // week
  const monOff = (now.getDay() + 6) % 7, mon = new Date(now); mon.setHours(12, 0, 0, 0); mon.setDate(mon.getDate() - monOff);
  $('#week').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const k = dkey(d), done = !!D.hist[k], sun = d.getDay() === 0, today = i === monOff;
    return '<div class="wd"><span>' + 'SMTWTFS'[d.getDay()] + '</span><span class="dot' + (done ? ' done' : sun ? ' rest' : '') + (today ? ' today' : '') + '">' + (done ? ICON.check : sun ? ICON.moon : '') + '</span></div>';
  }).join('');
  // goals + focus
  const sc = latestScan();
  if (sc) {
    const rd = readiness(sc.levels);
    $('#goalCard').innerHTML = '<div class="row" style="justify-content:space-between"><div class="eyebrow">Goal readiness</div><span class="small muted">Scan ' + sc.date + (daysSince(sc.date) >= RESCAN_DAYS ? ' · rescan due' : ' · rescan in ' + (RESCAN_DAYS - daysSince(sc.date)) + ' days') + '</span></div>' +
      Object.keys(GOALS).map(g => '<div class="goal"><b>' + GOALS[g].name + '</b><span>' + rd[g] + '%</span><div class="meter"><i style="width:' + rd[g] + '%"></i></div></div>').join('');
    const fa = focusAreas(sc.levels);
    $('#focusCard').innerHTML = '<div class="eyebrow">What Zuri is working on</div>' + (fa.length ? fa.map(f => '<div class="focus"><b>' + f.name + '</b><p>' + f.why + '</p></div>').join('') : '<p class="muted">Everything scored strong. We push skill work now.</p>');
  }
  // targets: the skill moves in your plan
  const order = ['wall_handstand', 'pike_hold', 'lsit', 'tuck_lsit', 'support_hold', 'para_pushup', 'pushup', 'knee_pushup', 'pike_pushup', 'para_dip', 'hollow_hold', 'tuck_hollow', 'squat'];
  $('#tlist').innerHTML = order.filter(ex => D.T[ex]).slice(0, 6).map(ex => {
    const t = D.T[ex];
    return '<div class="trow"><b>' + EX[ex].name + '</b><span class="pips" aria-label="' + t.hits + ' of 2 sessions toward the next step"><i class="' + (t.hits >= 1 ? 'on' : '') + '"></i><i class="' + (t.hits >= 2 ? 'on' : '') + '"></i></span><span class="tv">' + valText(ex, t.v) + '</span></div>';
  }).join('');
  show('home');
}
$('#hSettings').innerHTML = ICON.gear;
$('#hPlan').innerHTML = ICON.plan + 'My week';
$('#hPhotos').innerHTML = ICON.photo + 'Progress photos';
$('#hScan').innerHTML = ICON.scan + 'Rescan';
$('#hCopy').innerHTML = ICON.copy + 'Copy for Coach Zuri';
$('#hPlan').onclick = () => { renderPlanSheet(); openSheet('planSheet'); };
$('#hPhotos').onclick = () => { renderPhotos(); openSheet('photoSheet'); };
$('#hScan').onclick = () => startScan();
$('#hCopy').onclick = () => copyText(zuriSummary(), '#hCopied');
$('#hSettings').onclick = () => { renderSettings(); openSheet('setSheet'); };
$('#wScan').onclick = () => { D.settings.photos = $('#wPhotos').checked; save(); startScan(); };

function renderPlanSheet() {
  const sc = latestScan();
  $('#planNote').textContent = 'Built from your ' + (sc ? sc.date : '') + ' scan. Each set should end with about two reps left in you. Wednesday is an easy day, Sunday is rest.';
  $('#planDays').innerHTML = [1, 2, 3, 4, 5, 6].map(d => {
    const day = D.plan[d], st = buildSteps(day, D.T);
    return '<div class="card plan-day"><div class="eyebrow">' + DN[d] + ' · ' + minutes(st) + ' min</div><h3>' + esc(day.name) + '</h3>' +
      day.blocks.map(b => '<p><b style="color:var(--fg)">' + esc(b.name) + ':</b> ' + (b.circuit ? b.circuit.rounds + ' rounds of ' + b.circuit.items.map(e => EX[e].name).join(', ') + ' (' + b.circuit.work + 's on, ' + b.circuit.rest + 's off)' : b.items.map(it => EX[it.ex].name + ' ' + it.sets + '×' + valText(it.ex, (D.T[it.ex] || it).v)).join(', ')) + '</p>').join('') + '</div>';
  }).join('') + '<div class="card plan-day"><div class="eyebrow">Sunday</div><h3>Rest</h3><p>No training, no screens.</p></div>';
}
async function renderPhotos() {
  const body = $('#photoBody');
  let all = [];
  try { all = await photoDB.all(); } catch (e) {}
  if (!all.length) { body.innerHTML = '<p class="muted">No photos yet. They are taken during a body scan when photos are switched on.</p>'; return; }
  const dates = [...new Set(all.map(p => p.date))].sort();
  const pickP = (d, v) => all.find(p => p.date === d && p.view === v);
  const first = dates[0], last = dates[dates.length - 1];
  const fig = (p, cap) => '<figure>' + (p ? '<img alt="' + esc(cap) + '" src="' + URL.createObjectURL(p.blob) + '">' : '<img alt="">') + '<figcaption>' + esc(cap) + '</figcaption></figure>';
  body.innerHTML = ['front', 'side'].map(v => '<div class="card"><div class="eyebrow">' + (v === 'front' ? 'Front' : 'Side') + '</div><div class="photos">' + fig(pickP(first, v), 'First · ' + first) + fig(pickP(last, v), (first === last ? 'Same scan' : 'Latest · ' + last)) + '</div></div>').join('');
}
function renderSettings() {
  $('#sVoice').checked = D.settings.voice; $('#sBeep').checked = D.settings.beep;
  $('#sCam').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === D.settings.facing));
}
$('#sVoice').onchange = e => { D.settings.voice = e.target.checked; save(); };
$('#sBeep').onchange = e => { D.settings.beep = e.target.checked; save(); };
$('#sCam').querySelectorAll('button').forEach(b => b.onclick = () => { D.settings.facing = b.dataset.v; save(); renderSettings(); });
$('#sBackup').onclick = () => copyText(JSON.stringify(D), '#sDataMsg', 'Backup copied. Paste it into your notes to keep it safe.');
$('#sRestore').onclick = () => {
  const box = $('#sRestoreBox');
  if (box.hidden) { box.hidden = false; box.focus(); return; }
  try { const d = JSON.parse(box.value); if (!d || !Array.isArray(d.scans)) throw 0; D = Object.assign(blank(), d); save(); $('#sDataMsg').textContent = 'Restored.'; box.value = ''; box.hidden = true; renderHome(); }
  catch (e) { $('#sDataMsg').textContent = 'That did not look like a Zuri backup. Paste the whole thing, then tap Restore again.'; }
};
async function copyText(text, statusSel, okMsg) {
  try { await navigator.clipboard.writeText(text); $(statusSel).textContent = okMsg || 'Copied. Paste it into your chat with Coach Zuri in Claude.'; }
  catch (e) { $(statusSel).textContent = 'Your browser blocked copying. Try again.'; }
}
function zuriSummary() {
  const sc = latestScan(), lines = ['Update from Zuri Live (my camera coach):'];
  if (sc) { lines.push('Body scan ' + sc.date + ': ' + Object.keys(QUALITY).map(k => QUALITY[k].name + ' level ' + sc.levels[k] + ' (' + describe(k, sc.results[k]) + ')').join('; ') + '.'); }
  lines.push('Current targets: ' + Object.keys(D.T).map(ex => EX[ex].name + ' ' + valText(ex, D.T[ex].v)).join(', ') + '.');
  D.log.slice(-7).forEach(s => lines.push(s.date + ' ' + s.name + (s.completed ? '' : ' (ended early)') + ': ' + s.mins + ' min, ' + s.full + '/' + s.total + ' sets full.' + (s.short.length ? ' Short: ' + s.short.join(', ') + '.' : '') + (s.changes.length ? ' Targets: ' + s.changes.map(c => EX[c.ex].name + ' ' + c.from + '→' + c.to).join(', ') + '.' : '') + (s.faults.length ? ' Form notes: ' + s.faults.join('; ') + '.' : '')));
  return lines.join('\n');
}

/* ================= live engine ================= */
const cam = new PoseCam($('#vid'), $('#cam'));
const fig = new Figure($('#lvFig'));
let L = null;          // the current live run
let wake = null;
async function lockScreen() { try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (!L) return; if (document.visibilityState === 'visible') lockScreen(); else if (!L.paused) pause(); });

async function openLive(steps, meta) {
  unlockAudio();
  show('live');
  $('#lvPause').hidden = true; $('#lvStatus').hidden = true; $('#lvRest').hidden = true;
  $('#lvLoad').hidden = false; $('#lvLoadTitle').textContent = 'Waking Zuri up'; $('#lvLoadMsg').textContent = 'The first time takes a little longer.';
  L = Object.assign({ steps, i: -1, t: 0, total: 0, paused: false, log: {}, res: {}, trk: null, trk2: null, f: null, lostFor: 0, sideFor: 0, said: {}, frames: 0 }, meta);
  try {
    if (window.__zuriSim) cam.startSim(window.__zuriSim);
    else {
      await cam.load(meta.kind === 'scan' ? 'heavy' : 'full', m => { $('#lvLoadMsg').textContent = m; });
      $('#lvLoadMsg').textContent = 'Starting the camera…';
      await cam.start(D.settings.facing);
    }
  } catch (e) {
    $('#lvLoadTitle').textContent = 'Zuri can\'t see you yet';
    $('#lvLoadMsg').innerHTML = (e && e.name === 'NotAllowedError' ? 'Camera access was blocked. On iPhone go to Settings, Safari, Camera, and choose Allow. Then come back and tap Start again.' : 'The camera or the tracking model did not start. Check your connection the first time you open Zuri, then try again.') + '<br><br><button class="btn primary" id="lvBack" style="margin-inline:auto">Back home</button>';
    $('#lvBack').onclick = () => { closeLive(); renderHome(); };
    return;
  }
  $('#lvLoad').hidden = true;
  lockScreen();
  cam.onFrame = onFrame;
  L.last = performance.now();
  L.timer = setInterval(tick, 100);
  (function anim() { if (!L) return; if (!$('#lvRest').hidden) fig.frame(); requestAnimationFrame(anim); })();
  say(meta.opener);
  next();
}
function closeLive() {
  if (L && L.timer) clearInterval(L.timer);
  L = null; cam.onFrame = null; cam.stop(); cam.sim = null;
  try { if (wake) wake.release(); } catch (e) {}
  try { speechSynthesis.cancel(); } catch (e) {} speaking(false);
}

const step = () => L && L.steps[L.i];
function next() {
  if (!L) return;
  L.i++; L.t = 0; L.said = {}; L.trk = L.trk2 = null; L.lostFor = 0; L.sideFor = 0; L.count = 0; L.steady = 0;
  const s = step();
  if (!s) return finishLive();
  cam.tint = null;
  if (s.kind === 'rest') {
    const w = s.next, e = EX[w.ex] || {};
    const lead = s.label === 'Get ready' ? 'First up, ' : s.label === 'Next block' ? 'New block, ' + w.block + '. ' : s.label === 'Round rest' ? 'Round ' + w.round + ' of ' + w.rounds + '. Breathe. ' : s.label === 'Transition' ? 'Up next, ' : '';
    const line = s.intro || (s.label === 'Rest' && w.sets > 1 && !w.round ? pick(['Rest. Breathe through the nose.', 'Shake it out.', 'Good. Recover.']) + ' Set ' + w.setNo + ' of ' + w.sets + ' next.' : lead + e.name + '. ' + targetText(w) + e.cue);
    say(line);
  } else if (s.kind === 'work') {
    const e = EX[s.ex];
    if (s.mode === 'reps') L.trk = new RepTracker(e, s.target);
    else if (s.mode === 'hold') L.trk = new HoldTracker(e, s.target);
    else if (s.mode === 'timed') { if (e.move) L.trk2 = new MoveTracker(); if (e.kind === 'reps') L.trk = new RepTracker(e, 0); }
    else if (s.mode === 'measure') L.trk = new MeasureTracker(e);
    else if (s.mode === 'maxreps') { L.trk = new RepTracker(EX.pushup, 0); L.trk2 = new RepTracker(EX.knee_pushup, 0); }
    else if (s.mode === 'maxhold') { if (s.test === 'inversion') { L.trk = new HoldTracker(EX.wall_handstand, 0); L.trk2 = new HoldTracker(EX.pike_hold, 0); } else L.trk = new HoldTracker(e, 0); }
    else if (s.mode === 'timedreps') L.trk = new RepTracker(EX.squat, 0);
    if (s.mode === 'tempo') say('Go. I will count.', { rate: 1.1 });
    else if (s.mode === 'hold' || s.mode === 'maxhold') say(pick(['Get into position. The clock starts when I see you set.', 'Set up. I start timing when you are in position.']), { rate: 1.1 });
    else if (s.mode === 'reps' || s.mode === 'maxreps') say(pick(['Go when you are ready. I am counting.', 'Your set. I count every good rep.']), { rate: 1.1 });
    else if (s.mode === 'timed' || s.mode === 'timedreps') say('Go!', { rate: 1.1 });
    else if (s.mode === 'measure') say('Get into it and hold still for me.', { rate: 1.1 });
    beep(1200, 0.16, 0.12);
  } else if (s.kind === 'setup') say(s.text);
  else if (s.kind === 'photo') say(s.view === 'front' ? 'Photo time. Face me, stand tall, arms relaxed by your sides.' : 'Now turn side-on to me. Stand tall.');
  renderStatic();
}
const targetText = w => w.mode === 'reps' || w.mode === 'tempo' ? w.target + ' reps. ' : w.mode === 'hold' || w.mode === 'timed' ? w.target + ' seconds. ' : '';

function renderStatic() {
  const s = step(); if (!s) return;
  const w = s.kind === 'rest' ? s.next : s;
  $('#lvBlock').textContent = L.kind === 'scan' ? 'Body scan' : (w.block || '');
  $('#lvSet').textContent = s.kind === 'setup' || s.kind === 'photo' ? 'Set up' : L.kind === 'scan' ? 'Test ' + w.setNo + ' of ' + w.sets : w.round ? 'Round ' + w.round + ' of ' + w.rounds : w.sets > 1 ? 'Set ' + w.setNo + ' of ' + w.sets : '';
  const resting = s.kind === 'rest' || s.kind === 'setup' || s.kind === 'photo';
  $('#lvRest').hidden = !resting;
  if (resting) {
    const id = s.kind === 'setup' || s.kind === 'photo' ? 'stand' : (w.test || w.ex);
    fig.show(id);
    $('#lvFig').hidden = s.kind === 'setup' || s.kind === 'photo';
    $('#lvRest').style.justifyContent = s.kind === 'setup' ? 'flex-start' : '';
    $('#lvTip').textContent = s.kind === 'setup' ? s.tip : s.kind === 'photo' ? 'Hold still for a moment and I take the photo.' : ((EX[w.ex] && EX[w.ex].cam) || w.test ? setupTip(w.ex) : 'No camera needed for this one. Just listen for my count.');
  }
  $('#lvName').textContent = s.kind === 'rest' ? 'Up next: ' + (w.title || EX[w.ex].name) : s.kind === 'setup' ? 'Let me see you' : s.kind === 'photo' ? (s.view === 'front' ? 'Front photo' : 'Side photo') : (w.title || EX[w.ex].name);
  const ph = $('#lvPhase');
  ph.className = 'lv-phase' + (s.kind === 'work' ? ' work' : '');
  ph.textContent = s.kind === 'rest' ? s.label : s.kind === 'setup' ? 'Setup' : s.kind === 'photo' ? 'Photo' : ({ reps: 'Reps', hold: 'Hold', tempo: 'Follow my count', timed: 'Go', measure: 'Measuring', maxreps: 'Max reps', maxhold: 'Max hold', timedreps: 'As many as you can' })[s.mode];
}

/* Setup checklist: can Zuri see all of you, at a good size, in decent light? */
function framing(f) {
  const out = { head: false, hands: false, hips: false, feet: false, size: null, dark: false, ready: false, fix: null };
  if (f && f.ok) {
    const vis = i => f.P[i].v > 0.6 && f.P[i].inX && f.P[i].inY;
    out.head = vis(0) || vis(7) || vis(8);
    out.hands = vis(15) || vis(16);
    out.hips = vis(23) || vis(24);
    out.feet = vis(27) || vis(28);
    const top = Math.min(f.P[0].y, f.P[11].y), bottom = Math.max(f.P[27].y, f.P[28].y);
    out.size = bottom - top;                          // share of the picture height you fill, standing
  }
  const light = cam.light;
  out.dark = light != null && light < 55;
  const all = out.head && out.hands && out.hips && out.feet;
  out.sizeOk = out.size != null && out.size > 0.4 && out.size < 0.95;
  out.ready = all && out.sizeOk;
  out.fix = !f || !f.ok ? 'I can\'t see you yet. Step into the picture, about two metres from the phone.'
    : !out.feet ? 'Step back a little. I need to see your feet.'
    : !out.head ? 'Move so your head is in the picture too.'
    : !out.hands ? 'Keep your arms in the picture.'
    : out.size != null && out.size <= 0.4 ? 'Come a bit closer. You should fill about two thirds of the screen height.'
    : out.size != null && out.size >= 0.95 ? 'Step back a little. Leave some space above your head and below your feet.'
    : out.dark ? 'It is a bit dark. Face a window or turn a light on so I can see you sharply.' : null;
  return out;
}
function renderChecks(c) {
  const item = (ok, label) => '<span style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-weight:700;font-size:15px;background:' + (ok ? '#4CCB8B' : 'rgba(255,255,255,.14)') + ';color:' + (ok ? '#04160C' : '#F3F7F4') + '">' + (ok ? '✓' : '·') + ' ' + label + '</span>';
  $('#lvTip').innerHTML = '<div style="background:rgba(7,16,12,.72);border-radius:16px;padding:10px 12px"><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:8px">' + item(c.head, 'Head') + item(c.hands, 'Hands') + item(c.hips, 'Hips') + item(c.feet, 'Feet') + item(c.sizeOk, 'Distance') + item(!c.dark, 'Light') + '</div>' + esc(c.fix || 'Hold still…') + '</div>';
}

/* frames feed the trackers */
function onFrame(f, t) {
  if (!L || L.paused) return;
  L.f = f; L.frames++;
  const s = step(); if (!s) return;
  if (s.kind === 'setup' || s.kind === 'photo') return;
  if (s.kind !== 'work') return;
  const ev = [];
  if (L.trk) L.trk.update(f, t).forEach(e => ev.push([e, L.trk]));
  if (L.trk2) L.trk2.update(f, t).forEach(e => ev.push([e, L.trk2]));
  ev.forEach(([e, tr]) => handleEvent(s, e, tr));
}
function handleEvent(s, e, tr) {
  if (e.type === 'rep') {
    if (s.mode === 'maxreps') { const n = Math.max(L.trk.reps, L.trk2.reps); if (tr.reps < n) return; }
    beep(700, 0.05, 0.07);
    const n = tr.reps, left = s.target ? s.target - n : 99;
    if (e.cue) say(n + '. ' + e.cue, { rate: 1.12 });
    else if (s.target && left === 0) say(n + '. Done!', { rate: 1.12 });
    else if (s.target && left === 2 && s.target > 5) say(n + '. Two more.', { rate: 1.12 });
    else say(String(n), { count: true, rate: 1.2 });
    if (s.mode === 'reps' && s.target && n >= s.target) endWork('full', n);
  } else if (e.type === 'start') {
    if (s.mode === 'maxhold' && s.test === 'inversion' && !L.inv) { L.inv = tr === L.trk ? 'handstand' : 'pike'; if (tr === L.trk) L.trk2 = null; else { L.trk = L.trk2; L.trk2 = null; } }
    if (tr !== L.trk) return;
    beep(1000, 0.1, 0.1); say(pick(['Holding. Breathe.', 'Clock is running. Stay strong.', 'That is it. Hold.']), { rate: 1.1 });
  } else if (e.type === 'drop') {
    if (tr !== L.trk) return;
    const held = Math.round(e.held);
    if (s.mode === 'maxhold') endWork('max', held);
    else endWork(held >= s.target ? 'full' : 'short', held);
  } else if (e.type === 'cue') {
    if (tr !== L.trk && !(s.mode === 'timed')) return;
    say(e.text, { rate: 1.1 });
  } else if (e.type === 'done' && s.mode === 'measure') {
    endWork('measured', e.value, e.extra);
  }
}

/* the clock: rests, holds, timeouts and the screen */
function tick() {
  if (!L) return;
  const now = performance.now(), dt = Math.min(0.5, (now - L.last) / 1000) * (window.__zuriSpeed || 1); L.last = now;
  if (L.paused) return;
  const s = step(); if (!s) return;
  L.t += dt; L.total += dt;
  const t = L.t;
  if (s.kind === 'rest') {
    const rem = s.dur - t;
    if (rem <= 10.05 && s.dur > 25 && !L.said.ten) { L.said.ten = 1; say(pick(['Ten seconds. Get set.', 'Ten seconds. Get into position.'])); }
    for (let c = 3; c >= 1; c--) if (rem <= c && !L.said['b' + c]) { L.said['b' + c] = 1; beep(880, 0.09); }
    if (t >= s.dur) return next();
  } else if (s.kind === 'setup') {
    const c = framing(L.f);
    renderChecks(c);
    const allSeen = c.head && c.hands && c.hips && c.feet;
    L.steady = (c.ready || (allSeen && t > 20)) ? L.steady + dt : 0;   // distance is advice, not a wall
    if (L.steady > 2) { say(c.dark ? 'I can see all of you. More light would make me even more accurate.' : 'Perfect. I can see all of you clearly.'); return next(); }
    if (t > 6 && c.fix && (!L.said.fixAt || L.total - L.said.fixAt > 9)) { L.said.fixAt = L.total; say(c.fix); }
  } else if (s.kind === 'photo') {
    const f = L.f, vis = f && f.ok && missingParts(f, ['ear', 'sh', 'hip', 'kn', 'an']).length === 0;
    const right = vis && (s.view === 'front' ? f.shoulderSpread > 0.5 : f.shoulderSpread < 0.4);
    L.steady = right ? L.steady + dt : Math.max(0, L.steady - dt);
    if (L.steady > 1 && !L.said.c3) { L.said.c3 = 1; L.snapAt = t + 2.2; say('Three, two, one.'); }
    if (L.snapAt && t >= L.snapAt) { takePhoto(s.view); L.snapAt = null; return next(); }
    if (t > 30) return next();
  } else if (s.kind === 'work') {
    workTick(s, t);
    if (!L || step() !== s) return;
    visibilityCheck(s, dt);
  }
  renderLive(s, t);
}
function workTick(s, t) {
  const tr = L.trk;
  if (s.mode === 'reps') {
    const since = tr.lastRepT != null && L.f ? L.f.t - tr.lastRepT : 0;
    if (tr.reps > 0 && ((since > 8 && tr.state === 'up') || since > 15)) return endWork(tr.reps >= s.target ? 'full' : 'short', tr.reps);
    if (tr.reps === 0 && t > 25 && !L.said.nudge) { L.said.nudge = 1; say('Whenever you are ready. Side-on to me, so I can count.'); }
    if (tr.reps === 0 && t > 90) return endWork('skipped', 0);
  } else if (s.mode === 'hold') {
    if (tr.held >= s.target) { say(pick(['Time! Well held.', 'Time. That is the standard.'])); return endWork('full', s.target); }
    if (!tr.holding && t > 25 && !L.said.nudge) { L.said.nudge = 1; say('Get into position when you are ready. The clock waits for you.'); }
    if (!tr.holding && t > 120) return endWork('skipped', 0);
    const rem = s.target - tr.held;
    if (tr.holding && s.target >= 20 && rem <= 10 && !L.said.ten) { L.said.ten = 1; say('Ten seconds. Stay with me.'); }
    if (tr.holding && s.target >= 25 && tr.held >= s.target / 2 && !L.said.half) { L.said.half = 1; say(pick(['Halfway.', 'Half done. Breathe.'])); }
  } else if (s.mode === 'tempo') {
    const tempo = EX[s.ex].tempo || 3, n = Math.floor((t - 1) / tempo) + 1;
    if (t >= 1 && n > L.count && n <= s.target) { L.count = n; beep(700, 0.05, 0.07); say(n === s.target ? n + '. Done.' : String(n), { count: n !== s.target, rate: 1.2 }); }
    if (t >= 1.5 + s.target * tempo) return endWork('full', s.target);
  } else if (s.mode === 'timed') {
    const rem = s.target - t;
    if (s.target >= 30 && rem <= 10 && !L.said.ten) { L.said.ten = 1; say('Ten seconds. Finish strong.'); }
    for (let c = 3; c >= 1; c--) if (rem <= c && !L.said['b' + c]) { L.said['b' + c] = 1; beep(880, 0.09); }
    if (t >= s.target) { say(pick(['Time.', 'Time. Good work.'])); return endWork('full', s.target, null, tr ? tr.reps : null); }
  } else if (s.mode === 'measure') {
    if (t > 40) return endWork('measured', tr.best, tr.bestExtra);
  } else if (s.mode === 'maxreps') {
    const a = L.trk, b = L.trk2, n = Math.max(a.reps, b.reps), lastT = Math.max(a.lastRepT || 0, b.lastRepT || 0);
    if (n > 0 && L.f && L.f.t - lastT > 6) return endWork('max', n);
    if (n >= s.cap) return endWork('max', n);
    if (n === 0 && t > 60) return endWork('max', 0);
  } else if (s.mode === 'maxhold') {
    if (tr.held >= s.cap) { say('Time! That is the max. Come down.'); return endWork('max', s.cap); }
    if (!tr.holding && !(L.trk2 && L.trk2.holding) && t > 50) return endWork('max', 0);
  } else if (s.mode === 'timedreps') {
    const rem = s.target - t;
    if (rem <= 10 && !L.said.ten) { L.said.ten = 1; say('Ten seconds! Keep going.'); }
    if (t >= s.target) { say('Time!'); return endWork('max', tr.reps); }
  }
}
function visibilityCheck(s, dt) {
  const e = EX[s.test === 'inversion' ? 'wall_handstand' : s.ex];
  const cams = e && e.cam && s.mode !== 'timed' && s.mode !== 'tempo';
  const tr = L.trk;
  let msg = null;
  if (cams && tr) {
    if (!L.f || !L.f.ok) msg = 'I can\'t see you. Step into the picture.';
    else if (tr.visible === false && tr.missing && tr.missing.length) {
      const m = tr.missing;
      msg = m.includes('an') || m.includes('kn') ? 'Step back. I can\'t see your feet.' : m.includes('wr') || m.includes('el') ? 'I can\'t see your arms. Turn side-on.' : m.includes('ear') ? 'Turn your head a little. I need to see your ear and shoulder.' : 'Move so I can see all of you.';
    } else if (e.view === 'side' && L.f.shoulderSpread > 0.6 && !(tr.holding || tr.state === 'down')) L.sideFor += dt;
    else L.sideFor = 0;
    if (L.sideFor > 3) msg = 'Turn side-on to me.';
  }
  L.lostFor = msg ? L.lostFor + dt : 0;
  const showIt = L.lostFor > 1.2;
  $('#lvStatus').hidden = !showIt;
  if (showIt) { $('#lvStatus').textContent = msg; if (!L.said.lost || L.total - L.said.lost > 10) { L.said.lost = L.total; say(msg, { rate: 1.1 }); } }
  cam.tint = showIt ? '#FF8A78' : (tr && (tr.holding || tr.inPos) ? '#4CCB8B' : null);
}
function renderLive(s, t) {
  $('#lvClock').textContent = fmt(L.total);
  const doneDur = L.steps.slice(0, L.i).reduce((a, x) => a + (x.dur || 0), 0), all = L.steps.reduce((a, x) => a + (x.dur || 0), 0) || 1;
  $('#lvProg').style.width = Math.min(100, (doneDur + Math.min(t, s.dur || 0)) / all * 100).toFixed(1) + '%';
  let num = '', of = '';
  const tr = L.trk;
  if (s.kind === 'rest') { num = Math.max(0, Math.ceil(s.dur - t)); of = 'sec'; }
  else if (s.kind === 'setup' || s.kind === 'photo') { num = ''; of = ''; }
  else if (s.mode === 'reps') { num = tr.reps; of = '/ ' + s.target; }
  else if (s.mode === 'hold') { num = tr.holding ? Math.max(0, Math.ceil(s.target - tr.held)) : s.target; of = tr.holding ? 'sec' : 'sec · get set'; }
  else if (s.mode === 'tempo') { num = L.count; of = '/ ' + s.target; }
  else if (s.mode === 'timed') { num = Math.max(0, Math.ceil(s.target - t)); of = tr && tr.reps ? 'sec · ' + tr.reps + ' reps' : 'sec'; }
  else if (s.mode === 'measure') { num = tr.best == null ? '–' : (s.test === 'fold_test' ? '' : Math.round(tr.best)); of = tr.best == null ? 'get into it' : s.test === 'reach_test' ? '°' : s.test === 'squat_test' ? '° knee' : 'hold'; }
  else if (s.mode === 'maxreps') { num = Math.max(tr.reps, L.trk2.reps); of = num === 1 ? 'rep' : 'reps'; }
  else if (s.mode === 'maxhold') { const h = (L.trk2 && !L.inv) ? Math.max(tr.held, L.trk2.held) : tr.held; num = Math.floor(h); of = (tr.holding || (L.trk2 && L.trk2.holding)) ? 'sec' : 'sec · get set'; }
  else if (s.mode === 'timedreps') { num = tr.reps; of = Math.max(0, Math.ceil(s.target - t)) + 's left'; }
  $('#lvNum').textContent = num; $('#lvOf').textContent = of;
  if (s.kind === 'work' && (s.mode === 'hold' || s.mode === 'maxhold')) $('#lvPhase').className = 'lv-phase ' + ((tr.holding || (L.trk2 && L.trk2.holding)) ? 'hold' : 'work');
}

/* ending a piece of work */
function endWork(how, value, extra, reps) {
  const s = step(); if (!s || s.kind !== 'work') return;
  const tr = L.trk;
  if (L.kind === 'scan') {
    const r = { value: value == null ? null : Math.round(value * 100) / 100 };
    if (extra) r.extra = extra;
    if (s.mode === 'maxreps') r.variant = L.trk2.reps > L.trk.reps ? 'knees' : 'full';
    if (s.test === 'inversion') r.variant = L.inv === 'handstand' ? 'handstand' : 'pike';
    L.res[s.key] = r;
    say(scanLine(s, r), { rate: 1.05 });
  } else {
    const faults = tr && tr.faults ? Object.keys(tr.faults) : [];
    L.log[L.i] = { ex: s.ex, block: s.block, setNo: s.setNo, sets: s.sets, round: s.round || 0, mode: s.mode, target: s.target, done: Math.max(0, Math.min(s.target, Math.round(value || 0))), how, faults, reps: reps == null ? undefined : reps };
    if (how === 'short') say(s.mode === 'hold' ? Math.round(value) + ' seconds. Logged. That is today\'s number.' : Math.round(value) + ' reps. Logged. Next time, one more.');
    else if (how === 'full' && s.mode === 'reps') say(pick(['Good set.', 'Clean. Rest up.', 'Solid.']) + (faults.length ? ' Next set: ' + faults[0].toLowerCase() : ''));
  }
  beep(1000, 0.22, 0.12);
  next();
}
function scanLine(s, r) {
  if (r.value == null) return 'I could not measure that one. We move on.';
  switch (s.key) {
    case 'shoulders': return 'Got it. ' + Math.round(r.value) + ' degrees overhead.';
    case 'flex': return 'Got it. ' + describe('flex', r) + '.';
    case 'squatMob': return 'Got it. ' + (r.extra && r.extra.hipBelow ? 'Hips below the knees. Nice.' : 'Noted.');
    case 'push': return r.value + (r.variant === 'knees' ? ' knee push-ups.' : ' push-ups.') + ' Nice work.';
    case 'legs': return r.value + ' squats. Shake the legs out.';
    default: return r.value ? Math.round(r.value) + ' seconds. Good.' : 'That is okay. We build it from here.';
  }
}
async function takePhoto(view) {
  const fl = $('#lvFlash'); fl.classList.add('on'); setTimeout(() => fl.classList.remove('on'), 60);
  beep(1400, 0.06, 0.1);
  if (window.__zuriSim) { L.photos = (L.photos || 0) + 1; return; }
  try { const blob = await cam.snapshot(); if (blob) { await photoDB.put({ id: L.date + '-' + view, date: L.date, view, blob }); L.photos = (L.photos || 0) + 1; } } catch (e) {}
}

/* pause, skip, end */
function pause() {
  if (!L || L.paused) return;
  L.paused = true; try { speechSynthesis.cancel(); } catch (e) {} speaking(false);
  const s = step();
  $('#pDone').hidden = !(s && s.kind === 'work' && L.kind !== 'scan' && s.mode !== 'tempo' && s.mode !== 'timed');
  $('#pSkip').textContent = s && s.kind === 'rest' ? 'Skip the rest' : 'Skip this';
  $('#pEnd').textContent = L.kind === 'scan' ? 'End the scan' : 'End and save';
  $('#lvPause').hidden = false;
}
function resume() { if (!L) return; L.paused = false; L.last = performance.now(); $('#lvPause').hidden = true; say('Back at it.'); }
$('#live').addEventListener('click', e => { if (!L || !L.timer) return; if (e.target.closest('#lvPause') || e.target.closest('#lvEnd') || e.target.closest('#lvLoad')) return; pause(); });
$('#lvEnd').onclick = e => { e.stopPropagation(); pause(); };
$('#pResume').onclick = resume;
$('#pDone').onclick = () => { const s = step(); resume(); if (s && s.kind === 'work') endWork('full', s.target); };
$('#pSkip').onclick = () => {
  const s = step(); L.paused = false; L.last = performance.now(); $('#lvPause').hidden = true;
  if (s && s.kind === 'work') { if (L.kind === 'scan') endWork('skipped', null); else endWork('skipped', 0); } else next();
};
$('#pEnd').onclick = () => { if (!L) return; L.ended = true; finishLive(); };

function finishLive() {
  if (!L) return;
  const run = L;
  closeLive();
  if (run.kind === 'scan') finishScan(run); else finishSession(run);
}

/* ================= sessions ================= */
function startSession(dayKey) {
  const day = D.plan[dayKey];
  const steps = buildSteps(day, D.T);
  openLive(steps, { kind: 'session', dayKey, date: dkey(new Date()), started: new Date(), opener: 'Alright Jazzy. ' + day.name + '. Phone on its side, step back so I can see all of you. I count, you move.' });
}
function finishSession(run) {
  const sets = Object.keys(run.log).sort((a, b) => a - b).map(k => run.log[k]);
  const completed = !run.ended;
  const mins = Math.max(1, Math.round(run.total / 60));
  const worked = sets.filter(s => s.how !== 'skipped');
  let changes = [];
  if (worked.length) {
    const r = progress(D.T, sets); D.T = r.T; changes = r.changes;
    const date = run.date, day = D.plan[run.dayKey];
    const faults = {}; sets.forEach(s => (s.faults || []).forEach(f => { faults[f] = (faults[f] || 0) + 1; }));
    D.log.push({ date, day: DN[run.started.getDay()], name: day.name, completed, mins, full: sets.filter(s => s.how === 'full').length, total: sets.length,
      short: sets.filter(s => s.how === 'short').map(s => EX[s.ex].name + ' ' + s.done + '/' + s.target), changes, faults: Object.keys(faults).sort((a, b) => faults[b] - faults[a]).slice(0, 3), sets });
    D.log = D.log.slice(-90);
    if (completed) D.hist[date] = true;
    save();
  }
  // summary screen
  const day = D.plan[run.dayKey];
  $('#sDay').textContent = day.name;
  $('#sTitle').textContent = completed ? 'Done. That was work.' : 'Saved what you did.';
  const main = sets.filter(s => s.block !== 'Warm-up' && s.block !== 'Cool-down');
  $('#sMin').textContent = mins; $('#sFull').textContent = main.filter(s => s.how === 'full').length + '/' + main.length; $('#sStreak').textContent = streak();
  const ups = changes.filter(c => c.dir === 'up'), downs = changes.filter(c => c.dir === 'down');
  $('#sChanges').hidden = !changes.length;
  $('#sChanges').innerHTML = '<div class="eyebrow">Targets changed</div><div class="loglist">' + changes.map(c => '<div>' + EX[c.ex].name + '<span class="' + c.dir + '">' + valText(c.ex, c.from) + ' → ' + valText(c.ex, c.to) + '</span></div>').join('') + '</div>';
  const byEx = {}; main.forEach(s => { if (s.round) return; (byEx[s.ex] = byEx[s.ex] || []).push(s); });
  const unit = ex => EX[ex].kind === 'hold' || EX[ex].kind === 'timed' ? ' s' : ' reps';
  const circ = main.filter(s => s.round);
  $('#sLog').innerHTML = Object.keys(byEx).map(ex => '<div>' + EX[ex].name + '<span>' + byEx[ex].map(s => s.how === 'skipped' ? 'skip' : s.done + (s.how === 'short' ? '/' + s.target : '')).join(' · ') + unit(ex) + '</span></div>').join('')
    + (circ.length ? '<div>Circuit<span>' + circ.filter(s => s.how !== 'skipped').length + ' of ' + circ.length + ' intervals' + (circ.some(s => s.reps) ? ' · ' + circ.reduce((a, s) => a + (s.reps || 0), 0) + ' reps counted' : '') + '</span></div>' : '')
    || '<div>Nothing logged<span></span></div>';
  const faultList = D.log.length && worked.length ? D.log[D.log.length - 1].faults : [];
  const line = !worked.length ? 'Nothing logged this time. That is fine. Come back when you are ready.'
    : (ups.length ? 'New targets: ' + ups.map(c => EX[c.ex].name).join(' and ') + '. You earned that.' : completed ? 'Every rep counted, and every one is logged.' : 'Short day, still logged. Consistency beats perfect.')
      + (faultList.length ? ' Next time, watch this: ' + faultList[0].replace(/\.$/, '').toLowerCase() + '.' : '')
      + (downs.length ? ' I eased ' + downs.map(c => EX[c.ex].name).join(' and ') + ' back a step so you can own it.' : '');
  $('#sBubble').textContent = line;
  $('#sCopied').textContent = '';
  show('summary');
  say(line);
}
$('#sHome').onclick = () => renderHome();
$('#sCopy').onclick = () => copyText(zuriSummary(), '#sCopied');

/* ================= body scan ================= */
function startScan() {
  const steps = [];
  const date = dkey(new Date());
  steps.push({ kind: 'setup', dur: 10, need: ['sh', 'hip', 'kn', 'an'], text: 'Welcome to your body scan. Turn the phone on its side and prop it up at about hip height, about two metres away. Stand side-on to it, in good light, in fitted clothes if you can.', tip: 'Phone on its side at hip height, about 2 metres away. Good light, and fitted clothes help Zuri see your joints.', help: 'Still looking for you. Step back until your head and feet are both in the picture.' });
  if (D.settings.photos) { steps.push({ kind: 'photo', view: 'front', dur: 8 }); steps.push({ kind: 'photo', view: 'side', dur: 8 }); }
  SCAN.forEach((q, n) => {
    const ex = q.test === 'inversion' ? 'wall_handstand' : q.test;
    const mode = q.kind === 'measure' ? 'measure' : q.kind;
    const w = { kind: 'work', key: q.key, test: q.test, ex, mode, title: q.title, instr: q.instr || EX[q.test] && EX[q.test].cue, cap: q.cap || 0, target: q.secs || q.cap || 0, dur: q.secs || q.cap || 20, block: 'Body scan', setNo: n + 1, sets: SCAN.length, round: 0 };
    steps.push({ kind: 'rest', dur: n === 0 ? 15 : (q.kind === 'measure' ? 20 : 40), label: n === 0 ? 'Get ready' : 'Next test', next: w, intro: 'Test ' + (n + 1) + ' of ' + SCAN.length + '. ' + q.title + '. ' + (q.instr || EX[q.test].cue) });
    steps.push(w);
  });
  openLive(steps, { kind: 'scan', date, opener: '' });
}
function finishScan(run) {
  const prev = latestScan();
  const results = {}, levels = {};
  SCAN.forEach(q => {
    const r = run.res[q.key];
    if (r && r.value != null) { results[q.key] = r; levels[q.key] = levelOf(q.key, r); }
    else if (prev && prev.results[q.key]) { results[q.key] = Object.assign({ carried: true }, prev.results[q.key]); levels[q.key] = prev.levels[q.key]; }
    else { results[q.key] = { value: null }; levels[q.key] = 1; }
  });
  const measured = SCAN.filter(q => run.res[q.key] && run.res[q.key].value != null).length;
  if (!measured && !prev) { renderHome(); show(D.plan ? 'home' : 'welcome'); return; }
  D.scans.push({ date: run.date, results, levels, photos: !!run.photos });
  D.plan = buildPlan(levels);
  D.T = seedTargets(D.plan, D.T);
  save();
  renderResults(D.scans[D.scans.length - 1], prev);
  show('results');
  say('Scan done. Here is where you are, and what we work on first.');
}
function renderResults(sc, prev) {
  $('#rDate').textContent = 'Body scan · ' + sc.date;
  const fa = focusAreas(sc.levels), rd = readiness(sc.levels);
  const names = fa.map(f => f.name.toLowerCase()), list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
  $('#rBubble').textContent = fa.length ? 'Your plan puts extra work into ' + list + '. Build those and your handstand and L-sit come faster.' : 'Strong across the board. Your plan leans into skill work now.';
  $('#rGoals').innerHTML = '<div class="eyebrow">Goal readiness</div>' + Object.keys(GOALS).map(g => {
    const before = prev ? readiness(prev.levels)[g] : null;
    return '<div class="goal"><b>' + GOALS[g].name + '</b><span>' + rd[g] + '%' + (before != null && before !== rd[g] ? ' <small class="muted" style="font-size:13px">' + (rd[g] > before ? '+' : '') + (rd[g] - before) + '</small>' : '') + '</span><div class="meter"><i style="width:' + rd[g] + '%"></i></div></div>';
  }).join('');
  $('#rFocus').innerHTML = '<div class="eyebrow">What holds you back most</div>' + (fa.length ? fa.map(f => '<div class="focus"><b>' + f.name + '</b><p>' + f.why + '</p></div>').join('') : '<p class="muted">Nothing major. Keep building.</p>');
  $('#rList').innerHTML = SCAN.map(q => '<div class="q"><b>' + QUALITY[q.key].name + '</b><div class="lvl" data-l="' + sc.levels[q.key] + '" aria-label="Level ' + sc.levels[q.key] + ' of 4"><i></i><i></i><i></i><i></i></div><span class="val">' + esc(describe(q.key, sc.results[q.key])) + (sc.results[q.key].carried ? ' (from last scan)' : '') + '</span></div>').join('');
  $('#rPhotos').hidden = true;
  if (sc.photos) photoDB.all().then(all => {
    const ps = all.filter(p => p.date === sc.date); if (!ps.length) return;
    $('#rPhotoGrid').innerHTML = ps.map(p => '<figure><img alt="' + p.view + ' photo" src="' + URL.createObjectURL(p.blob) + '"><figcaption>' + (p.view === 'front' ? 'Front' : 'Side') + '</figcaption></figure>').join('');
    $('#rPhotos').hidden = false;
  }).catch(() => {});
}
$('#rDone').onclick = () => { renderPlanSheet(); renderHome(); openSheet('planSheet'); };

/* ================= boot ================= */
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
if (window.navigator.standalone || matchMedia('(display-mode: standalone)').matches) $('#wInstall').hidden = true;
$('#boot').hidden = true;
renderHome();
window.__zuri = { get D() { return D; }, get L() { return L; }, renderHome, startScan, startSession, save, next: () => next() };
