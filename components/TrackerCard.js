// TrackerCard Component (v4-only)
// Keeps v4 styling and shared utilities used by half-sheets.

// Icon components (needed before script.js loads)
const ChevronDown = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('polyline', { points: "6 9 12 15 18 9" })
);



const PenIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.25",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('path', { d: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" })
);


const PlusIconLocal = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('line', { x1: "12", y1: "5", x2: "12", y2: "19" }),
  React.createElement('line', { x1: "5", y1: "12", x2: "19", y2: "12" })
);



const XIcon = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('path', { d: "M18 6 6 18" }),
  React.createElement('path', { d: "m6 6 12 12" })
);

// Expose icons globally so shared components can use them
if (typeof window !== 'undefined') {
  window.ChevronDown = ChevronDown;
  window.PlusIconLocal = PlusIconLocal;
  window.XIcon = XIcon;
  window.PenIcon = PenIcon;
}

// Ensure zZz animation styles are injected
function ensureZzzStyles() {
  if (document.getElementById('tt-zzz-anim')) return;
  const style = document.createElement('style');
  style.id = 'tt-zzz-anim';
  style.textContent = `
    @keyframes floatingZs {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      50% { transform: translateY(-4px) scale(1.1); opacity: 0.7; }
      100% { transform: translateY(-8px) scale(1); opacity: 0; }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    .zzz { display: inline-block; }
    .zzz > span { display: inline-block; animation: floatingZs 2s ease-in-out infinite; }
    .zzz > span:nth-child(1) { animation-delay: 0s; }
    .zzz > span:nth-child(2) { animation-delay: 0.3s; }
    .zzz > span:nth-child(3) { animation-delay: 0.6s; }
  `;
  document.head.appendChild(style);
}

function ensureTapAnimationStyles() {
  if (document.getElementById('tt-tap-anim')) return;
  const style = document.createElement('style');
  style.id = 'tt-tap-anim';
  style.textContent = `
    .tt-tapable { position: relative; overflow: hidden; }
    .tt-tapable::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.05);
      opacity: 0;
      transition: opacity 0.1s ease-out;
      pointer-events: none;
      border-radius: inherit;
      z-index: 1;
    }
    .tt-tapable:active::before { opacity: 1; }
    .dark .tt-tapable::before { background: rgba(255, 255, 255, 0.1); }
  `;
  document.head.appendChild(style);
}

