// Timeline Item Component (shared)
const __ttTimelineItemCn = (...classes) => classes.filter(Boolean).join(' ');

// Ensure active sleep styles are injected
const __ttEnsureActiveSleepStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tt-active-sleep-timeline-styles')) return;
  const style = document.createElement('style');
  style.id = 'tt-active-sleep-timeline-styles';
  style.textContent = `
    /* Rotating dashed border animation - single dash segment traveling around */
    @keyframes ttActiveSleepBorderRotate {
      0% {
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dashoffset: -283; /* Full circumference for smooth loop */
      }
    }

    /* Badge pulse animation */
    @keyframes ttActiveSleepBadgePulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.7;
        transform: scale(1.15);
      }
    }

    .tt-active-sleep-badge-pulse {
      animation: ttActiveSleepBadgePulse 2s ease-in-out infinite;
    }

    /* ZZZ floating animation with Framer Motion fallback */
    @keyframes ttActiveZzzFloat {
      0% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      50% {
        opacity: 0.8;
        transform: translateY(-3px) scale(1.05);
      }
      100% {
        opacity: 0;
        transform: translateY(-6px) scale(0.95);
      }
    }

    .tt-active-zzz > span {
      display: inline-block;
      animation: ttActiveZzzFloat 2s ease-in-out infinite;
    }
    .tt-active-zzz > span:nth-child(1) { animation-delay: 0s; font-size: 0.7em; }
    .tt-active-zzz > span:nth-child(2) { animation-delay: 0.25s; font-size: 0.85em; }
    .tt-active-zzz > span:nth-child(3) { animation-delay: 0.5s; font-size: 1em; }
  `;
  document.head.appendChild(style);
};

// Format elapsed time helper (uses global if available, fallback otherwise)
const __ttFormatElapsedHms = (ms) => {
  if (typeof window !== 'undefined' && window.TT?.utils?.formatElapsedHmsTT) {
    return window.TT.utils.formatElapsedHmsTT(ms);
  }
  // Fallback implementation
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
};

