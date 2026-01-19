// Timeline Item Component (shared)
const __ttTimelineItemCn = (...classes) => classes.filter(Boolean).join(' ');

const TTSharedTimelineItem = ({ card, bottleIcon, moonIcon }) => {
  if (!card) return null;

  const unitText = (card.unit || '').toLowerCase();
  const amountText = typeof card.amount === 'number' || typeof card.amount === 'string'
    ? `${card.amount} ${unitText}`.trim()
    : '';
  const prefix = card.type === 'feed' ? 'Feed' : 'Sleep';
  const labelText = amountText
    ? (card.variant === 'logged'
        ? amountText
        : `${prefix} ~${amountText}`)
    : (card.variant === 'logged' ? '' : prefix);

  const photoList = card.photoURLs || card.photoUrls || card.photos;
  const hasPhotos = Array.isArray(photoList) ? photoList.length > 0 : Boolean(photoList);
  const hasNote = Boolean(card.note || card.notes);
  const showChevron = card.variant === 'logged' && (hasNote || hasPhotos);
  const ChevronIcon = (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.ChevronRightIcon || window.TT.shared.icons.ChevronDownIcon)) || null;

  return React.createElement(
    React.Fragment,
    null,
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
        card.variant === 'logged' ? (
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
      React.createElement('div', { className: "flex justify-between items-baseline" },
        React.createElement('div', { className: "flex items-center gap-2" },
          React.createElement('h3', {
            className: "font-semibold",
            style: card.variant === 'logged'
              ? { color: 'var(--tt-text-primary)' }
              : { color: 'var(--tt-text-tertiary)' }
          }, labelText)
        ),
        React.createElement('div', { className: "flex items-center gap-1.5" },
          React.createElement('span', {
            className: "text-xs",
            style: card.variant === 'logged'
              ? { color: 'var(--tt-text-secondary)' }
              : { color: 'var(--tt-text-tertiary)' }
          }, card.time),
          showChevron && ChevronIcon
            ? React.createElement(ChevronIcon, {
                className: "w-5 h-5",
                style: { color: 'var(--tt-text-secondary)' }
              })
            : null
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
