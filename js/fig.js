// The animated demo figure: a stick athlete that shows each movement. Angles in degrees,
// 0 = right, 90 = down, -90 = up. Segments: torso (hip->shoulder), upper arm, forearm, thigh, shin.
const L = { T: 48, U: 29, F: 27, Th: 44, Sh: 42, N: 5, R: 9 };
const PARA = 12;
const P = (t, ua, fa, th, sh, o = {}) => ({ t, ua, fa, th, sh, ua2: o.ua2 ?? ua, fa2: o.fa2 ?? fa, th2: o.th2 ?? th, sh2: o.sh2 ?? sh, hd: o.hd ?? t, lift: o.lift ?? 0 });
const PLANK = P(-25, 90, 90, 155, 155), QUAD = P(-14, 90, 90, 90, 180), STAND = P(-90, 90, 90, 90, 90);
const PUSH_B = P(-13, 150, 40, 167, 167);
const PIKE = P(35, 75, 75, 109, 109), PIKE_B = P(50, 150, 45, 125, 125);

export const POSES = {
  arm_circles: { loop: 2, A: P(-90, -90, -90, 90, 90, { ua2: 90, fa2: 90 }), B: P(-90, 90, 90, 90, 90, { ua2: -90, fa2: -90 }) },
  wrist_prep: { loop: 3, A: QUAD, B: P(-9, 102, 102, 90, 180), g: ['w', 'a'] },
  cat_cow: { loop: 3.5, A: P(-8, 90, 90, 90, 180, { hd: 40 }), B: P(-20, 90, 90, 90, 180, { hd: -40 }) },
  jacks: { loop: 0.8, A: STAND, B: P(-90, -40, -40, 68, 68, { ua2: -140, fa2: -140, th2: 112, sh2: 112, lift: 4 }), g: ['a'] },
  high_knees: { loop: 0.6, A: P(-88, 115, 60, 0, 90, { ua2: -40, fa2: 40, th2: 90, sh2: 90 }), B: P(-88, -40, 40, 90, 90, { ua2: 115, fa2: 60, th2: 0, sh2: 90 }), g: ['a'] },
  mountain_climbers: { loop: 0.7, A: P(-25, 90, 90, 155, 155, { th2: 30, sh2: 160 }), B: P(-25, 90, 90, 30, 160, { th2: 155, sh2: 155 }), g: ['w'] },
  scap_pushup: { loop: 2.5, A: P(-23, 90, 90, 157, 157), B: P(-27, 90, 90, 153, 153), g: ['w', 'a'] },
  puppy_stretch: { hold: true, A: P(200, 180, 180, 90, 0, { hd: 190 }), B: P(205, 180, 180, 90, 0, { hd: 195 }), g: ['w', 'a', 'e'] },
  wall_slides: { loop: 3.5, wall: 'left', A: P(-90, -45, -100, 90, 90), B: P(-90, -80, -95, 90, 90), g: ['a'] },
  pike_stretch: { hold: true, A: P(-60, 20, 20, 0, 0, { hd: -40 }), B: P(-25, 10, 10, 0, 0, { hd: -10 }), g: ['h', 'a'] },
  fold: { hold: true, A: STAND, B: P(60, 90, 90, 90, 90, { hd: 75 }), g: ['a'] },
  deep_squat_hold: { hold: true, A: P(-75, 0, 0, -15, 110), B: P(-70, 0, 0, -20, 112), g: ['a'] },
  childs: { hold: true, A: P(20, 15, 15, 30, 180, { hd: 20 }), B: P(12, 5, 5, 15, 180, { hd: 12 }), g: ['a', 'w'] },
  sphinx: { hold: true, A: P(-25, 90, 0, 180, 180, { hd: -20 }), B: P(-40, 90, 0, 180, 180, { hd: -28 }), g: ['h', 'e'] },
  knee_pushup: { loop: 3, A: P(-35, 90, 90, 160, 200), B: P(-18, 150, 40, 170, 200), g: ['w', 'a'] },
  pushup: { loop: 3, A: PLANK, B: PUSH_B, g: ['w', 'a'] },
  para_pushup: { loop: 3, para: true, A: PLANK, B: PUSH_B, g: ['w', 'a'] },
  pike_pushup: { loop: 3, A: PIKE, B: PIKE_B, g: ['w', 'a'] },
  para_dip: { loop: 3, para: true, A: P(-90, 90, 90, -10, 20), B: P(-90, 150, 60, -10, 20), g: ['w'] },
  pike_hold: { hold: true, A: PIKE, B: P(36, 75, 75, 108, 108), g: ['w', 'a'] },
  wall_handstand: { hold: true, wall: 'left', A: P(90, 90, 90, -94, -94), B: P(90, 90, 90, -91, -91), g: ['w'] },
  kickup_practice: { loop: 2.4, A: PIKE, B: P(90, 90, 90, -90, -70, { th2: -120, sh2: -120 }), g: ['w'] },
  tuck_hollow: { hold: true, A: P(-155, -155, -155, -60, 20, { hd: -150 }), B: P(-158, -158, -158, -62, 18, { hd: -152 }), g: ['h'] },
  hollow_hold: { hold: true, A: P(-30, -30, -30, 200, 200), B: P(-33, -33, -33, 203, 203), g: ['h'] },
  plank: { hold: true, A: P(-18, 90, 0, 162, 162), B: P(-19, 90, 0, 161, 161), g: ['e', 'a'] },
  reverse_plank: { hold: true, A: P(205, 90, 90, 25, 25, { hd: 195 }), B: P(203, 90, 90, 27, 27, { hd: 193 }), g: ['w', 'a'] },
  hollow_rock: { loop: 2, A: P(-42, -42, -42, 192, 192), B: P(-22, -22, -22, 208, 208), g: ['h'] },
  dead_bug: { loop: 3, A: P(0, -90, -90, -90, 180, { hd: 0 }), B: P(0, -5, -5, -90, 180, { th2: -180, sh2: 180, ua2: -90, fa2: -90, hd: 0 }), g: ['h'] },
  superman: { loop: 3, A: P(0, 0, 0, 180, 180), B: P(-18, -18, -18, 198, 198), g: ['h'] },
  support_hold: { hold: true, para: true, A: P(-90, 90, 90, -5, 80), B: P(-90, 90, 90, -8, 78), g: ['w'] },
  tuck_lsit: { hold: true, para: true, A: P(-90, 90, 90, -50, 60), B: P(-90, 90, 90, -46, 62), g: ['w'] },
  lsit: { hold: true, para: true, A: P(-90, 90, 90, -2, -2), B: P(-90, 90, 90, 2, 2), g: ['w'] },
  lsit_lifts: { loop: 2.5, A: P(-85, 90, 90, 5, 5), B: P(-85, 90, 90, -25, -25), g: ['w'] },
  squat: { loop: 3, A: P(-90, -5, -5, 90, 90), B: P(-62, -5, -5, 0, 100), g: ['a'] },
  squat_jump: { loop: 1.2, A: P(-62, -5, -5, 0, 100), B: P(-90, -88, -88, 90, 90, { lift: 16 }), g: ['a'] },
  lunge: { loop: 3, A: STAND, B: P(-84, 90, 90, 5, 90, { th2: 110, sh2: 170 }), g: ['a'] },
  glute_bridge: { loop: 2.5, A: P(0, 178, 178, 230, 126, { hd: 0 }), B: P(22, 178, 178, 210, 90, { hd: 0 }), g: ['h', 'a', 'e'] },
  wall_sit: { hold: true, wall: 'left', A: P(-90, 90, 90, 0, 90), B: P(-90, 90, 90, 0, 90), g: ['a'] },
  calf_raise: { loop: 2, A: STAND, B: P(-90, 90, 90, 90, 90, { lift: 8 }), g: ['a'] },
  reach_test: { hold: true, A: STAND, B: P(-90, -88, -88, 90, 90), g: ['a'] },
  fold_test: { hold: true, A: STAND, B: P(80, 90, 90, 90, 90, { hd: 95 }), g: ['a'] },
  squat_test: { hold: true, A: STAND, B: P(-55, 0, 0, -8, 108), g: ['a'] },
  inversion: { hold: true, wall: 'left', A: PIKE, B: P(90, 90, 90, -92, -92), g: ['w'] },
  stand: { hold: true, A: STAND, B: STAND, g: ['a'] }
};

