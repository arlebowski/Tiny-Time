// FloatingTrackerMenu Component
// A floating + button that splits into Feed/Sleep options.

// Guard to prevent redeclaration
if (typeof window !== 'undefined' && !window.TT?.shared?.FloatingTrackerMenu) {
  (function (global) {
    'use strict';

    const React = global.React;
    const { useState, useCallback, useEffect, useRef } = React || {};

    const resolveFramer = () => {
      if (!global) return {};
      const candidates = [
        global.framerMotion,
        global.FramerMotion,
        global['framer-motion'],
        global.Motion,
        global.motion
      ];
      for (const candidate of candidates) {
        if (!candidate) continue;
        if (candidate.motion || candidate.AnimatePresence) return candidate;
        if (candidate.default && (candidate.default.motion || candidate.default.AnimatePresence)) {
          return candidate.default;
        }
      }
      return {};
    };

    const framer = resolveFramer();
    const motion = framer.motion || ((props) => React.createElement('div', props));
    const AnimatePresence = framer.AnimatePresence || (({ children }) => children);

    if (!React || !motion || !AnimatePresence) {
      console.error('FloatingTrackerMenu requires React and Framer Motion to be loaded globally');
      return;
    }

    const FloatingTrackerMenu = (props) => {
      const {
        onSelectTracker = () => {},
        position = { bottom: 'calc(env(safe-area-inset-bottom) + 70px)', left: '50%' },
        className = ''
      } = props;

      const [isOpen, setIsOpen] = useState(false);
      const containerRef = useRef(null);

      const BottleIcon =
        global.TT?.shared?.icons?.BottleV2 ||
        global.TT?.shared?.icons?.["bottle-v2"] ||
        global.TT?.shared?.icons?.BottleMain ||
        global.TT?.shared?.icons?.["bottle-main"] ||
        null;
      const MoonIcon =
        global.TT?.shared?.icons?.MoonV2 ||
        global.TT?.shared?.icons?.["moon-v2"] ||
        global.TT?.shared?.icons?.MoonMain ||
        global.TT?.shared?.icons?.["moon-main"] ||
        null;

      const handleClose = useCallback(() => setIsOpen(false), []);
      const handleToggle = useCallback(() => setIsOpen((prev) => !prev), []);
      const handleTrackerSelect = useCallback((type) => {
        onSelectTracker(type);
        setIsOpen(false);
      }, [onSelectTracker]);

      const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      }, []);

      useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return;
        const onPointerDown = (e) => {
          const root = containerRef.current;
          if (root && root.contains(e.target)) return;
          setIsOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
      }, [isOpen]);

      return React.createElement(
        'div',
        {
          ref: containerRef,
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
        React.createElement(
          'div',
          {
            style: {
              position: 'relative',
              width: '64px',
              height: '64px',
              background: 'transparent',
              overflow: 'visible'
            },
            onPointerDown: (e) => e.stopPropagation()
          },
          React.createElement(
            AnimatePresence,
            { mode: 'wait' },
            !isOpen && React.createElement(PlusButton, {
              key: 'plus',
              onClick: handleToggle,
              isOpen: isOpen
            })
          ),
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
                  top: '50%',
                  left: '50%',
                  width: 0,
                  height: 0,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'transparent',
                  boxShadow: 'none',
                  overflow: 'visible'
                }
              },
              React.createElement(
                motion.button,
                {
                  key: 'center-close',
                  onClick: handleClose,
                  'aria-label': 'Close tracker menu',
                  initial: { scale: 0.8, opacity: 0 },
                  animate: { scale: 1, opacity: 1 },
                  exit: { scale: 0.8, opacity: 0 },
                  transition: { duration: 0.2, ease: 'easeOut' },
                  style: {
                    position: 'absolute',
                    top: '-32px',
                    left: '-32px',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer'
                  }
                }
              ),
              React.createElement(SplitButton, {
                icon: BottleIcon,
                label: 'Feed',
                type: 'feeding',
                direction: 'left',
                onClick: () => handleTrackerSelect('feeding')
              }),
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
    };

    const PlusButton = (props) => {
      const { onClick, isOpen } = props;

      return React.createElement(
        motion.button,
        {
          onClick: onClick,
          initial: { scale: 0.2, rotate: 180, opacity: 0 },
          animate: { scale: 1, rotate: 0, opacity: 1 },
          exit: {
            scale: 0.2,
            rotate: 180,
            opacity: 0,
            backgroundColor: 'rgba(0,0,0,0)',
            boxShadow: 'none'
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
            background: 'var(--tt-plus-bg, #000)',
            borderRadius: '50%',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            fontWeight: '300',
            color: 'var(--tt-plus-fg, #fff)',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            outline: 'none'
          }
        },
        '+'
      );
    };

    const SplitButton = (props) => {
      const {
        icon: IconComponent,
        label,
        type,
        direction,
        onClick
      } = props;

      const isLeft = direction === 'left';
      const gradientVar = type === 'feeding' ? '--tt-feed' : '--tt-sleep';
      const gradientStrongVar = type === 'feeding' ? '--tt-feed-strong' : '--tt-sleep-strong';

      return React.createElement(
        motion.div,
        {
          initial: {
            x: 0,
            y: 0,
            scale: 0.7,
            opacity: 0
          },
          animate: {
            x: isLeft ? -60 : 60,
            y: -92,
            scale: 1,
            opacity: 1
          },
          exit: {
            x: 0,
            y: 0,
            scale: 0.7,
            opacity: 0
          },
          transition: {
            type: 'spring',
            damping: 20,
            stiffness: 260,
            opacity: { duration: 0.2 }
          },
          whileHover: {
            scale: 1.08,
            y: -98,
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
          }
        },
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
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
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
              textShadow: '0 2px 8px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap'
            }
          },
          label
        )
      );
    };

    global.TT = global.TT || {};
    global.TT.shared = global.TT.shared || {};
    global.TT.shared.FloatingTrackerMenu = FloatingTrackerMenu;
  })(window);
}