// Shared elapsed time formatter
function formatElapsedHmsTT(ms) {
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

// Shared helpers for half-sheets
const formatDateTime = (date) => {
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
};

const checkSleepOverlap = async (startMs, endMs, excludeId = null) => {
  try {
    const allSessions = await firestoreStorage.getAllSleepSessions();
    const nowMs = Date.now();

    const normalizeInterval = (sMs, eMs) => {
      let s = Number(sMs);
      let e = Number(eMs);
      if (!Number.isFinite(s) || !Number.isFinite(e)) return null;
      if (s > nowMs + 3 * 3600000) s -= 86400000;
      if (e < s) s -= 86400000;
      if (e < s) return null;
      return { startMs: s, endMs: e };
    };

    const newNorm = normalizeInterval(startMs, endMs);
    if (!newNorm) return false;

    for (const session of allSessions) {
      if (excludeId && session.id === excludeId) continue;
      const existingEnd = session.isActive ? nowMs : (session.endTime || null);
      if (!session.startTime || !existingEnd) continue;

      const existingNorm = normalizeInterval(session.startTime, existingEnd);
      if (!existingNorm) continue;

      if (newNorm.startMs < existingNorm.endMs && existingNorm.startMs < newNorm.endMs) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking sleep overlap:', error);
    return false;
  }
};

const useWheelPickers = () => {
  try {
    if (typeof window !== 'undefined' && window.TT?.shared?.flags?.useWheelPickers?.get) {
      return !!window.TT.shared.flags.useWheelPickers.get();
    }
    return localStorage.getItem('tt_use_wheel_pickers') === 'true';
  } catch (e) {
    return false;
  }
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.utils = window.TT.utils || {};
  window.TT.utils.formatElapsedHmsTT = formatElapsedHmsTT;
  window.TT.utils.formatDateTime = formatDateTime;
  window.TT.utils.checkSleepOverlap = checkSleepOverlap;
  window.TT.utils.useWheelPickers = useWheelPickers;
}

const __ttV4ResolveFramer = () => {
  if (typeof window === 'undefined') return {};
  const candidates = [
    window.FramerMotion,
    window.framerMotion,
    window['framer-motion'],
    window.Motion,
    window.motion
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.motion || candidate.AnimatePresence) return candidate;
    if (candidate.default && (candidate.default.motion || candidate.default.AnimatePresence)) {
      return candidate.default;
    }
  }
  return {};
};

function formatV2Number(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const rounded = Math.round(x);
  if (Math.abs(x - rounded) < 1e-9) return String(rounded);
  return x.toFixed(1);
}

const TrackerCard = ({
  mode = 'sleep',
  total = null,
  target = null,
  timelineItems = [],
  lastEntryTime = null,
  onCardTap = null
}) => {
  ensureZzzStyles();
  ensureTapAnimationStyles();

  const __ttV4Framer = __ttV4ResolveFramer();
  const __ttV4Motion = __ttV4Framer.motion || null;
  const isV4CardMotion = !!__ttV4Motion;
  const CardWrapper = isV4CardMotion ? __ttV4Motion.div : 'div';
  const cardClassName = `rounded-2xl p-5 shadow-sm tt-card-tap`;
  const cardMotionProps = isV4CardMotion ? {
    whileTap: {
      scale: 0.992,
      transition: { duration: 0.08, ease: [0.16, 1, 0.3, 1] }
    },
    transition: { duration: 0.14, ease: [0.22, 1, 0.36, 1] }
  } : {};

  // Keep the active sleep detection for status pill
  const isSleepActive = React.useMemo(() => {
    if (mode !== 'sleep') return false;
    return timelineItems.some(item => item.isActive && item.startTime);
  }, [mode, timelineItems]);

  // Smooth transition state for progress
  const [cardHasBeenShown, setCardHasBeenShown] = React.useState(false);
  const lastValidPercentRef = React.useRef(0);

  const currentPercent = (total !== null && target !== null && target > 0)
    ? Math.min(100, (total / target) * 100)
    : 0;

  React.useEffect(() => {
    if (currentPercent > 0 || (total !== null && target !== null)) {
      if (!cardHasBeenShown) {
        setCardHasBeenShown(true);
      }
      lastValidPercentRef.current = currentPercent;
    }
  }, [currentPercent, total, target, cardHasBeenShown]);

  const calculatedPercent = cardHasBeenShown
    ? (currentPercent > 0 || (total !== null && target !== null) ? currentPercent : lastValidPercentRef.current)
    : currentPercent;

  const displayPercent = (calculatedPercent <= 0 && (!total || total <= 0)) ? 2 : calculatedPercent;

  const HeaderIcon = mode === 'feeding'
    ? (window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"]) || null
    : (window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.["moon-v2"]) || null;

  const renderDesign = ({
    showHeaderRow = true,
    iconOverride = null,
    headerGapClass = 'gap-2',
    headerBottomMarginClass = 'mb-6',
    headerLabelClassName = 'text-[18px] font-semibold',
    headerIconClassName = 'h-8 w-8',
    feedingIconTransform = 'translateY(-2px)',
    sleepIconTransform = 'none',
    mirrorFeedingIcon = false,
    showHeaderIcon = true,
    headerRight = null,
    headerLabel = null,
    showBigNumberIcon = false,
    bigNumberIconClassName = null,
    bigNumberRight = null,
    bigNumberRowClassName = "flex items-baseline gap-1 mb-1",
    bigNumberIconValueGapClassName = "gap-[6px]",
    bigNumberValueClassName = "text-[40px] leading-none font-bold",
    bigNumberTargetClassName = "relative -top-[1px] text-[16px] leading-none",
    bigNumberTargetColor = 'var(--tt-text-secondary)',
    bigNumberTargetVariant = 'target',
    bigNumberTopLabel = null,
    progressTrackHeightClass = 'h-6',
    progressTrackBg = 'var(--tt-progress-track)',
    progressBarGoalText = null,
    progressBarGoalTextClassName = "text-[12px] font-normal leading-none",
    statusRow = null,
    statusRowClassName = '',
    showDotsRow = true,
    progressBottomMarginClass = 'mb-1'
  } = {}) => {
    const IconComp = iconOverride || HeaderIcon;
    const withFeedingMirror = (t) => {
      const s = (t || '').trim();
      if (s.includes('scaleX(-1)')) return s;
      if (!s || s === 'none') return 'scaleX(-1)';
      return `scaleX(-1) ${s}`;
    };
    const effectiveFeedingTransform = mirrorFeedingIcon ? withFeedingMirror(feedingIconTransform) : feedingIconTransform;

    return React.createElement(
      CardWrapper,
      {
        className: cardClassName,
        style: {
          backgroundColor: "var(--tt-card-bg)",
          borderColor: "var(--tt-card-border)",
          cursor: 'pointer',
          transition: 'all 0.3s ease-out'
        },
        onClick: (e) => {
          if (typeof onCardTap === 'function') onCardTap(e, { mode });
        },
        ...cardMotionProps
      },
      showHeaderRow ? React.createElement(
        'div',
        {
          className: `flex items-center w-full ${(headerRight && !showHeaderIcon && !headerLabel) ? 'justify-end' : 'justify-between'} ${headerBottomMarginClass} ${(headerRight && !showHeaderIcon && !headerLabel) ? '' : 'h-6'}`,
          style: (headerRight && !showHeaderIcon && !headerLabel) ? {
            width: '100%',
            marginLeft: 0,
            marginRight: 0,
            paddingLeft: 0,
            paddingRight: 0,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end'
          } : {}
        },
        (showHeaderIcon || headerLabel || (!headerRight)) ? React.createElement(
          'div',
          { className: `flex items-center ${headerGapClass}` },
          showHeaderIcon
            ? (IconComp ? React.createElement(IconComp, {
                className: headerIconClassName,
                style: {
                  color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
                  transform: mode === 'feeding' ? effectiveFeedingTransform : sleepIconTransform,
                  strokeWidth: mode === 'feeding' ? '1.5' : undefined,
                  fill: mode === 'feeding' ? 'none' : (mode === 'sleep' ? 'var(--tt-sleep)' : undefined)
                }
              }) : React.createElement('div', { className: "h-6 w-6 rounded-2xl", style: { backgroundColor: 'var(--tt-input-bg)' } }))
            : null,
          (headerLabel || (!headerRight || showHeaderIcon)) ? (
            headerLabel
              ? headerLabel
              : React.createElement('div', {
                  className: headerLabelClassName,
                  style: { color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)' }
                }, mode === 'feeding' ? 'Feed' : 'Sleep')
          ) : null
        ) : null,
        headerRight
      ) : null,

      bigNumberTopLabel ? React.createElement(
        'div',
        { className: "flex items-center mb-4" },
        bigNumberTopLabel
      ) : null,

      (() => {
        const valueEl = React.createElement('div', {
          className: bigNumberValueClassName,
          style: {
            color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
            transition: 'opacity 0.4s ease-out, transform 0.4s ease-out'
          }
        },
          total !== null ? formatV2Number(total) : '0'
        );

        const targetEl = React.createElement('div', {
          className: bigNumberTargetClassName,
          style: { color: bigNumberTargetColor }
        },
          bigNumberTargetVariant === 'unit'
            ? (mode === 'sleep' ? 'hrs' : 'oz')
            : (target !== null
                ? (mode === 'sleep' ? `/ ${formatV2Number(target)} hrs` : `/ ${formatV2Number(target)} oz`)
                : (mode === 'sleep' ? '/ 0 hrs' : '/ 0 oz'))
        );

        const iconEl = (showBigNumberIcon && IconComp)
          ? React.createElement(IconComp, {
              className: bigNumberIconClassName || headerIconClassName,
              style: {
                color: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
                transform: mode === 'feeding' ? effectiveFeedingTransform : sleepIconTransform,
                strokeWidth: mode === 'feeding' ? '1.5' : undefined,
                fill: mode === 'feeding' ? 'none' : (mode === 'sleep' ? 'var(--tt-sleep)' : undefined)
              }
            })
          : null;

        if (!showBigNumberIcon && !bigNumberRight) {
          return React.createElement(
            'div',
            { className: bigNumberRowClassName },
            valueEl,
            targetEl
          );
        }

        return React.createElement(
          'div',
          { className: bigNumberRowClassName },
          React.createElement(
            'div',
            { className: `flex items-center ${bigNumberIconValueGapClassName} min-w-0` },
            iconEl,
            React.createElement(
              'div',
              { className: "flex items-baseline gap-[2px] min-w-0" },
              valueEl,
              targetEl
            )
          ),
          bigNumberRight
        );
      })(),

      React.createElement('div', {
        className: `relative w-full ${progressTrackHeightClass} rounded-2xl overflow-hidden ${progressBottomMarginClass}`,
        style: {
          backgroundColor: progressTrackBg,
          marginLeft: 0,
          marginRight: 0,
          paddingLeft: 0,
          paddingRight: 0,
          width: '100%',
          boxSizing: 'border-box'
        }
      },
        React.createElement('div', {
          className: `absolute left-0 top-0 h-full rounded-2xl ${isSleepActive ? 'tt-sleep-progress-pulse' : ''}`,
          style: {
            width: `${displayPercent}%`,
            backgroundColor: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transitionDelay: '0s',
            minWidth: '0%',
            position: 'relative'
          }
        })
      ),
      progressBarGoalText && React.createElement(
        'div',
        { className: "flex justify-end mt-1" },
        React.createElement('span', {
          className: progressBarGoalTextClassName,
          style: { color: 'var(--tt-text-tertiary)' }
        }, progressBarGoalText)
      ),
      statusRow ? React.createElement('div', { className: statusRowClassName }, statusRow) : null,
      showDotsRow && React.createElement(
        'div',
        { className: "flex gap-1.5 pl-1 mb-2" },
        Array.from({ length: Math.min(timelineItems.length, 10) }, (_, i) =>
          React.createElement('div', {
            key: i,
            className: "h-3.5 w-3.5 rounded-full",
            style: { backgroundColor: mode === 'feeding' ? 'var(--tt-feed)' : 'var(--tt-sleep)' }
          })
        )
      )
    );
  };

  const renderV4Design = () => {
    const formatRelativeTime = (timestamp) => {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      if (minutes < 1) return 'just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (remainingMinutes === 0) return `${hours}h ago`;
      return `${hours}h ${remainingMinutes}m ago`;
    };

    const formatRelativeTimeNoAgo = (timestamp) => {
      if (!timestamp) return '';
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      if (minutes < 1) return '0m';
      if (minutes < 60) return `${minutes}m`;
      if (remainingMinutes === 0) return `${hours}h`;
      return `${hours}h ${remainingMinutes}m`;
    };

    const v4IconSvg = mode === 'feeding'
      ? (window.TT?.shared?.icons?.BottleV2 || window.TT?.shared?.icons?.["bottle-v2"] || HeaderIcon)
      : (window.TT?.shared?.icons?.MoonV2 || window.TT?.shared?.icons?.["moon-v2"] || HeaderIcon);
    const v4StatusTextClassName = "text-[15px] font-normal leading-none";
    const v4GoalTextClassName = "text-[15px] font-normal leading-none";
    const v4TargetClassName = "relative -top-[1px] text-[20px] leading-none font-normal";

    const v4StatusText = mode === 'feeding'
      ? (lastEntryTime ? formatRelativeTime(lastEntryTime) : 'No feedings yet')
      : (() => {
          const activeEntry = timelineItems.find(item => item.isActive && item.startTime);
          if (activeEntry) {
            return React.createElement(
              'span',
              { className: "inline-flex items-center gap-2" },
              React.createElement(ActiveSleepTimer, { startTime: activeEntry.startTime, sessionId: activeEntry.id }),
              React.createElement(
                'span',
                { className: "inline-flex items-center font-light", style: { color: 'currentColor' } },
                zzzElementMemo
              )
            );
          }
          const lastCompletedSleep = timelineItems.find(item => item.endTime && !item.isActive);
          if (lastCompletedSleep && lastCompletedSleep.endTime) {
            return `Awake ${formatRelativeTimeNoAgo(lastCompletedSleep.endTime)}`;
          }
          return 'No sleep logged';
        })();

    const v4HeaderRight = (() => {
      const isActiveSleepPill = (mode === 'sleep' && isSleepActive);

      const chevronEl = React.createElement(
        'svg',
        {
          xmlns: "http://www.w3.org/2000/svg",
          viewBox: "0 0 256 256",
          className: "w-5 h-5",
          style: { color: 'var(--tt-text-tertiary)' }
        },
        React.createElement('path', {
          d: "M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z",
          fill: "currentColor"
        })
      );

      if (isActiveSleepPill) {
        return React.createElement(
          'span',
          { className: "inline-flex items-center gap-2", style: { color: 'var(--tt-text-tertiary)' } },
          React.createElement('span', { className: v4StatusTextClassName }, "Sleeping now"),
          chevronEl
        );
      }

      return React.createElement(
        'span',
        { className: "inline-flex items-center gap-2", style: { color: 'var(--tt-text-tertiary)' } },
        React.createElement('span', { className: v4StatusTextClassName }, v4StatusText),
        chevronEl
      );
    })();

    const createIconLabel = (m) => {
      const isFeed = m === 'feeding';
      const v4Svg = isFeed
        ? ((window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.BottleV2) ||
           (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons["bottle-v2"]) ||
           null)
        : ((window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.MoonV2) ||
           (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons["moon-v2"]) ||
           null);
      const color = isFeed ? 'var(--tt-feed)' : 'var(--tt-sleep)';
      const label = isFeed ? 'Feed' : 'Sleep';

      return React.createElement(
        'div',
        {
          className: "text-[18px] font-semibold inline-flex items-center gap-[5px]",
          style: { color }
        },
        v4Svg ? React.createElement(v4Svg, {
          className: "w-[22px] h-[22px]",
          style: {
            color,
            strokeWidth: isFeed ? '1.5' : undefined,
            fill: isFeed ? 'none' : color,
            transform: isFeed ? 'rotate(20deg)' : undefined
          }
        }) : null,
        React.createElement('span', null, label)
      );
    };
    const v4HeaderLabel = createIconLabel(mode);

    return renderDesign({
      showHeaderRow: true,
      headerGapClass: 'gap-2',
      headerBottomMarginClass: 'mb-[36px]',
      headerLabelClassName: 'text-[15.4px] font-medium',
      iconOverride: v4IconSvg,
      feedingIconTransform: 'none',
      sleepIconTransform: 'translateY(2px)',
      mirrorFeedingIcon: false,
      showHeaderIcon: false,
      headerRight: v4HeaderRight,
      headerLabel: v4HeaderLabel,
      showBigNumberIcon: false,
      bigNumberTopLabel: null,
      bigNumberIconClassName: mode === 'feeding' ? 'h-[35.739px] w-[35.739px]' : 'h-[33.858px] w-[33.858px]',
      bigNumberRight: null,
      bigNumberRowClassName: "flex items-baseline gap-1 mb-[13px]",
      bigNumberIconValueGapClassName: mode === 'sleep' ? 'gap-[8px]' : 'gap-[6px]',
      bigNumberValueClassName: "text-[40px] leading-none font-bold",
      bigNumberTargetClassName: v4TargetClassName,
      bigNumberTargetColor: 'var(--tt-text-tertiary)',
      bigNumberTargetVariant: 'unit',
      progressTrackHeightClass: 'h-[15.84px]',
      progressTrackBg: 'var(--tt-progress-track)',
      progressBarGoalText: target !== null
        ? (mode === 'sleep' ? `${formatV2Number(target)} hrs goal` : `${formatV2Number(target)} oz goal`)
        : (mode === 'sleep' ? '0 hrs goal' : '0 oz goal'),
      progressBarGoalTextClassName: v4GoalTextClassName,
      statusRow: null,
      statusRowClassName: "",
      showDotsRow: false,
      progressBottomMarginClass: 'mb-0'
    });
  };

  const ActiveSleepTimer = ({ startTime, sessionId }) => {
    const startTimeRef = React.useRef(startTime);
    const sessionIdRef = React.useRef(sessionId);

    if (sessionIdRef.current !== sessionId) {
      startTimeRef.current = startTime;
      sessionIdRef.current = sessionId;
    }

    const [elapsed, setElapsed] = React.useState(() => {
      return Date.now() - startTimeRef.current;
    });

    React.useEffect(() => {
      if (sessionIdRef.current !== sessionId) {
        startTimeRef.current = startTime;
        sessionIdRef.current = sessionId;
        setElapsed(Date.now() - startTimeRef.current);
      }

      const interval = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 1000);
      return () => clearInterval(interval);
    }, [sessionId]);

    return React.createElement('span', { className: "font-semibold tabular-nums whitespace-nowrap inline-block text-right", style: { color: 'currentColor' } },
      formatElapsedHmsTT(elapsed).str
    );
  };

  const zzzElementMemo = React.useMemo(() =>
    React.createElement('span', { className: "zzz" },
      React.createElement('span', null, 'z'),
      React.createElement('span', null, 'Z'),
      React.createElement('span', null, 'z')
    ), []
  );

  return React.createElement(React.Fragment, null, renderV4Design());
};

if (typeof window !== 'undefined') {
  window.__ttTrackerCardLoadedAt = Date.now();
  window.TrackerCard = TrackerCard;
}
