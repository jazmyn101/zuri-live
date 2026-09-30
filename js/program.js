// Body scan scoring, goal readiness, the weekly plan, and progression. Pure logic, no DOM.
import { EX } from './exercises.js';

/* ---------- the scan ---------- */
export const SCAN = [
  { key: 'shoulders', test: 'reach_test', kind: 'measure', title: 'Overhead reach', says: 'How far your arms go overhead. A straight handstand needs close to 180 degrees.' },
  { key: 'flex', test: 'fold_test', kind: 'measure', title: 'Forward fold', says: 'Hamstring flexibility. It decides how easily you can lift your legs in an L-sit.' },
  { key: 'squatMob', test: 'squat_test', kind: 'measure', title: 'Deep squat', says: 'Hip and ankle mobility for strong, safe legs.' },
  { key: 'push', test: 'pushup', kind: 'maxreps', title: 'Push-ups', says: 'Pushing strength. The base for handstand push-ups and dips.', cap: 40, instr: 'Do as many good push-ups as you can. If full ones are too hard, do them from your knees. Stop when your form goes.' },
  { key: 'core', test: 'hollow_hold', kind: 'maxhold', title: 'Hollow hold', says: 'The body line that holds a handstand straight.', cap: 60, instr: 'Hold a hollow body as long as you can with a flat lower back. I will stop you at one minute.' },
  { key: 'support', test: 'tuck_lsit', kind: 'maxhold', title: 'Tuck L-sit', says: 'Support strength on your parallettes: the heart of the L-sit.', cap: 30, instr: 'Sit between your parallettes, side-on to me. Press down, lift your feet and hold a tuck as long as you can. It is fine if it is short.' },
  { key: 'invert', test: 'inversion', kind: 'maxhold', title: 'Upside down', says: 'Strength and comfort upside down.', cap: 60, instr: 'If you are comfortable, kick up to a wall handstand, belly to the wall or back to it. If not, do a pike hold instead. Hold as long as you can.' },
  { key: 'legs', test: 'squat', kind: 'timedreps', title: '45-second squats', says: 'Leg strength and conditioning for a lean, strong body.', secs: 45, instr: 'As many full squats as you can in 45 seconds. Good depth counts.' }
];

export const QUALITY = {
  shoulders: { name: 'Shoulder mobility', unit: '°' },
  flex: { name: 'Hamstring flexibility', unit: '' },
  squatMob: { name: 'Hip and ankle mobility', unit: '°' },
  push: { name: 'Pushing strength', unit: ' reps' },
  core: { name: 'Core line', unit: 's' },
  support: { name: 'Support strength', unit: 's' },
  invert: { name: 'Upside-down strength', unit: 's' },
  legs: { name: 'Legs and conditioning', unit: ' squats' }
};

/** Turns raw scan results into levels 1 (starting out) to 4 (strong). */
export function levelOf(key, r) {
  if (!r || r.value == null) return 1;
  const v = r.value;
  switch (key) {
    case 'shoulders': return v >= 170 ? 4 : v >= 160 ? 3 : v >= 145 ? 2 : 1;
    case 'flex': return v >= 1.0 ? 4 : v >= 0.7 ? 3 : v >= 0.35 ? 2 : 1;
    case 'squatMob': return (v <= 60 && r.extra && r.extra.hipBelow) ? 4 : v <= 75 ? 3 : v <= 95 ? 2 : 1;
    case 'push': return r.variant === 'knees' ? 1 : v >= 15 ? 4 : v >= 8 ? 3 : v >= 1 ? 2 : 1;
    case 'core': return v >= 45 ? 4 : v >= 30 ? 3 : v >= 15 ? 2 : 1;
    case 'support': return v >= 20 ? 4 : v >= 10 ? 3 : v >= 3 ? 2 : 1;
    case 'invert': return r.variant === 'handstand' ? (v >= 45 ? 4 : v >= 15 ? 3 : 2) : (v >= 30 ? 2 : 1);
    case 'legs': return v >= 35 ? 4 : v >= 25 ? 3 : v >= 15 ? 2 : 1;
  }
  return 1;
}

