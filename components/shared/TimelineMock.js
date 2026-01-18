// Timeline mock component (ported from timeline (1).jsx)
const TimelineMock = () => {
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
  const [dragPosition, setDragPosition] = React.useState(null);
  const [holdingCard, setHoldingCard] = React.useState(null);
  const longPressTimer = React.useRef(null);
  const dragTimer = React.useRef(null);
  const timelineRef = React.useRef(null);

  React.useEffect(() => {
    const t = setTimeout(() => setHasLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  const filteredCards = cards
    .filter(card => (filter === 'all' ? true : card.type === filter))
    .sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));

  const handleFilterChange = (newFilter) => {
    if (newFilter === filter) return;
    setIsCompiling(true);
    setTimeout(() => setFilter(newFilter), 250);
    setTimeout(() => setIsCompiling(false), 500);
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

  const handleToggleExpanded = () => setIsExpanded(!isExpanded);

  const handleDragStart = (e, card) => {
    if (!isExpanded) return;
    e.stopPropagation();
    e.preventDefault();
    setHoldingCard(card.id);
    dragTimer.current = setTimeout(() => {
      setDraggingCard(card.id);
      setHoldingCard(null);
    }, 200);
  };

  const handleDragMove = (e) => {
    if (!draggingCard || !isExpanded || !timelineRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const relativeY = clientY - timelineRect.top;
    const percentage = Math.max(0, Math.min(100, (relativeY / timelineRect.height) * 100));
    setDragPosition(percentage);
    const newTime = positionToTime(percentage);
    setCards(prevCards => prevCards.map(card =>
      card.id === draggingCard ? { ...card, ...newTime } : card
    ));
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
    setDragPosition(null);
    setHoldingCard(null);
  };

  React.useEffect(() => {
    if (!draggingCard) return undefined;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.touchAction = 'none';
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.touchAction = '';
      window.scrollTo(0, scrollY);
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [draggingCard]);

  const renderIcon = (type) => {
    if (type === 'feed') {
      return React.createElement(
        'svg',
        { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", width: 20, height: 20, fill: "none", className: "flex-shrink-0", style: { transform: 'rotate(20deg)' } },
        React.createElement('path', { fill: "#ff69b4", d: "M11.264,1.872 C11.474,1.805 11.731,1.747 12.011,1.75 C12.277,1.753 12.518,1.811 12.711,1.872 C14.401,2.403 15.202,4.311 14.378,5.874 C14.19,6.231 14.246,6.522 14.371,6.76 C14.389,6.794 14.46,6.878 14.665,6.984 C14.859,7.085 15.088,7.163 15.321,7.237 L15.321,7.237 C16.501,7.611 17.189,8.319 17.529,9.112 C17.813,9.772 17.833,10.439 17.773,10.933 C17.8,11.008 17.832,11.101 17.869,11.212 C17.968,11.514 18.099,11.947 18.229,12.484 C18.489,13.556 18.75,15.054 18.75,16.753 C18.75,17.978 18.614,19.098 18.441,20.028 L18.416,20.166 C18.233,21.157 18.082,21.978 17.314,22.615 C16.904,22.956 16.459,23.113 15.959,23.185 C15.504,23.251 14.961,23.251 14.34,23.25 L9.66,23.25 C9.039,23.251 8.496,23.251 8.041,23.185 C7.541,23.113 7.096,22.956 6.686,22.615 C5.918,21.978 5.767,21.157 5.584,20.166 L5.559,20.028 C5.386,19.098 5.25,17.978 5.25,16.753 C5.25,15.054 5.511,13.556 5.771,12.484 C5.901,11.947 6.032,11.514 6.131,11.212 C6.17,11.093 6.205,10.995 6.232,10.918 C6.025,9.174 7.099,7.513 9.076,7.128 C9.407,7.016 9.597,6.861 9.713,6.642 C9.763,6.547 9.778,6.471 9.773,6.385 C9.766,6.285 9.728,6.124 9.596,5.874 C8.772,4.311 9.574,2.403 11.264,1.872 Z" })
      );
    }
    return React.createElement(
      'svg',
      { xmlns: "http://www.w3.org/2000/svg", width: 20, height: 20, viewBox: "0 0 256 256", className: "flex-shrink-0" },
      React.createElement('path', { fill: "#87CEEB", d: "M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z" })
    );
  };

  const renderCard = (card, index) => {
    const expandedTop = getCardPosition(card);
    const compressedTop = index * 92;
    const timelineHeight = 1400;
    const expandedTopPx = (expandedTop / 100) * timelineHeight;
    const isDragging = draggingCard === card.id;
    const isHolding = holdingCard === card.id;
    const visualTopPx = isDragging && dragPosition !== null
      ? (dragPosition / 100) * timelineHeight
      : expandedTopPx;
    const baseTop = isExpanded ? visualTopPx : compressedTop;
    const currentTop = isCompiling ? index * 110 : baseTop;

    return React.createElement(
      'div',
      {
        key: card.id,
        className: `timeline-card ${isDragging ? 'z-50' : ''}`,
        style: {
          position: 'absolute',
          top: `${currentTop}px`,
          left: 0,
          right: 0,
          transform: `translateY(0) ${isDragging ? 'scale(1.05)' : isHolding ? 'scale(1.02)' : 'scale(1)'} ${hasLoaded ? 'translateX(0)' : 'translateX(-100px)'}`,
          cursor: isExpanded ? 'grab' : 'default',
          transition: isDragging ? 'none' : isCompiling ? 'all 0.25s linear' : 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: hasLoaded ? 1 : 0
        },
        onMouseDown: (e) => handleDragStart(e, card),
        onTouchStart: (e) => handleDragStart(e, card),
        onMouseUp: handleDragEnd,
        onTouchEnd: handleDragEnd
      },
      React.createElement(
        'div',
        {
          className: `rounded-2xl p-4 h-20 relative transition-all duration-200 ${card.completed ? 'bg-gray-800' : 'bg-transparent border-2 border-gray-700'} ${isDragging ? 'shadow-2xl ring-2 ring-blue-500' : isHolding ? 'shadow-lg ring-2 ring-blue-400' : ''}`
        },
        React.createElement(
          'div',
          { className: `flex items-center gap-2 ${card.completed ? '' : 'opacity-70'}` },
          renderIcon(card.type),
          React.createElement('div', { className: "text-gray-300 text-base font-medium" }, card.time)
        ),
        card.completed
          ? React.createElement(
              'div',
              { className: "absolute top-3 right-3" },
              React.createElement(
                'svg',
                { xmlns: "http://www.w3.org/2000/svg", width: 20, height: 20, fill: "#000000", viewBox: "0 0 256 256", className: "text-gray-600" },
                React.createElement('path', { fill: "currentColor", d: "M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" })
              )
            )
          : null
      )
    );
  };

  return React.createElement(
    'div',
    { className: "w-full" },
    React.createElement(
      'div',
      { className: "max-w-md mx-auto select-none" },
      React.createElement(
        'div',
        { className: "flex justify-between items-center mb-4" },
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
        React.createElement(
          'button',
          {
            onClick: handleToggleExpanded,
            className: "bg-blue-500 text-white px-6 py-2 rounded-2xl font-medium hover:bg-blue-600 active:scale-95 transition-all"
          },
          isExpanded ? 'Done' : 'Edit'
        )
      ),
      React.createElement(
        'div',
        {
          ref: timelineRef,
          className: "relative",
          style: {
            height: isExpanded ? '1400px' : 'auto',
            minHeight: isExpanded ? '1400px' : `${filteredCards.length * 92}px`,
            transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            touchAction: draggingCard ? 'none' : 'auto'
          }
        },
        isExpanded
          ? React.createElement(
              'div',
              { className: "absolute left-0 top-0 w-16 h-full" },
              hours.map((h, idx) =>
                React.createElement(
                  'div',
                  { key: idx },
                  React.createElement(
                    'div',
                    {
                      className: "absolute left-0 text-gray-400 text-xs transition-all duration-600 ease-out",
                      style: {
                        top: `${h.position}%`,
                        transform: isExpanded ? 'translateX(0) translateY(-50%)' : 'translateX(-30px) translateY(-50%)',
                        opacity: isExpanded ? 1 : 0,
                        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                      }
                    },
                    h.label
                  ),
                  idx < hours.length - 1
                    ? React.createElement(
                        'div',
                        {
                          className: "absolute left-16 w-full border-t border-gray-800",
                          style: {
                            top: `${h.position + ((100 / 24) / 2)}%`,
                            opacity: isExpanded ? 1 : 0,
                            transform: isExpanded ? 'scaleX(1)' : 'scaleX(0)',
                            transformOrigin: 'left',
                            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                          }
                        }
                      )
                    : null,
                  React.createElement(
                    'div',
                    {
                      className: "absolute left-16 w-full border-t border-gray-700",
                      style: {
                        top: `${h.position}%`,
                        opacity: isExpanded ? 1 : 0,
                        transform: isExpanded ? 'scaleX(1)' : 'scaleX(0)',
                        transformOrigin: 'left',
                        transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                      }
                    }
                  )
                )
              )
            )
          : null,
        React.createElement(
          'div',
          { className: isExpanded ? 'ml-20 relative h-full' : 'relative' },
          filteredCards.map((card, index) => renderCard(card, index))
        )
      )
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TimelineMock = TimelineMock;
}
