// NextUpCard Component (v4)
// Displays the next feed/sleep state using mockup messaging logic

const __ttNextUpResolveFramer = () => {
  if (typeof window === 'undefined') return {};
  const candidates = [
    window.FramerMotion,
    window.framerMotion,
    window['framer-motion'],
    window.Motion,
    window.motion
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

const __ttNextUpToDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const __ttNextUpFormatDuration = (milliseconds) => {
  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

const __ttNextUpFormatTime = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr}${ampm}`;
};

const __ttNextUpFormatSleepTimer = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes < 1) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

const NextUpCard = ({
  babyState = 'awake',
  sleepStartTime = null,
  nextEvent = null,
  onWakeUp = () => {},
  onLogFeed = () => {},
  onStartSleep = () => {},
  className = '',
  style = null
}) => {
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  React.useEffect(() => {
    const interval = babyState === 'sleeping' ? 1000 : 30000;
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, interval);
    return () => clearInterval(id);
  }, [babyState]);

  const resolvedSleepStart = __ttNextUpToDate(sleepStartTime);
  const resolvedNextEvent = (() => {
    if (!nextEvent) return null;
    const scheduledTime = __ttNextUpToDate(nextEvent.scheduledTime || nextEvent.time);
    if (!scheduledTime) return null;
    const type = nextEvent.type === 'feed' ? 'feed' : 'sleep';
    const label = nextEvent.label || (type === 'feed' ? 'Feed' : 'Nap');
    return { type, scheduledTime, label };
  })();

  const stateData = (() => {
    const now = new Date(nowMs);

    // STATE 1: Baby is sleeping
    if (babyState === 'sleeping') {
      const sleepStart = resolvedSleepStart || now;
      const sleepDuration = Math.max(0, now - sleepStart);

      // Always show the next event while sleeping if it exists
      let showNextEvent = false;
      let nextEventText = '';
      if (resolvedNextEvent && resolvedNextEvent.scheduledTime) {
        const scheduledTimeStr = __ttNextUpFormatTime(resolvedNextEvent.scheduledTime);
        const label = resolvedNextEvent.label;
        showNextEvent = true;
        nextEventText = `${label} around ${scheduledTimeStr}`;
      }

      return {
        state: 'sleeping',
        duration: __ttNextUpFormatSleepTimer(sleepDuration),
        nextEvent: showNextEvent ? nextEventText : null,
        buttonText: 'Wake Up',
        buttonAction: onWakeUp
      };
    }

    // STATES 2-4: Baby is awake, check next event
    if (resolvedNextEvent && resolvedNextEvent.scheduledTime) {
      const timeUntilEvent = resolvedNextEvent.scheduledTime - now;
      const minutesUntilEvent = Math.floor(timeUntilEvent / (1000 * 60));
      const isFeed = resolvedNextEvent.type === 'feed';
      const label = resolvedNextEvent.label || (isFeed ? 'Feed' : 'Nap');

      // Format scheduled time
      const scheduledTimeStr = __ttNextUpFormatTime(resolvedNextEvent.scheduledTime);

      // STATE 2 or 3: Event is ready (within 10 min or overdue)
      if (minutesUntilEvent <= 10) {
        let durationText;
        let subText;

        if (minutesUntilEvent < 0) {
          // Overdue
          const minutesOverdue = Math.abs(minutesUntilEvent);
          durationText = `${label} ${minutesOverdue} min ago`;
          subText = `Around ${scheduledTimeStr}`;
        } else {
          // Coming up soon
          durationText = `${label} in ${minutesUntilEvent} min`;
          subText = `Around ${scheduledTimeStr}`;
        }

        return {
          state: isFeed ? 'feedReady' : 'sleepReady',
          duration: durationText,
          nextEvent: subText,
          buttonText: isFeed ? 'Log Feed' : 'Start Sleep',
          buttonAction: isFeed ? onLogFeed : onStartSleep
        };
      }

      // STATE 4: Event is upcoming (more than 10 min away)
      return {
        state: 'upcoming',
        duration: `${label} in ${__ttNextUpFormatDuration(timeUntilEvent)}`,
        nextEvent: `Around ${scheduledTimeStr}`,
        buttonText: null,
        buttonAction: null
      };
    }

    return null;
  })();

  if (!stateData) return null;

  const { motion } = __ttNextUpResolveFramer();
  const Root = motion ? motion.div : 'div';  const rootMotionProps = motion ? {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.18, ease: 'easeOut' }
  } : {};

  const rootClassName = [
    'tt-next-up-card',
    `tt-next-up-card--${stateData.state}`,
    className
  ].filter(Boolean).join(' ');

  const SleepIcon =
    (typeof window !== 'undefined' && window.TT && window.TT.shared && window.TT.shared.icons &&
      (window.TT.shared.icons.MoonV2 || window.TT.shared.icons["moon-v2"] || window.TT.shared.icons.MoonMain || window.TT.shared.icons["moon-main"])) ||
    null;

  return React.createElement(
    Root,
    {
      className: rootClassName,
      style: style || undefined,
      ...rootMotionProps
    },
    React.createElement('div', { className: 'tt-next-up-card__content' },
      React.createElement('div', { className: 'tt-next-up-card__row' },
        React.createElement('div', { className: 'tt-next-up-card__duration-row' },
          stateData.state === 'sleeping' && React.createElement(
            'span',
            { className: 'tt-next-up-card__sleep-icon', 'aria-hidden': true },
            SleepIcon ? React.createElement(SleepIcon, {
              className: 'tt-next-up-card__sleep-icon-svg',
              style: { color: 'currentColor', strokeWidth: '1.5' }
            }) : null
          ),
          React.createElement('span', { className: 'tt-next-up-card__duration' }, stateData.duration),
          stateData.state === 'sleeping' && React.createElement('span', { className: 'tt-next-up-card__zzz' },
            React.createElement('span', null, 'z'),
            React.createElement('span', null, 'Z'),
            React.createElement('span', null, 'z')
          )
        ),
        stateData.buttonText && React.createElement('button', {
          type: 'button',
          className: 'tt-next-up-card__cta tt-tapable',
          onClick: stateData.buttonAction,
          'aria-label': stateData.buttonText
        }, stateData.buttonText)
      ),
      stateData.nextEvent && React.createElement('div', { className: 'tt-next-up-card__subtext' }, stateData.nextEvent)
    )
  );
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.NextUpCard = NextUpCard;
}
