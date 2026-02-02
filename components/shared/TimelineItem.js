// Timeline Item Component (shared)
const __ttTimelineItemCn = (...classes) => classes.filter(Boolean).join(' ');

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

  const TTSharedTimelineItem = ({ card, bottleIcon, moonIcon, isExpanded = false, detailsHeight = 96, hasDetails: hasDetailsProp, onPhotoClick = null, onScheduledAdd = null, onActiveSleepClick = null, onExpandedContentHeight = null, disableScheduledGrayscale = false }) => {
  if (!card) return null;

  const __ttTimelineItemMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion) ? window.Motion.motion : null;
  const __ttTimelineItemAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence) ? window.Motion.AnimatePresence : null;

  const isScheduled = card.variant === 'scheduled';
  const isScheduledGray = isScheduled && !disableScheduledGrayscale;
  const isLogged = card.variant === 'logged';
  const isActiveSleep = Boolean(card.isActive && card.type === 'sleep');
  const unitText = (card.unit || '').toLowerCase();
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
  const amountText = (typeof card.amount === 'number' || typeof card.amount === 'string')
    ? (card.type === 'sleep' ? resolveSleepAmountText() : `${card.amount} ${unitText}`.trim())
    : '';
  const prefix = card.type === 'feed' ? 'Feed' : 'Sleep';
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
    ? `Feed around ${scheduledLabelTime}`
    : `${getSleepLabel(scheduledLabelTimeDate)} around ${scheduledLabelTime}`;
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
        : (amountText
            ? (isLogged ? amountText : `${prefix} ~${amountText}`)
            : (isLogged ? '' : prefix)));

  const photoList = card.photoURLs || card.photoUrls || card.photos;
  const hasPhotos = Array.isArray(photoList) ? photoList.length > 0 : Boolean(photoList);
  const hasNote = Boolean(card.note || card.notes);
  const hasDetails = typeof hasDetailsProp === 'boolean' ? hasDetailsProp : (hasNote || hasPhotos);
  const showChevron = isLogged && hasDetails && !isActiveSleep;
  const ChevronIcon = (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.ChevronDownIcon) || null;
  const noteText = card.note || card.notes || '';
  const photoUrls = Array.isArray(photoList) ? photoList : (photoList ? [photoList] : []);
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
  const showScheduledAction = isScheduled && Number.isFinite(scheduledTimeMs)
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

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', {
      className: __ttTimelineItemCn(
        "w-10 h-10 rounded-full flex items-center justify-center shadow-inner relative",
        isScheduledGray && "grayscale opacity-50"
      ),
      style: {
        backgroundColor: card.type === 'feed'
          ? 'color-mix(in srgb, var(--tt-feed) 20%, transparent)'
          : 'color-mix(in srgb, var(--tt-sleep) 20%, transparent)'
      }
    },
      card.type === 'feed' && bottleIcon
        ? React.createElement(bottleIcon, {
            style: {
              color: 'var(--tt-feed)',
              width: '1.5rem',
              height: '1.5rem',
              strokeWidth: '1.5',
              fill: 'none',
              transform: 'rotate(20deg)'
            }
          })
        : card.type === 'sleep' && moonIcon
          ? React.createElement(moonIcon, {
              style: {
                color: 'var(--tt-sleep)',
                width: '1.5rem',
                height: '1.5rem',
                strokeWidth: '1.5'
              }
            })
          : card.type === 'feed' ? '🍼' : '💤',
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
                  : { color: 'var(--tt-text-tertiary)' })
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
          !isScheduled && !isActiveSleep && React.createElement('span', {
            className: "text-xs",
            style: isLogged
              ? { color: 'var(--tt-text-secondary)' }
              : { color: 'var(--tt-text-tertiary)' }
          },
            // For sleep items, show "[start] – [end]" format
            // For cross-day sleeps, card.time already has "YD" prefix
            card.type === 'sleep' && resolvedEndTime
              ? `${isJustNow ? 'Just now' : card.time} – ${resolvedEndTime}`
              : (isJustNow ? 'Just now' : card.time)
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
              color: '#ffffff'
            }
          }, 'Open Timer'),
          isScheduled && showScheduledAction && React.createElement('button', {
            onClick: (e) => {
              e.stopPropagation();
              if (onScheduledAdd) onScheduledAdd(card);
            },
            className: "px-3 py-1 rounded-full text-xs font-semibold",
            style: {
              backgroundColor: card.type === 'feed' ? 'var(--tt-feed)' : 'var(--tt-sleep)',
              color: '#ffffff'
            }
          }, card.type === 'feed' ? 'Add Feed' : `Start ${getSleepLabel(scheduledLabelTimeDate)}`),
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
