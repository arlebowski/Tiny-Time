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

// Additional icons for detail sheets
const EditIcon = (props) => React.createElement(
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
  React.createElement('path', { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }),
  React.createElement('path', { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })
);

const CalendarIcon = (props) => React.createElement(
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
  React.createElement('rect', { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }),
  React.createElement('line', { x1: "16", y1: "2", x2: "16", y2: "6" }),
  React.createElement('line', { x1: "8", y1: "2", x2: "8", y2: "6" }),
  React.createElement('line', { x1: "3", y1: "10", x2: "21", y2: "10" })
);

const PlusIcon = (props) => React.createElement(
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
  React.createElement('line', { x1: "12", y1: "5", x2: "12", y2: "19" }),
  React.createElement('line', { x1: "5", y1: "12", x2: "19", y2: "12" })
);

const CheckIcon = (props) => React.createElement(
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
  React.createElement('polyline', { points: "20 6 9 17 4 12" })
);

const ClockIcon = (props) => React.createElement(
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
  React.createElement('circle', { cx: "12", cy: "12", r: "10" }),
  React.createElement('polyline', { points: "12 6 12 12 16 14" })
);

const XIcon = (props) => React.createElement(
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
  React.createElement('path', { d: "M18 6 6 18" }),
  React.createElement('path', { d: "m6 6 12 12" })
);

