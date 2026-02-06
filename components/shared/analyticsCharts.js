// Shared analytics UI pieces (HighlightCard + 7-day bar charts)
const HighlightCard = ({ icon: Icon, label, insightText, categoryColor, onClick, children, isFeeding = false, showInsightText = true }) => {
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const TTCardHeader = window.TT?.shared?.TTCardHeader || window.TTCardHeader;
  const headerIconEl = Icon
    ? React.createElement(Icon, {
        className: 'w-5 h-5',
        style: { 
          color: categoryColor,
          strokeWidth: isFeeding ? '1.5' : undefined,
          fill: isFeeding ? 'none' : categoryColor,
          transform: isFeeding ? 'rotate(20deg)' : undefined
        }
      })
    : null;
  const headerTitleEl = React.createElement(
    'span',
    {
      className: 'text-[17.6px] font-semibold leading-6',
      style: { color: categoryColor }
    },
    label
  );
  const Chevron = window.TT?.shared?.icons?.ChevronRightIcon || window.ChevronRight || null;
  const headerRightEl = Chevron
    ? React.createElement(Chevron, { 
        className: 'w-5 h-5',
        style: { color: 'var(--tt-text-tertiary)' }
      })
    : null;
  const Card = TTCard || 'div';
  const cardProps = TTCard
    ? { variant: "tracker", className: "cursor-pointer", onClick }
    : {
        className: 'rounded-2xl shadow-sm p-5 cursor-pointer',
        style: { backgroundColor: 'var(--tt-tracker-card-bg)', borderColor: 'var(--tt-card-border)' },
        onClick
      };

  return React.createElement(
    Card,
    cardProps,
    // Header: icon + label left, chevron right
    TTCardHeader
      ? React.createElement(TTCardHeader, {
          icon: headerIconEl,
          title: headerTitleEl,
          right: headerRightEl,
          gapClass: 'gap-1',
          className: 'mb-3 h-6'
        })
      : React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-3 h-6' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-1' },
            headerIconEl,
            headerTitleEl
          ),
          headerRightEl
        ),
    showInsightText
      ? React.createElement(
          React.Fragment,
          null,
          // Insight Text: single block, bold, clamped to 2 lines
          React.createElement(
            'div',
            { className: 'mb-3' },
            React.createElement(
              'div',
              { 
                className: 'text-base font-bold leading-tight insight-text-clamp',
                style: { color: 'var(--tt-text-primary)' }
              },
              (insightText || []).join(' ')
            )
          ),
          // Divider
          React.createElement('div', { 
            className: 'border-t mb-3',
            style: { borderColor: 'var(--tt-card-border)' }
          })
        )
      : null,
    React.createElement(
      'div',
      { style: { height: '240px' } },
      children
    )
  );
};

