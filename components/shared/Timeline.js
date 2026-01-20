// Timeline Component
// Converted from Timeline (1).tsx - VERBATIM

const __ttTimelineCn = (...classes) => classes.filter(Boolean).join(' ');

const Timeline = ({
  initialLoggedItems = null,
  initialScheduledItems = null,
  disableExpanded = false,
  allowItemExpand = true,
  editMode = null,
  onEditModeChange = null,
  onEditCard = null,
  onDeleteCard = null
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [isCompiling, setIsCompiling] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState('desc'); // 'desc' = reverse chrono (default), 'asc' = chrono
  const [timelineFullSizePhoto, setTimelineFullSizePhoto] = React.useState(null);
  const [editingCard, setEditingCard] = React.useState(null);
  const [deletingCard, setDeletingCard] = React.useState(null);
  const isEditMode = typeof editMode === 'boolean' ? editMode : isExpanded;
  const isEditControlled = typeof editMode === 'boolean';
  const isExpandedEffective = disableExpanded ? false : isExpanded;

  // Access app icons
  const bottleIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.BottleV2 || window.TT.shared.icons["bottle-v2"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["bottle-main"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Bottle2) ||
    null;
  const moonIcon =
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.MoonV2 || window.TT.shared.icons["moon-v2"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons["moon-main"])) ||
    (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.Moon2) ||
    null;
  const TimelineItem =
    (window.TT && window.TT.shared && window.TT.shared.TimelineItem) ||
    null;
  const [expandedCardId, setExpandedCardId] = React.useState(null);

  // Default scheduled items (kept as fallback/placeholder)
  const defaultScheduledItems = [
    { id: 'sched-1', time: '3:47 PM', hour: 15, minute: 47, variant: 'scheduled', type: 'sleep', amount: 3, unit: 'hrs' },
    { id: 'sched-2', time: '5:20 PM', hour: 17, minute: 20, variant: 'scheduled', type: 'feed', amount: 4, unit: 'oz' },
    { id: 'sched-3', time: '7:55 PM', hour: 19, minute: 55, variant: 'scheduled', type: 'sleep', amount: 3, unit: 'hrs' },
    { id: 'sched-4', time: '9:08 PM', hour: 21, minute: 8, variant: 'scheduled', type: 'feed', amount: 4, unit: 'oz' },
    { id: 'sched-5', time: '11:33 PM', hour: 23, minute: 33, variant: 'scheduled', type: 'sleep', amount: 2, unit: 'hrs' }
  ];

  const resolvedScheduledItems = Array.isArray(initialScheduledItems)
    ? initialScheduledItems
    : defaultScheduledItems;

  // Start with just scheduled items - production logged data comes via prop
  const [cards, setCards] = React.useState(() => {
    // If initialLoggedItems provided on mount, use it
    if (Array.isArray(initialLoggedItems)) {
      return [...initialLoggedItems, ...resolvedScheduledItems];
    }
    return [...resolvedScheduledItems];
  });

  // Update cards when initialLoggedItems changes (e.g., date change)
  React.useEffect(() => {
    const scheduledItems = Array.isArray(initialScheduledItems)
      ? initialScheduledItems
      : defaultScheduledItems;
    const loggedItems = Array.isArray(initialLoggedItems) ? initialLoggedItems : null;

    if (loggedItems || Array.isArray(initialScheduledItems)) {
      setCards([...(loggedItems || []), ...scheduledItems]);
    }
  }, [initialLoggedItems, initialScheduledItems]);
  const [draggingCard, setDraggingCard] = React.useState(null);
  const [holdingCard, setHoldingCard] = React.useState(null);
  const dragTimer = React.useRef(null);
  const timelineRef = React.useRef(null);
  const [dragY, setDragY] = React.useState(null);
  const touchOffset = React.useRef(0);
  const initialClientY = React.useRef(null);
  const expandedContentHeight = 190;

  const handleTimelinePhotoClick = React.useCallback((photoUrl) => {
    setTimelineFullSizePhoto(photoUrl);
  }, []);

  const handleDownloadPhoto = React.useCallback(async (e) => {
    e.stopPropagation();
    if (!timelineFullSizePhoto) return;

    try {
      const response = await fetch(timelineFullSizePhoto);
      const blob = await response.blob();
      const urlParts = timelineFullSizePhoto.split('.');
      const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
      const filename = `photo_${Date.now()}.${extension}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const a = document.createElement('a');
      a.href = timelineFullSizePhoto;
      a.download = `photo_${Date.now()}.jpg`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [timelineFullSizePhoto]);

  const handleEditCard = React.useCallback((card) => {
    if (typeof onEditCard === 'function') {
      onEditCard(card);
      return;
    }
    setEditingCard(card);
  }, [onEditCard]);

  const handleDeleteCard = React.useCallback((card) => {
    setDeletingCard(card);
  }, []);

  const confirmDelete = React.useCallback(async () => {
    if (!deletingCard) return;
    if (typeof onDeleteCard === 'function') {
      await onDeleteCard(deletingCard);
      setDeletingCard(null);
      return;
    }
    setCards(prev => prev.filter(c => c.id !== deletingCard.id));
    setDeletingCard(null);
  }, [deletingCard, onDeleteCard]);

  React.useEffect(() => {
    setTimeout(() => setHasLoaded(true), 100);
  }, []);
  
  React.useEffect(() => {
    if (disableExpanded && isExpanded) {
      setIsExpanded(false);
    }
  }, [disableExpanded, isExpanded]);

  const filteredCards = cards
    .filter(card => {
      if (filter === 'all') return true;
      return card.type === filter;
    })
    .sort((a, b) => {
      const aMinutes = a.hour * 60 + a.minute;
      const bMinutes = b.hour * 60 + b.minute;
      const direction = sortOrder === 'asc' ? 1 : -1;
      return (aMinutes - bMinutes) * direction;
    });

  const handleFilterChange = (newFilter) => {
    if (newFilter === filter) return;
    setIsCompiling(true);
    setTimeout(() => {
      setFilter(newFilter);
    }, 250);
    setTimeout(() => {
      setIsCompiling(false);
    }, 500);
  };

  const hours = Array.from({ length: 25 }, (_, i) => {
    const hour = i % 24;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
      hour,
      label: `${displayHour}:00 ${period}`,
      position: (i / 24) * 100
    };
  });

  const getCardPosition = (card) => {
    const totalMinutes = card.hour * 60 + card.minute;
    return (totalMinutes / (24 * 60)) * 100;
  };

  const getHasDetails = (card) => {
    if (!card) return false;
    const photoList = card.photoURLs || card.photoUrls || card.photos;
    const hasPhotos = Array.isArray(photoList) ? photoList.length > 0 : Boolean(photoList);
    const hasNote = Boolean(card.note || card.notes);
    return hasPhotos || hasNote;
  };

  const positionToTime = (percentage) => {
    const totalMinutes = Math.round((percentage / 100) * 24 * 60);
    const hour = Math.floor(totalMinutes / 60) % 24;
    const minute = totalMinutes % 60;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return {
      hour,
      minute,
      time: `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`
    };
  };

  const handleToggleExpanded = () => {
    if (disableExpanded) {
      if (typeof onEditModeChange === 'function') {
        onEditModeChange(!isEditMode);
      }
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleDragStart = (e, card) => {
    if (!isExpandedEffective) return;
    
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    initialClientY.current = clientY;
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const currentY = clientY - timelineRect.top;
    
    const cardTopBase = (getCardPosition(card) / 100) * 1400;
    const expandedCard = expandedCardId ? cards.find((c) => c.id === expandedCardId) : null;
    const expandedCardTopBase = expandedCard ? (getCardPosition(expandedCard) / 100) * 1400 : null;
    const needsExpandedOffset = isExpandedEffective && expandedCard && card.id !== expandedCardId && cardTopBase > expandedCardTopBase;
    const cardTop = needsExpandedOffset ? cardTopBase + expandedContentHeight : cardTopBase;
    touchOffset.current = currentY - cardTop;
    
    dragTimer.current = setTimeout(() => {
      setDraggingCard(card.id);
      setDragY(cardTop); 
      setHoldingCard(null);
    }, 500);

    setHoldingCard(card.id);
  };

  const handleDragMove = (e) => {
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    if (holdingCard && !draggingCard) {
      const movement = Math.abs(clientY - initialClientY.current);
      if (movement > 5) {
        if (dragTimer.current) {
          clearTimeout(dragTimer.current);
          dragTimer.current = null;
        }
        setHoldingCard(null);
        return;
      }
    }

    if (!draggingCard || !isExpandedEffective || !timelineRef.current) return;
    
    if (e.cancelable) e.preventDefault();
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const relativeY = clientY - timelineRect.top;
    const newCardTop = relativeY - touchOffset.current;
    const maxTop = Math.max(0, timelineRect.height - 1);
    const clampedTop = Math.max(0, Math.min(maxTop, newCardTop));
    
    setDragY(clampedTop);
    
    const percentage = Math.max(0, Math.min(100, (clampedTop / 1400) * 100));
    const newTime = positionToTime(percentage);
    
    window.requestAnimationFrame(() => {
      setCards(prevCards => prevCards.map(card => 
        card.id === draggingCard ? { ...card, ...newTime } : card
      ));
    });
  };

  const handleDragEnd = () => {
    if (dragTimer.current) {
      clearTimeout(dragTimer.current);
      dragTimer.current = null;
    }
    if (draggingCard) {
      setCards(prevCards => prevCards.map(card => {
        if (card.id === draggingCard) {
          const totalMinutes = card.hour * 60 + card.minute;
          const snappedMinutes = Math.min(23 * 60 + 55, Math.round(totalMinutes / 15) * 15);
          const snappedHour = Math.floor(snappedMinutes / 60) % 24;
          const snappedMinute = snappedMinutes % 60;
          const period = snappedHour >= 12 ? 'PM' : 'AM';
          const displayHour = snappedHour === 0 ? 12 : snappedHour > 12 ? snappedHour - 12 : snappedHour;
          return {
            ...card,
            hour: snappedHour,
            minute: snappedMinute,
            time: `${displayHour}:${snappedMinute.toString().padStart(2, '0')} ${period}`
          };
        }
        return card;
      }));
    }
    setDraggingCard(null);
    setDragY(null);
    setHoldingCard(null);
    initialClientY.current = null;
  };

  React.useEffect(() => {
    if (draggingCard || holdingCard) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [draggingCard, holdingCard]);

  const __ttTimelineMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion) ? window.Motion.motion : null;
  const __ttTimelineAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence) ? window.Motion.AnimatePresence : null;

  const timelinePhotoModal = timelineFullSizePhoto && ReactDOM.createPortal(
    React.createElement('div', {
      onClick: () => setTimelineFullSizePhoto(null),
      className: "fixed inset-0 bg-black/75 flex items-center justify-center p-4",
      style: { zIndex: 20000 }
    },
      React.createElement('button', {
        onClick: handleDownloadPhoto,
        className: "absolute top-4 right-20 w-10 h-10 flex items-center justify-center rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors",
        'aria-label': 'Download'
      },
        React.createElement('svg', {
          xmlns: "http://www.w3.org/2000/svg",
          width: "32",
          height: "32",
          fill: "#ffffff",
          viewBox: "0 0 256 256",
          className: "w-5 h-5"
        },
          React.createElement('path', {
            d: "M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z"
          })
        )
      ),
      React.createElement('button', {
        onClick: (e) => {
          e.stopPropagation();
          setTimelineFullSizePhoto(null);
        },
        className: "absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black bg-opacity-50 hover:bg-opacity-70 transition-colors",
        'aria-label': 'Close'
      },
        React.createElement('svg', {
          xmlns: "http://www.w3.org/2000/svg",
          width: "32",
          height: "32",
          fill: "#ffffff",
          viewBox: "0 0 256 256",
          className: "w-5 h-5"
        },
          React.createElement('path', {
            d: "M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"
          })
        )
      ),
      React.createElement('img', {
        src: timelineFullSizePhoto,
        alt: "Full size photo",
        className: "max-w-full max-h-full object-contain",
        onClick: (e) => e.stopPropagation()
      })
    ),
    document.body
  );

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', { className: "relative", style: { backgroundColor: 'var(--tt-app-bg)' } },
      React.createElement('div', { className: "w-full select-none" },
        React.createElement('div', { className: "sticky top-0 z-[100] backdrop-blur-md pt-0 pb-4 mb-0 flex justify-between items-center transition-all", style: { backgroundColor: 'var(--tt-app-bg)' } },
          React.createElement(
            (window.TT?.shared?.SegmentedToggle || window.SegmentedToggle || 'div'),
            {
              value: filter,
              options: [
                { label: 'All', value: 'all' },
                { label: 'Feed', value: 'feed' },
                { label: 'Sleep', value: 'sleep' }
              ],
              onChange: handleFilterChange,
              variant: 'body',
              size: 'medium',
              fullWidth: false
            }
          ),
          React.createElement('div', { className: "flex items-center gap-2" },
            React.createElement('button', {
              onClick: handleToggleSort,
              className: "w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95",
              style: {
                backgroundColor: 'var(--tt-subtle-surface)',
                borderColor: 'var(--tt-card-border)',
                color: 'var(--tt-text-primary)'
              },
              'aria-label': sortOrder === 'desc' ? 'Sort chronological' : 'Sort reverse chronological'
            },
              sortOrder === 'desc'
                ? React.createElement('svg', {
                    xmlns: "http://www.w3.org/2000/svg",
                    width: "32",
                    height: "32",
                    fill: "currentColor",
                    viewBox: "0 0 256 256",
                    className: "w-5 h-5"
                  },
                    React.createElement('path', {
                      d: "M40,128a8,8,0,0,1,8-8h72a8,8,0,0,1,0,16H48A8,8,0,0,1,40,128Zm8-56h56a8,8,0,0,0,0-16H48a8,8,0,0,0,0,16ZM184,184H48a8,8,0,0,0,0,16H184a8,8,0,0,0,0-16ZM229.66,82.34l-40-40a8,8,0,0,0-11.32,0l-40,40a8,8,0,0,0,11.32,11.32L176,67.31V144a8,8,0,0,0,16,0V67.31l26.34,26.35a8,8,0,0,0,11.32-11.32Z"
                    })
                  )
                : React.createElement('svg', {
                    xmlns: "http://www.w3.org/2000/svg",
                    width: "32",
                    height: "32",
                    fill: "currentColor",
                    viewBox: "0 0 256 256",
                    className: "w-5 h-5"
                  },
                    React.createElement('path', {
                      d: "M128,128a8,8,0,0,1-8,8H48a8,8,0,0,1,0-16h72A8,8,0,0,1,128,128ZM48,72H184a8,8,0,0,0,0-16H48a8,8,0,0,0,0,16Zm56,112H48a8,8,0,0,0,0,16h56a8,8,0,0,0,0-16Zm125.66-21.66a8,8,0,0,0-11.32,0L192,188.69V112a8,8,0,0,0-16,0v76.69l-26.34-26.35a8,8,0,0,0-11.32,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,229.66,162.34Z"
                    })
                  )
            ),
            __ttTimelineMotion && isEditControlled
              ? React.createElement(__ttTimelineMotion.div, {
                  className: "flex items-center gap-2"
                },
                  isEditMode && React.createElement(__ttTimelineMotion.span, {
                    initial: { opacity: 0, y: -4 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -4 },
                    className: "text-xs font-semibold px-2 py-1 rounded-full",
                    style: {
                      backgroundColor: 'var(--tt-subtle-surface)',
                      color: 'var(--tt-text-secondary)'
                    }
                  }, "Editing"),
                  React.createElement(__ttTimelineMotion.button, {
                    onClick: handleToggleExpanded,
                    className: "px-5 py-1.5 rounded-xl font-semibold text-sm transition-all shadow-lg",
                    animate: {
                      backgroundColor: isEditMode ? '#111827' : '#2563eb',
                      color: '#ffffff',
                      boxShadow: isEditMode
                        ? '0 10px 25px rgba(0,0,0,0.25)'
                        : '0 10px 25px rgba(37,99,235,0.25)'
                    }
                  }, isEditMode ? 'Done' : 'Edit')
                )
              : React.createElement('button', {
                  onClick: handleToggleExpanded,
                  className: "bg-blue-600 text-white px-5 py-1.5 rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-900/20"
                }, (disableExpanded ? isEditMode : isExpanded) ? 'Done' : 'Edit')
          )
        ),
        React.createElement('div', {
          ref: timelineRef,
          className: "relative transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
          style: {
            height: isExpandedEffective
              ? '1400px'
              : `${filteredCards.length * 84 + 20 + (expandedCardId ? expandedContentHeight : 0)}px`,
          }
        },
          isExpandedEffective && React.createElement('div', { className: "absolute left-0 top-0 w-16 h-full" },
            hours.map((h, idx) =>
              React.createElement('div', { key: idx },
                React.createElement('div', {
                  className: "absolute left-0 text-zinc-600 text-[10px] font-bold",
                  style: {
                    top: `${h.position}%`,
                    transform: idx === 0 ? 'translateY(0)' : (idx === hours.length - 1 ? 'translateY(-100%)' : 'translateY(-50%)'),
                    opacity: isExpandedEffective ? 1 : 0,
                  }
                }, h.label),
                React.createElement('div', {
                  className: "absolute left-16 w-full border-t border-zinc-900/50",
                  style: {
                    top: `${h.position}%`,
                    opacity: isExpandedEffective ? 0.3 : 0,
                  }
                })
              )
            )
          ),
          React.createElement('div', { className: __ttTimelineCn("relative transition-all duration-700", isExpandedEffective ? 'ml-20 h-full' : 'w-full') },
            __ttTimelineAnimatePresence && React.createElement(__ttTimelineAnimatePresence, { initial: false },
              (() => {
                const expandedCard = expandedCardId
                  ? filteredCards.find((c) => c.id === expandedCardId)
                  : null;
                const expandedCardIndex = expandedCardId
                  ? filteredCards.findIndex((c) => c.id === expandedCardId)
                  : -1;
                const timelineHeight = 1400;
                const expandedCardTopBase = expandedCard
                  ? (getCardPosition(expandedCard) / 100) * timelineHeight
                  : null;
                return filteredCards.map((card, index) => {
                  const expandedTop = getCardPosition(card);
                  const compressedTop = index * 84;
                  const expandedTopPx = (expandedTop / 100) * timelineHeight;
                  const isDragging = draggingCard === card.id;
                  const isHolding = holdingCard === card.id;
                  const isLogged = card.variant === 'logged';
                  const cardEditMode = isEditMode;
                  const hasDetails = isLogged && getHasDetails(card);
                  const isExpandedCard = expandedCardId === card.id;
                  const extraOffset = expandedCardId && expandedCardTopBase !== null && expandedTopPx > expandedCardTopBase
                    ? expandedContentHeight
                    : 0;
                  const compressedExtraOffset = expandedCardIndex !== -1 && index > expandedCardIndex
                    ? expandedContentHeight
                    : 0;
                  const targetY = (isDragging && dragY !== null)
                    ? dragY
                    : (isExpandedEffective ? expandedTopPx + extraOffset : compressedTop + compressedExtraOffset);

                  return __ttTimelineMotion && React.createElement(__ttTimelineMotion.div, {
                    key: card.id,
                    layout: !isDragging && !isHolding,
                    initial: { opacity: 0, y: 20 },
                    animate: {
                      opacity: 1,
                      y: targetY,
                      scale: (isDragging || isHolding) ? 1.05 : 1,
                      zIndex: (isDragging || isHolding) ? 50 : 1,
                    },
                    exit: { opacity: 0, scale: 0.8 },
                    transition: {
                      type: isDragging ? "just" : "spring",
                      stiffness: 500,
                      damping: 35,
                    },
                    className: __ttTimelineCn(
                      "absolute w-full min-h-[72px] backdrop-blur-md rounded-2xl p-4 flex items-start gap-4 border",
                      isDragging && "shadow-2xl cursor-grabbing",
                      isHolding && "shadow-xl",
                      !isLogged && "border-dashed"
                    ),
                    onMouseDown: (e) => handleDragStart(e, card),
                    onTouchStart: (e) => handleDragStart(e, card),
                    onClick: () => {
                      if (!isLogged || cardEditMode || !hasDetails || isDragging || isHolding || (!allowItemExpand)) return;
                      setExpandedCardId((prev) => (prev === card.id ? null : card.id));
                    },
                    style: {
                      touchAction: isExpandedEffective ? 'none' : 'auto',
                      userSelect: 'none',
                      backgroundColor: isLogged ? 'var(--tt-card-bg)' : 'var(--tt-app-bg)',
                      borderColor: isLogged ? 'var(--tt-card-border)' : 'var(--tt-text-tertiary)',
                      boxShadow: (() => {
                        if (!isDragging && !isHolding) return undefined;
                        const baseColor = !isLogged
                          ? 'var(--tt-text-secondary)'
                          : (card.type === 'feed' ? 'var(--tt-feed)' : 'var(--tt-sleep)');
                        const mixPct = isDragging ? '50%' : '30%';
                        return `0 0 0 2px color-mix(in srgb, ${baseColor} ${mixPct}, transparent)`;
                      })()
                    }
                  },
                    TimelineItem
                      ? React.createElement(TimelineItem, {
                          card,
                          bottleIcon,
                          moonIcon,
                          isExpanded: isExpandedCard,
                          detailsHeight: expandedContentHeight,
                          hasDetails,
                          onPhotoClick: handleTimelinePhotoClick,
                          isEditMode: cardEditMode,
                          onEdit: handleEditCard,
                          onDelete: handleDeleteCard
                        })
                      : null
                  );
                });
              })()
            )
          )
        )
      )
    ),
    timelinePhotoModal,
    deletingCard && ReactDOM.createPortal(
      React.createElement('div', {
        onClick: () => setDeletingCard(null),
        className: "fixed inset-0 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm",
        style: { zIndex: 30000 }
      },
        React.createElement('div', {
          onClick: (e) => e.stopPropagation(),
          className: "rounded-3xl shadow-2xl p-6 max-w-sm w-full",
          style: { backgroundColor: 'var(--tt-card-bg)' }
        },
          React.createElement('h2', {
            className: "text-xl font-semibold mb-2",
            style: { color: 'var(--tt-text-primary)' }
          }, `Delete ${deletingCard.type === 'feed' ? 'Feeding' : 'Sleep'}?`),
          React.createElement('p', {
            className: "text-base mb-6",
            style: { color: 'var(--tt-text-secondary)' }
          }, `Are you sure you want to delete this ${deletingCard.type} at ${deletingCard.time}?`),
          React.createElement('div', { className: "flex gap-3" },
            React.createElement('button', {
              onClick: () => setDeletingCard(null),
              className: "flex-1 px-4 py-3 rounded-xl font-semibold text-base transition-all",
              style: {
                backgroundColor: 'var(--tt-subtle-surface)',
                color: 'var(--tt-text-primary)'
              }
            }, 'Cancel'),
            React.createElement('button', {
              onClick: confirmDelete,
              className: "flex-1 px-4 py-3 rounded-xl font-semibold text-base transition-all shadow-lg",
              style: {
                backgroundColor: '#ef4444',
                color: '#ffffff'
              }
            }, 'Delete')
          )
        )
      ),
      document.body
    ),
    editingCard && ReactDOM.createPortal(
      React.createElement('div', {
        className: "fixed inset-0 bg-black/60 flex items-center justify-center p-4",
        style: { zIndex: 30000 }
      },
        React.createElement('div', {
          className: "rounded-3xl shadow-2xl p-6 max-w-sm w-full",
          style: { backgroundColor: 'var(--tt-card-bg)' }
        },
          React.createElement('h2', {
            className: "text-xl font-semibold mb-4",
            style: { color: 'var(--tt-text-primary)' }
          }, `Edit ${editingCard.type === 'feed' ? 'Feeding' : 'Sleep'}`),
          React.createElement('p', {
            className: "text-base mb-4",
            style: { color: 'var(--tt-text-secondary)' }
          }, 'Detail sheets (TTFeedDetailSheet / TTSleepDetailSheet) will be integrated here.'),
          React.createElement('button', {
            onClick: () => setEditingCard(null),
            className: "w-full px-4 py-3 rounded-xl font-semibold text-base",
            style: {
              backgroundColor: 'var(--tt-subtle-surface)',
              color: 'var(--tt-text-primary)'
            }
          }, 'Close')
        )
      ),
      document.body
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.Timeline = Timeline;
}