const TTSharedTimelineItem = ({ card, bottleIcon, moonIcon, isExpanded = false, detailsHeight = 96, hasDetails: hasDetailsProp, onPhotoClick = null, isEditMode = false, onEdit = null, onDelete = null, onScheduledAdd = null, onStopActiveSleep = null }) => {
  if (!card) return null;

  // Ensure styles are injected
  __ttEnsureActiveSleepStyles();

  const __ttTimelineItemMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion) ? window.Motion.motion : null;
  const __ttTimelineItemAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence) ? window.Motion.AnimatePresence : null;

  const isScheduled = card.variant === 'scheduled';
  const isLogged = card.variant === 'logged';
  const isActive = card.variant === 'active';
  const unitText = (card.unit || '').toLowerCase();
  const resolveSleepAmountText = () => {
    const raw = Number(card.amount);
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

  // Active sleep timer state
  const [elapsedMs, setElapsedMs] = React.useState(() => {
    if (isActive && card.startTime) {
      return Date.now() - card.startTime;
    }
    return 0;
  });

  // Update timer every second for active sleep
  React.useEffect(() => {
    if (!isActive || !card.startTime) return;

    const tick = () => setElapsedMs(Date.now() - card.startTime);
    tick(); // Immediate update
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [isActive, card.startTime]);

  // Format elapsed time for active sleep label
  const activeElapsedLabel = React.useMemo(() => {
    if (!isActive) return '';
    const parts = __ttFormatElapsedHms(elapsedMs);
    // Build label: Xh Xm Xs format
    let label = '';
    if (parts.showH) {
      label += `${parts.hStr}h `;
    }
    if (parts.showM) {
      label += `${parts.mStr}m `;
    }
    label += `${parts.sStr}s`;
    return label.trim();
  }, [isActive, elapsedMs]);

  const labelText = isScheduled
    ? scheduledLabel
    : isActive
      ? activeElapsedLabel
      : (amountText
          ? (isLogged ? amountText : `${prefix} ~${amountText}`)
          : (isLogged ? '' : prefix));

  const photoList = card.photoURLs || card.photoUrls || card.photos;
  const hasPhotos = Array.isArray(photoList) ? photoList.length > 0 : Boolean(photoList);
  const hasNote = Boolean(card.note || card.notes);
  const hasDetails = typeof hasDetailsProp === 'boolean' ? hasDetailsProp : (hasNote || hasPhotos);
  const loggedState = isEditMode ? 'edit' : 'default';
  const showChevron = isLogged && hasDetails && loggedState === 'default';
  const ChevronIcon = (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.ChevronDownIcon) || null;
  const PenIcon = (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.PenIcon || window.TT.shared.icons.Edit2)) || null;
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
  const scheduledActionLeadMs = 10 * 60 * 1000;
  const showScheduledAction = isScheduled && Number.isFinite(scheduledTimeMs)
    ? (Date.now() >= scheduledTimeMs - scheduledActionLeadMs) && !card.isCompleted
    : false;

  // ZZZ element for active sleep (with Framer Motion if available)
  const zzzElement = React.useMemo(() => {
    if (__ttTimelineItemMotion) {
      // Framer Motion version - staggered animation
      return React.createElement(
        'span',
        { className: "inline-flex items-baseline ml-1", style: { color: 'var(--tt-sleep)' } },
        ['z', 'Z', 'z'].map((letter, i) =>
          React.createElement(__ttTimelineItemMotion.span, {
            key: i,
            animate: {
              y: [0, -3, -6],
              opacity: [1, 0.8, 0],
              scale: [1, 1.05, 0.95]
            },
            transition: {
              duration: 2,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut"
            },
            style: {
              display: 'inline-block',
              fontSize: i === 0 ? '0.7em' : i === 1 ? '0.85em' : '1em'
            }
          }, letter)
        )
      );
    }
    // CSS fallback
    return React.createElement(
      'span',
      { className: "tt-active-zzz inline-flex items-baseline ml-1", style: { color: 'var(--tt-sleep)' } },
      React.createElement('span', null, 'z'),
      React.createElement('span', null, 'Z'),
      React.createElement('span', null, 'z')
    );
  }, [__ttTimelineItemMotion]);

  // Rotating dashed border SVG for active sleep
  const rotatingBorderSvg = React.useMemo(() => {
    if (!isActive) return null;

    // SVG that overlays the card with a rotating dashed border
    return React.createElement('svg', {
      className: "absolute inset-0 w-full h-full pointer-events-none",
      style: {
        zIndex: 0,
        overflow: 'visible'
      },
      viewBox: "0 0 100 100",
      preserveAspectRatio: "none"
    },
      React.createElement('rect', {
        x: "1",
        y: "1",
        width: "98",
        height: "98",
        rx: "16",
        ry: "16",
        fill: "none",
        stroke: "var(--tt-sleep)",
        strokeWidth: "1.5",
        strokeDasharray: "20 263", // Single short dash, rest is gap (circumference ~283)
        strokeDashoffset: "0",
        strokeLinecap: "round",
        style: {
          animation: 'ttActiveSleepBorderRotate 4s linear infinite'
        }
      })
    );
  }, [isActive]);

  // Badge icon based on variant
  const renderBadge = () => {
    if (isActive) {
      // Active sleep badge - circular SVG with pulse animation
      return React.createElement('svg', {
        className: "w-3 h-3 tt-active-sleep-badge-pulse",
        viewBox: "0 0 256 256",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg",
        style: { color: 'var(--tt-sleep)' }
      },
        React.createElement('path', { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm72-88a72,72,0,1,1-72-72A72.08,72.08,0,0,1,200,128Z" })
      );
    }

    if (isLogged) {
      // Logged - green checkmark
      return React.createElement('svg', {
        className: "w-3 h-3 text-green-500",
        viewBox: "0 0 256 256",
        fill: "currentColor",
        xmlns: "http://www.w3.org/2000/svg"
      },
        React.createElement('path', { d: "M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" })
      );
    }

    // Scheduled - clock icon
    return React.createElement('svg', {
      className: "w-3 h-3",
      viewBox: "0 0 256 256",
      fill: "currentColor",
      xmlns: "http://www.w3.org/2000/svg",
      style: { color: 'var(--tt-text-secondary)' }
    },
      React.createElement('path', { d: "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z" })
    );
  };

  return React.createElement(
    React.Fragment,
    null,
    // Icon circle with rotating border for active
    React.createElement('div', {
      className: __ttTimelineItemCn(
        "w-10 h-10 rounded-full flex items-center justify-center shadow-inner relative",
        card.variant === 'scheduled' && "grayscale opacity-50"
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
        style: { backgroundColor: 'var(--tt-card-bg)' }
      },
        renderBadge()
      )
    ),
    React.createElement('div', { className: "flex-1" },
      React.createElement('div', { className: "flex items-center justify-between min-h-[40px]" },
        React.createElement('div', { className: "flex items-center gap-2" },
          React.createElement('h3', {
            className: (isLogged || isActive) ? "font-semibold" : (isScheduled ? "font-normal" : "font-medium"),
            style: (isLogged || isActive)
              ? { color: 'var(--tt-text-primary)' }
              : { color: 'var(--tt-text-tertiary)' }
          }, labelText),
          // ZZZ animation for active sleep
          isActive && zzzElement
        ),
        React.createElement('div', { className: "flex items-center gap-2" },
          // Note/Photo indicators for logged items
          isLogged && hasDetails && loggedState === 'default' && React.createElement('div', { className: "flex items-center gap-1 mr-2" },
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
          // Time display for logged (not active)
          !isScheduled && !isActive && React.createElement('span', {
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
          // Chevron for logged items with details
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
          // Scheduled action button
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
          // Stop timer button for active sleep
          isActive && React.createElement('button', {
            onClick: (e) => {
              e.stopPropagation();
              if (onStopActiveSleep) onStopActiveSleep(card);
            },
            className: "px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95",
            style: {
              backgroundColor: 'var(--tt-sleep)',
              color: '#ffffff'
            }
          }, 'Stop timer'),
          // Edit/Delete buttons for logged items in edit mode
          (__ttTimelineItemAnimatePresence && __ttTimelineItemMotion)
            ? React.createElement(
                __ttTimelineItemAnimatePresence,
                { initial: false },
                (isLogged && loggedState === 'edit')
                  ? React.createElement(__ttTimelineItemMotion.div, {
                      className: "flex items-center gap-2",
                      initial: { opacity: 0, y: -6, scale: 0.96 },
                      animate: { opacity: 1, y: 0, scale: 1 },
                      exit: { opacity: 0, y: -6, scale: 0.96 },
                      transition: { type: "spring", stiffness: 380, damping: 28 }
                    },
                      onEdit && React.createElement(__ttTimelineItemMotion.button, {
                        onClick: (e) => {
                          e.stopPropagation();
                          onEdit(card);
                        },
                        whileTap: { scale: 0.96 },
                        className: "w-7 h-7 rounded-lg flex items-center justify-center",
                        style: {
                          backgroundColor: 'color-mix(in srgb, #3b82f6 15%, var(--tt-card-bg))',
                          color: '#3b82f6'
                        }
                      },
                        React.createElement('svg', {
                          className: "w-4 h-4",
                          viewBox: "0 0 256 256",
                          fill: "currentColor",
                          xmlns: "http://www.w3.org/2000/svg"
                        },
                          React.createElement('path', { d: "M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM51.31,160,136,75.31,152.69,92,68,176.68ZM48,179.31,76.69,208H48Zm48,25.38L79.31,188,164,103.31,180.69,120Zm96-96L147.31,64l24-24L216,84.68Z" })
                        )
                      ),
                      onDelete && React.createElement(__ttTimelineItemMotion.button, {
                        onClick: (e) => {
                          e.stopPropagation();
                          onDelete(card);
                        },
                        whileTap: { scale: 0.96 },
                        className: "w-7 h-7 rounded-lg flex items-center justify-center",
                        style: {
                          backgroundColor: 'color-mix(in srgb, #ef4444 15%, var(--tt-card-bg))',
                          color: '#ef4444'
                        }
                      },
                        React.createElement('svg', {
                          className: "w-4 h-4",
                          viewBox: "0 0 256 256",
                          fill: "currentColor",
                          xmlns: "http://www.w3.org/2000/svg"
                        },
                          React.createElement('path', { d: "M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" })
                        )
                      )
                    )
                  : null
              )
            : (isLogged && loggedState === 'edit')
              ? React.createElement('div', { className: "flex items-center gap-2" },
                  onEdit && React.createElement('button', {
                    onClick: (e) => {
                      e.stopPropagation();
                      onEdit(card);
                    },
                    className: "w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95",
                    style: {
                      backgroundColor: 'color-mix(in srgb, #3b82f6 15%, var(--tt-card-bg))',
                      color: '#3b82f6'
                    }
                  },
                    React.createElement('svg', {
                      className: "w-4 h-4",
                      viewBox: "0 0 256 256",
                      fill: "currentColor",
                      xmlns: "http://www.w3.org/2000/svg"
                    },
                      React.createElement('path', { d: "M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM51.31,160,136,75.31,152.69,92,68,176.68ZM48,179.31,76.69,208H48Zm48,25.38L79.31,188,164,103.31,180.69,120Zm96-96L147.31,64l24-24L216,84.68Z" })
                    )
                  ),
                  onDelete && React.createElement('button', {
                    onClick: (e) => {
                      e.stopPropagation();
                      onDelete(card);
                    },
                    className: "w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-95",
                    style: {
                      backgroundColor: 'color-mix(in srgb, #ef4444 15%, var(--tt-card-bg))',
                      color: '#ef4444'
                    }
                  },
                    React.createElement('svg', {
                      className: "w-4 h-4",
                      viewBox: "0 0 256 256",
                      fill: "currentColor",
                      xmlns: "http://www.w3.org/2000/svg"
                    },
                      React.createElement('path', { d: "M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z" })
                    )
                  )
                )
              : null
        )
      ),
      // Expandable details section (for logged items only)
      hasDetails && __ttTimelineItemAnimatePresence && __ttTimelineItemMotion && React.createElement(
        __ttTimelineItemAnimatePresence,
        { initial: false },
        isExpanded && React.createElement(
          __ttTimelineItemMotion.div,
          {
            initial: { height: 0, opacity: 0 },
            animate: { height: detailsHeight, opacity: 1 },
            exit: { height: 0, opacity: 0 },
            transition: { type: "spring", stiffness: 300, damping: 30 },
            style: { overflow: 'hidden' }
          },
          React.createElement('div', { className: "pt-2 pb-2 flex flex-col gap-3 text-xs" },
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
    ),
    // Rotating dashed border overlay for active sleep (rendered at card level)
    isActive && rotatingBorderSvg
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TimelineItem = TTSharedTimelineItem;
}
