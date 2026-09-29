// The weigh-in reminder as an iCalendar file, built on the phone by the service worker (sw.js), so "Add to calendar"
// needs no network and starts today. Must match reminderICS in src/body.ts (a test checks). Classic script: importScripts.
self.reminderICS = (every, day) => {
  const rule = { daily: 'FREQ=DAILY', '3x': 'FREQ=WEEKLY;BYDAY=MO,WE,FR', weekly: 'FREQ=WEEKLY;BYDAY=MO' }[every];
  if (!rule || !/^\d{8}$/.test(day)) return null;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uplift//Weigh-in//EN', 'BEGIN:VEVENT',
    `UID:uplift-weigh-in-${every}@uplift`, `DTSTAMP:${day}T000000`, `DTSTART:${day}T073000`, `DTEND:${day}T073500`, `RRULE:${rule}`,
    'SUMMARY:Weigh in (Uplift)', 'DESCRIPTION:Before breakfast: Uplift > Me > Log weigh-in',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Weigh in', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
};

// Training days (days: "MO,WE,FR", time: "0700", day: the first one, YYYYMMDD). Must match trainingICS in src/body.ts.
self.trainingICS = (days, time, day) => {
  const codes = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  const list = String(days).split(',');
  if (!list.length || !list.every((d) => codes.includes(d)) || new Set(list).size !== list.length) return null;
  if (!/^([01]\d|2[0-3])[0-5]\d$/.test(time) || !/^\d{8}$/.test(day)) return null;
  const sorted = [...list].sort((a, b) => codes.indexOf(a) - codes.indexOf(b));
  const end = `${String(Math.min(23, Number(time.slice(0, 2)) + 1)).padStart(2, '0')}${time.slice(2)}`;
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uplift//Training//EN', 'BEGIN:VEVENT',
    'UID:uplift-training@uplift', `DTSTAMP:${day}T000000`, `DTSTART:${day}T${time}00`, `DTEND:${day}T${end}00`, `RRULE:FREQ=WEEKLY;BYDAY=${sorted.join(',')}`,
    'SUMMARY:Workout (Uplift)', 'DESCRIPTION:Open Uplift for what to do today', 'URL:https://app.getuplift.pro/workout',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Time to train', 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
};
