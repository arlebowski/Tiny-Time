/**
 * Firestore doc ↔ timeline card transforms — shared between web and native.
 * These produce the card shapes expected by the native Timeline component
 * (see native/src/utils/mockDetailData.js for reference shapes).
 */

const formatTime12Hour = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const mins = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${mins} ${ampm}`;
};

/** Firestore feeding doc → timeline card */
export function feedingDocToCard(doc) {
  const ts = doc.timestamp || 0;
  const d = new Date(ts);
  return {
    id: doc.id,
    timestamp: ts,
    ounces: doc.ounces,
    notes: doc.notes || null,
    photoURLs: doc.photoURLs || null,
    time: formatTime12Hour(ts),
    hour: d.getHours(),
    minute: d.getMinutes(),
    variant: 'logged',
    type: 'feed',
    feedType: 'bottle',
    amount: doc.ounces,
    unit: 'oz',
    note: doc.notes || null,
  };
}

/** Firestore nursing doc → timeline card */
export function nursingDocToCard(doc) {
  const ts = doc.timestamp || doc.startTime || 0;
  const d = new Date(ts);
  const leftSec = Number(doc.leftDurationSec) || 0;
  const rightSec = Number(doc.rightDurationSec) || 0;
  return {
    id: doc.id,
    timestamp: ts,
    startTime: doc.startTime || ts,
    leftDurationSec: leftSec,
    rightDurationSec: rightSec,
    lastSide: doc.lastSide || null,
    notes: doc.notes || null,
    photoURLs: doc.photoURLs || null,
    time: formatTime12Hour(ts),
    hour: d.getHours(),
    minute: d.getMinutes(),
    variant: 'logged',
    type: 'feed',
    feedType: 'nursing',
    amount: leftSec + rightSec,
    unit: 'sec',
    note: doc.notes || null,
  };
}

/** Firestore solids doc → timeline card */
export function solidsDocToCard(doc) {
  const ts = doc.timestamp || 0;
  const d = new Date(ts);
  const foods = Array.isArray(doc.foods) ? doc.foods : [];
  return {
    id: doc.id,
    timestamp: ts,
    foods,
    notes: doc.notes || null,
    photoURLs: doc.photoURLs || null,
    time: formatTime12Hour(ts),
    hour: d.getHours(),
    minute: d.getMinutes(),
    variant: 'logged',
    type: 'feed',
    feedType: 'solids',
    label: foods.map((f) => f.name).join(', '),
    amount: foods.length,
    unit: 'foods',
    note: doc.notes || null,
  };
}

/** Firestore sleep doc → timeline card */
export function sleepDocToCard(doc) {
  const sTs = doc.startTime || 0;
  const eTs = doc.endTime || null;
  const d = new Date(sTs);
  const durationHours = eTs ? Math.round(((eTs - sTs) / 3600000) * 10) / 10 : null;
  const sleepType = doc.sleepType === 'day' ? 'nap' : 'night';
  return {
    id: doc.id,
    startTime: sTs,
    endTime: eTs,
    isActive: !!doc.isActive,
    notes: doc.notes || null,
    photoURLs: doc.photoURLs || null,
    sleepType,
    time: formatTime12Hour(sTs),
    endTimeDisplay: eTs ? formatTime12Hour(eTs) : null,
    hour: d.getHours(),
    minute: d.getMinutes(),
    variant: doc.isActive ? 'active' : 'logged',
    type: 'sleep',
    amount: durationHours,
    unit: 'hrs',
    note: doc.notes || null,
    originalStartTime: sTs,
    originalEndTime: eTs,
  };
}

/** Firestore diaper doc → timeline card */
export function diaperDocToCard(doc) {
  const ts = doc.timestamp || 0;
  const d = new Date(ts);
  const isWet = !!doc.isWet;
  const isPoo = !!doc.isPoo;
  const isDry = !isWet && !isPoo;
  const diaperType = isDry ? 'Dry' : (isWet && isPoo ? 'Wet + Poop' : (isPoo ? 'Poop' : 'Wet'));
  return {
    id: doc.id,
    timestamp: ts,
    isWet,
    isDry,
    isPoo,
    diaperType,
    notes: doc.notes || null,
    photoURLs: doc.photoURLs || null,
    time: formatTime12Hour(ts),
    hour: d.getHours(),
    minute: d.getMinutes(),
    variant: 'logged',
    type: 'diaper',
    amount: diaperType,
    unit: '',
    note: doc.notes || null,
  };
}
