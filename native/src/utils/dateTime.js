/**
 * Date/time utilities — 1:1 from web TrackerCard.js / halfsheets
 */

// Web formatDateTime: "Sun 3:45 pm"
export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[d.getDay()];
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const mins = minutes < 10 ? '0' + minutes : minutes;
  return `${day} ${hours}:${mins} ${ampm}`;
}

// Web formatElapsedHmsTT: { h, m, s, str: "1h 23m 45s" }
export function formatElapsedHmsTT(ms) {
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

  if (h > 0) {
    const hStr = h >= 10 ? pad2(h) : String(h);
    const mStr = pad2(m);
    const sStr = pad2(s);
    return { h, m, s, showH: true, showM: true, showS: true, hStr, mStr, sStr, str: `${hStr}h ${mStr}m ${sStr}s` };
  }
  if (m > 0) {
    const mStr = m >= 10 ? pad2(m) : String(m);
    const sStr = pad2(s);
    return { h: 0, m, s, showH: false, showM: true, showS: true, mStr, sStr, str: `${mStr}m ${sStr}s` };
  }
  const sStr = s < 10 ? String(s) : pad2(s);
  return { h: 0, m: 0, s, showH: false, showM: false, showS: true, sStr, str: `${sStr}s` };
}

// Parse ISO to { dayISO, hour, minute, ampm } for picker
export function isoToDateParts(iso) {
  const d = new Date(iso);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  let h24 = d.getHours();
  const minutes = d.getMinutes();
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  h12 = h12 ? h12 : 12;
  return { dayISO: day.toISOString(), hour: h12, minute: minutes, ampm };
}

// Build ISO from picker parts
export function partsToISO({ dayISO, hour, minute, ampm }) {
  const base = new Date(dayISO);
  const h12 = Number(hour) || 12;
  const m = Number(minute) || 0;
  const h24 = ampm === 'PM' ? (h12 % 12) + 12 : h12 % 12;
  base.setHours(h24, m, 0, 0);
  return base.toISOString();
}
