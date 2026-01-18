// Timeline Component
// Converted from Timeline (1).tsx - VERBATIM

const __ttTimelineCn = (...classes) => classes.filter(Boolean).join(' ');

const Timeline = () => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [isCompiling, setIsCompiling] = React.useState(false);
  const [cards, setCards] = React.useState([
    { id: 1, time: '4:23 AM', hour: 4, minute: 23, completed: true, type: 'feed' },
    { id: 2, time: '6:45 AM', hour: 6, minute: 45, completed: true, type: 'sleep' },
    { id: 3, time: '8:12 AM', hour: 8, minute: 12, completed: true, type: 'feed' },
    { id: 4, time: '10:30 AM', hour: 10, minute: 30, completed: true, type: 'sleep' },
    { id: 5, time: '1:15 PM', hour: 13, minute: 15, completed: true, type: 'feed' },
    { id: 6, time: '3:47 PM', hour: 15, minute: 47, completed: false, type: 'sleep' },
    { id: 7, time: '5:20 PM', hour: 17, minute: 20, completed: false, type: 'feed' },
    { id: 8, time: '7:55 PM', hour: 19, minute: 55, completed: false, type: 'sleep' },
    { id: 9, time: '9:08 PM', hour: 21, minute: 8, completed: false, type: 'feed' },
    { id: 10, time: '11:33 PM', hour: 23, minute: 33, completed: false, type: 'sleep' }
  ]);
  const [draggingCard, setDraggingCard] = React.useState(null);
  const [holdingCard, setHoldingCard] = React.useState(null);
  const dragTimer = React.useRef(null);
  const timelineRef = React.useRef(null);
  const [dragY, setDragY] = React.useState(null);
  const touchOffset = React.useRef(0);
  const initialClientY = React.useRef(null);

  React.useEffect(() => {
    setTimeout(() => setHasLoaded(true), 100);
  }, []);

  const filteredCards = cards
    .filter(card => {
      if (filter === 'all') return true;
      return card.type === filter;
    })
    .sort((a, b) => {
      const aMinutes = a.hour * 60 + a.minute;
      const bMinutes = b.hour * 60 + b.minute;
      return aMinutes - bMinutes;
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
    setIsExpanded(!isExpanded);
  };

  const handleDragStart = (e, card) => {
    if (!isExpanded) return;
    
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    initialClientY.current = clientY;
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const currentY = clientY - timelineRect.top;
    
    const cardTop = (getCardPosition(card) / 100) * 1400;
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

    if (!draggingCard || !isExpanded || !timelineRef.current) return;
    
    if (e.cancelable) e.preventDefault();
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const relativeY = clientY - timelineRect.top;
    const newCardTop = relativeY - touchOffset.current;
    
    setDragY(newCardTop);
    
    const percentage = Math.max(0, Math.min(100, (newCardTop / timelineRect.height) * 100));
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
          const snappedMinutes = Math.round(totalMinutes / 15) * 15;
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

  return React.createElement('div', { className: "relative", style: { backgroundColor: 'var(--tt-app-bg)' } },
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
        React.createElement('button', {
          onClick: handleToggleExpanded,
          className: "bg-blue-600 text-white px-5 py-1.5 rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-900/20"
        }, isExpanded ? 'Done' : 'Edit')
      ),
      React.createElement('div', {
        ref: timelineRef,
        className: "relative transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
        style: { 
          height: isExpanded ? '1400px' : `${filteredCards.length * 84 + 20}px`,
        }
      },
        isExpanded && React.createElement('div', { className: "absolute left-0 top-0 w-16 h-full" },
          hours.map((h, idx) =>
            React.createElement('div', { key: idx },
              React.createElement('div', {
                className: "absolute left-0 text-zinc-600 text-[10px] font-bold",
                style: { 
                  top: `${h.position}%`,
                  transform: 'translateY(-50%)',
                  opacity: isExpanded ? 1 : 0,
                }
              }, h.label),
              React.createElement('div', {
                className: "absolute left-16 w-full border-t border-zinc-900/50",
                style: { 
                  top: `${h.position}%`,
                  opacity: isExpanded ? 0.3 : 0,
                }
              })
            )
          )
        ),
        React.createElement('div', { className: __ttTimelineCn("relative transition-all duration-700", isExpanded ? 'ml-20 h-full' : 'w-full') },
          __ttTimelineAnimatePresence && React.createElement(__ttTimelineAnimatePresence, { initial: false },
            filteredCards.map((card, index) => {
              const expandedTop = getCardPosition(card);
              const compressedTop = index * 84;
              const timelineHeight = 1400;
              const expandedTopPx = (expandedTop / 100) * timelineHeight;
              const isDragging = draggingCard === card.id;
              const isHolding = holdingCard === card.id;

              return __ttTimelineMotion && React.createElement(__ttTimelineMotion.div, {
                key: card.id,
                layout: !isDragging && !isHolding,
                initial: { opacity: 0, y: 20 },
                animate: { 
                  opacity: 1, 
                  y: (isDragging && dragY !== null) ? dragY : (isExpanded ? expandedTopPx : compressedTop),
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
                  "absolute w-full h-20 bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 border border-white/5",
                  isDragging && "shadow-2xl ring-2 ring-blue-500/50 cursor-grabbing",
                  isHolding && "shadow-xl ring-2 ring-blue-500/30",
                  !card.completed && "bg-zinc-950/40 border-dashed border-zinc-800"
                ),
                onMouseDown: (e) => handleDragStart(e, card),
                onTouchStart: (e) => handleDragStart(e, card),
                style: { 
                  touchAction: isExpanded ? 'none' : 'auto',
                  userSelect: 'none'
                }
              },
                React.createElement('div', {
                  className: __ttTimelineCn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-inner relative",
                    card.type === 'feed' ? 'bg-orange-500/20 text-orange-500' : 'bg-indigo-500/20 text-indigo-500',
                    !card.completed && "grayscale opacity-50"
                  )
                },
                  card.type === 'feed' ? '🍼' : '💤',
                  React.createElement('div', { className: "absolute -bottom-1 -right-1 bg-black rounded-full p-0.5" },
                    card.completed ? (
                      React.createElement('svg', { className: "w-3 h-3 text-green-500", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                        React.createElement('path', { d: "M20 6L9 17l-5-5", strokeLinecap: "round", strokeLinejoin: "round" })
                      )
                    ) : (
                      React.createElement('svg', { className: "w-3 h-3 text-zinc-500", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
                        React.createElement('circle', { cx: "12", cy: "12", r: "10" }),
                        React.createElement('polyline', { points: "12 6 12 12 16 14" })
                      )
                    )
                  )
                ),
                React.createElement('div', { className: "flex-1" },
                  React.createElement('div', { className: "flex justify-between items-baseline" },
                    React.createElement('div', { className: "flex items-center gap-2" },
                      React.createElement('h3', {
                        className: __ttTimelineCn(
                          "font-bold capitalize",
                          card.completed ? "text-white" : "text-zinc-500"
                        )
                      }, card.type)
                    ),
                    React.createElement('span', {
                      className: __ttTimelineCn(
                        "text-xs font-mono",
                        card.completed ? "text-zinc-500" : "text-zinc-700"
                      )
                    }, card.time)
                  ),
                  React.createElement('div', { className: "mt-2 w-full h-1.5 bg-black/40 rounded-full overflow-hidden" },
                    __ttTimelineMotion && React.createElement(__ttTimelineMotion.div, {
                      initial: { width: 0 },
                      animate: { width: card.completed ? '100%' : '0%' },
                      transition: { delay: 0.5, duration: 1, ease: "circOut" },
                      className: __ttTimelineCn(
                        "h-full rounded-full",
                        card.type === 'feed' ? 'bg-orange-500' : 'bg-indigo-500',
                        !card.completed && "opacity-20"
                      )
                    })
                  )
                )
              );
            })
          )
        )
      )
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.Timeline = Timeline;
}