export function describe(key, r) {
  if (!r || r.value == null) return 'Not measured';
  const v = r.value;
  switch (key) {
    case 'shoulders': return Math.round(v) + '° overhead';
    case 'flex': return v >= 1 ? 'Hands to the floor' : v >= 0.7 ? 'Hands to the lower shins' : v >= 0.35 ? 'Hands to mid-shin' : 'Hands around the knees';
    case 'squatMob': return (r.extra && r.extra.hipBelow ? 'Hips below knees' : 'Hips above knees') + ' · knee ' + Math.round(v) + '°';
    case 'push': return Math.round(v) + (r.variant === 'knees' ? ' knee push-ups' : ' push-ups');
    case 'core': return Math.round(v) + 's hollow hold';
    case 'support': return Math.round(v) + 's tuck L-sit';
    case 'invert': return Math.round(v) + 's ' + (r.variant === 'handstand' ? 'wall handstand' : 'pike hold');
    case 'legs': return Math.round(v) + ' squats in 45s';
  }
  return '';
}

/* ---------- goals ---------- */
export const GOALS = {
  handstand: { name: 'Freestanding handstand', needs: { shoulders: 1.5, core: 1.2, invert: 1.3, push: 1 } },
  lsit: { name: 'Full L-sit', needs: { support: 1.5, flex: 1.3, core: 1 } },
  lean: { name: 'Lean and strong', needs: { legs: 1.3, push: 1, core: 1, squatMob: 0.7 } }
};
const WHY = {
  shoulders: 'Your arms stop short of straight overhead, so in a handstand your back arches to make up the difference. Opening the shoulders is the fastest way to a straighter line.',
  flex: 'Tight hamstrings pull your legs down in an L-sit. More flexibility means your abs lift less weight.',
  squatMob: 'A deeper, easier squat protects your knees and lets your legs work through their full range.',
  push: 'Pushing strength carries your handstand and makes every skill feel lighter.',
  core: 'The hollow position is the handstand shape on the floor. A strong hollow means a straight, stable line upside down.',
  support: 'The L-sit is mostly pressing down hard through straight arms. Support holds build exactly that.',
  invert: 'Time upside down builds the shoulder strength and calm you need to balance.',
  legs: 'Strong legs burn the most energy and drive the lean, athletic look you want.'
};
export function readiness(levels) {
  const out = {};
  for (const g in GOALS) {
    let s = 0, w = 0; for (const k in GOALS[g].needs) { s += (levels[k] || 1) / 4 * GOALS[g].needs[k]; w += GOALS[g].needs[k]; }
    out[g] = Math.round(s / w * 100);
  }
  return out;
}
/** The three things holding you back most, weighted by how much your goals need them. */
export function focusAreas(levels) {
  const weight = {};
  for (const g in GOALS) for (const k in GOALS[g].needs) weight[k] = (weight[k] || 0) + GOALS[g].needs[k];
  return Object.keys(QUALITY).map(k => ({ key: k, score: (5 - (levels[k] || 1)) * weight[k] }))
    .filter(x => (levels[x.key] || 1) < 4).sort((a, b) => b.score - a.score).slice(0, 3)
    .map(x => ({ key: x.key, name: QUALITY[x.key].name, why: WHY[x.key], level: levels[x.key] || 1 }));
}

/* ---------- the plan ---------- */
// item: { ex, sets, v, rest }  (v = reps or seconds per set)
const I = (ex, sets, v, rest = 45) => ({ ex, sets, v, rest });
const WARM_UP = [I('arm_circles', 1, 30, 0), I('wrist_prep', 1, 45, 0), I('cat_cow', 1, 6, 0), I('scap_pushup', 1, 8, 0), I('jacks', 1, 30, 0)];
const WARM_LOW = [I('jacks', 1, 40, 0), I('cat_cow', 1, 6, 0), I('deep_squat_hold', 1, 30, 0), I('glute_bridge', 1, 10, 0)];

