import { buildPlan, seedTargets, buildSteps, minutes, levelOf, focusAreas, readiness, progress, SCAN } from '../js/program.js';
import { EX } from '../js/exercises.js';
let fails = 0; const check = (n, c, i) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); if (!c) fails++; };
for (const lv of [1, 2, 3, 4]) {
  const levels = { shoulders: lv, flex: lv, squatMob: lv, push: lv, core: lv, support: lv, invert: lv, legs: lv };
  const plan = buildPlan(levels), T = seedTargets(plan, {});
  const mins = [1, 2, 3, 4, 5, 6].map(d => minutes(buildSteps(plan[d], T)));
  const bad = []; for (const d in plan) plan[d].blocks.forEach(b => (b.items || []).concat(b.circuit ? b.circuit.items.map(ex => ({ ex })) : []).forEach(it => { if (!EX[it.ex]) bad.push(it.ex); }));
  check('level ' + lv + ': every exercise exists', bad.length === 0, bad);
  check('level ' + lv + ': main days 24-45 min, easy day 18-28', mins.every((m, i) => i === 2 ? m >= 18 && m <= 28 : m >= 24 && m <= 45), mins);
  check('level ' + lv + ': Wednesday is the lightest', mins[2] <= Math.min(...mins), mins);
}
const lv = { shoulders: levelOf('shoulders', { value: 150 }), flex: levelOf('flex', { value: 0.5 }), squatMob: levelOf('squatMob', { value: 80, extra: { hipBelow: false } }), push: levelOf('push', { value: 9, variant: 'full' }), core: levelOf('core', { value: 18 }), support: levelOf('support', { value: 4 }), invert: levelOf('invert', { value: 25, variant: 'pike' }), legs: levelOf('legs', { value: 28 }) };
check('levels from sample scan', JSON.stringify(lv) === JSON.stringify({ shoulders: 2, flex: 2, squatMob: 2, push: 3, core: 2, support: 2, invert: 1, legs: 3 }), lv);
const fa = focusAreas(lv);
check('focus areas are the biggest gaps', fa.length === 3 && fa.some(x => x.key === 'invert') && fa.some(x => x.key === 'core'), fa.map(x => x.key));
check('readiness in range', Object.values(readiness(lv)).every(x => x > 0 && x <= 100), readiness(lv));
let T = { wall_handstand: { v: 25, hits: 0, miss: 0 } };
const full = [1, 2, 3].map(n => ({ ex: 'wall_handstand', round: 0, target: 25, done: 25, how: 'full' }));
let r = progress(T, full); r = progress(r.T, full);
check('two full sessions move the target up 5s', r.T.wall_handstand.v === 30 && r.changes[0].dir === 'up', r);
const short = [1, 2, 3].map(n => ({ ex: 'wall_handstand', round: 0, target: 30, done: 12, how: 'short' }));
r = progress(r.T, short); r = progress(r.T, short);
check('two short sessions move it back down', r.T.wall_handstand.v === 25 && r.changes[0].dir === 'down', r);
check('scan has 8 tests', SCAN.length === 8);
console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