// Expose icons globally so script.js can use them
if (typeof window !== 'undefined') {
  window.ChevronDown = ChevronDown;
  window.ChevronUp = ChevronUp;
  window.EditIcon = EditIcon;
  window.CalendarIcon = CalendarIcon;
  window.PlusIcon = PlusIcon;
  window.CheckIcon = CheckIcon;
  window.ClockIcon = ClockIcon;
  window.XIcon = XIcon;
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

const TimelineItem = ({ withNote, mode = 'sleep' }) => {
  const isSleep = mode === 'sleep';
  
  return React.createElement(
    'div',
    { className: "rounded-2xl bg-gray-50 p-4" },
    React.createElement(
      'div',
      { className: "flex items-center justify-between mb-2" },
      React.createElement(
        'div',
        { className: "flex items-center gap-3" },
        React.createElement('div', { className: "h-6 w-6 rounded-2xl bg-gray-100" }),
        React.createElement(
          'div',
          null,
          React.createElement('div', { className: "font-semibold text-gray-500" }, 
            isSleep ? '2h 20m' : '4oz'
          ),
          React.createElement('div', { className: "text-sm text-gray-500" }, 
            isSleep ? '6:07pm – 8:27pm' : '8:27pm'
          )
        )
      ),
      React.createElement(ChevronDown, { className: "rotate-[-90deg] text-gray-500" })
    ),
    withNote && React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'div',
        { className: "italic text-sm text-gray-500 mb-3" },
        isSleep ? 'Note: had to hold him forever' : 'Note: kid didn\'t burp dammit!'
      ),
      React.createElement(
        'div',
        { className: "grid grid-cols-2 gap-2" },
        [0, 1, 2, 3].map(i =>
          React.createElement(
            'div',
            {
              key: i,
              className: "aspect-square rounded-2xl bg-gray-100"
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
        React.createElement('span', { className: "text-black font-semibold" }, '1h 20m'),
        React.createElement('span', { className: "text-black font-light" },
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
    { className: "rounded-2xl bg-white p-5 shadow-sm" },
    React.createElement(
      'div',
      { className: "flex items-center gap-3 mb-4" },
      React.createElement('div', { className: "h-6 w-6 rounded-2xl bg-gray-100" }),
      React.createElement('div', { className: "text-base font-semibold" }, 'Header')
    ),
    React.createElement(
      'div',
      { className: "flex items-baseline gap-1 mb-2" },
      React.createElement('div', { className: "text-[40px] leading-none font-bold" }, 
        mode === 'sleep' ? '14.5' : '22.5'
      ),
      React.createElement('div', { className: "relative -top-[1px] text-[16px] leading-none text-gray-500" }, 
        mode === 'sleep' ? 'of 14.5 hrs' : 'of 25.5 oz'
      )
    ),
    
    // Animated Progress Bar (production-style)
    React.createElement('div', { className: "relative w-full h-6 bg-gray-100 rounded-2xl overflow-hidden mb-2" },
      React.createElement('div', {
        className: "absolute left-0 top-0 h-full rounded-2xl bg-gray-500",
        style: {
          width: cardVisible ? `${Math.min(100, demoPercent)}%` : '0%',
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
      React.createElement(TimelineItem, { mode }),
      React.createElement(TimelineItem, { withNote: true, mode })
    )
  );
};

// Detail Sheet Components
// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TTFeedDetailSheet && !window.TTSleepDetailSheet) {
  
  // Helper function to format date/time for display
  const formatDateTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = days[d.getDay()];
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = minutes < 10 ? '0' + minutes : minutes;
    return `${day} ${hours}:${mins} ${ampm}`;
  };

  // Input Field Row Component
  const InputRow = ({ label, value, onChange, icon, type = 'text', placeholder = '', rawValue, invalid = false }) => {
    // For datetime fields, use rawValue (ISO string) for the picker, but display formatted value
    const displayValue = type === 'datetime' ? (rawValue ? formatDateTime(rawValue) : '') : value;
    const inputRef = React.useRef(null);
    const timeAnchorRef = React.useRef(null);
    
    const handleRowClick = (e) => {
      // Don't focus if clicking the icon button (it has its own handler)
      if (e.target.closest('button')) {
        return;
      }
      // For datetime fields, open the picker when clicking the row
      if (type === 'datetime' || type === 'datetime-local' || type === 'date' || type === 'time') {
        e.preventDefault();
        if (window.TT && window.TT.ui && window.TT.ui.openAnchoredTimePicker) {
          window.TT.ui.openAnchoredTimePicker({
            anchorEl: timeAnchorRef.current,
            rawValue,
            onChange
          });
        }
      } else if (inputRef.current) {
        // For other types, focus the input
        inputRef.current.focus();
      }
    };
    
    const handleIconClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (type === 'datetime' || type === 'datetime-local' || type === 'date' || type === 'time') {
        if (window.TT && window.TT.ui && window.TT.ui.openAnchoredTimePicker) {
          window.TT.ui.openAnchoredTimePicker({
            anchorEl: timeAnchorRef.current,
            rawValue,
            onChange
          });
        }
      } else {
        // For non-datetime types, focus the input
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    };
    
    return React.createElement(
      'div',
      { 
        className: "flex items-center justify-between py-3 border-b border-gray-100 cursor-pointer active:bg-gray-100 active:rounded-2xl active:-mx-2 active:px-2 transition-all duration-150",
        onClick: handleRowClick
      },
      React.createElement('div', { className: "flex-1" },
        React.createElement('div', { className: "text-xs text-gray-500 mb-1" }, label),
        type === 'text' 
          ? React.createElement('textarea',
              {
                ref: inputRef,
                value: displayValue || '',
                onChange: (e) => {
                  if (onChange) {
                    onChange(e.target.value);
                    // Auto-growing height logic (same as AI chat tab)
                    const el = e.target;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                },
                placeholder: placeholder,
                rows: 1,
                className: "text-base font-normal text-black w-full outline-none resize-none",
                style: { background: 'transparent', maxHeight: '4.5rem', overflowY: 'auto' }
              }
            )
          : React.createElement('input',
              {
                ref: type === 'datetime' ? timeAnchorRef : inputRef,
                type: type === 'datetime' ? 'text' : type,
                inputMode: type === 'number' ? 'decimal' : undefined,
                step: type === 'number' ? '0.25' : undefined,
                value: displayValue || '',
                onChange: (e) => {
                  if (type !== 'datetime' && onChange) {
                    if (type === 'number') {
                      // Only allow numbers and decimal point
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      onChange(value);
                    } else {
                      onChange(e.target.value);
                    }
                  }
                },
                placeholder: placeholder,
                className: `text-base font-normal w-full outline-none ${invalid ? 'text-red-600' : 'text-black'}`,
                style: { background: 'transparent' },
                readOnly: type === 'datetime'
              }
            )
      ),
      icon && React.createElement('button', {
        onClick: handleIconClick,
        className: "ml-4 text-black"
      }, icon)
    );
  };

  // TTFeedDetailSheet Component
  const TTFeedDetailSheet = () => {
    const [ounces, setOunces] = React.useState('6');
    const [dateTime, setDateTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState("kid didn't burp dammit!");
    const [photos, setPhotos] = React.useState([]);
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);

    const handleSave = () => {
      console.log('Feed save:', { ounces, dateTime, notes, photos });
      // UI-only, no production behavior
    };

    const handleDelete = () => {
      console.log('Feed delete');
      // UI-only, no production behavior
    };

    const handleAddPhoto = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setPhotos([...photos, event.target.result]);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    };

    const handleRemovePhoto = (index) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
    };

    return React.createElement(
      'div',
      { className: "bg-white rounded-2xl shadow-sm p-6 space-y-0" },
      // Back button (optional, can be removed if not needed)
      React.createElement('div', { className: "flex items-start gap-1.5 mb-6" },
        React.createElement('button', {
          onClick: () => console.log('Back clicked'),
          className: "pl-0 pr-1 pt-1 pb-1 text-gray-600 hover:bg-gray-50 active:bg-gray-100 rounded-2xl transition-colors duration-100 mt-0.5 -ml-0.5"
        }, React.createElement(ChevronDown, { className: "w-5 h-5 rotate-90" })),
        React.createElement('div', { className: "flex-1" },
          React.createElement('div', { className: "text-xs text-gray-500 mb-1" }, ''),
          React.createElement('h2', { className: "text-base font-normal text-gray-800" }, 'Back')
        )
      ),

      // Ounces
      React.createElement(InputRow, {
        label: 'Ounces',
        value: ounces,
        onChange: setOunces,
        icon: React.createElement(EditIcon),
        type: 'number',
        placeholder: '0'
      }),

      // Date & Time
      React.createElement(InputRow, {
        label: 'Date & Time',
        value: formatDateTime(dateTime), // This won't be used for datetime type
        rawValue: dateTime, // Pass the raw ISO string
        onChange: setDateTime,
        icon: React.createElement(ClockIcon),
        type: 'datetime'
      }),

      // Notes
      React.createElement(InputRow, {
        label: 'Notes',
        value: notes,
        onChange: setNotes,
        icon: React.createElement(EditIcon),
        type: 'text',
        placeholder: 'Add a note...'
      }),

      // Photos
      React.createElement('div', { className: "py-3 border-b border-gray-100" },
        React.createElement('div', { className: "mb-3" },
          React.createElement('div', { className: "text-xs text-gray-500" }, 'Photos')
        ),
        React.createElement('div', { className: "flex gap-2" },
          // Render photos
          photos.map((photo, i) =>
            React.createElement('div', {
              key: i,
              className: "aspect-square rounded-2xl bg-gray-100 border border-gray-200 relative",
              style: { cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
            },
              React.createElement('img', { 
                src: photo, 
                alt: `Photo ${i + 1}`, 
                className: "w-full h-full object-cover rounded-2xl",
                onClick: () => setFullSizePhoto(photo)
              }),
              React.createElement('button', {
                onClick: (e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i);
                },
                className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
              },
                React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
              )
            )
          ),
          // Render placeholder (only one, always at the end)
          React.createElement('div', {
            onClick: handleAddPhoto,
            className: "aspect-square rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center active:opacity-80 transition-opacity duration-100",
            style: { cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
          },
            React.createElement(PlusIcon, { className: "w-6 h-6 text-gray-400" })
          )
        )
      ),

      // Save Button
      React.createElement('button', {
        onClick: handleSave,
        className: "w-full bg-black text-white rounded-2xl py-4 px-6 flex items-center justify-center gap-2 font-semibold mt-6 mb-3 active:opacity-80 transition-opacity duration-100"
      },
        React.createElement(CheckIcon, { className: "w-5 h-5" }),
        'Save'
      ),

      // Delete Button
      React.createElement('button', {
        onClick: handleDelete,
        className: "w-full text-red-600 py-2 text-center font-medium active:opacity-70 transition-opacity duration-100"
      }, 'Delete'),

      // Full-size photo modal
      fullSizePhoto && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setFullSizePhoto(null),
          className: "fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        },
          React.createElement('img', {
            src: fullSizePhoto,
            alt: "Full size photo",
            className: "max-w-full max-h-full object-contain",
            onClick: (e) => e.stopPropagation()
          })
        )
      )
    );
  };

  // TTSleepDetailSheet Component
  const TTSleepDetailSheet = () => {
    const [startTime, setStartTime] = React.useState(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());
    const [endTime, setEndTime] = React.useState(new Date().toISOString());
    const [notes, setNotes] = React.useState("kid didn't burp dammit!");
    const [photos, setPhotos] = React.useState([]);
    const [fullSizePhoto, setFullSizePhoto] = React.useState(null);
    const [lastValidDuration, setLastValidDuration] = React.useState({ hours: 2, minutes: 0, seconds: 0 });

    // Calculate duration with validation
    const calculateDuration = () => {
      if (!startTime || !endTime) return { hours: 0, minutes: 0, seconds: 0 };
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diff = end - start;
      
      // If end is before start, return null to indicate invalid
      if (diff < 0) {
        return null; // Invalid - end before start
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { hours, minutes, seconds };
    };

    const durationResult = calculateDuration();
    const isValid = durationResult !== null;
    const duration = isValid ? durationResult : lastValidDuration;
    
    // Update last valid duration when valid
    React.useEffect(() => {
      if (isValid) {
        setLastValidDuration(duration);
      }
    }, [isValid, duration.hours, duration.minutes, duration.seconds]);

    const handleSave = () => {
      if (!isValid) return; // Don't save if invalid
      console.log('Sleep save:', { startTime, endTime, notes, photos, duration });
      // UI-only, no production behavior
    };

    const handleDelete = () => {
      console.log('Sleep delete');
      // UI-only, no production behavior
    };

    const handleAddPhoto = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setPhotos([...photos, event.target.result]);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    };

    const handleRemovePhoto = (index) => {
      const newPhotos = photos.filter((_, i) => i !== index);
      setPhotos(newPhotos);
    };

    return React.createElement(
      'div',
      { className: "bg-white rounded-2xl shadow-sm p-6 space-y-0" },
      // Back button (optional)
      React.createElement('div', { className: "flex items-start gap-1.5 mb-5" },
        React.createElement('button', {
          onClick: () => console.log('Back clicked'),
          className: "pl-0 pr-1 pt-1 pb-1 text-gray-600 hover:bg-gray-50 active:bg-gray-100 rounded-2xl transition-colors duration-100 mt-0.5 -ml-0.5"
        }, React.createElement(ChevronDown, { className: "w-5 h-5 rotate-90" })),
        React.createElement('div', { className: "flex-1" },
          React.createElement('div', { className: "text-xs text-gray-500 mb-1" }, ''),
          React.createElement('h2', { className: "text-base font-normal text-gray-800" }, 'Back')
        )
      ),

      // Timer Display
      React.createElement('div', { className: "text-center -mt-2 mb-6" },
        React.createElement('div', { className: "text-[40px] leading-none font-bold text-black" },
          React.createElement('span', null, `${String(duration.hours).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base text-gray-500 font-normal ml-1" }, 'h'),
          React.createElement('span', { className: "ml-2" }, `${String(duration.minutes).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base text-gray-500 font-normal ml-1" }, 'm'),
          React.createElement('span', { className: "ml-2" }, `${String(duration.seconds).padStart(2, '0')}`),
          React.createElement('span', { className: "text-base text-gray-500 font-normal ml-1" }, 's')
        )
      ),

      // Start time
      React.createElement(InputRow, {
        label: 'Start time',
        value: formatDateTime(startTime), // This won't be used for datetime type
        rawValue: startTime, // Pass the raw ISO string
        onChange: setStartTime,
        icon: React.createElement(ClockIcon),
        type: 'datetime'
      }),

      // End time
      React.createElement(InputRow, {
        label: 'End time',
        value: formatDateTime(endTime), // This won't be used for datetime type
        rawValue: endTime, // Pass the raw ISO string
        onChange: setEndTime,
        icon: React.createElement(ClockIcon),
        type: 'datetime',
        invalid: !isValid // Pass invalid flag when end time is before start time
      }),

      // Notes
      React.createElement(InputRow, {
        label: 'Notes',
        value: notes,
        onChange: setNotes,
        icon: React.createElement(EditIcon),
        type: 'text',
        placeholder: 'Add a note...'
      }),

      // Photos
      React.createElement('div', { className: "py-3 border-b border-gray-100" },
        React.createElement('div', { className: "mb-3" },
          React.createElement('div', { className: "text-xs text-gray-500" }, 'Photos')
        ),
        React.createElement('div', { className: "flex gap-2" },
          // Render photos
          photos.map((photo, i) =>
            React.createElement('div', {
              key: i,
              className: "aspect-square rounded-2xl bg-gray-100 border border-gray-200 relative",
              style: { cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
            },
              React.createElement('img', { 
                src: photo, 
                alt: `Photo ${i + 1}`, 
                className: "w-full h-full object-cover rounded-2xl",
                onClick: () => setFullSizePhoto(photo)
              }),
              React.createElement('button', {
                onClick: (e) => {
                  e.stopPropagation();
                  handleRemovePhoto(i);
                },
                className: "absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10"
              },
                React.createElement(XIcon, { className: "w-3.5 h-3.5 text-white" })
              )
            )
          ),
          // Render placeholder (only one, always at the end)
          React.createElement('div', {
            onClick: handleAddPhoto,
            className: "aspect-square rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center active:opacity-80 transition-opacity duration-100",
            style: { cursor: 'pointer', minWidth: '80px', flexShrink: 0, width: '80px', height: '80px' }
          },
            React.createElement(PlusIcon, { className: "w-6 h-6 text-gray-400" })
          )
        )
      ),

      // Save Button
      React.createElement('button', {
        onClick: handleSave,
        disabled: !isValid,
        className: `w-full rounded-2xl py-4 px-6 flex items-center justify-center gap-2 font-semibold mt-6 mb-3 transition-opacity duration-100 ${
          isValid 
            ? 'bg-black text-white active:opacity-80' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`
      },
        React.createElement(CheckIcon, { className: "w-5 h-5" }),
        'Save'
      ),

      // Delete Button
      React.createElement('button', {
        onClick: handleDelete,
        className: "w-full text-red-600 py-2 text-center font-medium active:opacity-70 transition-opacity duration-100"
      }, 'Delete'),

      // Full-size photo modal
      fullSizePhoto && React.createElement(
        React.Fragment,
        null,
        React.createElement('div', {
          onClick: () => setFullSizePhoto(null),
          className: "fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
        },
          React.createElement('img', {
            src: fullSizePhoto,
            alt: "Full size photo",
            className: "max-w-full max-h-full object-contain",
            onClick: (e) => e.stopPropagation()
          })
        )
      )
    );
  };

  // Expose components globally
  if (typeof window !== 'undefined') {
    window.TTFeedDetailSheet = TTFeedDetailSheet;
    window.TTSleepDetailSheet = TTSleepDetailSheet;
  }
}

// Make available globally for script.js
if (typeof window !== 'undefined') {
  window.TrackerCard = TrackerCard;
}