const hsHold = l => l <= 1 ? [I('pike_hold', 3, 20, 45)] : l === 2 ? [I('pike_hold', 2, 30, 45), I('wall_handstand', 3, 15, 60)] : l === 3 ? [I('wall_handstand', 4, 25, 60)] : [I('wall_handstand', 3, 40, 60), I('kickup_practice', 1, 240, 30)];
const hsPush = l => [I('pike_pushup', l >= 3 ? 4 : 3, [0, 5, 6, 8, 10][l], 75)];
const push = l => l <= 1 ? [I('knee_pushup', 3, 8, 60)] : l === 2 ? [I('pushup', 3, 5, 60)] : l === 3 ? [I('pushup', 3, 10, 60), I('para_pushup', 2, 6, 60)] : [I('para_pushup', 4, 10, 60)];
const lsitWork = l => l <= 1 ? [I('support_hold', 4, 15, 45)] : l === 2 ? [I('support_hold', 2, 20, 45), I('tuck_lsit', 4, 8, 45)] : l === 3 ? [I('tuck_lsit', 4, 15, 60)] : [I('tuck_lsit', 3, 20, 60), I('lsit', 4, 6, 60)];
const dips = l => [I('para_dip', 3, [0, 5, 6, 8, 10][l], 60)];
const compression = l => [I('lsit_lifts', 3, [0, 6, 8, 10, 12][l], 40)];
const core = l => l <= 1 ? [I('tuck_hollow', 3, 20, 30)] : [I('hollow_hold', 3, [0, 0, 20, 30, 40][l], 30)];
const legs = l => [I('squat', 3, [0, 10, 12, 15, 15][l], 60), I('lunge', 3, [0, 8, 10, 12, 12][l], 60), I('glute_bridge', 3, 15, 45), I('wall_sit', 2, [0, 30, 30, 40, 45][l], 45)];
const cooldown = focus => {
  const pool = { shoulders: [I('puppy_stretch', 1, 45, 0), I('wall_slides', 1, 8, 0)], flex: [I('pike_stretch', 1, 45, 0), I('fold', 1, 40, 0)], squatMob: [I('deep_squat_hold', 1, 40, 0)] };
  const out = []; focus.forEach(k => (pool[k] || []).forEach(x => out.length < 3 && out.push(x)));
  if (out.length < 3) out.push(I('childs', 1, 45, 0));
  if (out.length < 3) out.push(I('sphinx', 1, 40, 0));
  return out;
};
const mobilityFocus = levels => ['shoulders', 'flex', 'squatMob'].sort((a, b) => (levels[a] || 1) - (levels[b] || 1));
const B = (name, items, extra) => Object.assign({ name, items }, extra || {});
const circuit = (name, l, exs) => ({ name, circuit: { rounds: 4, work: l >= 3 ? 40 : 30, rest: l >= 3 ? 20 : 30, roundRest: 60, items: exs } });

/** A short, repeatable week: 4 sessions of about 40 minutes (or 3 if life is busy).
 *  Skill work comes first while you're fresh, handstands get 3 short exposures a week because
 *  skills grow with frequency, and every set should end with a rep or two left in the tank. */
