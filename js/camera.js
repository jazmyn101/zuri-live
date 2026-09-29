// Camera + MediaPipe pose landmarker. Everything runs on the phone; no frames leave it.
import { FilesetResolver, PoseLandmarker } from '../vendor/vision_bundle.js';
import { EuroSmoother, makeFrame } from './geom.js';

const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32]];
const MODELS = { heavy: 'pose_landmarker_heavy.task', full: 'pose_landmarker_full.task', lite: 'pose_landmarker_lite.task' };

export class PoseCam {
  constructor(video, canvas) {
    this.video = video; this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.landmarker = null; this.modelKey = null; this.fs = null; this.stream = null; this.facing = 'user';
    this.onFrame = null; this.running = false; this.sim = null;
    this.lastVideoTime = -1; this.lastDetect = 0; this.raw = null; this.fps = 0; this.light = null;
    this.resetSmoothing();
    this._orient = () => { if (this.running && !this.sim && this.stream) this.start(this.facing).catch(() => {}); };
    window.addEventListener('orientationchange', () => setTimeout(this._orient, 400));
  }
  // tuned so reps at a normal pace keep ~99% of their range while still positions stay steady
  resetSmoothing() { this.sm2 = new EuroSmoother(33, ['x', 'y'], 1.5, 15); this.sm3 = new EuroSmoother(33, ['x', 'y', 'z'], 1.5, 6); }

  /** Load a pose model. 'heavy' is the most accurate (used for the body scan), 'full' is fast enough
   *  for live training. Falls back to lighter models if the phone can't run the one asked for. */
  async load(want, onProgress) {
    want = want || 'full';
    if (this.landmarker && this.modelKey === want) return;
    this.fs = this.fs || await FilesetResolver.forVisionTasks(new URL('../vendor/wasm', import.meta.url).href);
    const order = want === 'heavy' ? [['heavy', 'GPU'], ['full', 'GPU'], ['lite', 'GPU'], ['lite', 'CPU']] : [['full', 'GPU'], ['lite', 'GPU'], ['lite', 'CPU']];
    let err;
    for (const [key, delegate] of order) {
      try {
        onProgress && onProgress(key === 'heavy' ? 'Loading Zuri\'s sharpest eyes…' : key === 'full' ? 'Loading Zuri\'s eyes…' : 'Loading a lighter model…');
        const lm = await PoseLandmarker.createFromOptions(this.fs, {
          baseOptions: { modelAssetPath: new URL('../vendor/' + MODELS[key], import.meta.url).href, delegate },
          runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.6, minPosePresenceConfidence: 0.6, minTrackingConfidence: 0.6
        });
        if (this.landmarker) { try { this.landmarker.close(); } catch (e) {} }
        this.landmarker = lm; this.modelKey = want; this.model = key + ' ' + delegate;
        this.lastVideoTime = -1; this.resetSmoothing();
        return;
      } catch (e) { err = e; }
    }
    throw err;
  }

