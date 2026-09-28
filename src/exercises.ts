// The built-in exercise library (ships with the app, never stored). Custom exercises live in the log.
import type { Exercise } from "./model";

export const GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core"] as const;

const STRENGTH: readonly Exercise[] = [
 {
  "id": "bench-press-bb",
  "name": "Barbell Bench Press",
  "group": "Chest",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Eyes under the bar; shoulder blades pinched back and down.",
   "Feet flat and driven into the floor; small natural arch.",
   "Grip a little wider than shoulder width, wrists stacked over elbows."
  ],
  "exec": [
   "Unrack to over the shoulders; lower under control to the lower-chest / nipple line.",
   "Keep elbows tucked ~45-75 degrees; touch lightly.",
   "Press up and slightly back toward the face; keep the upper back tight."
  ],
  "avoid": [
   "Flaring elbows out to 90 degrees.",
   "Bouncing the bar off the chest.",
   "Hips lifting off the bench / losing upper-back tightness."
  ]
 },
 {
  "id": "incline-barbell-press",
  "name": "Incline Barbell Press",
  "group": "Chest",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Bench at about 30 degrees.",
   "Grip just outside shoulder width, wrists stacked over elbows.",
   "Shoulder blades retracted, feet planted."
  ],
  "exec": [
   "Unrack and lower under control to the upper chest / collarbone.",
   "Press up and slightly back; don't let it drift toward the face."
  ],
  "avoid": [
   "Setting the bench too steep - it becomes a shoulder press.",
   "Bouncing the bar off the chest.",
   "Flaring the elbows out to 90 degrees."
  ]
 },
 {
  "id": "incline-db-press",
  "name": "Incline Dumbbell Press",
  "group": "Chest",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Bench at about 30 degrees.",
   "Sit back with the dumbbells on your thighs, then kick them to shoulder level as you lie back.",
   "Shoulder blades retracted, wrists over elbows."
  ],
  "exec": [
   "Press up and slightly together without clashing the bells.",
   "Lower until the elbows are just below shoulder level; feel the upper-chest stretch."
  ],
  "avoid": [
   "Setting the bench too steep - it becomes a shoulder press.",
   "Letting the wrists bend back.",
   "Clanking the dumbbells together at the top."
  ]
 },
 {
  "id": "flat-db-press",
  "name": "Dumbbell Bench Press",
  "group": "Chest",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Lie flat, dumbbells over the lower chest.",
   "Shoulder blades retracted and 'set', feet planted."
  ],
  "exec": [
   "Lower with elbows ~45 degrees until level with the torso.",
   "Press up in a slight arc until the arms are nearly straight."
  ],
  "avoid": [
   "Over-lowering past a comfortable shoulder stretch.",
   "Bridging the hips up.",
   "Pushing the weights toward the head."
  ]
 },
 {
  "id": "machine-chest-press",
  "name": "Chest Press Machine",
  "group": "Chest",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Set the seat so the handles line up with mid-chest.",
   "Back and head against the pad, blades pulled back."
  ],
  "exec": [
   "Press smoothly to near-lockout.",
   "Return under control until the hands are level with the chest."
  ],
  "avoid": [
   "Seat too low (handles at the neck) or too high (at the belly).",
   "Shrugging the shoulders up to press.",
   "Letting the stack slam down."
  ]
 },
 {
  "id": "pec-deck",
  "name": "Pec Deck / Machine Fly",
  "group": "Chest",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Seat height so the forearms meet the pads at mid-chest with a soft elbow bend.",
   "Back flat on the pad, feet planted."
  ],
  "exec": [
   "Bring the pads together in a hugging arc; squeeze for a beat.",
   "Return slowly to a comfortable chest stretch."
  ],
  "avoid": [
   "Yanking with straight, locked arms.",
   "Overstretching the arms behind the torso.",
   "Rounding the shoulders forward at the finish."
  ]
 },
 {
  "id": "cable-fly",
  "name": "Cable Chest Fly",
  "group": "Chest",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "Pulleys set high, staggered stance, slight forward lean from the hips.",
   "Soft, fixed elbow bend held throughout."
  ],
  "exec": [
   "Sweep the handles down and together in front of the hips / navel.",
   "Cross the hands slightly, squeeze, return slowly to a stretch."
  ],
  "avoid": [
   "Bending and extending the elbows (turns it into a press).",
   "Standing bolt upright.",
   "Using so much weight it pulls you backward."
  ]
 },
 {
  "id": "push-up",
  "name": "Push-Ups",
  "group": "Chest",
  "equip": "Bodyweight",
  "weightType": "bodyweight",
  "setup": [
   "Hands just outside the shoulders, wrists under shoulders.",
   "Body in one straight line head to heels; glutes and abs braced."
  ],
  "exec": [
   "Lower until the chest is about a fist's height off the floor, elbows ~45 degrees.",
   "Press away and think about pushing the floor down."
  ],
  "avoid": [
   "Hips sagging or piking up.",
   "Head craning forward toward the floor.",
   "Half-reps that never reach the bottom."
  ]
 },
 {
  "id": "deadlift",
  "name": "Conventional Deadlift",
  "group": "Back",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Bar over mid-foot, shins about 2 cm away, hip-width stance.",
   "Hinge and grip just outside the knees; chest up, lats tight, flat back.",
   "Take the slack out of the bar before you pull."
  ],
  "exec": [
   "Push the floor away; keep the bar dragging up the legs.",
   "Hips and shoulders rise together; stand tall and lock the hips.",
   "Hinge back down under control, bar close to the legs."
  ],
  "avoid": [
   "Rounding the lower back or jerking the bar off the floor.",
   "Hips shooting up first (turns it into a stiff-leg pull).",
   "Leaning back / hyperextending at the top."
  ]
 },
 {
  "id": "bb-bent-row",
  "name": "Barbell Bent-Over Row",
  "group": "Back",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Hip-hinge to about 45 degrees or lower with a flat back.",
   "Bar hanging under the shoulders, shins vertical, core braced."
  ],
  "exec": [
   "Pull the bar to the lower ribs / navel, elbows past the torso.",
   "Squeeze the shoulder blades; lower fully under control."
  ],
  "avoid": [
   "Standing up more upright to heave the weight.",
   "Rounding or over-arching the back.",
   "Biceps-only tugs where the elbows barely move."
  ]
 },
 {
  "id": "t-bar-row",
  "name": "T-Bar Row",
  "group": "Back",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Straddle the bar (or landmine handle), hip-hinge to about 45 degrees with a flat back, chest up."
  ],
  "exec": [
   "Pull the handle to the lower chest / upper belly, elbows driving back and up.",
   "Squeeze the blades; lower under control."
  ],
  "avoid": [
   "Standing up to heave the weight.",
   "Rounding the back.",
   "Short, bouncing reps that never stretch out."
  ]
 },
 {
  "id": "lat-pulldown",
  "name": "Lat Pulldown",
  "group": "Back",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Thighs locked under the pad, grip slightly wider than the shoulders.",
   "Arms fully extended; hold a small constant backward lean of the torso."
  ],
  "exec": [
   "Drive the elbows down and back, bar to the upper chest.",
   "Squeeze the lats, then return to a full overhead stretch."
  ],
  "avoid": [
   "Leaning way back and using momentum.",
   "Pulling the bar behind the neck.",
   "Shoulders shrugging up at the top of the stretch."
  ]
 },
 {
  "id": "seated-cable-row",
  "name": "Seated Cable Row",
  "group": "Back",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "Knees soft, feet braced, sit tall with a natural spine.",
   "Arms extended without letting the shoulders round forward."
  ],
  "exec": [
   "Pull the handle to the lower abdomen, elbows close to the body.",
   "Squeeze the blades; return smoothly to a controlled stretch."
  ],
  "avoid": [
   "Big torso swing back and forth.",
   "Rounding forward on the stretch.",
   "Shrugging the shoulders toward the ears."
  ]
 },
 {
  "id": "cable-row-close",
  "name": "Cable Row - Close Grip",
  "group": "Back",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "Close (V-bar) handle, seated tall with a natural spine, arms extended."
  ],
  "exec": [
   "Pull the handle to the belly, elbows brushing the sides.",
   "Squeeze the mid-back; return to a controlled stretch."
  ],
  "avoid": [
   "Leaning far back to move more weight.",
   "Shrugging up at the finish.",
   "Letting the shoulders round forward on the stretch."
  ]
 },
 {
  "id": "single-arm-cable-row",
  "name": "Single-Arm Cable Row",
  "group": "Back",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "One hand on the handle, tall seated or standing stance, brace against the machine if standing."
  ],
  "exec": [
   "Row the handle to the ribs, elbow close to the body, squeeze.",
   "Return to a full stretch with no torso rotation."
  ],
  "avoid": [
   "Twisting the torso to help finish the rep.",
   "Shrugging the working shoulder.",
   "Using the free hand to cheat the pull."
  ]
 },
 {
  "id": "one-arm-db-row",
  "name": "Single-Arm Dumbbell Row",
  "group": "Back",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "One hand and knee on the bench, other foot planted.",
   "Back flat and roughly parallel to the floor; dumbbell hanging straight down."
  ],
  "exec": [
   "Row the dumbbell to the hip / lower ribs, elbow tight to the side.",
   "Squeeze, then lower to a full stretch with no torso rotation."
  ],
  "avoid": [
   "Twisting the torso open to lift more.",
   "Shrugging the working shoulder up.",
   "Jerking the weight off the bottom."
  ]
 },
 {
  "id": "pull-up",
  "name": "Assisted Pull-Up",
  "group": "Back",
  "equip": "Bodyweight / Machine",
  "weightType": "bodyweight",
  "setup": [
   "Grip shoulder-width or slightly wider.",
   "On an assisted machine, kneel/stand on the platform with just enough support to complete clean reps.",
   "Shoulders 'set' down and back before you pull; core braced."
  ],
  "exec": [
   "Pull the chest toward the bar, leading with the elbows.",
   "Chin clears the bar, then lower all the way to straight arms."
  ],
  "avoid": [
   "Kipping or swinging the legs for momentum.",
   "Stopping half-way up or not fully extending at the bottom.",
   "Using so much assistance that the last few reps stop being hard."
  ]
 },
 {
  "id": "chest-supported-row",
  "name": "Chest-Supported Row",
  "group": "Back",
  "equip": "Dumbbell / Machine",
  "weightType": "machine",
  "setup": [
   "Chest on the pad, feet planted, grip the handles with arms extended.",
   "Let the shoulders relax forward at the start."
  ],
  "exec": [
   "Row the handles back, elbows driving past the ribs.",
   "Squeeze the blades together; return to a full controlled stretch."
  ],
  "avoid": [
   "Peeling the chest off the pad to cheat.",
   "Using only the arms with no blade movement.",
   "Slamming the stack on the return."
  ]
 },
 {
  "id": "straight-arm-pulldown",
  "name": "Straight-Arm Pulldown",
  "group": "Back",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "High pulley; stand tall then hinge slightly forward.",
   "Arms nearly straight (soft elbow), bar at about forehead height."
  ],
  "exec": [
   "Sweep the bar down to the thighs in an arc using the lats.",
   "Keep the arms straight; return under control to the stretch."
  ],
  "avoid": [
   "Bending the elbows into a triceps pushdown.",
   "Rounding the back as you pull.",
   "Shrugging the shoulders."
  ]
 },
 {
  "id": "db-shrug",
  "name": "Dumbbell Shrug",
  "group": "Back",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Stand tall holding dumbbells at the sides, arms straight, shoulders relaxed."
  ],
  "exec": [
   "Shrug the shoulders straight up toward the ears, pause, then lower slowly under control."
  ],
  "avoid": [
   "Rolling the shoulders in a circle.",
   "Using the biceps to help lift.",
   "Bouncing at the bottom instead of a controlled stretch."
  ]
 },
 {
  "id": "bb-shrug",
  "name": "Barbell Shrug",
  "group": "Back",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Stand tall holding the bar in front of the thighs with a shoulder-width grip."
  ],
  "exec": [
   "Shrug straight up toward the ears, squeeze at the top, lower slowly."
  ],
  "avoid": [
   "Bending the elbows to help.",
   "Rolling the shoulders.",
   "Using leg drive / momentum to jerk the bar up."
  ]
 },
 {
  "id": "back-extension",
  "name": "Back Extension",
  "group": "Back",
  "equip": "Bodyweight",
  "weightType": "bodyweight",
  "setup": [
   "Hips on the pad of a hyperextension bench, ankles locked under the rollers, body hinged forward at the hips."
  ],
  "exec": [
   "Raise the torso until it is in line with the legs - a slight extension, not a big backbend.",
   "Lower back down under control."
  ],
  "avoid": [
   "Hyperextending past neutral at the top.",
   "Rounding the back at the bottom.",
   "Using momentum to whip up."
  ]
 },
 {
  "id": "ohp-bb",
  "name": "Barbell Overhead Press",
  "group": "Shoulders",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Bar resting on the front delts, hands just outside the shoulders.",
   "Elbows slightly in front of the bar; glutes and abs braced, ribs down."
  ],
  "exec": [
   "Press straight up, moving the head back slightly to clear the chin.",
   "Then push 'through' so the bar finishes over the mid-foot, biceps by the ears."
  ],
  "avoid": [
   "Leaning back into a standing incline press.",
   "Flaring the ribs / over-arching the lower back.",
   "Pressing around the face instead of clearing it."
  ]
 },
 {
  "id": "seated-db-press",
  "name": "Dumbbell Shoulder Press",
  "group": "Shoulders",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Upright bench with back support (or standing).",
   "Dumbbells at shoulder height just outside the delts, wrists over elbows."
  ],
  "exec": [
   "Press up and slightly in until the bells nearly touch.",
   "Lower under control to ear level."
  ],
  "avoid": [
   "Bouncing out of the bottom.",
   "Clashing the dumbbells overhead.",
   "Arching the back off the pad."
  ]
 },
 {
  "id": "machine-shoulder-press",
  "name": "Machine Shoulder Press",
  "group": "Shoulders",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Seat height so the handles start level with the shoulders, back flat against the pad."
  ],
  "exec": [
   "Press up until the arms are extended without locking out hard.",
   "Lower under control back to shoulder level."
  ],
  "avoid": [
   "Seat too low or high, changing the pressing angle.",
   "Shrugging up to press.",
   "Bouncing the weight at the bottom."
  ]
 },
 {
  "id": "lateral-raise",
  "name": "Dumbbell Lateral Raise",
  "group": "Shoulders",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Stand tall with a slight forward lean, soft elbows.",
   "Dumbbells at the sides, thumbs tipped slightly down."
  ],
  "exec": [
   "Raise out to the sides to about shoulder height, leading with the elbows.",
   "Pause, then lower slowly."
  ],
  "avoid": [
   "Swinging with the hips / using momentum.",
   "Going well above shoulder height and shrugging.",
   "Turning it into a front raise."
  ]
 },
 {
  "id": "db-front-raise",
  "name": "Dumbbell Front Raise",
  "group": "Shoulders",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Stand tall, dumbbells in front of the thighs, slight bend in the elbows held throughout."
  ],
  "exec": [
   "Raise one or both dumbbells forward to about shoulder height, leading with the hands.",
   "Lower slowly."
  ],
  "avoid": [
   "Swinging the torso or using momentum.",
   "Raising above shoulder height and shrugging.",
   "Locking the elbows fully straight."
  ]
 },
 {
  "id": "rear-delt-fly",
  "name": "Reverse / Rear-Delt Fly",
  "group": "Shoulders",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Hinge forward with a flat back, or rest the chest on an incline pad.",
   "Soft elbows, weights hanging down, traps relaxed."
  ],
  "exec": [
   "Open the arms out and back in a wide arc to shoulder level.",
   "Squeeze the rear delts; lower slowly."
  ],
  "avoid": [
   "Rowing with sharply bent elbows.",
   "Using the lower back to swing the weight up.",
   "Shrugging the traps toward the ears."
  ]
 },
 {
  "id": "face-pull",
  "name": "Face Pull",
  "group": "Shoulders",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "Rope set at upper-chest / face height; step back for tension.",
   "Arms extended, thumbs pointing back."
  ],
  "exec": [
   "Pull the rope toward the forehead, elbows high and wide.",
   "Let the hands separate; squeeze, return under control."
  ],
  "avoid": [
   "Dropping the elbows into a straight row.",
   "Using so much weight the torso gets dragged forward.",
   "Jerky, snatched reps."
  ]
 },
 {
  "id": "upright-row",
  "name": "Cable Upright Row",
  "group": "Shoulders",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "Grip about shoulder-width, arms straight, stand tall, core braced."
  ],
  "exec": [
   "Lead with the elbows, pulling the bar to about lower-chest height.",
   "Keep the elbows no higher than the shoulders; lower under control."
  ],
  "avoid": [
   "Narrow grip pulled to the chin (shoulder pinch).",
   "Shrugging and using body momentum.",
   "Letting the wrists roll far forward."
  ]
 },
 {
  "id": "back-squat",
  "name": "Barbell Back Squat",
  "group": "Legs",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Bar on the upper traps or rear delts, hands snug.",
   "Feet about shoulder-width, toes slightly out, whole foot planted.",
   "Take a big breath and brace the trunk hard before you descend."
  ],
  "exec": [
   "Break at the hips and knees together, knees tracking over the toes.",
   "Descend to at least parallel with a neutral spine.",
   "Drive up through the mid-foot, hips and chest rising together."
  ],
  "avoid": [
   "Knees caving inward.",
   "Heels lifting / weight shifting onto the toes.",
   "Lower back rounding at the bottom ('butt wink')."
  ]
 },
 {
  "id": "front-squat",
  "name": "Front Squat",
  "group": "Legs",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Bar on the front delts in a clean grip or crossed-arm rack.",
   "Elbows high, torso tall, feet about shoulder-width."
  ],
  "exec": [
   "Descend straight down, keeping the elbows up and torso upright.",
   "Hit depth, then drive up without the chest folding forward."
  ],
  "avoid": [
   "Elbows dropping so the bar rolls forward.",
   "Heels rising off the floor.",
   "Rounding the upper back."
  ]
 },
 {
  "id": "goblet-squat",
  "name": "Goblet Squat",
  "group": "Legs",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Hold one dumbbell vertically at the chest, both hands cupping the top plate.",
   "Feet shoulder-width, toes slightly out."
  ],
  "exec": [
   "Squat down between the knees, elbows brushing the inside of the knees near the bottom.",
   "Drive up through the whole foot, keeping the chest tall."
  ],
  "avoid": [
   "Letting the dumbbell drift away from the chest.",
   "Knees caving in.",
   "Rounding the upper back to keep the weight close."
  ]
 },
 {
  "id": "rdl",
  "name": "Romanian Deadlift",
  "group": "Legs",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Stand tall holding the bar at the hips, knees softly bent and fixed.",
   "Shoulder blades set, bar against the thighs."
  ],
  "exec": [
   "Push the hips back, sliding the bar down the thighs.",
   "Go until you feel a strong hamstring stretch (~mid-shin), back flat.",
   "Drive the hips forward to stand tall."
  ],
  "avoid": [
   "Bending the knees more (turns it into a deadlift).",
   "Rounding the back / letting the bar drift away from the legs.",
   "Over-arching and thrusting the hips at the top."
  ]
 },
 {
  "id": "leg-press",
  "name": "Leg Press",
  "group": "Legs",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Feet mid-platform, about shoulder-width, whole foot in contact.",
   "Hips and lower back flat against the pad."
  ],
  "exec": [
   "Lower the sled until the knees reach about 90 degrees, or just before the hips tuck.",
   "Press through the mid-foot without hard-locking the knees."
  ],
  "avoid": [
   "Lower back rounding off the pad at the bottom.",
   "Slamming into full lockout.",
   "Knees caving inward under load."
  ]
 },
 {
  "id": "bulgarian-split-squat",
  "name": "Bulgarian Split Squat",
  "group": "Legs",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Rear foot up on a bench behind you, laces down.",
   "Front foot far enough forward that the shin stays fairly vertical at the bottom."
  ],
  "exec": [
   "Lower straight down until the back knee nearly touches the floor.",
   "Drive up through the front heel; most of the work is the front leg."
  ],
  "avoid": [
   "Front foot too close to the bench (steep shin, knee strain).",
   "Pushing off the back leg.",
   "Torso collapsing forward."
  ]
 },
 {
  "id": "walking-lunge",
  "name": "Walking Lunge",
  "group": "Legs",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Dumbbells at the sides, tall posture, core braced, eyes forward."
  ],
  "exec": [
   "Step forward into a lunge; front shin near-vertical, back knee toward the floor.",
   "Push through the front heel to bring the back leg through into the next step."
  ],
  "avoid": [
   "Front knee collapsing inward or shooting far past the toes.",
   "Torso pitching forward.",
   "Tiny steps that crunch the front knee."
  ]
 },
 {
  "id": "reverse-lunge",
  "name": "Reverse Lunge",
  "group": "Legs",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Dumbbells at the sides, tall posture, feet hip-width."
  ],
  "exec": [
   "Step backward into a lunge, lowering the back knee toward the floor with the front shin near-vertical.",
   "Push through the front heel to return to standing."
  ],
  "avoid": [
   "Letting the front knee drift past the toes and stay there under load.",
   "Leaning the torso forward.",
   "Rushing the step back off-balance."
  ]
 },
 {
  "id": "step-up",
  "name": "Step-Up",
  "group": "Legs",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Dumbbells at the sides, box or bench about knee height, whole foot planted on top."
  ],
  "exec": [
   "Drive through the top foot to stand fully on the box, hips finishing level.",
   "Step down under control."
  ],
  "avoid": [
   "Pushing off the bottom foot to 'jump' up.",
   "Box too high, forcing the knee to cave.",
   "Leaning the torso forward for momentum."
  ]
 },
 {
  "id": "leg-extension",
  "name": "Leg Extension",
  "group": "Legs",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Back against the pad, knee joint aligned with the machine's pivot.",
   "Shin pad on the lower shin, just above the ankle."
  ],
  "exec": [
   "Extend to nearly straight; pause and squeeze the quads.",
   "Lower under control without letting the stack rest."
  ],
  "avoid": [
   "Kicking explosively and swinging.",
   "Hips lifting off the seat.",
   "So much weight that only the top few degrees move."
  ]
 },
 {
  "id": "seated-leg-curl",
  "name": "Seated Leg Curl",
  "group": "Legs",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Sit with the back against the pad, the ankle pad resting just above the heels, knee aligned with the machine's pivot."
  ],
  "exec": [
   "Curl the heels back and down toward the seat, squeezing the hamstrings.",
   "Return slowly to a full stretch."
  ],
  "avoid": [
   "Lower back rounding to muscle the weight.",
   "Fast, bouncy reps.",
   "Toes pointed hard through the whole set."
  ]
 },
 {
  "id": "lying-leg-curl",
  "name": "Lying Leg Curl",
  "group": "Legs",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Knee aligned with the pivot, ankle pad just above the heel.",
   "Hips pressed into the pad, light grip on the handles."
  ],
  "exec": [
   "Curl the heels toward the glutes as far as possible; squeeze.",
   "Lower slowly to a full stretch."
  ],
  "avoid": [
   "Hips rising / lower back arching to yank the weight.",
   "Fast, partial reps.",
   "Pointing the toes hard and cramping - keep the feet neutral."
  ]
 },
 {
  "id": "hip-thrust",
  "name": "Barbell Hip Thrust",
  "group": "Legs",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Upper back on a bench, bar over the hips with a pad.",
   "Feet flat, shins about vertical at the top; chin tucked."
  ],
  "exec": [
   "Drive through the heels to full hip extension - torso and thighs in a line.",
   "Squeeze the glutes hard at the top; lower under control."
  ],
  "avoid": [
   "Over-arching the lower back instead of extending the hips.",
   "Pushing through the toes.",
   "Feet too far out or too close to the hips."
  ]
 },
 {
  "id": "glute-bridge",
  "name": "Glute Bridge",
  "group": "Legs",
  "equip": "Bodyweight",
  "weightType": "bodyweight",
  "setup": [
   "Lie on your back, knees bent, feet flat close to the glutes, arms at the sides."
  ],
  "exec": [
   "Drive through the heels to lift the hips until the torso and thighs form a line.",
   "Squeeze the glutes at the top."
  ],
  "avoid": [
   "Over-arching the lower back.",
   "Pushing through the toes.",
   "Feet too far from the glutes, making it hamstring-only."
  ]
 },
 {
  "id": "calf-raise",
  "name": "Standing Calf Raise",
  "group": "Legs",
  "equip": "Machine",
  "weightType": "machine",
  "setup": [
   "Balls of the feet on the platform, heels free to drop.",
   "Knees straight but not locked, torso tall."
  ],
  "exec": [
   "Rise onto the toes as high as possible; pause at the top.",
   "Lower slowly to a deep stretch below the platform."
  ],
  "avoid": [
   "Bouncing through a tiny range.",
   "Bending the knees to cheat the movement.",
   "No pause at the top or stretch at the bottom."
  ]
 },
 {
  "id": "bb-curl",
  "name": "Barbell Biceps Curl",
  "group": "Arms",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Shoulder-width grip, elbows pinned to the sides.",
   "Tall posture, core braced, shoulders back."
  ],
  "exec": [
   "Curl the bar up by flexing the elbows only.",
   "Stop just short of the forearms going vertical; lower under control to straight arms."
  ],
  "avoid": [
   "Swinging the torso / using the hips.",
   "Elbows drifting forward at the top.",
   "Cutting the bottom range short."
  ]
 },
 {
  "id": "ez-bar-curl",
  "name": "EZ-Bar Curl",
  "group": "Arms",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "EZ-bar with an angled grip, elbows pinned to the sides, tall posture."
  ],
  "exec": [
   "Curl the bar up by flexing the elbows only; squeeze, lower under control to straight arms."
  ],
  "avoid": [
   "Swinging the torso.",
   "Elbows drifting forward at the top.",
   "Only doing the top half of the rep."
  ]
 },
 {
  "id": "db-biceps-curl",
  "name": "Dumbbell Biceps Curl",
  "group": "Arms",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Stand tall, a dumbbell in each hand at the sides, elbows pinned close to the body."
  ],
  "exec": [
   "Curl both dumbbells up together, rotating the palms up as they rise; squeeze, lower under control."
  ],
  "avoid": [
   "Swinging the torso for momentum.",
   "Elbows drifting forward.",
   "Cutting the bottom stretch short."
  ]
 },
 {
  "id": "alt-db-curl",
  "name": "Alternating Dumbbell Curl",
  "group": "Arms",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Stand tall, a dumbbell in each hand, elbows at the sides."
  ],
  "exec": [
   "Curl one arm up while the other stays extended; alternate sides with a controlled tempo."
  ],
  "avoid": [
   "Using the free arm's swing to help the working arm.",
   "Twisting the torso side to side.",
   "Rushing the alternation."
  ]
 },
 {
  "id": "hammer-curl",
  "name": "Dumbbell Hammer Curl",
  "group": "Arms",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Neutral grip, palms facing in, elbows at the sides, tall posture."
  ],
  "exec": [
   "Curl straight up keeping the palms neutral; squeeze.",
   "Lower slowly; alternate arms or both together."
  ],
  "avoid": [
   "Rocking the body for momentum.",
   "Letting the elbows travel forward.",
   "Rotating into a normal supinated curl."
  ]
 },
 {
  "id": "incline-db-curl",
  "name": "Incline Dumbbell Curl",
  "group": "Arms",
  "equip": "Dumbbell",
  "weightType": "dumbbell",
  "setup": [
   "Bench at about 45-60 degrees.",
   "Sit back so the arms hang straight down behind the torso line; shoulders relaxed."
  ],
  "exec": [
   "Curl up without letting the elbows swing forward; squeeze at the top.",
   "Lower to a full stretch with the arms hanging."
  ],
  "avoid": [
   "Shrugging the shoulders forward to start each rep.",
   "Bouncing at the bottom.",
   "Half-reps that skip the stretch."
  ]
 },
 {
  "id": "cable-biceps-curl",
  "name": "Cable Biceps Curl",
  "group": "Arms",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "Low pulley, straight or EZ handle, stand tall with elbows pinned to the sides."
  ],
  "exec": [
   "Curl the handle up under constant tension; squeeze, then lower slowly."
  ],
  "avoid": [
   "Stepping back and leaning to add momentum.",
   "Elbows drifting forward.",
   "Letting the weight stack slam between reps."
  ]
 },
 {
  "id": "preacher-curl",
  "name": "Preacher Curl",
  "group": "Arms",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Armpits over the top of the pad, upper arms flat on it, chest against it.",
   "Feet planted."
  ],
  "exec": [
   "Curl up to just short of vertical forearms to keep tension; squeeze.",
   "Lower slowly to nearly straight without slamming the elbows."
  ],
  "avoid": [
   "Fully relaxing / hyperextending at the bottom under load.",
   "Lifting the elbows off the pad.",
   "Using the shoulders to swing up."
  ]
 },
 {
  "id": "triceps-pushdown",
  "name": "Cable Triceps Pushdown",
  "group": "Arms",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "High pulley, bar attachment, elbows pinned to the sides, slight forward lean, core braced."
  ],
  "exec": [
   "Extend the arms fully down.",
   "Squeeze the triceps; return under control to about 90 degrees."
  ],
  "avoid": [
   "Elbows drifting out or up.",
   "Leaning over and using body weight to push.",
   "Short reps that never lock out."
  ]
 },
 {
  "id": "rope-pushdown",
  "name": "Rope Triceps Pushdown",
  "group": "Arms",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "Rope attachment on a high pulley, elbows pinned to the sides, slight forward lean."
  ],
  "exec": [
   "Push down and apart, spreading the rope ends at the bottom and turning the palms in.",
   "Squeeze, return under control."
  ],
  "avoid": [
   "Elbows drifting away from the body.",
   "Leaning on the weight instead of the triceps.",
   "Letting the rope snap back up."
  ]
 },
 {
  "id": "overhead-triceps-ext",
  "name": "Overhead Triceps Extension",
  "group": "Arms",
  "equip": "Cable / Dumbbell",
  "weightType": "cable",
  "setup": [
   "Rope from a low pulley, or a single dumbbell in both hands, held behind the head.",
   "Elbows pointing forward and close; upper arms fixed."
  ],
  "exec": [
   "Extend the elbows to straighten the arms overhead; squeeze.",
   "Lower slowly to a deep stretch behind the head."
  ],
  "avoid": [
   "Elbows flaring wide.",
   "Moving the upper arms / hinging at the shoulders.",
   "Over-arching the lower back."
  ]
 },
 {
  "id": "close-grip-bench",
  "name": "Close-Grip Bench Press",
  "group": "Arms",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Grip about shoulder-width - not narrower.",
   "Blades retracted, feet planted, wrists stacked."
  ],
  "exec": [
   "Lower the bar to the lower chest with the elbows tucked close.",
   "Press up and slightly back, locking out with the triceps."
  ],
  "avoid": [
   "Gripping so narrow the wrists hurt.",
   "Elbows flaring out wide.",
   "Bouncing the bar off the chest."
  ]
 },
 {
  "id": "ez-skull-crusher",
  "name": "EZ-Bar Skull Crushers",
  "group": "Arms",
  "equip": "Barbell",
  "weightType": "barbell",
  "setup": [
   "Lie on a flat bench, EZ-bar held with a narrow grip, upper arms vertical and fixed over the shoulders."
  ],
  "exec": [
   "Lower the bar toward the forehead / just behind it by bending the elbows only.",
   "Extend back up without moving the upper arms."
  ],
  "avoid": [
   "Letting the elbows flare or drift back over the face.",
   "Moving the upper arms instead of just the forearms.",
   "Using so much weight the elbows get hammered."
  ]
 },
 {
  "id": "bench-dips",
  "name": "Bench Dips",
  "group": "Arms",
  "equip": "Bodyweight",
  "weightType": "bodyweight",
  "setup": [
   "Hands on the edge of a bench behind you, fingers forward, legs extended out in front, hips close to the bench."
  ],
  "exec": [
   "Bend the elbows to lower the hips straight down, then press back up to straight arms."
  ],
  "avoid": [
   "Letting the hips drift forward away from the bench.",
   "Shoulders rolling forward into a pinched position.",
   "Flaring the elbows out wide."
  ]
 },
 {
  "id": "plank",
  "name": "Plank",
  "group": "Core",
  "equip": "Bodyweight",
  "weightType": "bodyweight",
  "metric": "secs",
  "setup": [
   "Forearms under the shoulders, elbows about 90 degrees.",
   "Feet together or hip-width; body in one straight line."
  ],
  "exec": [
   "Brace the abs as if about to be punched; squeeze the glutes.",
   "Tuck the ribs down and breathe normally; hold for time."
  ],
  "avoid": [
   "Hips sagging toward the floor or piking up.",
   "Head dropping / neck craning.",
   "Holding your breath."
  ]
 },
 {
  "id": "hanging-leg-raise",
  "name": "Hanging Leg Raise",
  "group": "Core",
  "equip": "Bodyweight",
  "weightType": "bodyweight",
  "setup": [
   "Dead hang from the bar, shoulders lightly 'set', legs together.",
   "Start with a slight backward tilt of the pelvis."
  ],
  "exec": [
   "Curl the pelvis and lift the legs to at least parallel (or knees to chest).",
   "Lower slowly with no swing."
  ],
  "avoid": [
   "Kipping / swinging to build momentum.",
   "Only raising the knees with a flat pelvis (hip-flexor-only).",
   "Dropping the legs fast at the end."
  ]
 },
 {
  "id": "cable-crunch",
  "name": "Cable Crunch",
  "group": "Core",
  "equip": "Cable",
  "weightType": "cable",
  "setup": [
   "Kneel below a high pulley, rope beside the head / neck.",
   "Hips fixed, slight forward hinge."
  ],
  "exec": [
   "Crunch by rounding the spine, bringing the ribs toward the pelvis.",
   "Squeeze the abs hard; return under control."
  ],
  "avoid": [
   "Turning it into a hip hinge (bowing from the hips).",
   "Pulling with the arms.",
   "Letting the weight yank you back upright."
  ]
 },
 {
  "id": "russian-twist",
  "name": "Russian Twist",
  "group": "Core",
  "equip": "Bodyweight",
  "weightType": "bodyweight",
  "setup": [
   "Sit with knees bent, heels down or feet raised.",
   "Lean the torso back ~45 degrees with a flat, not rounded, back; hands or a plate at the chest."
  ],
  "exec": [
   "Rotate the shoulders and ribcage to one side, reach or tap.",
   "Rotate to the other side; move from the trunk, not just the arms."
  ],
  "avoid": [
   "Rounding the lower back.",
   "Only swinging the arms while the torso stays still.",
   "Rushing until it becomes flailing."
  ]
 },
 {
  "id": "dead-bug",
  "name": "Dead Bug",
  "group": "Core",
  "equip": "Bodyweight",
  "weightType": "bodyweight",
  "setup": [
   "Lie on your back, arms straight up over the shoulders.",
   "Hips and knees bent to 90 degrees; press the lower back gently into the floor."
  ],
  "exec": [
   "Slowly lower the opposite arm and leg toward the floor, back staying flat.",
   "Return and switch sides."
  ],
  "avoid": [
   "Letting the lower back arch up off the floor.",
   "Holding your breath.",
   "Moving fast and losing control."
  ]
 },
 {
  "id": "ab-wheel",
  "name": "Ab Wheel Rollout",
  "group": "Core",
  "equip": "Wheel",
  "weightType": "bodyweight",
  "setup": [
   "Kneel with the wheel under the shoulders.",
   "Hips slightly tucked, back flat, abs and glutes braced hard."
  ],
  "exec": [
   "Roll forward as far as you can keep a flat, braced spine.",
   "Pull back with the abs - not the hips."
  ],
  "avoid": [
   "Letting the lower back sag as you extend.",
   "Rolling out further than you can control.",
   "Piking back with the hips instead of the abs."
  ]
 }
];

