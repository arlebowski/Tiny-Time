// Timeline Item Component (shared)
const __ttTimelineItemCn = (...classes) => classes.filter(Boolean).join(' ');

var __ttNormalizePhotoUrls = (typeof window !== 'undefined' && window.__ttNormalizePhotoUrls)
  ? window.__ttNormalizePhotoUrls
  : (input) => {
      if (!input) return [];
      const items = Array.isArray(input) ? input : [input];
      const urls = [];
      for (const item of items) {
        if (typeof item === 'string' && item.trim()) {
          urls.push(item);
          continue;
        }
        if (item && typeof item === 'object') {
          const maybe =
            item.url ||
            item.publicUrl ||
            item.publicURL ||
            item.downloadURL ||
            item.downloadUrl ||
            item.src ||
            item.uri;
          if (typeof maybe === 'string' && maybe.trim()) {
            urls.push(maybe);
          }
        }
      }
      return urls;
    };

if (typeof window !== 'undefined' && !window.__ttNormalizePhotoUrls) {
  window.__ttNormalizePhotoUrls = __ttNormalizePhotoUrls;
}

const __ttEnsureZzzStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tt-zzz-anim')) return;
  const style = document.createElement('style');
  style.id = 'tt-zzz-anim';
  style.textContent = `
    @keyframes floatingZs {
      0% {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
      50% {
        transform: translateY(-4px) scale(1.1);
        opacity: 0.7;
      }
      100% {
        transform: translateY(-8px) scale(1);
        opacity: 0;
      }
    }
    .zzz {
      display: inline-block;
    }
    .zzz > span {
      display: inline-block;
      animation: floatingZs 2s ease-in-out infinite;
    }
    .zzz > span:nth-child(1) { animation-delay: 0s; }
    .zzz > span:nth-child(2) { animation-delay: 0.3s; }
    .zzz > span:nth-child(3) { animation-delay: 0.6s; }
  `;
  document.head.appendChild(style);
};


  const TTSharedTimelineItem = ({ card, bottleIcon, nursingIcon, moonIcon, diaperIcon, isExpanded = false, detailsHeight = 96, hasDetails: hasDetailsProp, onPhotoClick = null, onScheduledAdd = null, onActiveSleepClick = null, onExpandedContentHeight = null, disableScheduledGrayscale = false, iconSize = 24, iconWrapSize = 40, disableScheduledAction = false, scheduledLabelColor = null, onFoodUpdate = null }) => {
  if (!card) return null;

  const __ttTimelineItemMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion) ? window.Motion.motion : null;
  const __ttTimelineItemAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence) ? window.Motion.AnimatePresence : null;

  const isScheduled = card.variant === 'scheduled';
  const isScheduledGray = isScheduled && !disableScheduledGrayscale;
  const isLogged = card.variant === 'logged';
  const isActiveSleep = Boolean(card.isActive && card.type === 'sleep');
  const isNursing = card.type === 'feed' && card.feedType === 'nursing';
  const isSolids = card.type === 'feed' && card.feedType === 'solids';
  const isInlineEditor = Boolean(card.inlineEditor);
  const unitText = (card.unit || '').toLowerCase();
  const SolidsIcon = (props) => React.createElement(
    'svg',
    { ...props, xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: "24", height: "24", fill: "none", stroke: "currentColor", strokeWidth: "1.5" },
    React.createElement('path', { d: "M3.76,22.751 C3.131,22.751 2.544,22.506 2.103,22.06 C1.655,21.614 1.41,21.015 1.418,20.376 C1.426,19.735 1.686,19.138 2.15,18.697 L11.633,9.792 C12.224,9.235 12.17,8.2 12.02,7.43 C11.83,6.456 11.908,4.988 13.366,3.53 C14.751,2.145 16.878,1.25 18.784,1.25 L18.789,1.25 C20.031,1.251 21.07,1.637 21.797,2.365 C22.527,3.094 22.914,4.138 22.915,5.382 C22.916,7.289 22.022,9.417 20.637,10.802 C19.487,11.952 18.138,12.416 16.734,12.144 C15.967,11.995 14.935,11.942 14.371,12.537 L5.473,22.011 C5.029,22.481 4.43,22.743 3.786,22.75 C3.777,22.75 3.768,22.75 3.759,22.75 L3.76,22.751 Z" })
  );
  const formatSleepDuration = (ms) => {
    const totalSec = Math.round(Math.max(0, Number(ms) || 0) / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h >= 1) {
      return `${h}h ${m}m`;
    }
    if (m >= 1) {
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    return `${s}s`;
  };
  const resolveSleepAmountText = () => {
    const raw = Number(card.amount);
    if (isLogged) {
      const durationMs = (typeof card.startTime === 'number' && typeof card.endTime === 'number')
        ? Math.max(0, card.endTime - card.startTime)
        : (Number.isFinite(raw) ? Math.round(raw * 3600 * 1000) : 0);
      return durationMs > 0 ? formatSleepDuration(durationMs) : '';
    }
    if (!Number.isFinite(raw) || raw <= 0) return '';
    if (raw < 1) {
      const mins = Math.round(raw * 60);
      return `${mins} min`;
    }
    const totalMins = Math.round(raw * 60);
    const hours = Math.floor(totalMins / 60);
    const minutes = totalMins % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };
  const formatNursingDuration = (totalSec) => {
    const total = Math.max(0, Number(totalSec) || 0);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };
  const nursingTotalSec = isNursing
    ? (Number(card.leftDurationSec || 0) + Number(card.rightDurationSec || 0))
    : 0;
  const nursingAmountText = isNursing && nursingTotalSec > 0 ? formatNursingDuration(nursingTotalSec) : '';
  const amountText = isNursing
    ? nursingAmountText
    : ((typeof card.amount === 'number' || typeof card.amount === 'string')
        ? (card.type === 'sleep' ? resolveSleepAmountText() : `${card.amount} ${unitText}`.trim())
        : '');
  const prefix = isNursing ? 'Nursing' : (card.type === 'feed' ? 'Feed' : (card.type === 'sleep' ? 'Sleep' : 'Diaper'));
  const sleepSettings =
    (window.TT && window.TT.shared && window.TT.shared.sleepSettings) ||
    (window.TT && window.TT.sleepSettings) ||
    null;
  const getSleepLabel = (time) => {
    if (!time || !(time instanceof Date)) return 'Sleep';
    const dayStart = Number(sleepSettings?.sleepDayStart ?? sleepSettings?.daySleepStartMinutes ?? 390);
    const dayEnd = Number(sleepSettings?.sleepDayEnd ?? sleepSettings?.daySleepEndMinutes ?? 1170);
    const mins = time.getHours() * 60 + time.getMinutes();
    const isDaySleep = dayStart <= dayEnd
      ? (mins >= dayStart && mins < dayEnd)
      : (mins >= dayStart || mins < dayEnd);
    return isDaySleep ? 'Nap' : 'Sleep';
  };
  const scheduledTimeMs = Number.isFinite(Number(card.timeMs))
    ? Number(card.timeMs)
    : (Number.isFinite(card.hour)
        ? new Date(new Date().setHours(card.hour, card.minute || 0, 0, 0)).getTime()
        : null);
  const scheduledLabelTimeDate = Number.isFinite(scheduledTimeMs) ? new Date(scheduledTimeMs) : null;
  const scheduledLabelTime = card.time || '';
  const scheduledLabel = card.type === 'feed'
    ? 'Feed'
    : (card.type === 'sleep' ? getSleepLabel(scheduledLabelTimeDate) : 'Diaper');
  const [activeElapsedMs, setActiveElapsedMs] = React.useState(() => {
    if (isActiveSleep && typeof card.startTime === 'number') {
      return Math.max(0, Date.now() - card.startTime);
    }
    return 0;
  });
  const labelText = isScheduled
    ? scheduledLabel
    : (isActiveSleep
        ? formatSleepDuration(activeElapsedMs)
        : (isSolids && card.label
            ? card.label
            : (amountText
                ? (isLogged ? amountText : `${prefix} ~${amountText}`)
                : (isLogged ? '' : prefix))));

  const photoList = card.photoURLs || card.photoUrls || card.photos;
  const photoUrls = __ttNormalizePhotoUrls(photoList);
  const hasPhotos = photoUrls.length > 0;
  const hasNote = Boolean(card.note || card.notes);
  const hasDetails = typeof hasDetailsProp === 'boolean' ? hasDetailsProp : (hasNote || hasPhotos || isNursing || isSolids);
  const showChevron = isLogged && hasDetails && !isActiveSleep;
  const ChevronIcon = (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.ChevronDownIcon) || null;
  const noteText = card.note || card.notes || '';
  const recentMs = 60 * 1000;
  const startTimestamp = (typeof card.timestamp === 'number' ? card.timestamp : (typeof card.startTime === 'number' ? card.startTime : null));
  const isJustNow = typeof startTimestamp === 'number' && (Date.now() - startTimestamp) >= 0 && (Date.now() - startTimestamp) <= recentMs;
  const formatTime12Hour = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = minutes < 10 ? `0${minutes}` : String(minutes);
    return `${hours}:${mins} ${ampm}`;
  };
  const resolvedEndTime = typeof card.endTime === 'number'
    ? formatTime12Hour(card.endTime)
    : card.endTime;
  const showScheduledAction = !disableScheduledAction && isScheduled && Number.isFinite(scheduledTimeMs)
    ? Math.abs(Date.now() - scheduledTimeMs) <= 10 * 60 * 1000
    : false;
  const detailsContentRef = React.useRef(null);
  const updateDetailsHeight = React.useCallback(() => {
    if (!onExpandedContentHeight || !detailsContentRef.current) return;
    const nextHeight = Math.max(0, detailsContentRef.current.scrollHeight || 0);
    onExpandedContentHeight(card.id, nextHeight);
  }, [onExpandedContentHeight, card.id]);
  const zzzElement = React.useMemo(() => (
    React.createElement('span', { className: "zzz text-xs", style: { color: 'var(--tt-sleep)', fontSize: '16px', fontWeight: 700 } },
      React.createElement('span', null, 'z'),
      React.createElement('span', null, 'Z'),
      React.createElement('span', null, 'z')
    )
  ), []);

  React.useEffect(() => {
    if (!isActiveSleep) return undefined;
    __ttEnsureZzzStyles();
    const startTime = typeof card.startTime === 'number' ? card.startTime : null;
    if (!startTime) {
      setActiveElapsedMs(0);
      return undefined;
    }
    const tick = () => setActiveElapsedMs(Math.max(0, Date.now() - startTime));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [card.startTime, isActiveSleep]);

  React.useEffect(() => {
    if (!onExpandedContentHeight) return undefined;
    if (!isExpanded || !hasDetails) {
      onExpandedContentHeight(card.id, 0);
      return undefined;
    }

    updateDetailsHeight();

    const node = detailsContentRef.current;
    if (!node || typeof ResizeObserver !== 'function') return undefined;
    const observer = new ResizeObserver(() => updateDetailsHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, [card.id, hasDetails, isExpanded, onExpandedContentHeight, updateDetailsHeight]);

  const feedAccent = isNursing ? 'var(--tt-nursing)' : (isSolids ? 'var(--tt-solids)' : 'var(--tt-feed)');
  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', {
      className: __ttTimelineItemCn(
        "w-10 h-10 rounded-full flex items-center justify-center shadow-inner relative",
        isScheduledGray && "grayscale opacity-50"
      ),
      style: {
        width: `${iconWrapSize}px`,
        height: `${iconWrapSize}px`,
        backgroundColor: card.type === 'feed'
          ? `color-mix(in srgb, ${feedAccent} 20%, transparent)`
          : (card.type === 'sleep'
              ? 'color-mix(in srgb, var(--tt-sleep) 20%, transparent)'
              : 'color-mix(in srgb, var(--tt-diaper) 20%, transparent)')
      }
    },
      card.type === 'feed' && (isNursing ? nursingIcon : isSolids ? SolidsIcon : bottleIcon)
        ? React.createElement(isNursing ? nursingIcon : isSolids ? SolidsIcon : bottleIcon, {
            style: {
              color: feedAccent,
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              strokeWidth: '1.5',
              fill: isNursing ? 'currentColor' : 'none',
              transform: isNursing ? 'none' : 'rotate(20deg)'
            }
          })
        : card.type === 'sleep' && moonIcon
          ? React.createElement(moonIcon, {
              style: {
                color: 'var(--tt-sleep)',
                width: `${iconSize}px`,
                height: `${iconSize}px`,
                strokeWidth: '1.5'
              }
            })
          : card.type === 'diaper' && diaperIcon
            ? React.createElement(diaperIcon, {
                style: {
                  color: 'var(--tt-diaper)',
                  width: `${iconSize}px`,
                  height: `${iconSize}px`
                }
              })
          : (card.type === 'feed' ? '🍼' : (card.type === 'sleep' ? '💤' : '🧷')),
      React.createElement('div', {
        className: "absolute -bottom-1 -right-1 rounded-full p-0.5",
        style: { backgroundColor: 'var(--tt-timeline-item-bg)' }
      },
        isActiveSleep ? (
          __ttTimelineItemMotion
            ? React.createElement(__ttTimelineItemMotion.div, {
                animate: { scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] },
                transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
                style: { display: 'flex' }
              },
                React.createElement('svg', {
                  className: "w-3 h-3",
                  viewBox: "0 0 256 256",
                  fill: "currentColor",
                  xmlns: "http://www.w3.org/2000/svg",
                  style: { color: 'var(--tt-sleep)' }
                },
                  React.createElement('path', { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm72-88a72,72,0,1,1-72-72A72.08,72.08,0,0,1,200,128Z" })
                )
              )
            : React.createElement('svg', {
                className: "w-3 h-3",
                viewBox: "0 0 256 256",
                fill: "currentColor",
                xmlns: "http://www.w3.org/2000/svg",
                style: { color: 'var(--tt-sleep)' }
              },
                React.createElement('path', { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm72-88a72,72,0,1,1-72-72A72.08,72.08,0,0,1,200,128Z" })
              )
        ) : card.variant === 'logged' ? (
          React.createElement('svg', {
            className: "w-3 h-3 text-green-500",
            viewBox: "0 0 256 256",
            fill: "currentColor",
            xmlns: "http://www.w3.org/2000/svg"
          },
            React.createElement('path', { d: "M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" })
          )
        ) : (
          React.createElement('svg', {
            className: "w-3 h-3",
            viewBox: "0 0 256 256",
            fill: "currentColor",
            xmlns: "http://www.w3.org/2000/svg",
            style: { color: 'var(--tt-text-secondary)' }
          },
            React.createElement('path', { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" })
          )
        )
      )
    ),
    React.createElement('div', { className: "flex-1" },
      React.createElement('div', { className: "flex items-center justify-between min-h-[40px]" },
        React.createElement('div', { className: "flex items-center gap-2" },
          React.createElement('h3', {
            className: isLogged ? "font-semibold" : (isScheduled ? "font-normal" : "font-medium"),
            style: isActiveSleep
              ? { color: 'var(--tt-sleep)' }
              : (isLogged
                  ? { color: 'var(--tt-text-primary)' }
                  : (isScheduled && scheduledLabelColor
                      ? { color: scheduledLabelColor }
                      : { color: 'var(--tt-text-tertiary)' }))
          }, labelText),
          isActiveSleep ? zzzElement : null
        ),
        React.createElement('div', { className: "flex items-center gap-2" },
          isLogged && hasDetails && React.createElement('div', { className: "flex items-center gap-1 mr-2" },
            hasNote && React.createElement('svg', {
              className: "w-4 h-4",
              viewBox: "0 0 256 256",
              fill: "currentColor",
              xmlns: "http://www.w3.org/2000/svg",
              style: { color: 'var(--tt-text-tertiary)' }
            },
              React.createElement('path', { d: "M88,96a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H96A8,8,0,0,1,88,96Zm8,40h64a8,8,0,0,0,0-16H96a8,8,0,0,0,0,16Zm32,16H96a8,8,0,0,0,0,16h32a8,8,0,0,0,0-16ZM224,48V156.69A15.86,15.86,0,0,1,219.31,168L168,219.31A15.86,15.86,0,0,1,156.69,224H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32H208A16,16,0,0,1,224,48ZM48,208H152V160a8,8,0,0,1,8-8h48V48H48Zm120-40v28.7L196.69,168Z" })
            ),
            hasPhotos && React.createElement('svg', {
              className: "w-4 h-4",
              viewBox: "0 0 256 256",
              fill: "currentColor",
              xmlns: "http://www.w3.org/2000/svg",
              style: { color: 'var(--tt-text-tertiary)' }
            },
              React.createElement('path', { d: "M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z" })
            )
          ),
          !isActiveSleep && React.createElement('span', {
            className: "text-xs",
            style: (isLogged || isScheduled)
              ? { color: 'var(--tt-text-secondary)' }
              : { color: 'var(--tt-text-tertiary)' }
          },
            // For sleep items, show "[start] – [end]" format
            // For cross-day sleeps, card.time already has "YD" prefix
            card.type === 'sleep' && resolvedEndTime
              ? `${isLogged && isJustNow ? 'Just now' : card.time} – ${resolvedEndTime}`
              : (isLogged && isJustNow ? 'Just now' : card.time)
          ),
          showChevron && ChevronIcon
            ? (__ttTimelineItemMotion
                ? React.createElement(__ttTimelineItemMotion.div, {
                    animate: { rotate: isExpanded ? 180 : 0 },
                    transition: { type: "spring", stiffness: 300, damping: 26 },
                    style: { display: 'flex', alignItems: 'center' }
                  },
                    React.createElement(ChevronIcon, {
                      className: "w-5 h-5",
                      style: { color: 'var(--tt-text-secondary)' }
                    })
                  )
                : React.createElement(ChevronIcon, {
                    className: "w-5 h-5",
                    style: { color: 'var(--tt-text-secondary)' }
                  })
              )
            : null,
          isActiveSleep && React.createElement('button', {
            onClick: (e) => {
              e.stopPropagation();
              if (onActiveSleepClick) onActiveSleepClick(card);
            },
            className: "px-3 py-1 rounded-full text-xs font-semibold",
            style: {
              backgroundColor: 'var(--tt-sleep)',
              color: 'var(--tt-text-on-accent)'
            }
          }, 'Open Timer'),
          // Scheduled CTA disabled per request.
          null
        )
      ),
      hasDetails && __ttTimelineItemAnimatePresence && __ttTimelineItemMotion && React.createElement(
        __ttTimelineItemAnimatePresence,
        { initial: false },
        isExpanded && React.createElement(
          __ttTimelineItemMotion.div,
          {
            layout: true,
            initial: { height: 0, opacity: 0 },
            animate: { height: 'auto', opacity: 1 },
            exit: { height: 0, opacity: 0 },
            transition: { type: "spring", stiffness: 300, damping: 30 },
            style: { overflow: 'hidden' }
          },
          React.createElement('div', { ref: detailsContentRef, className: "pt-2 pb-2 flex flex-col gap-3 text-xs" },
            isNursing && React.createElement('div', {
              className: "flex flex-col gap-1",
              style: { color: 'var(--tt-text-secondary)' }
            },
              React.createElement('div', null, `Left ${formatNursingDuration(Number(card.leftDurationSec || 0))} • Right ${formatNursingDuration(Number(card.rightDurationSec || 0))}`),
              card.lastSide ? React.createElement('div', { style: { color: 'var(--tt-text-tertiary)' } }, `Last side: ${String(card.lastSide).toUpperCase().slice(0, 1)}${String(card.lastSide).slice(1)}`) : null
            ),
            isSolids && Array.isArray(card.foods) && card.foods.length > 0 && React.createElement('div', {
              className: "flex flex-col gap-3",
              style: { color: 'var(--tt-text-secondary)' }
            },
              card.foods.map((food, idx) => {
                const FOOD_MAP = window.TT?.constants?.FOOD_MAP || {};
                const foodDef = FOOD_MAP[food.id] || Object.values(FOOD_MAP).find((item) => String(item?.name || '').toLowerCase() === String(food?.name || '').toLowerCase()) || null;
                const foodEmoji = foodDef?.emoji || food.emoji || '🍽️';
                const amountCircles = food.amount === 'all' ? '●●●' : (food.amount === 'most' || food.amount === 'some') ? '●●○' : food.amount === 'a-little' ? '●○○' : food.amount === 'none' ? '○○○' : '';
                const reactionText = food.reaction ? ` • ${food.reaction}` : '';
                const prepText = food.preparation ? ` • ${food.preparation}` : '';
                const updateFood = (patch) => {
                  if (typeof onFoodUpdate === 'function') {
                    onFoodUpdate({ ...food, ...patch });
                  }
                };
                if (!isInlineEditor) {
                  return React.createElement('div', {
                    key: `${card.id}-food-${idx}`,
                    className: "flex items-start gap-2"
                  },
                    React.createElement('div', {
                      className: "w-5 h-5 flex-shrink-0 flex items-center justify-center",
                      style: { fontSize: 14, lineHeight: '14px' }
                    }, foodEmoji),
                    React.createElement('div', { className: "flex flex-col gap-0.5 min-w-0" },
                      React.createElement('div', { className: "font-medium", style: { color: 'var(--tt-text-primary)' } }, food.name),
                      (amountCircles || reactionText || prepText) && React.createElement('div', { style: { color: 'var(--tt-text-tertiary)', fontSize: '11px' } },
                        `${amountCircles}${reactionText}${prepText}`
                      ),
                      food.notes && React.createElement('div', { className: "italic text-[11px]", style: { color: 'var(--tt-text-tertiary)' } }, food.notes)
                    )
                  );
                }

                const renderOptions = (label, options, value, onChange) => (
                  React.createElement('div', { className: "flex flex-col gap-2" },
                    React.createElement('div', { className: "text-[11px] font-semibold", style: { color: 'var(--tt-text-tertiary)' } }, label),
                    React.createElement('div', { className: "flex flex-wrap gap-2" },
                      options.map((option) => {
                        const selected = value === option.value;
                        return React.createElement('button', {
                          key: option.value,
                          type: 'button',
                          onClick: (e) => {
                            e.stopPropagation();
                            onChange(option.value);
                          },
                          className: "px-3 py-1 rounded-full text-[11px] font-semibold transition",
                          style: {
                            border: `1px solid ${selected ? 'var(--tt-solids)' : 'var(--tt-card-border)'}`,
                            backgroundColor: selected
                              ? 'color-mix(in srgb, var(--tt-solids) 16%, var(--tt-input-bg))'
                              : 'var(--tt-input-bg)',
                            color: selected ? 'var(--tt-solids)' : 'var(--tt-text-secondary)'
                          }
                        }, option.label)
                      })
                    )
                  )
                );

                const amountOptions = [
                  { value: 'all', label: 'All ●●●' },
                  { value: 'some', label: 'Some ●●○' },
                  { value: 'a-little', label: 'A little ●○○' },
                  { value: 'none', label: 'None ○○○' }
                ];
                const reactionOptions = [
                  { value: 'loved', label: 'Loved' },
                  { value: 'liked', label: 'Liked' },
                  { value: 'disliked', label: 'Disliked' }
                ];
                const prepOptions = [
                  { value: 'raw', label: 'Raw' },
                  { value: 'puree', label: 'Puree' },
                  { value: 'steamed', label: 'Steamed' },
                  { value: 'boiled', label: 'Boiled' }
                ];

                return React.createElement('div', {
                  key: `${card.id}-food-${idx}`,
                  className: "flex flex-col gap-3"
                },
                  React.createElement('div', { className: "flex items-start gap-2" },
                    React.createElement('div', {
                      className: "w-5 h-5 flex-shrink-0 flex items-center justify-center",
                      style: { fontSize: 14, lineHeight: '14px' }
                    }, foodEmoji),
                    React.createElement('div', { className: "flex flex-col gap-0.5 min-w-0" },
                      React.createElement('div', { className: "font-medium", style: { color: 'var(--tt-text-primary)' } }, food.name),
                      food.category && React.createElement('div', { className: "text-[11px]", style: { color: 'var(--tt-text-tertiary)' } }, food.category)
                    )
                  ),
                  renderOptions('Amount', amountOptions, food.amount || null, (value) => updateFood({ amount: value })),
                  renderOptions('Reaction', reactionOptions, food.reaction || null, (value) => updateFood({ reaction: value })),
                  renderOptions('Preparation', prepOptions, food.preparation || null, (value) => updateFood({ preparation: value })),
                  React.createElement('div', { className: "flex flex-col gap-2" },
                    React.createElement('div', { className: "text-[11px] font-semibold", style: { color: 'var(--tt-text-tertiary)' } }, `Notes for ${food.name}`),
                    React.createElement('textarea', {
                      value: food.notes || '',
                      onChange: (e) => updateFood({ notes: e.target.value }),
                      rows: 2,
                      className: "w-full rounded-xl px-3 py-2 text-xs outline-none",
                      style: {
                        backgroundColor: 'var(--tt-input-bg)',
                        border: '1px solid var(--tt-card-border)',
                        color: 'var(--tt-text-primary)',
                        resize: 'vertical'
                      },
                      onClick: (e) => e.stopPropagation(),
                      placeholder: 'Add notes...'
                    })
                  )
                );
              })
            ),
            hasNote && React.createElement('div', {
              className: "italic",
              style: { color: 'var(--tt-text-secondary)' }
            }, noteText),
            hasPhotos && React.createElement('div', { className: "flex gap-2" },
              photoUrls.slice(0, 3).map((url, idx) => (
                React.createElement('img', {
                  key: `${card.id || 'photo'}-${idx}`,
                  src: url,
                  alt: "Timeline attachment",
                  className: "w-32 h-32 rounded-2xl object-cover",
                  style: { backgroundColor: 'var(--tt-input-bg)' },
                  onLoad: updateDetailsHeight,
                  onClick: (e) => {
                    e.stopPropagation();
                    if (onPhotoClick) onPhotoClick(url);
                  }
                })
              ))
            )
          )
        )
      )
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TimelineItem = TTSharedTimelineItem;
}
