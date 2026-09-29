# Zuri Live

Jazzy's hands-free calisthenics coach. Prop the phone on its side, 2–3 m away, and Zuri watches
through the camera: she counts reps, times holds only while you're in position, and calls out form.

- **Body scan** (about 12 min): overhead reach, forward fold, deep squat, max push-ups, hollow hold,
  tuck L-sit, wall handstand or pike hold, 45-second squats. Optional front/side progress photos.
- **Plan** built from the scan for three goals: freestanding handstand, full L-sit, lean and strong.
  Monday to Saturday, Wednesday is an easy day, Sunday is rest. Rescan every 4 weeks.
- **Progression**: two sessions in a row hitting every set moves a target up; two well short moves it down.

Everything runs on the phone (MediaPipe Pose, bundled in `vendor/`). Nothing is uploaded; scans,
logs and photos are stored in the browser on that phone.

Tests: `node test/detectors.test.mjs` and `node test/program.test.mjs`.