const _dateKeyLocalSafe = (ms) => {
  if (typeof _dateKeyLocal === 'function') return _dateKeyLocal(ms);
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const _formatV2NumberSafe = (n) => {
  if (typeof formatV2Number === 'function') return formatV2Number(n);
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  const fixed = num.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
};

const SleepChart = ({ data = [], average = 0 }) => {
  const getComputedColor = (cssVar) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return '';
    }
    const defaultSleep = (window.TT && window.TT.themeTokens && window.TT.themeTokens.DEFAULT_APPEARANCE)
      ? window.TT.themeTokens.DEFAULT_APPEARANCE.sleepAccent
      : '';
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || defaultSleep;
  };

  const sleepColor = getComputedColor('--tt-sleep');
  const mutedBarColor = getComputedColor('--tt-subtle-surface');
  const tertiaryText = getComputedColor('--tt-text-tertiary');
  const secondaryText = getComputedColor('--tt-text-secondary');

  const getDayAbbrev = (date) => {
    const day = date.getDay();
    const abbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return abbrevs[day];
  };
  
  const todayKey = _dateKeyLocalSafe(Date.now());
  
  const chartData = data.map((entry) => {
    const hours = entry.totalHrs || 0;
    const dayAbbrev = entry.date ? getDayAbbrev(entry.date) : '';
    const isToday = entry.key === todayKey;
    return {
      day: dayAbbrev,
      hours: hours,
      isHighlighted: isToday,
      isToday: isToday
    };
  });
  
  if (chartData.length === 0) {
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: i === 0
      });
    }
  } else if (chartData.length < 7) {
    const now = new Date();
    while (chartData.length < 7) {
      const d = new Date(now);
      d.setDate(now.getDate() - (7 - chartData.length - 1));
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: chartData.length === 6
      });
    }
  }
  
  const maxHours = Math.max(
    ...chartData.map(d => d.hours),
    average,
    1
  );
  
  const chartHeight = 130;
  const barWidth = 32;
  const barGap = 16;
  const chartWidth = barWidth + barGap;
  const totalWidth = (chartData.length - 1) * chartWidth + barWidth;
  
  const bars = chartData.map((entry, index) => {
    const x = index * chartWidth;
    const height = (entry.hours / maxHours) * chartHeight;
    const y = chartHeight - height;
    return { ...entry, x, y, height };
  });
  
  const refLineY = chartHeight - (average / maxHours) * chartHeight;
  
  const [isVisible, setIsVisible] = React.useState(false);
  const chartRef = React.useRef(null);
  
  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    
    const element = chartRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px'
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);
  
  return React.createElement(
    'div',
    { 
      className: 'flex flex-col h-full justify-between',
      ref: chartRef
    },
    React.createElement(
      'div',
      { className: 'flex flex-col mb-1' },
        React.createElement(
          'span',
          {
            className: 'text-xs font-medium tracking-wider mb-1',
            style: { color: tertiaryText }
          },
          'Average sleep'
        ),
        React.createElement(
          'div',
          { className: 'flex items-baseline gap-1' },
        React.createElement(
          'span',
          {
            className: 'text-[40px] font-bold leading-none',
            style: { color: sleepColor }
          },
          _formatV2NumberSafe(average)
        ),
        React.createElement(
          'span',
          {
            className: 'relative -top-[1px] text-[17.6px] leading-none font-normal',
            style: { color: secondaryText }
          },
          'hrs'
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'w-full mt-2 -mx-1 relative', style: { height: '150px' } },
      React.createElement(
        'svg',
        {
          width: '100%',
          height: '100%',
          viewBox: `0 0 ${totalWidth} ${chartHeight + 25}`,
          preserveAspectRatio: 'xMidYMax meet',
          style: { overflow: 'visible' }
        },
        bars.map((bar, index) =>
          React.createElement(
            'rect',
            {
              key: `bar-${index}`,
              x: bar.x,
              y: isVisible ? bar.y : chartHeight,
              width: barWidth,
              height: isVisible ? bar.height : 0,
              fill: bar.isToday ? sleepColor : mutedBarColor,
              rx: 6,
              ry: 6,
              style: {
                transition: 'height 0.6s ease-out, y 0.6s ease-out',
                transitionDelay: `${index * 0.05}s`
              }
            }
          )
        ),
        bars.map((bar, index) =>
          React.createElement(
            'text',
            {
              key: `label-${index}`,
              x: bar.x + barWidth / 2,
              y: chartHeight + 18,
              textAnchor: 'middle',
              fill: tertiaryText,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif'
            },
            bar.day
          )
        ),
        React.createElement(
          'line',
          {
            x1: 0,
            y1: refLineY,
            x2: totalWidth,
            y2: refLineY,
            stroke: sleepColor,
            strokeWidth: 3,
            opacity: 0.85
          }
        )
      )
    )
  );
};

