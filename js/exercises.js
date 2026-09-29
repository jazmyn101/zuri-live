// Exercise catalog and the live trackers that watch them. Pure logic, no DOM.
import { ang, incl, lineDev, dist, missingParts, Median } from './geom.js';

const SIDE_TIP = 'Phone on its side, about hip height, about 2 metres away. Train side-on to it so I see your whole body.';
const FRONT_TIP = 'Phone on its side, about 2 metres away. Face it, whole body in the picture.';

/* ---------- shared checks ---------- */
const elbow = f => ang(f.S.sh, f.S.el, f.S.wr);
const knee = f => ang(f.S.hip, f.S.kn, f.S.an);
const hipAng = (f, low = 'an') => ang(f.S.sh, f.S.hip, f.S[low]);
const bodyFlat = (f, low = 'an', max = 40) => incl(f.S.sh, f.S[low]) < max;
const inverted = f => f.S.an.y < f.S.hip.y && f.S.hip.y < f.S.sh.y && f.S.sh.y < f.S.wr.y + 0.02;
const shrugged = f => dist(f.S.ear, f.S.sh) < 0.17 * f.torso;
const lineCue = (f, low, sag = 0.07, pike = 0.1, sagCue = 'Squeeze your glutes. Hips up a little.', pikeCue = 'Lower your hips. One straight line.') => {
  const d = lineDev(f.S.sh, f.S.hip, f.S[low]);
  return d > sag ? sagCue : d < -pike ? pikeCue : null;
};

/* ---------- catalog ----------
   kind: reps (camera counts), hold (camera times while you're in position),
         tempo (Zuri counts out loud at a steady pace), timed (clock only)
   Rep signals are shaped so the start position is HIGH and the turnaround is LOW. */
