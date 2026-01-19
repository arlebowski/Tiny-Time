// Timeline Item Component (shared)
const __ttTimelineItemCn = (...classes) => classes.filter(Boolean).join(' ');

const TTSharedTimelineItem = ({ card, bottleIcon, moonIcon, isExpanded = false, detailsHeight = 96, hasDetails: hasDetailsProp, onPhotoClick = null, isEditMode = false }) => {
  if (!card) return null;

  const __ttTimelineItemMotion = (typeof window !== 'undefined' && window.Motion && window.Motion.motion) ? window.Motion.motion : null;
  const __ttTimelineItemAnimatePresence = (typeof window !== 'undefined' && window.Motion && window.Motion.AnimatePresence) ? window.Motion.AnimatePresence : null;

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
  const hasDetails = typeof hasDetailsProp === 'boolean' ? hasDetailsProp : (hasNote || hasPhotos);
  const loggedState = isEditMode ? 'edit' : 'default';
  const showChevron = card.variant === 'logged' && hasDetails && loggedState === 'default';
  const ChevronIcon = (window.TT && window.TT.shared && window.TT.shared.icons && window.TT.shared.icons.ChevronDownIcon) || null;
  const PenIcon = (window.TT && window.TT.shared && window.TT.shared.icons && (window.TT.shared.icons.PenIcon || window.TT.shared.icons.Edit2)) || null;
  const noteText = card.note || card.notes || '';
  const photoUrls = Array.isArray(photoList) ? photoList : (photoList ? [photoList] : []);

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
      React.createElement('div', { className: "flex items-center justify-between min-h-[40px]" },
        React.createElement('div', { className: "flex items-center gap-2" },
          React.createElement('h3', {
            className: card.variant === 'logged' ? "font-semibold" : "font-medium",
            style: card.variant === 'logged'
              ? { color: 'var(--tt-text-primary)' }
              : { color: 'var(--tt-text-tertiary)' }
          }, labelText)
        ),
        React.createElement('div', { className: "flex items-center gap-1.5" },
          card.variant === 'logged' && hasDetails && React.createElement('div', { className: "flex items-center gap-1 mr-2" },
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
          React.createElement('span', {
            className: "text-xs",
            style: card.variant === 'logged'
              ? { color: 'var(--tt-text-secondary)' }
              : { color: 'var(--tt-text-tertiary)' }
          }, card.time),
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
            : null
          ,
          (card.variant === 'logged' && loggedState === 'edit' && PenIcon)
            ? React.createElement(PenIcon, {
                className: "w-3 h-3",
                style: { color: 'var(--tt-text-secondary)' }
              })
            : null
        )
      ),
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
          React.createElement('div', { className: "pt-2 flex flex-col gap-3 text-xs" },
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
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TimelineItem = TTSharedTimelineItem;
}