const finisher = (l, items) => ({ name: 'Finisher', circuit: { rounds: 3, work: l >= 3 ? 35 : 30, rest: 15, roundRest: 40, items } });
export function buildPlan(levels, days) {
  days = days === 3 ? 3 : 4;
  const L = k => levels[k] || 1;
  const mob = mobilityFocus(levels);
  const pushEasy = L('push') <= 1 ? 'knee_pushup' : 'pushup';
  const lighter = items => items.map(x => Object.assign({}, x, { sets: Math.max(2, x.sets - 1) }));
  const hsPlay = L('invert') >= 3 ? [I('kickup_practice', 1, 180, 30)] : [I('pike_hold', 2, 20, 40)];
  const burn = finisher(L('legs'), ['jacks', 'squat', 'mountain_climbers', 'high_knees']);
  const plan = {
    1: { name: 'Handstand & Push', tags: ['Handstand', 'Push', 'Core'], blocks: [B('Warm-up', WARM_UP), B('Shoulder prep', [I('wall_slides', 1, 8, 0), I('puppy_stretch', 1, 30, 0)]), B('Handstand', hsHold(L('invert'))), B('Handstand strength', hsPush(L('push'))), B('Push', push(L('push'))), B('Core', core(L('core'))), B('Back line', [I('reverse_plank', 2, 20, 30), I('superman', 2, 10, 30), I('plank', 2, 30, 30)]), B('Cool-down', cooldown(['shoulders', mob[0]]))] },
    2: { name: 'Legs & L-sit', tags: ['L-sit', 'Legs', 'Burn'], blocks: [B('Warm-up', WARM_LOW), B('L-sit', lsitWork(L('support'))), B('Legs', legs(L('legs')).slice(0, 3)), B('Compression', compression(L('flex'))), burn, B('Cool-down', cooldown(['flex', 'squatMob']))] },
    3: { name: 'Handstand & L-sit', tags: ['Handstand', 'L-sit', 'Dips'], blocks: [B('Warm-up', WARM_UP), B('Handstand', hsHold(L('invert'))), B('L-sit', lighter(lsitWork(L('support')))), B('Dips', dips(L('support'))), B('Compression', compression(L('flex'))), B('Legs', [I('glute_bridge', 3, 15, 40), I('wall_sit', 2, [0, 30, 30, 40, 45][L('legs')], 45)]), B('Core', [I(L('core') >= 3 ? 'hollow_rock' : 'dead_bug', 3, L('core') >= 3 ? 12 : 10, 30)]), B('Cool-down', cooldown(['flex', 'shoulders']))] },
    4: { name: 'Full Body & Burn', tags: ['Push', 'Legs', 'Burn'], blocks: [B('Warm-up', WARM_LOW.slice(0, 2).concat(WARM_UP.slice(1, 2))), B('Handstand play', hsPlay), B('Push', lighter(push(L('push')))), B('Legs', lighter(legs(L('legs')).slice(0, 2))), B('Support', [lsitWork(L('support'))[0]].map(x => Object.assign({}, x, { sets: 2 }))), B('Core', core(L('core')).concat([I('superman', 2, 10, 30)])), finisher(L('legs'), ['jacks', 'squat', 'mountain_climbers', pushEasy, 'high_knees']), B('Cool-down', cooldown(mob))] }
  };
  if (days === 3) {                      // three sessions: the full-body day folds into session 3
    plan[3].blocks.splice(plan[3].blocks.length - 1, 0, finisher(L('legs'), ['jacks', 'squat', pushEasy, 'high_knees']));
    delete plan[4];
  }
  return plan;
}

/* ---------- targets and progression ---------- */
const CAPS = { knee_pushup: 15, pushup: 25, para_pushup: 20, pike_pushup: 15, para_dip: 15, squat: 25, lunge: 16, glute_bridge: 20, lsit_lifts: 15, dead_bug: 16, hollow_rock: 20, calf_raise: 20, cat_cow: 8, scap_pushup: 12, wall_slides: 12,
  pike_hold: 60, wall_handstand: 60, tuck_hollow: 45, hollow_hold: 60, plank: 90, support_hold: 40, tuck_lsit: 30, lsit: 20, wall_sit: 75, reverse_plank: 45 };
const PROGRESSES = ex => EX[ex] && (EX[ex].kind === 'reps' || EX[ex].kind === 'hold');

/** Seed per-exercise targets from a plan; keeps any target you've already earned. */
export function seedTargets(plan, T) {
  const next = Object.assign({}, T);
  for (const d in plan) plan[d].blocks.forEach(b => (b.items || []).forEach(it => {
    if (!PROGRESSES(it.ex)) return;
    const cur = next[it.ex];
    if (!cur) next[it.ex] = { v: it.v, hits: 0, miss: 0 };
    else if (cur.v < it.v) next[it.ex] = Object.assign({}, cur, { v: it.v });   // a better scan raises the floor
  }));
  return next;
}
export const targetFor = (it, T) => (PROGRESSES(it.ex) && T[it.ex]) ? T[it.ex].v : it.v;

