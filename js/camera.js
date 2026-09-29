// Camera + MediaPipe pose landmarker. Everything runs on the phone; no frames leave it.
import { FilesetResolver, PoseLandmarker } from '../vendor/vision_bundle.js';
import { Smoother, makeFrame } from './geom.js';

const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32]];

export class PoseCam {
  constructor(video, canvas) {
    this.video = video; this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.landmarker = null; this.stream = null; this.facing = 'user';
    this.smoother = new Smoother(0.55); this.onFrame = null; this.running = false;
    this.lastVideoTime = -1; this.lastDetect = 0; this.raw = null; this.fps = 0; this.sim = null;
  }

  async load(onProgress) {
    if (this.landmarker) return;
    const fs = await FilesetResolver.forVisionTasks(new URL('../vendor/wasm', import.meta.url).href);
    const tries = [['pose_landmarker_full.task', 'GPU'], ['pose_landmarker_lite.task', 'GPU'], ['pose_landmarker_lite.task', 'CPU']];
    let err;
    for (const [model, delegate] of tries) {
      try {
        onProgress && onProgress(model.includes('full') ? 'Loading Zuri\'s eyes…' : 'Loading a lighter model…');
        this.landmarker = await PoseLandmarker.createFromOptions(fs, {
          baseOptions: { modelAssetPath: new URL('../vendor/' + model, import.meta.url).href, delegate },
          runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5
        });
        this.model = model + ' ' + delegate;
        return;
      } catch (e) { err = e; }
    }
    throw err;
  }

  async start(facing) {
    this.facing = facing || this.facing;
    this.stopStream();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: this.facing, width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 30 } } });
    this.video.srcObject = this.stream;
    this.video.muted = true; this.video.playsInline = true;
    await this.video.play();
    this.running = true; this.smoother = new Smoother(0.55);
    this.loop();
  }

  startSim(fn) { this.sim = fn; this.running = true; this.smoother = new Smoother(0.55); this.loop(); }

  stopStream() { if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; } }
  stop() { this.running = false; this.stopStream(); }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());
    const v = this.video, now = performance.now();
    if (this.sim) { const s = this.sim(); this.handle(s && s.lm, s ? s.aspect : 1, now); this.draw(); return; }
    if (v.readyState < 2 || !v.videoWidth) return;
    if (v.currentTime !== this.lastVideoTime && now - this.lastDetect >= 30 && this.landmarker) {
      this.lastVideoTime = v.currentTime;
      const dt = now - this.lastDetect; this.lastDetect = now; this.fps = this.fps * 0.9 + (1000 / Math.max(1, dt)) * 0.1;
      let res = null;
      try { res = this.landmarker.detectForVideo(v, now); } catch (e) { res = null; }
      this.handle(res && res.landmarks && res.landmarks[0], v.videoWidth / v.videoHeight, now);
    }
    this.draw();
  }

  handle(raw, aspect, now) {
    this.raw = this.smoother.push(raw || null);
    const t = now / 1000 * (window.__zuriSpeed || 1);
    const f = makeFrame(this.raw, aspect, t);
    this.onFrame && this.onFrame(f, t);
  }

  /** Draw the camera image (mirrored for the selfie camera) and the tracked skeleton. */
  draw() {
    const c = this.canvas, ctx = this.ctx, v = this.video;
    const W = c.clientWidth, H = c.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#07100C'; ctx.fillRect(0, 0, W, H);
    const vw = v.videoWidth || 720, vh = v.videoHeight || 1280;
    const s = Math.min(W / vw, H / vh), dw = vw * s, dh = vh * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
    const mirror = this.facing === 'user';
    if (v.videoWidth && !this.sim) {
      ctx.save();
      if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(v, W - dx - dw, dy, dw, dh); }
      else ctx.drawImage(v, dx, dy, dw, dh);
      ctx.restore();
      ctx.fillStyle = 'rgba(7,16,12,.28)'; ctx.fillRect(dx, dy, dw, dh);
    }
    const L = this.raw; if (!L) return;
    const X = p => (mirror ? 1 - p.x : p.x) * dw + dx, Y = p => p.y * dh + dy;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(4, dw / 110);
    ctx.strokeStyle = this.tint || '#F2B33D';
    BONES.forEach(([a, b]) => {
      const p = L[a], q = L[b];
      if ((p.visibility ?? 1) < 0.5 || (q.visibility ?? 1) < 0.5) return;
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(X(p), Y(p)); ctx.lineTo(X(q), Y(q)); ctx.stroke();
    });
    ctx.globalAlpha = 1; ctx.fillStyle = '#FFFFFF';
    [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(i => { const p = L[i]; if ((p.visibility ?? 1) < 0.5) return; ctx.beginPath(); ctx.arc(X(p), Y(p), ctx.lineWidth * 0.75, 0, 7); ctx.fill(); });
  }

  /** A still photo from the camera (unmirrored), as a JPEG blob. */
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
