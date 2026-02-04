const ttEnsureTapAnimationStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById('tt-tap-anim')) return;
  const style = document.createElement('style');
  style.id = 'tt-tap-anim';
  style.textContent = `
    .tt-tapable {
      position: relative;
      overflow: hidden;
    }
    .tt-tapable::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.05);
      opacity: 0;
      transition: opacity 0.1s ease-out;
      pointer-events: none;
      border-radius: inherit;
      z-index: 1;
    }
    .tt-tapable:active::before {
      opacity: 1;
    }
    .dark .tt-tapable::before {
      background: rgba(255, 255, 255, 0.1);
    }
  `;
  document.head.appendChild(style);
};

const ttFormatElapsedHmsTT = (ms) => {
  if (typeof window !== 'undefined' && typeof window.formatElapsedHmsTT === 'function') {
    return window.formatElapsedHmsTT(ms);
  }
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad2 = (v) => String(v).padStart(2, '0');
  if (h >= 1) {
    const hStr = h < 10 ? `${h}h` : `${h}h`;
    return { str: `${hStr} ${pad2(m)}:${pad2(s)}`, h, m, s };
  }
  return { str: `${pad2(m)}:${pad2(s)}`, h, m, s };
};

const TTSwipeRow = ({
  entry,
  mode = 'sleep',
  mirrorFeedingIcon = false,
  iconOverride = null,
  onClick = null,
  onActiveSleepClick = null,
  onDelete = null,
  onPhotoClick = null,
  showIcon = true,
  showText = true,
  showChevron = true,
  chevronDirection = 'right',
  animateChevron = false,
  enableTapAnimation = true,
  enableSwipeDelete = true,
  enableExpansion = true,
  allowCollapse = false,
  expanded: expandedProp,
  defaultExpanded = true,
  onToggleExpand = null,
  expandedContent = null,
  rightContent = null,
  bodyContent = null,
  variant = 'tracker',
  chat = null
}) => {
  if (!entry) return null;

  ttEnsureTapAnimationStyles();

  const isSleep = mode === 'sleep';
  const timelineBg = variant === 'outline' ? 'transparent' : 'var(--tt-swipe-row-bg)';
  const outlineBorder = variant === 'outline' ? '2px solid var(--tt-border-strong)' : 'none';

  // Swipe state
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const touchStartRef = React.useRef({ x: 0, y: 0 });
  const itemRef = React.useRef(null);

  const SWIPE_THRESHOLD = 80; // pixels to reveal delete button
  const DELETE_BUTTON_WIDTH = 80; // base width of delete button (matches Apple Messages)
  const DELETE_BUTTON_MAX_WIDTH = 100; // elastic max width (~25% more, like Apple)

  // Real-time timer state for active sleep
  const [elapsedTime, setElapsedTime] = React.useState(() => {
    if (entry.isActive && entry.startTime) {
      return Date.now() - entry.startTime;
    }
    return 0;
  });

  // Update timer every second for active sleep
  React.useEffect(() => {
    if (!entry.isActive || !entry.startTime) return;
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - entry.startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [entry.isActive, entry.startTime]);

  // Format time for display
  const formatTime12Hour = (timestamp) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${mins}${ampm}`;
  };

  const isSameLocalDay = (a, b) => {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  };

  const isYesterdayLocal = (timestamp) => {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    const now = new Date();
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return isSameLocalDay(d, y);
  };

  // Format duration with seconds for active sleep
  const formatDurationWithSeconds = (ms) => {
    return ttFormatElapsedHmsTT(ms).str;
  };

  // Format duration for sleep (with seconds for in-progress)
  const formatDuration = (startTime, endTime, isActive = false) => {
    if (!startTime) return '';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    if (diffMs < 0) return '';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (isActive) {
      return ttFormatElapsedHmsTT(diffMs).str;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get display values based on mode
  const primaryText = isSleep
    ? (entry.isActive && entry.startTime
        ? formatDurationWithSeconds(elapsedTime)
        : formatDuration(entry.startTime, entry.endTime, entry.isActive))
    : `${entry.ounces || 0}oz`;

  const secondaryText = isSleep
    ? (entry.startTime && entry.endTime
        ? `${formatTime12Hour(entry.startTime)} – ${formatTime12Hour(entry.endTime)}`
        : entry.startTime
          ? `${(entry.isActive && isYesterdayLocal(entry.startTime)) ? 'YD ' : ''}${formatTime12Hour(entry.startTime)} – in progress`
          : '')
    : (entry.timestamp ? formatTime12Hour(entry.timestamp) : '');

  const hasNote = entry.notes && entry.notes.trim() !== '';
  const hasPhotos = entry.photoURLs && Array.isArray(entry.photoURLs) && entry.photoURLs.length > 0;
  const hasDefaultExpandedContent = hasNote || hasPhotos;
  const hasExpandedContent = expandedContent !== null ? true : hasDefaultExpandedContent;

  const isControlledExpanded = typeof expandedProp === 'boolean';
  const [expandedState, setExpandedState] = React.useState(defaultExpanded);
  const expanded = isControlledExpanded ? expandedProp : expandedState;

  const handleToggleExpand = () => {
    if (!enableExpansion || !allowCollapse || !hasExpandedContent) return;
    const next = !expanded;
    if (!isControlledExpanded) setExpandedState(next);
    if (typeof onToggleExpand === 'function') onToggleExpand(next);
  };

  const getIcon = () => {
    if (isSleep) {
      const sleepType = entry.sleepType || 'night';
      const DaySleepIcon = window.TT?.shared?.icons?.DaySleep || null;
      const NightSleepIcon = window.TT?.shared?.icons?.NightSleep || null;
      const Icon = sleepType === 'day' ? DaySleepIcon : NightSleepIcon;
      const accentColor = 'var(--tt-sleep)';
      const iconStyle = entry.isActive
        ? { color: accentColor, animation: 'pulse 2s ease-in-out infinite' }
        : { color: accentColor };
      return Icon ? React.createElement(Icon, {
        style: { ...iconStyle, width: '2.475rem', height: '2.475rem', strokeWidth: '3' }
      }) : React.createElement('div', { style: { width: '2.475rem', height: '2.475rem', borderRadius: '1rem', backgroundColor: 'var(--tt-input-bg)' } });
    }

    const OverrideIcon = iconOverride || null;
    const BottleIcon =
      window.TT?.shared?.icons?.BottleV2 ||
      window.TT?.shared?.icons?.["bottle-v2"] ||
      window.TT?.shared?.icons?.BottleMain ||
      window.TT?.shared?.icons?.["bottle-main"] ||
      null;
    const accentColor = 'var(--tt-feed)';
    const iconSize = '1.4375rem';
    if (OverrideIcon) {
      return React.createElement(OverrideIcon, {
        style: {
          color: accentColor,
          width: iconSize,
          height: iconSize,
          transform: 'rotate(20deg)'
        }
      });
    }
    const bottleEl = BottleIcon ? React.createElement(BottleIcon, {
      style: {
        color: accentColor,
        width: iconSize,
        height: iconSize,
        strokeWidth: '1.5',
        fill: 'none',
        transform: 'rotate(20deg)'
      }
    }) : null;
    if (bottleEl) {
      return mirrorFeedingIcon
        ? React.createElement('span', { style: { display: 'inline-block', transform: 'scaleX(-1) rotate(20deg)', transformOrigin: 'center' } }, bottleEl)
        : bottleEl;
    }
    return React.createElement('div', { style: { width: iconSize, height: iconSize, borderRadius: '1rem', backgroundColor: 'var(--tt-input-bg)' } });
  };

  // Touch handlers for swipe - use refs to add non-passive listeners
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (Math.abs(deltaX) > deltaY && deltaX < 0) {
      setIsSwiping(true);
      const newOffset = Math.max(-DELETE_BUTTON_WIDTH * 2, deltaX);
      setSwipeOffset(newOffset);
    }
  };

  const handleTouchEnd = (finalOffset = null) => {
    if (!isSwiping) return;
    const currentOffset = finalOffset !== null ? finalOffset : swipeOffset;
    if (currentOffset < -DELETE_BUTTON_WIDTH * 1.5) {
      if (navigator.vibrate) navigator.vibrate(10);
      if (onDelete && entry?.id) {
        setSwipeOffset(0);
        handleDeleteDirect();
      }
    } else if (currentOffset < -SWIPE_THRESHOLD) {
      if (navigator.vibrate) navigator.vibrate(5);
      setSwipeOffset(-DELETE_BUTTON_WIDTH);
    } else {
      setSwipeOffset(0);
    }
    setIsSwiping(false);
    touchStartRef.current = null;
  };

  React.useEffect(() => {
    const element = itemRef.current;
    if (!element) return;
    const swipeableElement = element.querySelector('.swipeable-content');
    if (!swipeableElement) return;
    let currentSwipeOffset = swipeOffset;
    const touchMoveHandler = (e) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      if (Math.abs(deltaX) > deltaY && deltaX < 0) {
        setIsSwiping(true);
        e.preventDefault();
        const newOffset = Math.max(-DELETE_BUTTON_WIDTH * 2, deltaX);
        currentSwipeOffset = newOffset;
        setSwipeOffset(newOffset);
      }
    };
    const touchEndHandler = () => {
      handleTouchEnd(currentSwipeOffset);
    };
    swipeableElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    swipeableElement.addEventListener('touchmove', touchMoveHandler, { passive: false });
    swipeableElement.addEventListener('touchend', touchEndHandler, { passive: true });
    return () => {
      swipeableElement.removeEventListener('touchstart', handleTouchStart);
      swipeableElement.removeEventListener('touchmove', touchMoveHandler);
      swipeableElement.removeEventListener('touchend', touchEndHandler);
    };
  }, [swipeOffset, isSwiping, onDelete, entry]);

  const handleDeleteDirect = async () => {
    if (!entry || !entry.id || !onDelete) return;
    try {
      if (typeof firestoreStorage === 'undefined') {
        console.error('firestoreStorage not available');
        alert('Unable to delete. Please try again.');
        return;
      }
      if (mode === 'sleep') {
        await firestoreStorage.deleteSleepSession(entry.id);
      } else {
        await firestoreStorage.deleteFeeding(entry.id);
      }
      setSwipeOffset(0);
      if (onDelete) {
        await onDelete();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete. Please try again.');
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (itemRef.current && !itemRef.current.contains(e.target) && swipeOffset < 0) {
        setSwipeOffset(0);
      }
    };
    if (swipeOffset < 0) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [swipeOffset]);

  const handleClick = (e) => {
    if (isSwiping || swipeOffset < 0) {
      e.stopPropagation();
      return;
    }
    if (enableExpansion && allowCollapse && hasExpandedContent) {
      handleToggleExpand();
      return;
    }
    if (onClick && entry) {
      onClick(entry);
    }
  };

  const chevronIcon = (() => {
    const icons = window.TT?.shared?.icons || {};
    if (chevronDirection === 'down') return icons.ChevronDownIcon || window.ChevronDownIcon;
    if (chevronDirection === 'up') return icons.ChevronUpIcon || window.ChevronUpIcon;
    return icons.ChevronRightIcon || window.ChevronRightIcon;
  })();
  const chevronStyle = animateChevron && chevronDirection === 'right' && enableExpansion && allowCollapse
    ? { transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }
    : {};

  const resolvedBodyContent = (() => {
    if (bodyContent) return bodyContent;
    if (variant !== 'chat' || !chat) return null;
    const lastMsgText = chat.lastMessage?.text || '';
    const preview = lastMsgText.length > 50 ? lastMsgText.slice(0, 50) + '…' : lastMsgText;
    const avatar = typeof window !== 'undefined' && typeof window.ttChatAvatar === 'function'
      ? window.ttChatAvatar(chat)
      : null;
    const timestamp = chat.lastMessage?.createdAtMs
      ? (typeof window !== 'undefined' && typeof window.ttFormatTimeShort === 'function'
          ? window.ttFormatTimeShort(chat.lastMessage.createdAtMs)
          : '')
      : '';
    const unreadDot = chat.isUnread
      ? React.createElement('div', {
          style: {
            width: 8,
            height: 8,
            borderRadius: 9999,
            backgroundColor: '#007AFF',
            flex: '0 0 auto'
          }
        })
      : null;

    return React.createElement(
      'div',
      { className: 'flex items-center gap-3 flex-1 min-w-0' },
      avatar,
      React.createElement(
        'div',
        { className: 'flex-1 min-w-0' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-1' },
          React.createElement(
            'div',
            {
              className: 'font-semibold truncate',
              style: { color: 'var(--tt-text-primary)' }
            },
            chat.name
          ),
          timestamp
            ? React.createElement(
                'div',
                {
                  className: 'text-xs ml-2',
                  style: { color: 'var(--tt-text-secondary)', flex: '0 0 auto' }
                },
                timestamp
              )
            : null
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-2' },
          React.createElement(
            'div',
            {
              className: 'text-sm truncate',
              style: { color: 'var(--tt-text-secondary)', flex: '1 1 auto' }
            },
            preview || 'No messages yet'
          ),
          unreadDot
        )
      )
    );
  })();

  return React.createElement(
    'div',
    {
      ref: itemRef,
      className: "relative overflow-hidden rounded-2xl",
      style: { touchAction: 'pan-y' }
    },
    React.createElement(
      'div',
      {
        className: `swipeable-content rounded-2xl cursor-pointer transition-colors duration-150${enableTapAnimation ? ' tt-tapable' : ''}`,
        style: {
          backgroundColor: timelineBg,
          border: outlineBorder,
          position: 'relative',
          transition: isSwiping
            ? 'none'
            : 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)',
          zIndex: 1,
          overflow: 'hidden'
        },
        onClick: handleClick
      },
      React.createElement(
        'div',
        {
          className: "p-4",
          style: {
            transform: swipeOffset < 0
              ? `translateX(${swipeOffset}px)`
              : 'translateX(0px)',
            transition: isSwiping
              ? 'none'
              : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }
        },
        resolvedBodyContent
          ? React.createElement(
              'div',
              { className: "flex items-center justify-between" },
              React.createElement('div', { className: "flex-1 min-w-0" }, resolvedBodyContent),
              swipeOffset >= -SWIPE_THRESHOLD && (
                rightContent
                  ? rightContent
                  : (showChevron && chevronIcon && React.createElement(chevronIcon, {
                      className: "w-5 h-5",
                      isTapped: false,
                      selectedWeight: 'bold',
                      style: { color: 'var(--tt-text-secondary)', ...chevronStyle }
                    }))
              )
            )
          : React.createElement(
              'div',
              { className: "flex items-center justify-between mb-2" },
              React.createElement(
                'div',
                { className: "flex items-center gap-3" },
                showIcon ? getIcon() : null,
                showText && React.createElement(
                  'div',
                  null,
                  React.createElement('div', { className: "font-semibold", style: { color: 'var(--tt-text-secondary)' } },
                    primaryText
                  ),
                  React.createElement('div', { className: "text-[15.4px]", style: { color: 'var(--tt-text-secondary)' } },
                    secondaryText
                  )
                )
              ),
              swipeOffset >= -SWIPE_THRESHOLD && (
                rightContent
                  ? rightContent
                  : (showChevron && chevronIcon && React.createElement(chevronIcon, {
                      className: "w-5 h-5",
                      isTapped: false,
                      selectedWeight: 'bold',
                      style: { color: 'var(--tt-text-secondary)', ...chevronStyle }
                    }))
              )
            ),
        enableExpansion && hasExpandedContent && React.createElement(
          'div',
          {
            style: {
              overflow: 'hidden',
              maxHeight: expanded ? '1000px' : '0px',
              opacity: expanded ? 1 : 0,
              transition: allowCollapse ? 'max-height 0.4s ease, opacity 0.25s ease' : 'none'
            }
          },
          expandedContent !== null
            ? expandedContent
            : React.createElement(
                React.Fragment,
                null,
                hasNote && React.createElement(
                  'div',
                  { className: "italic text-[15.4px] mb-3", style: { color: 'var(--tt-text-secondary)' } },
                  `Note: ${entry.notes}`
                ),
                hasPhotos && React.createElement(
                  'div',
                  { className: "grid grid-cols-2 gap-2" },
                  entry.photoURLs.slice(0, 4).map((photoUrl, i) =>
                    React.createElement(
                      'img',
                      {
                        key: i,
                        src: photoUrl,
                        alt: `Photo ${i + 1}`,
                        className: "aspect-square rounded-2xl object-cover",
                        style: { backgroundColor: 'var(--tt-input-bg)' },
                        onClick: (e) => {
                          e.stopPropagation();
                          if (onPhotoClick) {
                            onPhotoClick(photoUrl);
                          }
                        }
                      }
                    )
                  )
                )
              )
        )
      ),
      enableSwipeDelete && onDelete && React.createElement(
        'div',
        {
          className: "absolute right-0 top-0 bottom-0 flex items-center justify-center rounded-r-2xl",
          style: {
            width: swipeOffset < 0
              ? (() => {
                  const absOffset = Math.abs(swipeOffset);
                  if (absOffset <= DELETE_BUTTON_WIDTH) {
                    return `${absOffset}px`;
                  } else {
                    const extra = absOffset - DELETE_BUTTON_WIDTH;
                    return `${Math.min(DELETE_BUTTON_MAX_WIDTH, DELETE_BUTTON_WIDTH + extra * 0.3)}px`;
                  }
                })()
              : '0px',
            backgroundColor: '#ef4444',
            transition: isSwiping
              ? 'none'
              : 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: swipeOffset < 0 ? Math.min(1, Math.abs(swipeOffset) / 60) : 0,
            overflow: 'hidden'
          }
        },
        React.createElement(
          'button',
          {
            onClick: handleDeleteDirect,
            className: "text-white font-semibold text-sm px-4 whitespace-nowrap",
            style: { touchAction: 'manipulation' }
          },
          'Delete'
        )
      )
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTSwipeRow = TTSwipeRow;
}
