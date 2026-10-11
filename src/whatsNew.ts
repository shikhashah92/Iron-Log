// What's new: every release, newest first. Add an entry with each user-facing change (the Home card shows the top one).
import type Ionicons from '@expo/vector-icons/Ionicons';

export type ChangeKind = 'new' | 'better' | 'fixed';
export interface Change { kind: ChangeKind; icon: keyof typeof Ionicons.glyphMap; title: string; text: string }
export interface Release { date: string; title: string; changes: Change[] }

export const RELEASES: Release[] = [
  { date: '2026-10-11', title: 'A cleaner, smarter Uplift', changes: [
    { kind: 'better', icon: 'home-outline', title: 'A focused Home', text: 'Start your next planned workout in one tap. Setup tips come one at a time, and your weight only shows up when a weigh-in is due.' },
    { kind: 'better', icon: 'barbell-outline', title: 'A tidier Workout tab', text: 'Empty, activity and past workouts sit side by side, and the ready-made list is shorter, with See all for the rest.' },
    { kind: 'better', icon: 'play-circle-outline', title: 'Start from any exercise', text: 'On an exercise’s page, Start a workout sits right under the picture, with Watch how and Your photo beside it.' },
    { kind: 'better', icon: 'stats-chart-outline', title: 'Trends, reordered', text: 'Muscles worked and your weekly bars come first. Your streak now sits in This month.' },
    { kind: 'fixed', icon: 'construct-outline', title: 'Small fixes', text: 'Clearer month-on-month changes, short workouts no longer show 0 minutes, and the goblet squat says One dumbbell.' },
    { kind: 'better', icon: 'person-circle-outline', title: 'A calmer Me tab', text: 'Your weight, its chart and Log weigh-in now sit together, with your target, trophies and challenges as single rows.' },
    { kind: 'new', icon: 'analytics-outline', title: 'Touch a chart to read it', text: 'Drag along the weight or exercise charts to see each day’s numbers.' },
    { kind: 'better', icon: 'settings-outline', title: 'Settings, sorted', text: 'Grouped into workouts, reminders, your data and help. Units and weigh-in reminders live here now.' },
    { kind: 'new', icon: 'body-outline', title: 'Exercises for each muscle', text: 'In History → Trends, tap a muscle on the body map to see exercises that work it. Your favourites and recent ones come first.' },
    { kind: 'new', icon: 'logo-youtube', title: 'Watch how on YouTube', text: 'Every exercise page has a button that finds form videos for it on YouTube.' },
    { kind: 'new', icon: 'information-circle-outline', title: 'Look before you lift', text: 'Open an exercise’s page from a template preview, or from the ⓘ in the exercise picker.' },
    { kind: 'fixed', icon: 'calculator-outline', title: 'Goblet squat volume', text: 'One dumbbell is no longer counted twice. Your own dumbbell exercises can be set to one or two dumbbells.' },
    { kind: 'better', icon: 'flag-outline', title: 'A smoother finish', text: 'No more questions about sets you never filled in. Uplift only offers to update a template when you changed it on purpose, and saving takes you to History.' },
    { kind: 'better', icon: 'sparkles-outline', title: 'A friendlier first workout', text: 'Empty fields say kg and reps, there’s a tip for choosing a starting weight, and the tour closes when you tap outside it.' },
    { kind: 'better', icon: 'barbell-outline', title: 'Plates, one tap away', text: 'Tap kg on any barbell lift to open the plate calculator. The rest timer no longer covers your next set.' },
  ] },
  { date: '2026-10-07', title: 'Times you can fix', changes: [
    { kind: 'new', icon: 'time-outline', title: 'Edit when you trained', text: 'Change a workout’s start and end time, during it or afterwards.' },
    { kind: 'new', icon: 'calendar-outline', title: 'Log a past workout', text: 'Forgot to log one? Add it from the Workout tab, then fill in what you did.' },
    { kind: 'better', icon: 'checkmark-done-outline', title: 'Finish at the bottom', text: 'The Finish button now waits at the end of your workout too. If you forgot to close one, Uplift asks when you really finished.' },
  ] },
  { date: '2026-10-05', title: 'Your body, mapped', changes: [
    { kind: 'new', icon: 'body-outline', title: 'Muscle map', text: 'See the muscles you’ve worked, shaded on a front and back body, over 7 days to a year.' },
    { kind: 'better', icon: 'swap-horizontal-outline', title: 'Pounds everywhere', text: 'Pick lb in Me and the whole app follows: lifts, plates, records, charts and sharing.' },
    { kind: 'fixed', icon: 'cloud-download-outline', title: 'Strong import', text: 'Imports that have exercises with similar names now load properly.' },
  ] },
  { date: '2026-10-04', title: 'Drag, drop, open', changes: [
    { kind: 'new', icon: 'reorder-three-outline', title: 'Drag to reorder', text: 'Hold and drag to put exercises in a different order.' },
    { kind: 'new', icon: 'color-wand-outline', title: 'A new opening', text: 'An animated Uplift splash every time the app opens.' },
    { kind: 'better', icon: 'lock-closed-outline', title: 'Locked down tighter', text: 'Stricter browser security rules, so only Uplift’s own code can run in the app.' },
    { kind: 'better', icon: 'mail-outline', title: 'Say hello', text: 'Feedback and support now go to hello@getuplift.pro.' },
  ] },
  { date: '2026-09-30', title: 'Small fixes, big relief', changes: [
    { kind: 'fixed', icon: 'eye-outline', title: 'No more blank screen', text: 'Saving your details in Me no longer leaves an empty screen behind.' },
    { kind: 'better', icon: 'cloud-download-outline', title: 'Newer Strong exports', text: 'Strong’s newer export files import too, units and all.' },
    { kind: 'better', icon: 'calendar-number-outline', title: 'Type your birthday', text: 'Enter your date of birth by typing it, not scrolling.' },
  ] },
  { date: '2026-09-29', title: 'Reasons to come back', changes: [
    { kind: 'new', icon: 'radio-button-on-outline', title: 'Weekly goal', text: 'Pick 2–6 workouts a week and watch the ring fill. Rest days never break your streak.' },
    { kind: 'new', icon: 'trophy-outline', title: 'Milestones', text: '36 trophies, from your first workout to a blue whale’s worth of tonnes lifted.' },
    { kind: 'new', icon: 'trending-up', title: 'Beat last time', text: 'A suggestion for each exercise: a step up when it went well, hold when it was a grind.' },
    { kind: 'new', icon: 'gift-outline', title: 'Monthly Wrapped', text: 'Your month in a few swipes, plus reminders on your training days.' },
    { kind: 'new', icon: 'people-outline', title: 'Challenges', text: 'Join a challenge, or dare a friend to match your best lift.' },
  ] },
  { date: '2026-09-28', title: 'Hello, Uplift', changes: [
    { kind: 'new', icon: 'rocket-outline', title: 'Iron Log is now Uplift', text: 'A new name, a new look, and every Iron Log backup still restores.' },
    { kind: 'new', icon: 'phone-portrait-outline', title: 'Everything stays on your phone', text: 'No account, no cloud. Your log lives on this phone, with locked backups you keep yourself.' },
    { kind: 'new', icon: 'list-outline', title: 'Workouts, the Strong way', text: 'Templates fill in last session’s numbers. Tick each set as you go and the rest timer starts.' },
    { kind: 'new', icon: 'albums-outline', title: 'Ready-made templates', text: 'Full body, Push, Pull, Legs and more, plus plans that rotate them through your week.' },
    { kind: 'new', icon: 'stats-chart-outline', title: 'History and trends', text: 'A calendar of your training, month-on-month numbers, streaks and charts for every exercise.' },
    { kind: 'new', icon: 'medal-outline', title: 'Personal bests and sharing', text: 'See every record you beat, and share a workout as a story picture.' },
    { kind: 'new', icon: 'scale-outline', title: 'The Me tab', text: 'Weigh-ins, a smoothed trend, measurements, and a target weight with a steady plan.' },
    { kind: 'new', icon: 'leaf-outline', title: 'Yoga and activities', text: '41 asanas, Surya Namaskar and pranayama, plus runs, classes and sports, with calories.' },
    { kind: 'new', icon: 'cloud-download-outline', title: 'Import from Strong', text: 'Bring your whole Strong history over from its CSV export.' },
    { kind: 'new', icon: 'map-outline', title: 'Install first, then a tour', text: 'Add Uplift to your Home Screen, set up in a few steps, then take a quick tour of the app.' },
  ] },
  { date: '2026-09-16', title: 'Iron Log grows up', changes: [
    { kind: 'new', icon: 'copy-outline', title: 'Templates and favourites', text: 'Save workouts as templates and star the exercises you use most.' },
    { kind: 'new', icon: 'stopwatch-outline', title: 'Workout timer and feelings', text: 'Start and end a workout, then note how it felt.' },
    { kind: 'new', icon: 'people-circle-outline', title: 'Profiles', text: 'Keep logs for several people on one phone.' },
  ] },
  { date: '2026-09-11', title: 'Day one', changes: [
    { kind: 'new', icon: 'flash-outline', title: 'Iron Log begins', text: 'The first version: log your lifts, set by set, from your phone.' },
  ] },
];
export const LATEST = RELEASES[0].date;

