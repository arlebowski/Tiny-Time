/**
 * FloatingTrackerMenuWithMitosis Component
 * 
 * A floating action menu where the + button literally splits (mitosis) into tracker options.
 * The button deforms, bulges, and divides into Feed and Sleep buttons.
 * 
 * @component
 * @example
 * // Usage with React.createElement
 * const menu = React.createElement(window.TT.shared.FloatingTrackerMenuWithMitosis, {
 *   onSelectTracker: (type) => console.log('selected:', type),
 *   position: { bottom: '32px', left: '50%' }
 * });
 */

(function(global) {
  'use strict';

  const React = global.React;
  const { useState } = React;
  const motion = global.framerMotion.motion;
  const AnimatePresence = global.framerMotion.AnimatePresence;

  if (!React || !motion || !AnimatePresence) {
    console.error('FloatingTrackerMenuWithMitosis requires React and Framer Motion to be loaded globally');
    return;
  }

  /**
   * FloatingTrackerMenuWithMitosis Component
   * 
   * @param {Object} props
   * @param {function} props.onSelectTracker - Callback when tracker is selected (type: 'feed' | 'sleep')
   * @param {Object} props.position - Position object for the trigger button
   * @param {number|string} props.position.bottom - Bottom position (default: '32px')
   * @param {number|string} props.position.left - Left position (default: '50%')
   * @param {string} props.className - Additional CSS classes
   */
  function FloatingTrackerMenuWithMitosis(props) {
    const {
      onSelectTracker = () => {},
      position = { bottom: '32px', left: '50%' },
      className = ''
    } = props;

    const [isOpen, setIsOpen] = useState(false);

    // Get icons from global namespace
    const BottleIcon = global.TT?.shared?.icons?.BottleV2;
    const MoonIcon = global.TT?.shared?.icons?.MoonV2;

    if (!BottleIcon || !MoonIcon) {
      console.warn('FloatingTrackerMenuWithMitosis: Icons not found in window.TT.shared.icons');
    }

    const handleToggle = () => {
      setIsOpen(!isOpen);
    };

    const handleTrackerSelect = (type) => {
      onSelectTracker(type);
      setIsOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    return React.createElement(
      'div',
      {
        className: className,
        onKeyDown: handleKeyDown,
        style: {
          position: 'fixed',
          bottom: position.bottom,
          left: position.left,
          transform: 'translateX(-50%)',
          zIndex: 1000
        }
      },
      // Gradient backdrop
      React.createElement(
        AnimatePresence,
        null,
        isOpen && React.createElement(
          motion.div,
          {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.3 },
            style: {
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50vh',
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
              zIndex: -1,
              pointerEvents: 'none'
            },
            'aria-hidden': 'true'
          }
        )
      ),
      
      // The mitosis animation container
      React.createElement(
        'div',
        {
          style: {
            position: 'relative',
            width: '64px',
            height: '64px'
          }
        },
        
        // Original + button (morphs and splits)
        React.createElement(
          AnimatePresence,
          { mode: 'wait' },
          !isOpen && React.createElement(PlusButton, {
            key: 'plus',
            onClick: handleToggle,
            isOpen: isOpen
          })
        ),
        
        // Split buttons (emerge from the +)
        React.createElement(
          AnimatePresence,
          null,
          isOpen && React.createElement(
            motion.div,
            {
              initial: { opacity: 1 },
              exit: { opacity: 0 },
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }
            },
            // Feed button (left half splits out)
            React.createElement(SplitButton, {
              icon: BottleIcon,
              label: 'Feed',
              type: 'feed',
              direction: 'left',
              onClick: () => handleTrackerSelect('feed')
            }),
            // Sleep button (right half splits out)
            React.createElement(SplitButton, {
              icon: MoonIcon,
              label: 'Sleep',
              type: 'sleep',
              direction: 'right',
              onClick: () => handleTrackerSelect('sleep')
            })
          )
        )
      )
    );
  }

  /**
   * PlusButton - The initial + button that morphs during mitosis
   * @private
   */
  function PlusButton(props) {
    const { onClick, isOpen } = props;

    return React.createElement(
      motion.button,
      {
        onClick: onClick,
        initial: { scale: 1, rotate: 0 },
        exit: { 
          scaleX: 1.3,
          scaleY: 0.9,
          opacity: 0
        },
        transition: { 
          duration: 0.3,
          ease: 'easeInOut'
        },
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
        'aria-label': 'Open tracker menu',
        'aria-expanded': isOpen,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '64px',
          height: '64px',
          background: 'white',
          borderRadius: '50%',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: '300',
          color: '#000',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          outline: 'none'
        },
        className: 'focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
      },
      '+'
    );
  }

  /**
   * SplitButton - Individual button that emerges from the mitosis
   * @private
   */
  function SplitButton(props) {
    const {
      icon: IconComponent,
      label,
      type,
      direction,
      onClick
    } = props;

    const isLeft = direction === 'left';
    
    // Get CSS variable for gradient
    const gradientVar = type === 'feed' ? '--tt-feed' : '--tt-sleep';
    const gradientStrongVar = type === 'feed' ? '--tt-feed-strong' : '--tt-sleep-strong';

    return React.createElement(
      motion.div,
      {
        initial: { 
          x: 0,
          y: 0,
          scale: 0.5,
          opacity: 0,
          // Start as half circles facing each other
          clipPath: isLeft 
            ? 'ellipse(50% 100% at 100% 50%)' // Left half
            : 'ellipse(50% 100% at 0% 50%)',   // Right half
        },
        animate: { 
          x: isLeft ? -60 : 60,  // Push apart horizontally
          y: -100,                // Move up
          scale: 1,
          opacity: 1,
          // Morph into full circles
          clipPath: 'ellipse(100% 100% at 50% 50%)'
        },
        exit: { 
          x: isLeft ? -30 : 30,
          y: -50,
          scale: 0.5,
          opacity: 0
        },
        transition: { 
          duration: 0.5,
          ease: [0.34, 1.56, 0.64, 1], // Elastic ease
          opacity: { duration: 0.3 },
          clipPath: { duration: 0.4 }
        },
        whileHover: { 
          scale: 1.1, 
          y: -105,
          transition: { duration: 0.2 }
        },
        whileTap: { scale: 0.95 },
        onClick: onClick,
        role: 'button',
        'aria-label': `Track ${label}`,
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        },
        style: {
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          outline: 'none'
        },
        className: 'focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full'
      },
      // Icon circle
      React.createElement(
        motion.div,
        {
          initial: { rotate: isLeft ? -90 : 90 },
          animate: { rotate: 0 },
          transition: { 
            duration: 0.5,
            ease: 'easeOut'
          },
          style: {
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(135deg, var(${gradientVar}) 0%, var(${gradientStrongVar}) 100%)`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
          }
        },
        IconComponent && React.createElement(
          'div',
          {
            style: { 
              width: '32px', 
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }
          },
          React.createElement(IconComponent, { 
            size: 32,
            color: 'currentColor'
          })
        )
      ),
      // Label
      React.createElement(
        motion.div,
        {
          initial: { opacity: 0, y: -10 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: 0.2, duration: 0.3 },
          style: {
            color: 'var(--tt-text-primary, #fff)',
            fontSize: '14px',
            fontWeight: '600',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap'
          }
        },
        label
      )
    );
  }

  // Attach to global namespace
  if (!global.TT) {
    global.TT = {};
  }
  if (!global.TT.shared) {
    global.TT.shared = {};
  }

  global.TT.shared.FloatingTrackerMenuWithMitosis = FloatingTrackerMenuWithMitosis;

  console.log('FloatingTrackerMenuWithMitosis component loaded successfully');

})(window);

/**
 * USAGE EXAMPLE:
 * 
 * // In your app, just drop in the component:
 * 
 * function MyApp() {
 *   const handleSelectTracker = (type) => {
 *     console.log('Selected tracker:', type);
 *     // Navigate to tracker form
 *     if (type === 'feed') {
 *       // Show feed form
 *     } else if (type === 'sleep') {
 *       // Show sleep form
 *     }
 *   };
 * 
 *   return React.createElement(
 *     'div',
 *     { className: 'min-h-screen' },
 *     
 *     // Your app content
 *     React.createElement('div', { className: 'p-4' }, 'Your app content here...'),
 *     
 *     // Floating tracker menu with mitosis animation
 *     React.createElement(window.TT.shared.FloatingTrackerMenuWithMitosis, {
 *       onSelectTracker: handleSelectTracker,
 *       position: {
 *         bottom: '32px',  // Distance from bottom
 *         left: '50%'      // Centered horizontally
 *       }
 *     })
 *   );
 * }
 * 
 * // Mount your app
 * const root = ReactDOM.createRoot(document.getElementById('root'));
 * root.render(React.createElement(MyApp));
 * 
 * 
 * // NOTES:
 * // - Make sure React, ReactDOM, and Framer Motion are loaded via CDN before this script
 * // - Make sure your icons (BottleV2, MoonV2) are available at window.TT.shared.icons
 * // - CSS variables should be defined in your stylesheets:
 * //   --tt-feed, --tt-feed-strong, --tt-sleep, --tt-sleep-strong, --tt-text-primary
 */
