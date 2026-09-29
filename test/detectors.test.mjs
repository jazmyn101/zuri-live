// Synthetic skeletons -> MediaPipe-style landmarks -> trackers. Run: node test/detectors.test.mjs
import { makeFrame } from '../js/geom.js';
import { EX, RepTracker, HoldTracker, MeasureTracker } from '../js/exercises.js';

const L = { T: 48, U: 29, F: 27, Th: 44, Sh: 42, N: 14 };
const D = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
const add = (p, a, l) => { const d = D(a); return [p[0] + d[0] * l, p[1] + d[1] * l]; };
// pose: absolute segment angles in degrees (0 = right, 90 = down, -90 = up), like the demo figure
const pose = (t, ua, fa, th, sh, o = {}) => ({ t, ua, fa, th, sh, th2: o.th2 ?? th, sh2: o.sh2 ?? sh, hd: o.hd ?? t });
function landmarks(p, noise = 0) {
  const H = [0, 0], S = add(H, p.t, L.T), E = add(S, p.ua, L.U), W = add(E, p.fa, L.F), K = add(H, p.th, L.Th), A = add(K, p.sh, L.Sh);
  const K2 = add(H, p.th2, L.Th), A2 = add(K2, p.sh2, L.Sh);
  const ear = add(S, p.hd, L.N * 0.8), nose = add(S, p.hd, L.N);
  const pts = [H, S, E, W, K, A, K2, A2, ear, nose];
  const minX = Math.min(...pts.map(q => q[0])), maxX = Math.max(...pts.map(q => q[0])), minY = Math.min(...pts.map(q => q[1])), maxY = Math.max(...pts.map(q => q[1]));
  const span = 320, cx = 0, cy = 0;   // fixed camera: the hip sits mid-frame, like a propped phone
  const N = q => ({ x: 0.5 + (q[0] - cx) / span / 0.75 + (Math.random() - .5) * noise, y: 0.5 + (q[1] - cy) / span + (Math.random() - .5) * noise, visibility: 0.95 });
  const lm = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.2 }));
  const set = (i, q, v = 0.95) => { lm[i] = { ...N(q), visibility: v }; };
  set(0, nose); set(7, ear); set(8, ear, 0.3);
  set(11, S); set(12, [S[0] + 0.5, S[1]], 0.6);
  set(13, E); set(14, E, 0.4); set(15, W); set(16, W, 0.4);
  set(23, H); set(24, [H[0] + 0.5, H[1]], 0.6);
  set(25, K); set(26, K2, 0.6); set(27, A); set(28, A2, 0.6); set(31, add(A, 0, 6)); set(32, add(A2, 0, 6), 0.5);
  return lm;
}
const lerp = (a, b, u) => { const o = {}; for (const k in a) o[k] = a[k] + (b[k] - a[k]) * u; return o; };
const aspect = 0.75;
let fails = 0;
const check = (name, cond, info) => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? '  ' + JSON.stringify(info) : '')); if (!cond) fails++; };

function runReps(id, A, B, cycles, opts = {}) {
  const tr = new RepTracker(EX[id], 99); let t = 0; const cues = [];
  for (let c = 0; c < cycles; c++) for (let i = 0; i <= 60; i++) {
    const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / 60);
    const p = lerp(A, B, u);
    const f = makeFrame(landmarks(opts.mod ? opts.mod(p, u) : p, 0.003), aspect, t); t += 1 / 30;
    tr.update(f, t).forEach(e => e.cue && cues.push(e.cue));
  }
  return { reps: tr.reps, good: tr.good, cues: [...new Set(cues)], visible: tr.visible };
}
function runHold(id, P, secs, opts = {}) {
  const tr = new HoldTracker(EX[id], 99); let t = 0; const ev = [];
  if (opts.pre) for (let i = 0; i < 60; i++) { tr.update(makeFrame(landmarks(opts.pre, 0.002), aspect, t), t); t += 1 / 30; }
  for (let i = 0; i < secs * 30; i++) { const e = tr.update(makeFrame(landmarks(P, 0.002), aspect, t), t); t += 1 / 30; e.forEach(x => ev.push(x.type === 'cue' ? x.text : x.type)); }
  if (opts.after) for (let i = 0; i < 60; i++) { tr.update(makeFrame(landmarks(opts.after, 0.002), aspect, t), t).forEach(x => ev.push(x.type)); t += 1 / 30; }
  return { held: +tr.held.toFixed(1), holding: tr.holding, dropped: tr.dropped, ev: [...new Set(ev)] };
}
function runMeasure(id, P, secs) {
  const tr = new MeasureTracker(EX[id]); let t = 0, done = null;
  for (let i = 0; i < secs * 30 && !done; i++) { tr.update(makeFrame(landmarks(P, 0.002), aspect, t), t).forEach(e => { if (e.type === 'done') done = e; }); t += 1 / 30; }
  return done;
}