export const EX = {
  // warm-up and mobility (clock or tempo, phone can stay put)
  arm_circles: { name: 'Arm circles', kind: 'timed', cue: 'Big slow circles. Forward, then back.' },
  wrist_prep: { name: 'Wrist prep', kind: 'timed', cue: 'On hands and knees. Rock forward and back over the wrists, then turn the fingers back and rock again.' },
  cat_cow: { name: 'Cat-cow', kind: 'tempo', tempo: 3.5, cue: 'Round the spine, then open the chest. Slow and smooth.' },
  jacks: { name: 'Jumping jacks', kind: 'timed', cam: true, move: true, cue: 'Light on your feet. Full reach overhead.' },
  high_knees: { name: 'High knees', kind: 'timed', cam: true, move: true, cue: 'Knees to hip height. Pump the arms.' },
  mountain_climbers: { name: 'Mountain climbers', kind: 'timed', cam: true, move: true, cue: 'Shoulders over the hands. Drive the knees.' },
  scap_pushup: { name: 'Scapular push-ups', kind: 'tempo', tempo: 2.5, cue: 'Arms locked. Let the chest sink between the shoulders, then push the floor away.' },
  puppy_stretch: { name: 'Puppy stretch', kind: 'timed', cue: 'Knees under the hips, walk the hands forward, melt the chest toward the floor. Feel the shoulders open.' },
  wall_slides: { name: 'Wall slides', kind: 'tempo', tempo: 3.5, cue: 'Back and arms against the wall. Slide the arms up as high as they go without the ribs popping out.' },
  pike_stretch: { name: 'Seated pike stretch', kind: 'timed', cue: 'Sit tall, legs straight together. Fold from the hips and reach for the toes. Breathe into it.' },
  fold: { name: 'Standing forward fold', kind: 'timed', cue: 'Soft knees. Let the head hang heavy.' },
  deep_squat_hold: { name: 'Deep squat hold', kind: 'timed', cue: 'Sink into your deepest squat, heels down, elbows pushing the knees out.' },
  childs: { name: "Child's pose", kind: 'timed', cue: 'Hips to heels. Reach long. Slow breaths.' },
  sphinx: { name: 'Sphinx stretch', kind: 'timed', cue: 'Forearms down, chest lifted. Lengthen the front of the body.' },

  // pushing
  knee_pushup: {
    name: 'Knee push-ups', kind: 'reps', cam: true, view: 'side', need: ['sh', 'el', 'wr', 'hip', 'kn'], step: 2, min: 3,
    cue: 'Knees down, body straight from knees to head. Chest to the floor.',
    sig: elbow, top: 150, bottom: 112, ideal: 100,
    gate: f => bodyFlat(f, 'kn', 45) && f.S.wr.y > f.S.sh.y,
    live: f => lineCue(f, 'kn'),
    after: s => s.min > 108 ? 'Go lower. Chest to the floor.' : null
  },
  pushup: {
    name: 'Push-ups', kind: 'reps', cam: true, view: 'side', need: ['sh', 'el', 'wr', 'hip', 'an'], step: 2, min: 3,
    cue: 'Body like a plank. Elbows at forty-five. Chest to the floor.',
    sig: elbow, top: 150, bottom: 112, ideal: 100,
    gate: f => bodyFlat(f) && f.S.wr.y > f.S.sh.y,
    live: f => lineCue(f, 'an'),
    after: s => s.min > 108 ? 'Go lower. Chest to the floor.' : null
  },
  para_pushup: {
    name: 'Parallette push-ups', kind: 'reps', cam: true, view: 'side', need: ['sh', 'el', 'wr', 'hip', 'an'], step: 1, min: 3,
    cue: 'Grip the bars and go deeper than the floor allows.',
    sig: elbow, top: 150, bottom: 108, ideal: 92,
    gate: f => bodyFlat(f) && f.S.wr.y > f.S.sh.y,
    live: f => lineCue(f, 'an'),
    after: s => s.min > 100 ? 'Use the bars. Chest below the hands.' : null
  },
  pike_pushup: {
    name: 'Pike push-ups', kind: 'reps', cam: true, view: 'side', need: ['sh', 'el', 'wr', 'hip', 'an'], step: 1, min: 3,
    cue: 'Hips high. Lower the top of your head in front of your hands.',
    sig: elbow, top: 150, bottom: 118, ideal: 104,
    gate: f => f.S.hip.y < f.S.sh.y && hipAng(f) < 130,
    live: f => hipAng(f) > 118 ? 'Walk your feet in. Hips higher.' : null,
    after: s => s.min > 112 ? 'Bend the elbows more. Head toward the floor.' : null
  },
  para_dip: {
    name: 'Parallette dips', kind: 'reps', cam: true, view: 'side', need: ['sh', 'el', 'wr'], step: 1, min: 3,
    cue: 'Hands on the bars behind you, shoulders down. Lower until the elbows hit ninety.',
    sig: elbow, top: 148, bottom: 118, ideal: 100,
    gate: f => f.S.wr.y > f.S.sh.y,
    live: f => shrugged(f) ? 'Shoulders down, away from the ears.' : null,
    after: s => s.min > 110 ? 'Lower. Elbows to ninety.' : null
  },

  // handstand line
  pike_hold: {
    name: 'Pike hold', kind: 'hold', cam: true, view: 'side', need: ['sh', 'el', 'wr', 'hip', 'an'], step: 5, min: 10,
    cue: 'Hands down, hips high, push the floor away. Ears between your arms.',
    check: f => {
      const ok = f.S.hip.y < f.S.sh.y - 0.05 * f.torso && hipAng(f) < 125 && elbow(f) > 145;
      let cue = null;
      if (ok) { if (ang(f.S.hip, f.S.sh, f.S.wr) < 150) cue = 'Push tall through the shoulders.'; else if (hipAng(f) > 110) cue = 'Walk your feet a little closer.'; }
      return { ok, cue };
    }
  },
  wall_handstand: {
    name: 'Wall handstand hold', kind: 'hold', cam: true, view: 'side', need: ['sh', 'el', 'wr', 'hip', 'an'], step: 5, min: 10,
    cue: 'Belly to the wall. Push the floor away. Ribs in, legs squeezed.',
    check: f => {
      const ok = inverted(f) && incl(f.S.wr, f.S.an) > 60 && elbow(f) > 145;
      let cue = null;
      if (ok) {
        if (elbow(f) < 160) cue = 'Lock your arms.';
        else if (ang(f.S.hip, f.S.sh, f.S.wr) < 158) cue = 'Push tall. Open the shoulders.';
        else if (Math.abs(lineDev(f.S.sh, f.S.hip, f.S.an)) > 0.08) cue = 'Ribs in. Squeeze your glutes. Make one line.';
      }
      return { ok, cue };
    }
  },
  kickup_practice: { name: 'Kick-up practice', kind: 'timed', cue: 'Away from the wall. Small kicks, find the balance, come down safely by turning out. Quality over quantity.' },

  // core
  tuck_hollow: {
    name: 'Tuck hollow hold', kind: 'hold', cam: true, view: 'side', need: ['sh', 'hip', 'kn'], step: 5, min: 10,
    cue: 'Lower back pressed down, shoulders up, knees pulled in over the hips.',
    check: f => {
      const ok = incl(f.S.sh, f.S.hip) < 40 && f.S.sh.y < f.S.hip.y - 0.04 * f.torso && f.S.kn.y < f.S.hip.y - 0.04 * f.torso;
      return { ok, cue: null };
    }
  },
  hollow_hold: {
    name: 'Hollow body hold', kind: 'hold', cam: true, view: 'side', need: ['sh', 'hip', 'kn', 'an'], step: 5, min: 10,
    cue: 'Lower back glued to the floor. Ribs down, legs long, arms by your ears.',
    check: f => {
      const lift = 0.04 * f.torso;
      const ok = incl(f.S.sh, f.S.an) < 40 && f.S.sh.y < f.S.hip.y - lift && f.S.an.y < f.S.hip.y - lift / 2;
      let cue = null;
      if (ok) { if (knee(f) < 145) cue = 'Straighten your legs.'; }
      return { ok: ok && knee(f) > 120, cue };
    }
  },
  plank: {
    name: 'Plank', kind: 'hold', cam: true, view: 'side', need: ['sh', 'hip', 'an'], step: 10, min: 15,
    cue: 'Elbows under the shoulders, one straight line, squeeze everything.',
    check: f => ({ ok: bodyFlat(f, 'an', 30) && f.S.hip.y > f.S.sh.y - 0.3 * f.torso, cue: lineCue(f, 'an') })
  },
  reverse_plank: {
    name: 'Reverse plank', kind: 'hold', cam: true, view: 'side', need: ['sh', 'hip', 'an'], step: 5, min: 10,
    cue: 'Hands behind you, push the hips up. Chest open.',
    check: f => ({ ok: bodyFlat(f, 'an', 35), cue: lineDev(f.S.sh, f.S.hip, f.S.an) > 0.08 ? 'Push your hips up.' : null })
  },
  hollow_rock: { name: 'Hollow rocks', kind: 'tempo', tempo: 2, step: 2, min: 6, cue: 'Stay hollow and rock as one piece.' },
  dead_bug: { name: 'Dead bugs', kind: 'tempo', tempo: 3, step: 2, min: 6, cue: 'Low back flat. Opposite arm and leg reach long, slow.' },
  superman: { name: 'Supermans', kind: 'tempo', tempo: 3, step: 2, min: 6, cue: 'Lift chest and legs together. Squeeze the back, lower slow.' },

  // L-sit line (floor parallettes)
  support_hold: {
    name: 'Parallette support', kind: 'hold', cam: true, view: 'side', need: ['ear', 'sh', 'el', 'wr', 'hip'], step: 5, min: 10,
    cue: 'Hands on the bars, arms locked, heels on the floor. Push down and lift the hips. Long neck.',
    check: f => {
      const ok = elbow(f) > 150 && f.S.wr.y > f.S.sh.y + 0.3 * f.torso && incl(f.S.hip, f.S.sh) > 55;
      return { ok, cue: ok && shrugged(f) ? 'Push your shoulders down. Long neck.' : null };
    }
  },
  tuck_lsit: {
    name: 'Tuck L-sit', kind: 'hold', cam: true, view: 'side', need: ['ear', 'sh', 'el', 'wr', 'hip', 'kn', 'an'], step: 3, min: 5,
    cue: 'Press down, lock the arms, feet off the floor, knees pulled to the chest.',
    check: (f, ctx) => {
      const lifted = ctx.floorY == null || f.S.an.y < ctx.floorY - 0.05 * f.torso;
      const ok = elbow(f) > 145 && f.S.wr.y > f.S.sh.y + 0.3 * f.torso && lifted && f.S.kn.y < f.S.hip.y + 0.15 * f.torso;
      let cue = null;
      if (ok) { if (shrugged(f)) cue = 'Push your shoulders down.'; else if (f.S.kn.y > f.S.hip.y) cue = 'Pull the knees higher.'; }
      return { ok, cue };
    }
  },
  lsit: {
    name: 'L-sit', kind: 'hold', cam: true, view: 'side', need: ['ear', 'sh', 'el', 'wr', 'hip', 'kn', 'an'], step: 2, min: 3,
    cue: 'Lock the arms, push the floor away, legs straight and level, toes pointed.',
    check: (f, ctx) => {
      const lifted = ctx.floorY == null || f.S.an.y < ctx.floorY - 0.05 * f.torso;
      const ok = elbow(f) > 145 && lifted && knee(f) > 140 && incl(f.S.hip, f.S.an) < 35;
      let cue = null;
      if (ok) { if (knee(f) < 160) cue = 'Lock your knees.'; else if (f.S.an.y > f.S.hip.y + 0.12 * f.torso) cue = 'Lift the legs higher.'; else if (shrugged(f)) cue = 'Shoulders down.'; }
      return { ok, cue };
    }
  },
  lsit_lifts: { name: 'Seated leg lifts', kind: 'tempo', tempo: 2.5, step: 2, min: 5, cue: 'Sit tall, hands beside the knees. Lift both straight legs off the floor, lower with control.' },

  // legs
  squat: {
    name: 'Bodyweight squats', kind: 'reps', cam: true, view: 'any', need: ['sh', 'hip', 'kn', 'an'], step: 2, min: 5,
    cue: 'Chest tall. Knees over the toes. Sit deep.',
    sig: knee, top: 160, bottom: 125, ideal: 100,
    gate: f => incl(f.S.hip, f.S.sh) > 35,
    live: () => null,
    after: (s, f) => s.min > 110 ? 'Sit deeper.' : (f && incl(f.S.hip, f.S.sh) < 40 ? 'Chest up.' : null)
  },
  squat_jump: { name: 'Squat jumps', kind: 'timed', cam: true, move: true, cue: 'Sink, explode up, land soft.' },
  lunge: {
    name: 'Reverse lunges', kind: 'reps', cam: true, view: 'side', need: ['sh', 'hip', 'kn', 'an'], step: 2, min: 4,
    cue: 'Step back, drop the back knee toward the floor, drive through the front heel. Alternate legs.',
    sig: f => Math.min(knee(f), ang(f.O.hip, f.O.kn, f.O.an)), top: 155, bottom: 125, ideal: 105,
    gate: f => incl(f.S.hip, f.S.sh) > 50,
    live: () => null,
    after: s => s.min > 115 ? 'Drop the back knee lower.' : null
  },
  glute_bridge: {
    name: 'Glute bridges', kind: 'reps', cam: true, view: 'side', need: ['sh', 'hip', 'kn'], step: 2, min: 6,
    cue: 'Feet flat, drive through the heels, squeeze the glutes at the top.',
    sig: f => 200 - ang(f.S.sh, f.S.hip, f.S.kn), top: 55, bottom: 40, ideal: 32,
    gate: f => incl(f.S.sh, f.S.hip) < 50,
    live: () => null,
    after: s => s.min > 36 ? 'Squeeze higher at the top.' : null
  },
  wall_sit: {
    name: 'Wall sit', kind: 'hold', cam: true, view: 'side', need: ['sh', 'hip', 'kn', 'an'], step: 5, min: 15,
    cue: 'Back flat on the wall, thighs level, hands off the knees.',
    check: f => {
      const k = knee(f), ok = k > 65 && k < 125 && incl(f.S.hip, f.S.sh) > 60;
      return { ok, cue: ok && k > 110 ? 'Slide lower. Thighs level.' : null };
    }
  },
  calf_raise: { name: 'Calf raises', kind: 'tempo', tempo: 2, step: 2, min: 8, cue: 'Up on the toes, pause, come down slow.' },

  // body scan measurements
  reach_test: {
    name: 'Overhead reach', kind: 'measure', cam: true, view: 'side', need: ['sh', 'el', 'wr', 'hip'], better: 'max', hold: 3,
    cue: 'Stand tall, side-on. Keep the ribs down and raise both arms straight up as high as they go. Hold it.',
    measure: f => {
      const e = elbow(f), up = f.S.wr.y < f.nose.y;
      if (!up) return { ok: false };
      return { ok: e > 145, value: ang(f.S.hip, f.S.sh, f.S.wr), cue: e <= 150 ? 'Straighten your arms.' : null };
    }
  },
  fold_test: {
    name: 'Forward fold', kind: 'measure', cam: true, view: 'side', need: ['sh', 'wr', 'hip', 'kn', 'an'], better: 'max', hold: 3,
    cue: 'Legs straight and together. Fold forward from the hips and reach toward the floor. Relax and hold.',
    measure: f => {
      if (f.S.wr.y < f.S.hip.y || f.S.sh.y < f.S.hip.y - 0.6 * f.torso) return { ok: false };   // only measure once you are folded forward
      const k = knee(f), span = (f.S.an.y - f.S.kn.y) || 0.01;
      return { ok: k > 150, value: (f.S.wr.y - f.S.kn.y) / span, cue: k <= 155 ? 'Keep your knees straight.' : null };
    }
  },
  squat_test: {
    name: 'Deep squat', kind: 'measure', cam: true, view: 'side', need: ['sh', 'hip', 'kn', 'an'], better: 'min', hold: 3,
    cue: 'Feet shoulder width, heels down, arms forward. Squat as deep as you comfortably can and hold.',
    measure: f => {
      const k = knee(f);
      if (k > 130) return { ok: false };
      return { ok: true, value: k, extra: { hipBelow: f.S.hip.y > f.S.kn.y, lean: 90 - incl(f.S.hip, f.S.sh) } };
    }
  }
};

