// Pure geometry on MediaPipe pose landmarks. No DOM, so it can be unit-tested in Node.
// Coordinates: x is scaled by the frame's aspect ratio so one unit is the same length on both axes.
// y grows downward (screen space).

export const IDX = {
  nose: 0, lEar: 7, rEar: 8,
  lSh: 11, rSh: 12, lEl: 13, rEl: 14, lWr: 15, rWr: 16,
  lHip: 23, rHip: 24, lKn: 25, rKn: 26, lAn: 27, rAn: 28, lFt: 31, rFt: 32
};

const PARTS = ['ear', 'sh', 'el', 'wr', 'hip', 'kn', 'an', 'ft'];
const SIDE_IDX = {
  L: { ear: 7, sh: 11, el: 13, wr: 15, hip: 23, kn: 25, an: 27, ft: 31 },
  R: { ear: 8, sh: 12, el: 14, wr: 16, hip: 24, kn: 26, an: 28, ft: 32 }
};

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });

/** Angle at b, in degrees (0-180). */
export function ang(a, b, c) {
  const v1x = a.x - b.x, v1y = a.y - b.y, v2x = c.x - b.x, v2y = c.y - b.y;
  const d = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (!d) return 180;
  return Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / d))) * 180 / Math.PI;
}

/** Inclination of segment a-b from horizontal, 0 (flat) to 90 (vertical). */
export function incl(a, b) {
  return Math.atan2(Math.abs(b.y - a.y), Math.abs(b.x - a.x)) * 180 / Math.PI;
}

/** Signed distance of m from the line a-c, as a fraction of |a-c|.
 *  Positive = m sits lower on screen (larger y) than the line at that point. */
export function lineDev(a, m, c) {
  const L = dist(a, c); if (!L) return 0;
  const cross = ((c.x - a.x) * (m.y - a.y) - (c.y - a.y) * (m.x - a.x)) / L; // perpendicular distance, signed by direction
  // orient the sign so "below the line" is positive regardless of which way a->c points
  const sign = (c.x - a.x) >= 0 ? 1 : -1;
  return (cross * sign) / L;
}

/** Build a frame from raw landmarks (normalized 0-1) and the video's aspect ratio (w/h). */
export function makeFrame(raw, aspect, t) {
  if (!raw || !raw.length) return { t, ok: false };
  const P = raw.map(p => ({ x: p.x * aspect, y: p.y, v: p.visibility == null ? 1 : p.visibility, inX: p.x > 0.01 && p.x < 0.99, inY: p.y > 0.01 && p.y < 0.99 }));
  const sideScore = s => ['sh', 'el', 'wr', 'hip', 'kn', 'an'].reduce((a, k) => a + P[SIDE_IDX[s][k]].v, 0);
  const side = sideScore('L') >= sideScore('R') ? 'L' : 'R';
  const S = {}, O = {};
  PARTS.forEach(k => { S[k] = P[SIDE_IDX[side][k]]; O[k] = P[SIDE_IDX[side === 'L' ? 'R' : 'L'][k]]; });
  const shM = mid(P[11], P[12]), hipM = mid(P[23], P[24]), anM = mid(P[27], P[28]);
  const torso = dist(shM, hipM) || 0.2;
  const bodyLen = torso + dist(hipM, anM);
  const shoulderSpread = dist(P[11], P[12]) / torso;   // small = side-on, large = facing the camera
  return { t, ok: true, P, S, O, side, shM, hipM, anM, nose: P[0], torso, bodyLen, shoulderSpread, aspect };
}

/** Is every named side part visible and inside the frame? Returns the missing part names. */
export function missingParts(f, parts) {
  if (!f || !f.ok) return parts.slice();
  return parts.filter(k => { const p = f.S[k]; return !p || p.v < 0.5 || !p.inX || !p.inY; });
}

/** Exponential smoothing of landmark streams (reduces jitter without much lag). */
export class Smoother {
  constructor(alpha = 0.55) { this.a = alpha; this.prev = null; }
  push(raw) {
    if (!raw) { this.prev = null; return null; }
    if (!this.prev || this.prev.length !== raw.length) { this.prev = raw.map(p => ({ ...p })); return this.prev; }
    const a = this.a;
    this.prev = raw.map((p, i) => {
      const q = this.prev[i];
      return { x: q.x + a * (p.x - q.x), y: q.y + a * (p.y - q.y), z: p.z, visibility: (q.visibility ?? 1) + a * ((p.visibility ?? 1) - (q.visibility ?? 1)) };
    });
    return this.prev;
  }
}

/** Rolling median over the last n values; steadies a measurement before it is scored. */
export class Median {
  constructor(n = 9) { this.n = n; this.v = []; }
  push(x) { this.v.push(x); if (this.v.length > this.n) this.v.shift(); const s = this.v.slice().sort((a, b) => a - b); return s[s.length >> 1]; }
  reset() { this.v = []; }
}
