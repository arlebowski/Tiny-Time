// Shared analytics UI pieces (HighlightCard + 7-day bar charts)
const HighlightCard = ({
  icon: Icon,
  label,
  insightText,
  categoryColor,
  onClick,
  children,
  isFeeding = false,
  showInsightText = true
}) => {
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const TTCardHeader = window.TT?.shared?.TTCardHeader || window.TTCardHeader;
  const ChevronRightIcon = window.TT?.shared?.icons?.ChevronRightIcon || window.ChevronRight || null;

  const headerIconEl = Icon
    ? React.createElement(Icon, {
        className: 'w-[22px] h-[22px]',
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
    { className: 'text-[18px] font-semibold leading-6', style: { color: categoryColor } },
    label
  );

  const headerRightEl = ChevronRightIcon
    ? React.createElement(ChevronRightIcon, { className: 'w-5 h-5', style: { color: 'var(--tt-text-tertiary)' } })
    : null;

  return React.createElement(
    (TTCard || 'div'),
    {
      className: 'rounded-2xl shadow-sm p-5',
      style: { backgroundColor: 'var(--tt-card-bg)' },
      onClick
    },
    TTCardHeader
      ? React.createElement(TTCardHeader, {
          icon: headerIconEl,
          title: headerTitleEl,
          right: headerRightEl,
          gapClass: 'gap-[5px]',
          className: 'mb-3 h-6'
        })
      : React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-3 h-6' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-[5px]' },
            headerIconEl,
            headerTitleEl
          ),
          headerRightEl
        ),
    showInsightText
      ? React.createElement(
          React.Fragment,
          null,
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
          React.createElement('div', {
            className: 'border-t mb-3',
            style: { borderColor: 'var(--tt-card-border)' }
          })
        )
      : null,
    React.createElement('div', { style: { height: '240px' } }, children)
  );
};

const _getComputedColor = (cssVar, fallback) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || fallback;
};

const _formatDayLabel = (date) => {
  if (!(date instanceof Date)) return '';
  const label = date.toLocaleDateString('en-US', { weekday: 'short' });
  return label;
};

const SleepChart = ({ data = [], average = 0 }) => {
  const categoryColor = _getComputedColor('--tt-sleep', '#4a8ac2');
  const max = Math.max(1, ...data.map((d) => Number(d.totalHrs || 0)));

  return React.createElement(
    'div',
    { className: 'flex flex-col h-full' },
    React.createElement(
      'div',
      { className: 'flex flex-col mb-1' },
      React.createElement('span', { className: 'text-xs font-medium text-gray-400 tracking-wider mb-1' }, 'Average sleep'),
      React.createElement(
        'div',
        { className: 'flex items-baseline space-x-1' },
        React.createElement('span', { className: 'text-[2.25rem] font-bold leading-none', style: { color: categoryColor } }, average.toFixed(1)),
        React.createElement('span', { className: 'text-sm font-medium text-gray-400' }, 'hrs')
      )
    ),
    React.createElement(
      'div',
      { className: 'relative' },
      React.createElement(
        'div',
        { className: 'overflow-x-auto overflow-y-hidden -mx-2 px-2' },
        React.createElement(
          'div',
          {
            className: 'flex gap-6 pb-2',
            style: { minWidth: data.length > 4 ? `${data.length * 80}px` : '100%' }
          },
          data.map((item) =>
            React.createElement(
              'div',
              { key: item.key || item.date, className: 'flex flex-col items-center gap-2 flex-shrink-0' },
              React.createElement(
                'div',
                { className: 'flex flex-col justify-end items-center', style: { height: '180px', width: '60px' } },
                React.createElement(
                  'div',
                  {
                    className: 'w-full rounded-t-lg flex flex-col items-center justify-start pt-2 transition-all duration-500',
                    style: {
                      backgroundColor: 'var(--tt-sleep)',
                      height: `${(Number(item.totalHrs || 0) / max) * 160}px`,
                      minHeight: '30px'
                    }
                  },
                  React.createElement(
                    'div',
                    { className: 'text-white font-semibold' },
                    React.createElement('span', { className: 'text-xs' }, Number(item.totalHrs || 0).toFixed(1)),
                    React.createElement('span', { className: 'text-[10px] opacity-70 ml-0.5' }, 'h')
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'text-xs font-medium', style: { color: 'var(--tt-text-secondary)' } },
                _formatDayLabel(item.date)
              ),
              React.createElement(
                'div',
                { className: 'text-xs', style: { color: 'var(--tt-text-tertiary)' } },
                `${item.count || 0} sleeps`
              )
            )
          )
        )
      )
    )
  );
};

const FeedingChart = ({ data = [], average = 0 }) => {
  const categoryColor = _getComputedColor('--tt-feed', '#d45d5c');
  const max = Math.max(1, ...data.map((d) => Number(d.volume || 0)));

  return React.createElement(
    'div',
    { className: 'flex flex-col h-full' },
    React.createElement(
      'div',
      { className: 'flex flex-col mb-1' },
      React.createElement('span', { className: 'text-xs font-medium text-gray-400 tracking-wider mb-1' }, 'Average intake'),
      React.createElement(
        'div',
        { className: 'flex items-baseline space-x-1' },
        React.createElement('span', { className: 'text-[2.25rem] font-bold leading-none', style: { color: categoryColor } }, average.toFixed(1)),
        React.createElement('span', { className: 'text-sm font-medium text-gray-400' }, 'oz')
      )
    ),
    React.createElement(
      'div',
      { className: 'relative' },
      React.createElement(
        'div',
        { className: 'overflow-x-auto overflow-y-hidden -mx-2 px-2' },
        React.createElement(
          'div',
          {
            className: 'flex gap-6 pb-2',
            style: { minWidth: data.length > 4 ? `${data.length * 80}px` : '100%' }
          },
          data.map((item) =>
            React.createElement(
              'div',
              { key: item.key || item.date, className: 'flex flex-col items-center gap-2 flex-shrink-0' },
              React.createElement(
                'div',
                { className: 'flex flex-col justify-end items-center', style: { height: '180px', width: '60px' } },
                React.createElement(
                  'div',
                  {
                    className: 'w-full rounded-t-lg flex flex-col items-center justify-start pt-2 transition-all duration-500',
                    style: {
                      backgroundColor: 'var(--tt-feed)',
                      height: `${(Number(item.volume || 0) / max) * 160}px`,
                      minHeight: '30px'
                    }
                  },
                  React.createElement(
                    'div',
                    { className: 'text-white font-semibold' },
                    React.createElement('span', { className: 'text-xs' }, Number(item.volume || 0)),
                    React.createElement('span', { className: 'text-[10px] opacity-70 ml-0.5' }, 'oz')
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'text-xs font-medium', style: { color: 'var(--tt-text-secondary)' } },
                _formatDayLabel(item.date)
              ),
              React.createElement(
                'div',
                { className: 'text-xs', style: { color: 'var(--tt-text-tertiary)' } },
                `${item.count || 0} feeds`
              )
            )
          )
        )
      )
    )
  );
};