export const isCam = id => !!(EX[id] && EX[id].cam);
export const setupTip = id => (EX[id] && EX[id].view === 'front') ? FRONT_TIP : SIDE_TIP;

/* ---------- trackers ---------- */
function throttle(state, text, t, gap = 4, repeat = 12) {
  if (!text) return null;
  if (t - (state.lastAny || -99) < gap) return null;
  if (t - (state.last[text] || -99) < repeat) return null;
  state.lastAny = t; state.last[text] = t;
  return text;
}

/** Counts reps from a joint-angle signal and collects form cues. */
export class RepTracker {
  constructor(ex, target) {
    this.ex = ex; this.target = target || 0;
    this.reps = 0; this.good = 0; this.state = 'up'; this.min = Infinity; this.pending = null;
    this.firstT = null; this.lastRepT = null; this.visible = false; this.inPos = false;
    this.cues = { last: {}, lastAny: -99 }; this.faults = {};
  }
  update(f, t) {
    const ex = this.ex, out = [];
    const miss = missingParts(f, ex.need);
    this.visible = miss.length === 0;
    if (!this.visible) { this.missing = miss; return out; }
    this.inPos = ex.gate(f);
    if (!this.inPos) { if (this.state === 'down') this.min = Math.min(this.min, ex.sig(f)); return out; }
    const v = ex.sig(f);
    const live = ex.live(f);
    if (live && this.state === 'down') this.pending = live;
    if (this.state === 'up' && v < ex.bottom) { this.state = 'down'; this.min = v; if (this.firstT == null) this.firstT = t; }
    else if (this.state === 'down') {
      this.min = Math.min(this.min, v);
      if (v > ex.top) {
        this.reps++; this.lastRepT = t;
        const good = this.min <= ex.ideal + 8;
        if (good) this.good++;
        const fault = this.pending || ex.after({ min: this.min }, f);
        if (fault) this.faults[fault] = (this.faults[fault] || 0) + 1;
        out.push({ type: 'rep', n: this.reps, good, cue: throttle(this.cues, fault, t, 3, 10) });
        this.state = 'up'; this.min = Infinity; this.pending = null;
      }
    }
    return out;
  }
}

