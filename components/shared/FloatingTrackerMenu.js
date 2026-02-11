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
        className = '',
        visibleTypes = null
      } = props;

      const [isOpen, setIsOpen] = useState(false);
      const containerRef = useRef(null);

      const BottleIcon =
        global.TT?.shared?.icons?.BottleV2 ||
        global.TT?.shared?.icons?.["bottle-v2"] ||
        null;
      const NursingIcon =
        global.TT?.shared?.icons?.NursingIcon ||
        null;
      const MoonIcon =
        global.TT?.shared?.icons?.MoonV2 ||
        global.TT?.shared?.icons?.["moon-v2"] ||
        null;
      const DiaperIcon =
        global.TT?.shared?.icons?.DiaperIcon ||
        null;

      const getStoredVariant = () => {
        try {
          const stored = localStorage.getItem('tt_last_feed_variant');
          return stored === 'nursing' ? 'nursing' : 'bottle';
        } catch (e) {
          return 'bottle';
        }
      };
      const [lastFeedVariant, setLastFeedVariant] = useState(getStoredVariant);
      const lastFeedVariantRef = useRef(getStoredVariant());

      const resolveLastFeedVariant = useCallback(async () => {
        const storage = global.firestoreStorage;
        if (!storage || typeof storage.getAllFeedings !== 'function' || typeof storage.getAllNursingSessions !== 'function') return;
        try {
          const [feedsRaw, nursingRaw] = await Promise.all([
            storage.getAllFeedings(),
            storage.getAllNursingSessions()
          ]);
          const feeds = Array.isArray(feedsRaw) ? feedsRaw : [];
          const nursing = Array.isArray(nursingRaw) ? nursingRaw : [];
          const latestTs = (items) => {
            let maxTs = 0;
            for (const item of items) {
              const ts = Number(item?.timestamp ?? item?.startTime ?? 0);
              if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
            }
            return maxTs;
          };
          const feedTs = latestTs(feeds);
          const nursingTs = latestTs(nursing);
          const nextVariant = nursingTs > feedTs ? 'nursing' : 'bottle';
          if (nextVariant !== lastFeedVariantRef.current) {
            lastFeedVariantRef.current = nextVariant;
            setLastFeedVariant(nextVariant);
          }
          try {
            localStorage.setItem('tt_last_feed_variant', nextVariant);
          } catch (e) {}
        } catch (e) {}
      }, []);

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

      useEffect(() => {
        resolveLastFeedVariant();
      }, [resolveLastFeedVariant]);

      useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleAdded = (e) => {
          if (e?.detail?.mode === 'feeding') {
            resolveLastFeedVariant();
          }
        };
        const handleVariant = (e) => {
          const nextVariant = e?.detail?.variant === 'nursing' ? 'nursing' : 'bottle';
          if (nextVariant !== lastFeedVariantRef.current) {
            lastFeedVariantRef.current = nextVariant;
            setLastFeedVariant(nextVariant);
          }
        };
        window.addEventListener('tt-input-sheet-added', handleAdded);
        window.addEventListener('tt-last-feed-variant', handleVariant);
        return () => {
          window.removeEventListener('tt-input-sheet-added', handleAdded);
          window.removeEventListener('tt-last-feed-variant', handleVariant);
        };
      }, [resolveLastFeedVariant]);

      const showFeed = !visibleTypes || visibleTypes.feeding !== false;
      const showSleep = !visibleTypes || visibleTypes.sleep !== false;
      const showDiaper = !visibleTypes || visibleTypes.diaper !== false;

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
              showFeed && React.createElement(SplitButton, {
                icon: lastFeedVariant === 'nursing' ? NursingIcon : BottleIcon,
                label: 'Feed',
                type: 'feeding',
                accentVar: lastFeedVariant === 'nursing' ? '--tt-nursing' : '--tt-feed',
                accentStrongVar: lastFeedVariant === 'nursing' ? '--tt-nursing-strong' : '--tt-feed-strong',
                direction: 'left',
                onClick: () => handleTrackerSelect('feeding')
              }),
              showDiaper && React.createElement(SplitButton, {
                icon: DiaperIcon,
                label: 'Diaper',
                type: 'diaper',
                direction: 'top',
                onClick: () => handleTrackerSelect('diaper')
              }),
              showSleep && React.createElement(SplitButton, {
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
            backgroundColor: 'transparent',
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
            background: 'var(--tt-plus-bg)',
            borderRadius: '50%',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--tt-plus-fg)',
            cursor: 'pointer',
            boxShadow: 'var(--tt-shadow-floating)',
            outline: 'none'
          }
        },
        React.createElement(
          'svg',
          {
            xmlns: "http://www.w3.org/2000/svg",
            width: "21.6",
            height: "21.6",
            viewBox: "0 0 256 256",
            fill: "currentColor",
            style: { display: 'block' }
          },
          React.createElement('path', {
            d: "M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"
          })
        )
      );
    };

    const SplitButton = (props) => {
      const {
        icon: IconComponent,
        label,
        type,
        direction,
        onClick,
        accentVar,
        accentStrongVar
      } = props;

      const isLeft = direction === 'left';
      const isTop = direction === 'top';
      const gradientVar = accentVar || (type === 'feeding'
        ? '--tt-feed'
        : (type === 'sleep' ? '--tt-sleep' : '--tt-diaper'));
      const gradientStrongVar = accentStrongVar || (type === 'feeding'
        ? '--tt-feed-strong'
        : (type === 'sleep' ? '--tt-sleep-strong' : '--tt-diaper-strong'));

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
            x: isLeft ? -74 : (isTop ? 0 : 74),
            y: isTop ? -164 : -112,
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
            y: isTop ? -172 : -120,
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
            gap: '10px',
            cursor: 'pointer',
            outline: 'none'
          }
        },
        React.createElement(
          motion.div,
          {
            initial: { rotate: isLeft ? -90 : (isTop ? 0 : 90) },
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
              boxShadow: 'var(--tt-shadow-floating)'
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
                color: 'var(--tt-text-on-accent)'
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
              color: 'var(--tt-text-primary)',
              fontSize: '14px',
              fontWeight: '600',
              textShadow: 'var(--tt-text-shadow)',
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
