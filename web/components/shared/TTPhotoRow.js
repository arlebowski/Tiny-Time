const TTPhotoRow = ({
  expanded = false,
  onExpand,
  title = 'Photos',
  showTitle = true,
  existingPhotos = [],
  newPhotos = [],
  onAddPhoto,
  onRemovePhoto,
  onPreviewPhoto,
  addLabel = '+ Add photos',
  addHint = 'Add',
  showAddHint = false,
  addTileBorder = false,
  containerClassName = '',
  containerStyle = null
}) => {
  const XIcon = (typeof window !== 'undefined' && window.XIcon) || null;
  const PlusIcon = (typeof window !== 'undefined' && window.PlusIconLocal) || null;

  if (!expanded) {
    return React.createElement('div', {
      onClick: () => { if (typeof onExpand === 'function') onExpand(); },
      className: `py-3 cursor-pointer active:opacity-70 transition-opacity ${containerClassName}`.trim(),
      style: { color: 'var(--tt-text-tertiary)', ...(containerStyle || {}) }
    }, addLabel);
  }

  return React.createElement('div', { className: `py-3 ${containerClassName}`.trim(), style: containerStyle || undefined },
    showTitle && React.createElement('div', { className: "mb-3" },
      React.createElement('div', { className: "text-xs", style: { color: 'var(--tt-text-secondary)' } }, title)
    ),
    React.createElement('div', { className: "flex gap-2" },
      (existingPhotos || []).map((photoUrl, i) =>
        React.createElement('div', {
          key: `existing-${i}`,
          className: "aspect-square rounded-2xl border relative",
          style: { backgroundColor: 'var(--tt-input-bg)', borderColor: 'var(--tt-card-border)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
        },
          React.createElement('img', {
            src: photoUrl,
            alt: `Photo ${i + 1}`,
            className: "w-full h-full object-cover rounded-2xl",
            onClick: () => { if (typeof onPreviewPhoto === 'function') onPreviewPhoto(photoUrl); }
          }),
          XIcon && React.createElement('button', {
            onClick: (e) => {
              e.stopPropagation();
              if (typeof onRemovePhoto === 'function') onRemovePhoto(i, true);
            },
            className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
          },
            React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
          )
        )
      ),
      (newPhotos || []).map((photo, i) =>
        React.createElement('div', {
          key: `new-${i}`,
          className: "aspect-square rounded-2xl border relative",
          style: { backgroundColor: 'var(--tt-input-bg)', borderColor: 'var(--tt-card-border)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
        },
          React.createElement('img', {
            src: photo,
            alt: `Photo ${i + 1}`,
            className: "w-full h-full object-cover rounded-2xl",
            onClick: () => { if (typeof onPreviewPhoto === 'function') onPreviewPhoto(photo); }
          }),
          XIcon && React.createElement('button', {
            onClick: (e) => {
              e.stopPropagation();
              if (typeof onRemovePhoto === 'function') onRemovePhoto(i, false);
            },
            className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
          },
            React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
          )
        )
      ),
      React.createElement('div', {
        onClick: () => { if (typeof onAddPhoto === 'function') onAddPhoto(); },
        className: `aspect-square rounded-2xl flex items-center justify-center active:opacity-80 transition-opacity duration-100 ${showAddHint ? 'flex-col gap-1' : ''}`.trim(),
        style: { backgroundColor: 'var(--tt-input-bg)', cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px', border: addTileBorder ? '1px solid var(--tt-card-border)' : undefined }
      },
        PlusIcon && React.createElement(PlusIcon, { className: "w-6 h-6", style: { color: 'var(--tt-text-tertiary)' } }),
        showAddHint && React.createElement('div', { className: "text-[11px]", style: { color: 'var(--tt-text-tertiary)' } }, addHint)
      )
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.TTPhotoRow = TTPhotoRow;
  window.TTPhotoRow = TTPhotoRow;
}
