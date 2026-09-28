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
