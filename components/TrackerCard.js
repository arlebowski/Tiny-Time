// TrackerCard Component (UI Lab version)
// Copied from inline implementation in script.js

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
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('polyline', { points: "6 9 12 15 18 9" })
);

const ChevronUp = (props) => React.createElement(
  'svg',
  {
    ...props,
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
  React.createElement('polyline', { points: "18 15 12 9 6 15" })
);

// Expose icons globally so script.js can use them
if (typeof window !== 'undefined') {
  window.ChevronDown = ChevronDown;
  window.ChevronUp = ChevronUp;
}

// Ensure zZz animation styles are injected
function ensureZzzStyles() {
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
      animation: floatingZs 2s ease-in-out infinite;
    }
    .zzz :nth-child(1) { animation-delay: 0s; }
    .zzz :nth-child(2) { animation-delay: 0.3s; }
    .zzz :nth-child(3) { animation-delay: 0.6s; }
  `;
  document.head.appendChild(style);
}

const TimelineItem = ({ withNote }) => {
  return React.createElement(
    'div',
    { className: "rounded-xl bg-gray-50 p-4" },
    React.createElement(
      'div',
      { className: "flex items-center justify-between mb-2" },
      React.createElement(
        'div',
        { className: "flex items-center gap-3" },
        React.createElement('div', { className: "h-6 w-6 rounded bg-black/10" }),
        React.createElement(
          'div',
          null,
          React.createElement('div', { className: "font-semibold" }, '4oz'),
          React.createElement('div', { className: "text-sm text-gray-500" }, '8:27pm')
        )
      ),
      React.createElement(ChevronDown, { className: "rotate-[-90deg]" })
    ),
    withNote && React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'div',
        { className: "italic text-sm text-gray-600 mb-3" },
        'Note: kid didn\'t burp dammit!'
      ),
      React.createElement(
        'div',
        { className: "grid grid-cols-2 gap-2" },
        [0, 1, 2, 3].map(i =>
          React.createElement(
            'div',
            {
              key: i,
              className: "aspect-square rounded-lg bg-gray-300"
            }
          )
        )
      )
    )
  );
};

const TrackerCard = ({ mode = 'sleep' }) => {
  ensureZzzStyles();
  const [expanded, setExpanded] = React.useState(false);
  const [cardVisible, setCardVisible] = React.useState(false);

  // Animation trigger - set visible after mount
  React.useEffect(() => {
    setCardVisible(true);
  }, []);

  // Inject a calm zZz keyframe animation (UI Lab version - unique to avoid conflicts)
  React.useEffect(() => {
    try {
      if (document.getElementById('tt-zzz-ui-lab-style')) return;
      const s = document.createElement('style');
      s.id = 'tt-zzz-ui-lab-style';
      s.textContent = `@keyframes ttZzzUILab{0%{opacity:1;transform:translateY(4px)}30%{opacity:1;transform:translateY(0px)}70%{opacity:1;transform:translateY(-4px)}100%{opacity:0;transform:translateY(-8px)}}`;
      document.head.appendChild(s);
    } catch (e) {
      // non-fatal
    }
  }, []);

  // Demo percent for animation (66% = 2/3)
  const demoPercent = 66;
  
  // Status text based on mode for Timeline row
  const timelineStatusText = mode === 'feeding' 
    ? 'Last fed 4:02pm'
    : React.createElement(
        React.Fragment,
        null,
        React.createElement('span', { className: "text-gray-900 font-semibold" }, '1h 20m'),
        React.createElement('span', { className: "text-gray-900 font-light" },
          ' ',
          React.createElement('span', { className: "zzz" },
            React.createElement('span', null, 'z'),
            React.createElement('span', null, 'Z'),
            React.createElement('span', null, 'z')
          )
        )
      );

  const timelineLabel = mode === 'feeding'
    ? `Timeline • ${timelineStatusText}`
    : React.createElement(
        React.Fragment,
        null,
        'Timeline • ',
        timelineStatusText
      );

  return React.createElement(
    'div',
    { className: "rounded-2xl bg-white p-5 shadow-md" },
    React.createElement(
      'div',
      { className: "flex items-center gap-3 mb-4" },
      React.createElement('div', { className: "h-6 w-6 rounded bg-black/10" }),
      React.createElement('div', { className: "text-base font-semibold" }, 'Header')
    ),
    React.createElement(
      'div',
      { className: "flex items-baseline gap-1 mb-2" },
      React.createElement('div', { className: "text-[40px] leading-none font-bold" }, '30'),
      React.createElement('div', { className: "relative -top-[1px] text-[16px] leading-none text-gray-500" }, 'of 25.5 oz')
    ),
    
    // Animated Progress Bar (production-style)
    React.createElement('div', { className: "relative w-full h-6 bg-gray-100 rounded-2xl overflow-hidden mb-2" },
      React.createElement('div', {
        className: "absolute left-0 top-0 h-full rounded-2xl",
        style: {
          width: cardVisible ? `${Math.min(100, demoPercent)}%` : '0%',
          background: '#757575',
          transition: 'width 0.6s ease-out',
          transitionDelay: '0s'
        }
      })
    ),
    React.createElement(
      'div',
      { className: "flex gap-1.5 pl-1" },
      [0, 1, 2, 3, 4].map(i =>
        React.createElement('div', { key: i, className: "h-3.5 w-3.5 rounded-full bg-gray-500" })
      )
    ),
    React.createElement('div', { className: "border-t border-gray-100 my-4" }),
    React.createElement(
      'button',
      {
        onClick: () => setExpanded(!expanded),
        className: "flex w-full items-center justify-between text-gray-500"
      },
      React.createElement('span', null, timelineLabel),
      expanded ? React.createElement(ChevronUp) : React.createElement(ChevronDown)
    ),
    expanded && React.createElement(
      'div',
      { className: "mt-4 space-y-4" },
      React.createElement(TimelineItem),
      React.createElement(TimelineItem, { withNote: true })
    )
  );
};

// Make available globally for script.js
if (typeof window !== 'undefined') {
  window.TrackerCard = TrackerCard;
}