/** After a session: two sessions in a row with every set hit moves a target up one step;
 *  two sessions well short of it moves it back down, so the plan stays hard but doable. */
export function progress(T, sets) {
  const next = JSON.parse(JSON.stringify(T)), by = {}, changes = [];
  sets.filter(s => !s.round && PROGRESSES(s.ex) && s.how !== 'skipped').forEach(s => { (by[s.ex] = by[s.ex] || []).push(s); });
  for (const ex in by) {
    const t = next[ex] || (next[ex] = { v: by[ex][0].target, hits: 0, miss: 0 });
    const arr = by[ex], full = arr.every(s => s.how === 'full');
    const ratio = arr.reduce((a, s) => a + s.done / Math.max(1, s.target), 0) / arr.length;
    const step = EX[ex].step || 1, min = EX[ex].min || 3, cap = CAPS[ex] || 999;
    if (full) { t.hits++; t.miss = 0; if (t.hits >= 2) { const v = Math.min(cap, t.v + step); if (v > t.v) changes.push({ ex, from: t.v, to: v, dir: 'up' }); t.v = v; t.hits = 0; } }
    else if (ratio < 0.7) { t.miss++; t.hits = 0; if (t.miss >= 2) { const v = Math.max(min, t.v - step); if (v < t.v) changes.push({ ex, from: t.v, to: v, dir: 'down' }); t.v = v; t.miss = 0; } }
    else { t.hits = 0; t.miss = 0; }
  }
  return { T: next, changes };
}

export const RESCAN_DAYS = 28;

/* ---------- a session as a list of steps ---------- */
const est = (ex, mode, v) => mode === 'reps' ? 3 + v * 3 : mode === 'hold' ? v + 8 : mode === 'tempo' ? 2 + v * (EX[ex].tempo || 3) : v;
export function buildSteps(day, T, opts) {
  opts = opts || {};
  const steps = [];
  let pendingRest = null;
  const addRest = (dur, label) => { pendingRest = { kind: 'rest', dur, label }; };
  const push = w => { const r = pendingRest || { kind: 'rest', dur: 10, label: 'Get ready' }; r.next = w; steps.push(r, w); pendingRest = null; };
  day.blocks.forEach((b, bi) => {
    if (b.circuit) {
      const c = b.circuit;
      for (let rd = 1; rd <= c.rounds; rd++) c.items.forEach((ex, ii) => {
        if (rd === 1 && ii === 0) addRest(steps.length ? 25 : 10, steps.length ? 'Next block' : 'Get ready');
        push({ kind: 'work', ex, mode: 'timed', target: c.work, dur: c.work, block: b.name, setNo: ii + 1, sets: c.items.length, round: rd, rounds: c.rounds });
        const last = ii === c.items.length - 1;
        if (!(rd === c.rounds && last)) addRest(last ? c.roundRest : c.rest, last ? 'Round rest' : 'Rest');
      });
      return;
    }
    b.items.forEach((it, ii) => {
      const e = EX[it.ex], mode = e.kind === 'measure' ? 'hold' : e.kind;
      const v = targetFor(it, T);
      for (let s = 1; s <= it.sets; s++) {
        if (s === 1) addRest(steps.length === 0 ? 10 : ii === 0 ? 25 : 15, steps.length === 0 ? 'Get ready' : ii === 0 ? 'Next block' : 'Transition');
        else addRest(it.rest, 'Rest');
        push({ kind: 'work', ex: it.ex, mode, target: v, dur: est(it.ex, mode, v), block: b.name, setNo: s, sets: it.sets, round: 0 });
      }
    });
  });
  return steps;
}
export const minutes = steps => Math.round(steps.reduce((a, s) => a + s.dur, 0) / 60);