/** Times a hold only while you are actually in position. */
export class HoldTracker {
  constructor(ex, target) {
    this.ex = ex; this.target = target || 0;
    this.held = 0; this.holding = false; this.inSince = null; this.outSince = null; this.dropped = false;
    this.lastT = null; this.visible = false; this.ctx = { floorY: null, floorBuf: [] };
    this.cues = { last: {}, lastAny: -99 }; this.faults = {}; this.startT = null;
  }
  update(f, t) {
    const ex = this.ex, out = [];
    const dt = this.lastT == null ? 0 : Math.min(0.25, t - this.lastT); this.lastT = t;
    const miss = missingParts(f, ex.need);
    this.visible = miss.length === 0; this.missing = miss;
    let r = { ok: false };
    if (this.visible) {
      if (!this.holding && f.S.an && f.S.an.v > 0.5) {         // learn where the floor is while you get ready
        this.ctx.floorBuf.push(f.S.an.y); if (this.ctx.floorBuf.length > 90) this.ctx.floorBuf.shift();
        this.ctx.floorY = Math.max(...this.ctx.floorBuf);
      }
      r = ex.check(f, this.ctx);
    }
    if (r.ok) {
      this.outSince = null;
      if (this.inSince == null) this.inSince = t;
      if (!this.holding && t - this.inSince >= 0.4) { this.holding = true; this.startT = t; out.push({ type: 'start' }); }
    } else {
      this.inSince = null;
      if (this.holding && this.outSince == null) this.outSince = t;
    }
    if (this.holding && !this.dropped) {
      if (this.outSince != null && t - this.outSince > 1.0) {
        this.dropped = true; this.held = Math.max(0, this.held - (t - this.outSince));
        if (this.held >= 1.5) out.push({ type: 'drop', held: this.held });
        else { this.holding = false; this.dropped = false; this.held = 0; }   // a wobble at the start, not a real attempt
      } else this.held += dt;
      const c = r.ok ? throttle(this.cues, r.cue, t, 4, 10) : null;
      if (c) { this.faults[c] = (this.faults[c] || 0) + 1; out.push({ type: 'cue', text: c }); }
    }
    return out;
  }
}

