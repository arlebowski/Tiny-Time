/**
 * mockDetailData — mock data for DetailSheet
 * Shapes match web TrackerDetailTab card formats (feedingToCard, sleepToCard, etc.)
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

const makeId = () => Math.random().toString(36).slice(2, 10);

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Generate mock timeline items for a given date.
 */
export function getMockTimelineItems(date) {
  const dayStart = startOfDay(date);
  const items = [];

  // Bottle feedings
  const bottleTimes = [6 * 60, 9.5 * 60, 13 * 60, 16.5 * 60, 20 * 60]; // minutes from midnight
  bottleTimes.forEach((mins) => {
    const ts = dayStart + mins * 60000;
    const oz = Math.round((2 + Math.random() * 4) * 10) / 10;
    const d = new Date(ts);
    items.push({
      id: makeId(),
      timestamp: ts,
      ounces: oz,
      notes: null,
      photoURLs: null,
      time: formatTime12Hour(ts),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'logged',
      type: 'feed',
      feedType: 'bottle',
      amount: oz,
      unit: 'oz',
      note: null,
    });
  });

  // Nursing session
  const nursingTs = dayStart + 7.5 * 3600000;
  const nD = new Date(nursingTs);
  items.push({
    id: makeId(),
    timestamp: nursingTs,
    startTime: nursingTs,
    leftDurationSec: 420,
    rightDurationSec: 360,
    lastSide: 'right',
    notes: null,
    photoURLs: null,
    time: formatTime12Hour(nursingTs),
    hour: nD.getHours(),
    minute: nD.getMinutes(),
    variant: 'logged',
    type: 'feed',
    feedType: 'nursing',
    amount: 780,
    unit: 'sec',
    note: null,
  });

  // Solids sessions
  const solidsTimes = [11.5 * 60, 18 * 60];
  solidsTimes.forEach((mins, idx) => {
    const ts = dayStart + mins * 60000;
    const d = new Date(ts);
    const foods = idx === 0
      ? [{ name: 'Avocado' }, { name: 'Banana' }]
      : [{ name: 'Sweet Potato' }];
    items.push({
      id: makeId(),
      timestamp: ts,
      foods,
      notes: null,
      photoURLs: null,
      time: formatTime12Hour(ts),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'logged',
      type: 'feed',
      feedType: 'solids',
      label: foods.map((f) => f.name).join(', '),
      amount: foods.length,
      unit: 'foods',
      note: null,
    });
  });

  // Sleep sessions
  const sleepPairs = [
    { startMins: 0, endMins: 6 * 60 },       // overnight ending at 6am
    { startMins: 12 * 60, endMins: 14 * 60 }, // afternoon nap
  ];
  sleepPairs.forEach(({ startMins, endMins }) => {
    const sTs = dayStart + startMins * 60000;
    const eTs = dayStart + endMins * 60000;
    const sD = new Date(sTs);
    const durationHours = Math.round(((eTs - sTs) / 3600000) * 10) / 10;
    items.push({
      id: makeId(),
      startTime: sTs,
      endTime: eTs,
      isActive: false,
      notes: null,
      photoURLs: null,
      sleepType: startMins === 0 ? 'night' : 'nap',
      time: formatTime12Hour(sTs),
      endTimeDisplay: formatTime12Hour(eTs),
      hour: sD.getHours(),
      minute: sD.getMinutes(),
      variant: 'logged',
      type: 'sleep',
      amount: durationHours,
      unit: 'hrs',
      note: null,
      crossesFromYesterday: startMins === 0,
      originalStartTime: sTs,
      originalEndTime: eTs,
    });
  });

  // Diaper changes
  const diaperTimes = [
    { mins: 6.5 * 60, isWet: true, isPoo: false },
    { mins: 10 * 60, isWet: true, isPoo: true },
    { mins: 14.5 * 60, isWet: true, isPoo: false },
    { mins: 17 * 60, isWet: false, isPoo: true },
    { mins: 20.5 * 60, isWet: true, isPoo: false },
  ];
  diaperTimes.forEach(({ mins, isWet, isPoo }) => {
    const ts = dayStart + mins * 60000;
    const d = new Date(ts);
    const isDry = !isWet && !isPoo;
    const diaperType = isDry ? 'Dry' : (isWet && isPoo ? 'Wet + Poop' : (isPoo ? 'Poop' : 'Wet'));
    items.push({
      id: makeId(),
      timestamp: ts,
      isWet,
      isDry,
      isPoo,
      diaperType,
      notes: null,
      photoURLs: null,
      time: formatTime12Hour(ts),
      hour: d.getHours(),
      minute: d.getMinutes(),
      variant: 'logged',
      type: 'diaper',
      amount: diaperType,
      unit: '',
      note: null,
    });
  });

  // Sort by time
  items.sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
  return items;
}

/**
 * Get summary totals for a given date.
 */
export function getMockDaySummary() {
  return {
    feedOz: 18.2,
    nursingMs: 780 * 1000, // 13 min
    solidsCount: 3,
    sleepMs: 8 * 3600000,  // 8 hrs
    diaperCount: 5,
    diaperWetCount: 4,
    diaperPooCount: 2,
  };
}