const FeedingChart = ({ data = [], average = 0 }) => {
  const getComputedColor = (cssVar) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return '';
    }
    const defaultFeed = (window.TT && window.TT.themeTokens && window.TT.themeTokens.DEFAULT_APPEARANCE)
      ? window.TT.themeTokens.DEFAULT_APPEARANCE.feedAccent
      : '';
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || defaultFeed;
  };

  const feedColor = getComputedColor('--tt-feed');
  const mutedBarColor = getComputedColor('--tt-subtle-surface');
  const tertiaryText = getComputedColor('--tt-text-tertiary');
  const secondaryText = getComputedColor('--tt-text-secondary');

  const getDayAbbrev = (date) => {
    const day = date.getDay();
    const abbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
    return abbrevs[day];
  };
  
  const todayKey = _dateKeyLocalSafe(Date.now());
  
  const chartData = data.map((entry) => {
    const volume = entry.volume || 0;
    const dayAbbrev = entry.date ? getDayAbbrev(entry.date) : '';
    const isToday = entry.key === todayKey;
    return {
      day: dayAbbrev,
      volume: volume,
      isHighlighted: isToday,
      isToday: isToday
    };
  });
  
  if (chartData.length === 0) {
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      chartData.push({
        day: getDayAbbrev(d),
        hours: 0,
        isHighlighted: false,
        isToday: i === 0
      });
    }
  } else if (chartData.length < 7) {
    const now = new Date();
    while (chartData.length < 7) {
      const d = new Date(now);
      d.setDate(now.getDate() - (7 - chartData.length - 1));
      chartData.push({
        day: getDayAbbrev(d),
        volume: 0,
        isHighlighted: false,
        isToday: chartData.length === 6
      });
    }
  }
  
  const maxVolume = Math.max(
    ...chartData.map(d => d.volume),
    average,
    1
  );
  
  const chartHeight = 130;
  const barWidth = 32;
  const barGap = 16;
  const chartWidth = barWidth + barGap;
  const totalWidth = (chartData.length - 1) * chartWidth + barWidth;
  
  const bars = chartData.map((entry, index) => {
    const x = index * chartWidth;
    const height = (entry.volume / maxVolume) * chartHeight;
    const y = chartHeight - height;
    return { ...entry, x, y, height };
  });
  
  const refLineY = chartHeight - (average / maxVolume) * chartHeight;
  
  const [isVisible, setIsVisible] = React.useState(false);
  const chartRef = React.useRef(null);
  
  React.useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    
    const element = chartRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px'
      }
    );
    
    observer.observe(element);
    
    return () => {
      observer.disconnect();
    };
  }, [isVisible]);
  
  return React.createElement(
    'div',
    { 
      className: 'flex flex-col h-full justify-between',
      ref: chartRef
    },
    React.createElement(
      'div',
      { className: 'flex flex-col mb-1' },
        React.createElement(
          'span',
          {
            className: 'text-xs font-medium tracking-wider mb-1',
            style: { color: tertiaryText }
          },
          'Average intake'
        ),
        React.createElement(
          'div',
          { className: 'flex items-baseline gap-1' },
        React.createElement(
          'span',
          {
            className: 'text-[40px] font-bold leading-none',
            style: { color: feedColor }
          },
          _formatV2NumberSafe(average)
        ),
        React.createElement(
          'span',
          {
            className: 'relative -top-[1px] text-[17.6px] leading-none font-normal',
            style: { color: secondaryText }
          },
          'oz'
        )
      )
    ),
    React.createElement(
      'div',
      { className: 'w-full mt-2 -mx-1 relative', style: { height: '150px' } },
      React.createElement(
        'svg',
        {
          width: '100%',
          height: '100%',
          viewBox: `0 0 ${totalWidth} ${chartHeight + 25}`,
          preserveAspectRatio: 'xMidYMax meet',
          style: { overflow: 'visible' }
        },
        bars.map((bar, index) =>
          React.createElement(
            'rect',
            {
              key: `bar-${index}`,
              x: bar.x,
              y: isVisible ? bar.y : chartHeight,
              width: barWidth,
              height: isVisible ? bar.height : 0,
              fill: bar.isToday ? feedColor : mutedBarColor,
              rx: 6,
              ry: 6,
              style: {
                transition: 'height 0.6s ease-out, y 0.6s ease-out',
                transitionDelay: `${index * 0.05}s`
              }
            }
          )
        ),
        bars.map((bar, index) =>
          React.createElement(
            'text',
            {
              key: `label-${index}`,
              x: bar.x + barWidth / 2,
              y: chartHeight + 18,
              textAnchor: 'middle',
              fill: tertiaryText,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: '-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif'
            },
            bar.day
          )
        ),
        React.createElement(
          'line',
          {
            x1: 0,
            y1: refLineY,
            x2: totalWidth,
            y2: refLineY,
            stroke: feedColor,
            strokeWidth: 3,
            opacity: 0.85
          }
        )
      )
    )
  );
};