// ---- push patterns (side view, facing right)
const PLANK = pose(-25, 90, 90, 155, 155, { hd: -20 });
const PUSH_BOTTOM = pose(-12, 150, 40, 168, 168, { hd: -10 });
let r = runReps('pushup', PLANK, PUSH_BOTTOM, 8);
check('push-ups: counts 8 reps', r.reps === 8, r);
check('push-ups: clean reps have no cue', r.cues.length === 0, r.cues);
r = runReps('pushup', PLANK, PUSH_BOTTOM, 6, { mod: p => ({ ...p, t: p.t - 10, th: p.th + 10, sh: p.sh + 10 }) });
check('push-ups: sagging hips cue', r.reps === 6 && r.cues.some(c => /Hips up/.test(c)), r);
r = runReps('pushup', PLANK, pose(-20, 120, 70, 160, 160), 5);
check('push-ups: shallow reps not counted', r.reps === 0, r);
const KNEE_TOP = pose(-35, 90, 90, 150, 270 - 90 + 20, { hd: -30 });
r = runReps('knee_pushup', pose(-35, 90, 90, 160, 200), pose(-18, 150, 40, 170, 200), 5);
check('knee push-ups: counts 5', r.reps === 5, r);
const STAND = pose(-90, 90, 90, 90, 90);

// ---- pike push-up
const PIKE = pose(40, 75, 75, 115, 115, { hd: 90 });
const PIKE_B = pose(60, 150, 30, 128, 128, { hd: 100 });
r = runReps('pike_pushup', PIKE, PIKE_B, 5);
check('pike push-ups: counts 5', r.reps === 5, r);

// ---- squat & lunge & bridge
r = runReps('squat', pose(-90, -5, -5, 90, 90), pose(-55, -5, -5, 5, 105), 6);
check('squats: counts 6', r.reps === 6, r);
r = runReps('squat', pose(-90, -5, -5, 90, 90), pose(-75, -5, -5, 45, 100), 4);
check('squats: half squats not counted or cued', r.reps === 0 || r.cues.includes('Sit deeper.'), r);
r = runReps('lunge', STAND, pose(-86, 90, 90, 10, 95, { th2: 115, sh2: 175 }), 5);
check('lunges: counts 5', r.reps === 5, r);
r = runReps('glute_bridge', pose(0, 178, 178, 232, 125, { hd: 0 }), pose(20, 178, 178, 205, 95, { hd: 0 }), 6);
check('glute bridges: counts 6', r.reps === 6, r);

// ---- dips
r = runReps('para_dip', pose(-95, 95, 95, -10, 25, { hd: -95 }), pose(-80, 150, 55, -10, 25, { hd: -85 }), 5);
check('parallette dips: counts 5', r.reps === 5, r);

// ---- holds
let h = runHold('wall_handstand', pose(90, 90, 90, -92, -92, { hd: 95 }), 10, { after: STAND });
check('wall handstand: times ~10 s then drop', h.held > 8.5 && h.held < 10.6 && h.ev.includes('drop'), h);
h = runHold('wall_handstand', pose(90, 90, 90, -92, -92, { hd: 95 }), 4, {});
check('wall handstand: no banana cue on straight line', !h.ev.some(e => /Ribs/.test(e)), h);
h = runHold('wall_handstand', pose(100, 90, 90, -100, -100, { hd: 100 }), 8);
check('wall handstand: arched back gets ribs cue', h.ev.some(e => /Ribs in/.test(e)), h);
h = runHold('wall_handstand', STAND, 5);
check('wall handstand: standing does not count', h.held === 0, h);
h = runHold('pike_hold', PIKE, 6);
check('pike hold: times', h.held > 4.5, h);
h = runHold('hollow_hold', pose(-160, -160, -160, -15, -15, { hd: -150 }), 6);
check('hollow hold: times', h.held > 4.5, h);
h = runHold('hollow_hold', pose(180, 180, 180, 0, 0, { hd: 180 }), 5);
check('hollow hold: lying flat does not count', h.held === 0, h);
h = runHold('plank', PLANK, 6);
check('plank: times', h.held > 4.5, h);
h = runHold('wall_sit', pose(-90, 90, 90, 0, 90), 6);
check('wall sit: times', h.held > 4.5, h);
const SEAT = pose(-90, 90, 90, 0, 90, { hd: -90 });          // sitting between the bars, feet down
const TUCK = pose(-90, 90, 90, -40, 70, { hd: -90 });
h = runHold('tuck_lsit', TUCK, 6, { pre: pose(-90, 90, 90, -5, 85, { hd: -90 }) });
check('tuck L-sit: times after feet leave the floor', h.held > 4.5, h);
h = runHold('lsit', pose(-90, 90, 90, 0, 0, { hd: -90 }), 5, { pre: pose(-90, 90, 90, 8, 15, { hd: -90 }) });
check('L-sit: times', h.held > 3.5, h);
h = runHold('support_hold', pose(-88, 90, 90, -20, 60, { hd: -90 }), 5);
check('support hold: times', h.held > 3.5, h);

// ---- scan measures
let m = runMeasure('reach_test', pose(-90, -88, -88, 90, 90, { hd: -90 }), 8);
check('reach test: full overhead ~175+', m && m.value > 170, m);
m = runMeasure('reach_test', pose(-90, -60, -60, 90, 90, { hd: -90 }), 8);
check('reach test: limited ~150', m && m.value > 140 && m.value < 160, m);
m = runMeasure('fold_test', pose(95, 90, 90, 90, 90, { hd: 100 }), 8);
check('fold test: hands near floor >= 1', m && m.value >= 0.95, m);
m = runMeasure('fold_test', pose(-20, 90, 90, 90, 90, { hd: 10 }), 8);
check('fold test: tight hamstrings < 0.6', m && m.value < 0.6, m);
m = runMeasure('squat_test', pose(-50, -5, -5, -5, 110), 8);
check('squat test: deep squat angle < 70', m && m.value < 70, m);

console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