const DIR = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
const NUM = ['t', 'ua', 'fa', 'th', 'sh', 'ua2', 'fa2', 'th2', 'sh2', 'hd', 'lift'];
const lerp = (a, b, u) => { const o = {}; NUM.forEach(k => { o[k] = a[k] + (b[k] - a[k]) * u; }); return o; };
const ease = x => x * x * (3 - 2 * x);
function joints(p) {
  const add = (a, ang, len) => { const d = DIR(ang); return [a[0] + d[0] * len, a[1] + d[1] * len]; };
  const H = [0, 0], S = add(H, p.t, L.T), E = add(S, p.ua, L.U), W = add(E, p.fa, L.F), K = add(H, p.th, L.Th), A = add(K, p.sh, L.Sh);
  const E2 = add(S, p.ua2, L.U), W2 = add(E2, p.fa2, L.F), K2 = add(H, p.th2, L.Th), A2 = add(K2, p.sh2, L.Sh);
  return { H, S, E, W, K, A, E2, W2, K2, A2, C: add(S, p.hd, L.N + L.R) };
}
function ground(d, j) {
  const g = d.g || ['w', 'e', 'a', 'h'], ys = [];
  if (g.includes('w')) { const pa = d.para ? PARA : 0; ys.push(j.W[1] + pa, j.W2[1] + pa); }
  if (g.includes('e')) ys.push(j.E[1], j.E2[1]);
  if (g.includes('a')) ys.push(j.A[1], j.A2[1]);
  if (g.includes('h')) ys.push(j.H[1]);
  return Math.max(...ys);
}
const ALL = j => [j.H, j.S, j.E, j.W, j.K, j.A, j.E2, j.W2, j.K2, j.A2, j.C];
function prep(d) {
  if (d._s) return d;
  let minX = 1e9, maxX = -1e9, minY = 1e9;
  for (let i = 0; i <= 10; i++) {
    const p = lerp(d.A, d.B, i / 10), j = joints(p), g = ground(d, j);
    ALL(j).forEach(q => { minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1] - g - p.lift); });
    minY = Math.min(minY, j.C[1] - g - L.R - p.lift);
  }
  d._s = Math.min(2.1, 208 / (maxX - minX + 20), 112 / (-minY + 4)); d._cx = (minX + maxX) / 2; d._minX = minX;
  return d;
}