  async start(facing) {
    this.facing = facing || this.facing;
    this.stopStream();
    // Ask for the camera in the same orientation as the phone, so nothing gets cropped or zoomed.
    const land = window.innerWidth > window.innerHeight;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: this.facing, width: { ideal: land ? 1280 : 720 }, height: { ideal: land ? 720 : 1280 }, frameRate: { ideal: 30 } } });
    this.video.srcObject = this.stream;
    this.video.muted = true; this.video.playsInline = true;
    await this.video.play();
    this.resetSmoothing();
    if (!this.running) { this.running = true; this.loop(); }
  }

  startSim(fn) { this.sim = fn; this.resetSmoothing(); if (!this.running) { this.running = true; this.loop(); } }
  stopStream() { if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; } }
  stop() { this.running = false; this.stopStream(); }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());
    const v = this.video, now = performance.now();
    if (this.sim) { const s = this.sim(); this.handle(s && s.lm, s && s.world, s ? s.aspect : 1, now); this.draw(); return; }
    if (v.readyState < 2 || !v.videoWidth || !this.landmarker) return;
    if (v.currentTime === this.lastVideoTime || now - this.lastDetect < 28) return;
    this.lastVideoTime = v.currentTime;
    const dt = now - this.lastDetect; this.lastDetect = now; this.fps = this.fps * 0.9 + (1000 / Math.max(1, dt)) * 0.1;
    let res = null;
    try { res = this.landmarker.detectForVideo(v, now); } catch (e) { res = null; }
    this.handle(res && res.landmarks && res.landmarks[0], res && res.worldLandmarks && res.worldLandmarks[0], v.videoWidth / v.videoHeight, now);
    this.draw();        // draw the exact frame that was just measured, so the lines sit on your body
    if (!this._lightAt || now - this._lightAt > 1000) { this._lightAt = now; this.light = this.measureLight(); }
  }

  handle(raw, world, aspect, now) {
    const tt = now / 1000;
    this.raw = this.sm2.push(raw || null, tt);
    const w = world ? this.sm3.push(world, tt) : null;
    const t = tt * (window.__zuriSpeed || 1);
    const f = makeFrame(this.raw, aspect, t, w);
    this.onFrame && this.onFrame(f, t);
  }

  /** Average brightness 0-255 of the camera image. */
  measureLight() {
    try {
      const c = this._lc || (this._lc = document.createElement('canvas')); c.width = 32; c.height = 18;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(this.video, 0, 0, 32, 18);
      const d = x.getImageData(0, 0, 32, 18).data; let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      return s / (d.length / 4);
    } catch (e) { return null; }
  }

  /** Draw the camera image (mirrored for the selfie camera) and the tracked skeleton. */
  draw() {
    const c = this.canvas, ctx = this.ctx, v = this.video;
    const W = c.clientWidth, H = c.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!W || !H) return;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#07100C'; ctx.fillRect(0, 0, W, H);
    const vw = v.videoWidth || 1280, vh = v.videoHeight || 720;
    const s = Math.min(W / vw, H / vh), dw = vw * s, dh = vh * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
    const mirror = this.facing === 'user';
    if (v.videoWidth && !this.sim) {
      ctx.save();
      if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(v, W - dx - dw, dy, dw, dh); }
      else ctx.drawImage(v, dx, dy, dw, dh);
      ctx.restore();
      ctx.fillStyle = 'rgba(7,16,12,.22)'; ctx.fillRect(dx, dy, dw, dh);
    }
    const L = this.raw; if (!L) return;
    const X = p => (mirror ? 1 - p.x : p.x) * dw + dx, Y = p => p.y * dh + dy;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3, dw / 150);
    ctx.strokeStyle = this.tint || '#F2B33D';
    BONES.forEach(([a, b]) => {
      const p = L[a], q = L[b];
      if ((p.visibility ?? 1) < 0.5 || (q.visibility ?? 1) < 0.5) return;
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(X(p), Y(p)); ctx.lineTo(X(q), Y(q)); ctx.stroke();
    });
    ctx.globalAlpha = 1; ctx.fillStyle = '#FFFFFF';
    [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(i => { const p = L[i]; if ((p.visibility ?? 1) < 0.5) return; ctx.beginPath(); ctx.arc(X(p), Y(p), ctx.lineWidth * 0.8, 0, 7); ctx.fill(); });
  }

  /** A still photo from the camera (as you see it on screen), as a JPEG blob. */
  snapshot() {
    const v = this.video, c = document.createElement('canvas');
    const sc = Math.min(1, 1080 / Math.max(v.videoWidth, v.videoHeight));
    c.width = Math.round(v.videoWidth * sc); c.height = Math.round(v.videoHeight * sc);
    const x = c.getContext('2d');
    if (this.facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(v, 0, 0, c.width, c.height);
    return new Promise(r => c.toBlob(b => r(b), 'image/jpeg', 0.85));
  }
}