/** Finds your best position for a scan measurement (held steady for a few seconds). */
export class MeasureTracker {
  constructor(ex) { this.ex = ex; this.okTime = 0; this.best = null; this.bestExtra = null; this.med = new Median(9); this.lastT = null; this.visible = false; this.cues = { last: {}, lastAny: -99 }; }
  update(f, t) {
    const ex = this.ex, out = [];
    const dt = this.lastT == null ? 0 : Math.min(0.25, t - this.lastT); this.lastT = t;
    const miss = missingParts(f, ex.need);
    this.visible = miss.length === 0; this.missing = miss;
    if (!this.visible) return out;
    const r = ex.measure(f);
    const c = throttle(this.cues, r.cue, t, 3, 8); if (c) out.push({ type: 'cue', text: c });
    if (!r.ok) { this.med.reset(); return out; }
    this.okTime += dt;
    const v = this.med.push(r.value);
    if (this.okTime > 0.6 && (this.best == null || (ex.better === 'max' ? v > this.best : v < this.best))) { this.best = v; this.bestExtra = r.extra || null; }
    if (this.okTime >= ex.hold) out.push({ type: 'done', value: this.best, extra: this.bestExtra });
    return out;
  }
}

/** For timed cardio: notices when you stop moving. */
export class MoveTracker {
  constructor() { this.prev = null; this.energy = 1; this.still = 0; this.lastT = null; this.cues = { last: {}, lastAny: -99 }; }
  update(f, t) {
    const out = [], dt = this.lastT == null ? 0 : Math.min(0.25, t - this.lastT); this.lastT = t;
    if (!f || !f.ok) return out;
    const pts = [f.P[15], f.P[16], f.P[25], f.P[26], f.hipM];
    if (this.prev && dt > 0) {
      const d = pts.reduce((a, p, i) => a + dist(p, this.prev[i]), 0) / pts.length / f.torso / dt;
      this.energy = this.energy * 0.9 + d * 0.1;
      this.still = this.energy < 0.35 ? this.still + dt : 0;
      if (this.still > 4) { const c = throttle(this.cues, 'Keep moving. Stay with me.', t, 5, 10); if (c) out.push({ type: 'cue', text: c }); }
    }
    this.prev = pts.map(p => ({ x: p.x, y: p.y }));
    return out;
  }
}