const NS = 'http://www.w3.org/2000/svg';
export class Figure {
  constructor(host) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 240 150'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Exercise demonstration');
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.append(e); return e; };
    this.wall = mk('rect', { y: 8, width: 5, height: 130, rx: 2, fill: 'var(--figdim)', opacity: '.5' });
    mk('line', { x1: 8, y1: 138, x2: 232, y2: 138, stroke: 'var(--figdim)', 'stroke-width': 2, 'stroke-linecap': 'round' });
    this.para = mk('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    const line = (c, w) => mk('polyline', { fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    this.arm2 = line('var(--figdim)', 6); this.leg2 = line('var(--figdim)', 6); this.torso = line('var(--fig)', 8); this.leg = line('var(--fig)', 7); this.arm = line('var(--accent)', 7);
    this.head = mk('circle', { r: 9, fill: 'var(--fig)' });
    host.innerHTML = ''; host.append(svg); this.id = null; this.t0 = performance.now();
  }
  show(id) { if (id !== this.id) { this.id = id; this.t0 = performance.now(); } }
  frame() {
    const d = POSES[this.id] || POSES.stand; prep(d);
    const t = (performance.now() - this.t0) / 1000;
    const u = d.hold ? ease(Math.min(1, t / 1.4)) : 0.5 - 0.5 * Math.cos(2 * Math.PI * t / (d.loop || 3));
    const p = lerp(d.A, d.B, u), j = joints(p), g = ground(d, j), s = d._s;
    const X = q => [120 + (q[0] - d._cx) * s, 138 + (q[1] - g - p.lift) * s];
    const pts = a => a.map(q => X(q).map(n => n.toFixed(1)).join(',')).join(' ');
    this.arm2.setAttribute('points', pts([j.S, j.E2, j.W2])); this.leg2.setAttribute('points', pts([j.H, j.K2, j.A2]));
    this.torso.setAttribute('points', pts([j.H, j.S])); this.leg.setAttribute('points', pts([j.H, j.K, j.A])); this.arm.setAttribute('points', pts([j.S, j.E, j.W]));
    const c = X(j.C); this.head.setAttribute('cx', c[0].toFixed(1)); this.head.setAttribute('cy', c[1].toFixed(1)); this.head.setAttribute('r', (L.R * s).toFixed(1));
    if (d.para) { const w = X(j.W), hw = 15 * s, ph = PARA * s; this.para.setAttribute('d', `M${w[0] - hw},138L${w[0] - hw},${138 - ph}L${w[0] + hw},${138 - ph}L${w[0] + hw},138`); this.para.style.display = ''; } else this.para.style.display = 'none';
    if (d.wall) { this.wall.setAttribute('x', (120 + (d._minX - d._cx) * s - 7).toFixed(1)); this.wall.style.display = ''; } else this.wall.style.display = 'none';
  }
}
