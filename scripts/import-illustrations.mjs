// Copy exercise illustrations from a Workout Guide checkout into public/illustrations/<our id>/{1,2,3}.svg.
// Artwork: Workout Guide by Bryl Lim, based on Everkinetic, CC BY-SA 4.0 (see public/illustrations/LICENSE.md).
//   git clone --depth 1 https://github.com/bryllim/workout-guide.git /tmp/wg
//   node scripts/import-illustrations.mjs /tmp/wg
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Our built-in exercise id → Workout Guide slug. Unlisted ids use their own id as the slug. `slug#2`: a held pose, so
// only that frame is used (copied to all three, so it stands still).
const SLUG = {
  'bench-press-bb': 'bench-press', 'incline-barbell-press': 'incline-bench-press', 'incline-db-press': 'incline-dumbbell-press',
  'flat-db-press': 'dumbbell-bench-press', 'bb-bent-row': 'barbell-row', 'seated-cable-row': 'seated-row',
  'cable-row-close': 'seated-row', 'one-arm-db-row': 'one-arm-dumbbell-row', 'pull-up': 'assisted-pull-up',
  'db-shrug': 'dumbbell-shrug', 'bb-shrug': 'shrug', 'ohp-bb': 'overhead-press', 'seated-db-press': 'seated-dumbbell-press',
  'db-front-raise': 'front-raise', 'back-squat': 'squat', 'rdl': 'romanian-deadlift', 'calf-raise': 'standing-calf-raise',
  'bb-curl': 'ez-bar-curl', 'db-biceps-curl': 'bicep-curl', 'alt-db-curl': 'bicep-curl', 'incline-db-curl': 'incline-dumbbell-curl',
  'cable-biceps-curl': 'cable-curl', 'triceps-pushdown': 'tricep-pushdown', 'rope-pushdown': 'rope-tricep-pushdown',
  'overhead-triceps-ext': 'overhead-tricep-extension', 'close-grip-bench': 'close-grip-bench-press',
  'ez-skull-crusher': 'skull-crusher', 'bench-dips': 'bench-dip',
  // activities (the rest have no drawing: `art: false`)
  'run': 'running', 'treadmill': 'running', 'walk': 'walking', 'treadmill-walk': 'treadmill-incline-walk', 'hike': 'hiking', 'cycle': 'cycling', 'indoor-cycle': 'cycling', 'swim': 'swimming', 'row-erg': 'rowing', 'elliptical': 'elliptical', 'stair-climber': 'stair-climber', 'jump-rope': 'jump-rope', 'yin-yoga': 'childs-pose', 'stretching': 'worlds-greatest-stretch', 'hiit': 'burpee', 'circuit': 'jumping-jack', 'wod': 'kettlebell-swing', 'spin': 'cycling',
  // yoga: the closest pose in the set (the rest have `art: false`); flows keep all three frames
  'surya-namaskar': 'hindu-push-up', 'marjaryasana-bitilasana': 'cat-cow-stretch', 'tadasana': 'toe-touch#3', 'uttanasana': 'toe-touch#1',
  'adho-mukha-svanasana': 'hindu-push-up#3', 'phalakasana': 'hindu-push-up#1', 'ashtanga-namaskara': 'hindu-push-up#2', 'balasana': 'childs-pose#1',
  'baddha-konasana': 'butterfly-stretch#1', 'paschimottanasana': 'seated-forward-fold-stretch#1', 'anjaneyasana': 'kneeling-hip-flexor-stretch#1',
  'salabhasana': 'superman-hold#1', 'setu-bandhasana': 'glute-bridge#2', 'navasana': 'v-up#1', 'pavanmuktasana': 'reverse-crunch#2', 'vasisthasana': 'side-plank#1',
};

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/import-illustrations.mjs <workout-guide checkout>'); process.exit(1); }
const pkg = join(src, 'packages/workout-guide');
const { BUILT_IN } = await import('../src/exercises.ts');
const out = 'public/illustrations';
rmSync(out, { recursive: true, force: true });
const missing = [];
for (const e of BUILT_IN.filter((x) => x.art !== false)) {
  const [slug, still] = (SLUG[e.id] ?? e.id).split('#');
  const from = (n) => join(pkg, 'assets', slug, `frame-${still ?? n}.svg`);
  if (![1, 2, 3].every((n) => existsSync(from(n)))) { missing.push(`${e.id} → ${slug}`); continue; }
  mkdirSync(join(out, e.id), { recursive: true });
  for (const n of [1, 2, 3]) copyFileSync(from(n), join(out, e.id, `${n}.svg`));
}
if (missing.length) { console.error('No frames for:\n' + missing.join('\n')); process.exit(1); }
writeFileSync(join(out, 'LICENSE.md'), `# Exercise illustrations

From [Workout Guide](https://github.com/bryllim/workout-guide) by [Bryl Lim](https://bryllim.com), based on artwork by
[Everkinetic](https://github.com/everkinetic/data), licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Per-frame sources and changes:
[manifest.json](https://github.com/bryllim/workout-guide/blob/main/packages/workout-guide/manifest.json).

Iron Log copies the frames unmodified and renames them to its own exercise ids (\`<id>/1.svg\`…\`3.svg\`).
This license covers these images only, not Iron Log's code.
`);
const drawn = BUILT_IN.filter((x) => x.art !== false).length;
console.log(`Copied ${drawn * 3} frames for ${drawn} exercises.`);