/** Cardio (time + distance) and activities (time + intensity). MET: light / moderate / vigorous (Compendium of Physical Activities). */
const ACTIVITIES: readonly Exercise[] = [
 {
  "id": "run",
  "name": "Running",
  "group": "Cardio",
  "equip": "Outdoor",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   7,
   9.8,
   11.5
  ],
  "icon": "walk",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "treadmill",
  "name": "Treadmill run",
  "group": "Cardio",
  "equip": "Treadmill",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   7,
   9.8,
   11.5
  ],
  "icon": "walk",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "walk",
  "name": "Walking",
  "group": "Cardio",
  "equip": "Outdoor",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   2.8,
   3.5,
   5
  ],
  "icon": "walk",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "treadmill-walk",
  "name": "Incline treadmill walk",
  "group": "Cardio",
  "equip": "Treadmill",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   4.5,
   6,
   8
  ],
  "icon": "trending-up",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "hike",
  "name": "Hiking",
  "group": "Cardio",
  "equip": "Outdoor",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   5.3,
   6,
   7.8
  ],
  "icon": "trail-sign",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "cycle",
  "name": "Cycling",
  "group": "Cardio",
  "equip": "Bike",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   5.8,
   8,
   10
  ],
  "icon": "bicycle",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "indoor-cycle",
  "name": "Indoor cycling",
  "group": "Cardio",
  "equip": "Stationary bike",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   4.8,
   6.8,
   8.8
  ],
  "icon": "bicycle",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "swim",
  "name": "Swimming",
  "group": "Cardio",
  "equip": "Pool",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   5.8,
   7,
   9.8
  ],
  "icon": "water",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "row-erg",
  "name": "Rowing machine",
  "group": "Cardio",
  "equip": "Rower",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   4.8,
   7,
   8.5
  ],
  "icon": "boat",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "elliptical",
  "name": "Elliptical",
  "group": "Cardio",
  "equip": "Machine",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   4.6,
   5,
   7
  ],
  "icon": "infinite",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "stair-climber",
  "name": "Stair climber",
  "group": "Cardio",
  "equip": "Machine",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   5,
   9,
   9.5
  ],
  "icon": "stats-chart",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "jump-rope",
  "name": "Jump rope",
  "group": "Cardio",
  "equip": "Rope",
  "weightType": "bodyweight",
  "kind": "cardio",
  "met": [
   8.8,
   11.8,
   12.3
  ],
  "icon": "pulse",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "hatha-yoga",
  "name": "Hatha yoga",
  "group": "Yoga & mobility",
  "equip": "Mat",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   2,
   2.5,
   3
  ],
  "icon": "leaf",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "vinyasa-yoga",
  "name": "Vinyasa yoga",
  "group": "Yoga & mobility",
  "equip": "Mat",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   3,
   4,
   5
  ],
  "icon": "leaf",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "power-yoga",
  "name": "Power yoga",
  "group": "Yoga & mobility",
  "equip": "Mat",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   3.5,
   4,
   5.5
  ],
  "icon": "leaf",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "yin-yoga",
  "name": "Yin / restorative yoga",
  "group": "Yoga & mobility",
  "equip": "Mat",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   1.8,
   2.3,
   2.5
  ],
  "icon": "leaf",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "pilates",
  "name": "Pilates",
  "group": "Yoga & mobility",
  "equip": "Mat",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   2.8,
   3,
   4
  ],
  "icon": "body",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "stretching",
  "name": "Stretching & mobility",
  "group": "Yoga & mobility",
  "equip": "Mat",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   2.3,
   2.3,
   2.8
  ],
  "icon": "body",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "breathwork",
  "name": "Meditation & breathwork",
  "group": "Yoga & mobility",
  "equip": "None",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   1.3,
   1.3,
   1.5
  ],
  "icon": "cloud",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "football",
  "name": "Football",
  "group": "Sports",
  "equip": "Ball",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   5,
   7,
   10
  ],
  "icon": "football",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "cricket",
  "name": "Cricket",
  "group": "Sports",
  "equip": "Bat & ball",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   4,
   4.8,
   6
  ],
  "icon": "baseball",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "badminton",
  "name": "Badminton",
  "group": "Sports",
  "equip": "Racket",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   4.5,
   5.5,
   7
  ],
  "icon": "tennisball",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "tennis",
  "name": "Tennis",
  "group": "Sports",
  "equip": "Racket",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   5,
   7.3,
   8
  ],
  "icon": "tennisball",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "squash",
  "name": "Squash",
  "group": "Sports",
  "equip": "Racket",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   7.3,
   9,
   12
  ],
  "icon": "tennisball",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "basketball",
  "name": "Basketball",
  "group": "Sports",
  "equip": "Ball",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   4.5,
   6.5,
   8
  ],
  "icon": "basketball",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "table-tennis",
  "name": "Table tennis",
  "group": "Sports",
  "equip": "Paddle",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   3,
   4,
   5
  ],
  "icon": "tennisball",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "padel",
  "name": "Padel",
  "group": "Sports",
  "equip": "Racket",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   5,
   6,
   7.5
  ],
  "icon": "tennisball",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "hiit",
  "name": "HIIT",
  "group": "Classes",
  "equip": "None",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   6,
   8,
   10
  ],
  "icon": "flash",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "circuit",
  "name": "Circuit training",
  "group": "Classes",
  "equip": "Mixed",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   4.3,
   6,
   8
  ],
  "icon": "repeat",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "wod",
  "name": "CrossFit-style WOD",
  "group": "Classes",
  "equip": "Mixed",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   6,
   8,
   10
  ],
  "icon": "barbell",
  "setup": [],
  "exec": [],
  "avoid": []
 },
 {
  "id": "boxing",
  "name": "Boxing / kickboxing",
  "group": "Classes",
  "equip": "Gloves",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   5.5,
   7.8,
   12.8
  ],
  "icon": "hand-left",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "martial-arts",
  "name": "Martial arts",
  "group": "Classes",
  "equip": "None",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   5.3,
   7.8,
   10.3
  ],
  "icon": "hand-right",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "dance",
  "name": "Dance",
  "group": "Classes",
  "equip": "None",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   4.5,
   5.5,
   7.8
  ],
  "icon": "musical-notes",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "zumba",
  "name": "Zumba",
  "group": "Classes",
  "equip": "None",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   5.5,
   6.5,
   7.8
  ],
  "icon": "musical-notes",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "climbing",
  "name": "Climbing / bouldering",
  "group": "Classes",
  "equip": "Wall",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   5.8,
   7.3,
   8
  ],
  "icon": "trending-up",
  "setup": [],
  "exec": [],
  "avoid": [],
  "art": false
 },
 {
  "id": "spin",
  "name": "Spin class",
  "group": "Classes",
  "equip": "Stationary bike",
  "weightType": "bodyweight",
  "kind": "activity",
  "met": [
   6.8,
   8.5,
   11
  ],
  "icon": "bicycle",
  "setup": [],
  "exec": [],
  "avoid": []
 }
];

export const BUILT_IN: readonly Exercise[] = [...STRENGTH, ...ACTIVITIES];
