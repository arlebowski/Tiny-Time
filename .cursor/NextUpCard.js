// NextUpCard.js - Vanilla JavaScript component with all states

class NextUpCard {
  constructor(container, options = {}) {
    this.container = container;
    this.babyState = options.babyState || 'awake'; // 'sleeping' or 'awake'
    this.sleepStartTime = options.sleepStartTime || null; // Date object or null
    this.nextEvent = options.nextEvent || null; // { type: 'feed'|'sleep', scheduledTime: Date, label: 'Feed'|'Nap' }
    this.onWakeUp = options.onWakeUp || (() => {});
    this.onLogFeed = options.onLogFeed || (() => {});
    this.onStartSleep = options.onStartSleep || (() => {});
    
    this.currentState = null;
    this.timerInterval = null;
    
    this.render();
    this.startTimer();
  }

  // Calculate which state to show
  determineState() {
    const now = new Date();

    // STATE 1: Baby is sleeping
    if (this.babyState === 'sleeping' && this.sleepStartTime) {
      const sleepDuration = now - this.sleepStartTime;
      const hours = Math.floor(sleepDuration / (1000 * 60 * 60));
      const minutes = Math.floor((sleepDuration % (1000 * 60 * 60)) / (1000 * 60));
      
      // Check if next event is within 30 minutes
      let showNextEvent = false;
      let nextEventText = '';
      if (this.nextEvent && this.nextEvent.scheduledTime) {
        const timeUntilNext = this.nextEvent.scheduledTime - now;
        const minutesUntilNext = Math.floor(timeUntilNext / (1000 * 60));
        if (minutesUntilNext <= 30 && minutesUntilNext > 0) {
          showNextEvent = true;
          nextEventText = `${this.nextEvent.label || this.nextEvent.type} in ${minutesUntilNext} min`;
        }
      }
      
      return {
        state: 'sleeping',
        duration: `${hours}h ${minutes}m`,
        nextEvent: showNextEvent ? nextEventText : null,
        buttonText: 'Wake Up',
        buttonAction: this.onWakeUp
      };
    }

    // STATES 2-4: Baby is awake, check next event
    if (this.nextEvent && this.nextEvent.scheduledTime) {
      const timeUntilEvent = this.nextEvent.scheduledTime - now;
      const minutesUntilEvent = Math.floor(timeUntilEvent / (1000 * 60));
      const isFeed = this.nextEvent.type === 'feed';
      const label = this.nextEvent.label || (isFeed ? 'Feed' : 'Nap');
      
      // Format scheduled time
      const scheduledTimeStr = this.formatTime(this.nextEvent.scheduledTime);

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
          buttonAction: isFeed ? this.onLogFeed : this.onStartSleep
        };
      }

      // STATE 4: Event is upcoming (more than 10 min away)
      return {
        state: 'upcoming',
        duration: `${label} in ${this.formatDuration(timeUntilEvent)}`,
        nextEvent: `Around ${scheduledTimeStr}`,
        buttonText: null,
        buttonAction: null
      };
    }

    // No event scheduled
    return null;
  }

  formatDuration(milliseconds) {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  }

  formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr}${ampm}`;
  }

  getStyles(state) {
    const styles = {
      sleeping: {
        backgroundColor: '#4F46E5',
        buttonColor: '#4F46E5',
        textColor: 'white'
      },
      feedReady: {
        backgroundColor: '#DB2777',
        buttonColor: '#DB2777',
        textColor: 'white'
      },
      sleepReady: {
        backgroundColor: '#4F46E5',
        buttonColor: '#4F46E5',
        textColor: 'white'
      },
      upcoming: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        buttonColor: null,
        textColor: 'rgba(0,0,0,0.87)'
      }
    };

    return styles[state] || styles.upcoming;
  }

  render() {
    const stateData = this.determineState();
    
    // Don't render if no state
    if (!stateData) {
      this.container.innerHTML = '';
      return;
    }

    const styles = this.getStyles(stateData.state);
    const isSleeping = stateData.state === 'sleeping';
    const isUpcoming = stateData.state === 'upcoming';

    this.container.innerHTML = `
      <div 
        class="next-up-card" 
        style="
          background: ${styles.backgroundColor}; 
          border-radius: 1rem; 
          padding: 1.25rem;
        "
      >
        <div style="display: flex; flex-direction: column; gap: ${stateData.nextEvent ? '0.5rem' : '0'};">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: baseline; gap: 0.5rem;">
              <span style="
                font-size: ${isUpcoming ? '1.5rem' : '1.875rem'}; 
                font-weight: 300; 
                color: ${styles.textColor}; 
                font-variant-numeric: tabular-nums;
              ">${stateData.duration}</span>
              ${isSleeping ? `
                <span class="zzz" style="font-size: 1rem; color: ${styles.textColor}; opacity: 0.7;">
                  <span style="display: inline-block; animation: floatingZs 2s ease-in-out infinite; animation-delay: 0s;">z</span>
                  <span style="display: inline-block; animation: floatingZs 2s ease-in-out infinite; animation-delay: 0.3s;">Z</span>
                  <span style="display: inline-block; animation: floatingZs 2s ease-in-out infinite; animation-delay: 0.6s;">z</span>
                </span>
              ` : ''}
            </div>
            ${stateData.buttonText ? `
              <button 
                class="action-button"
                style="
                  padding: 0.375rem 0.75rem;
                  border-radius: 9999px;
                  font-size: 0.75rem;
                  font-weight: 600;
                  border: none;
                  cursor: pointer;
                  background: ${isUpcoming ? styles.buttonColor : 'white'};
                  color: ${isUpcoming ? 'white' : styles.buttonColor};
                "
              >
                ${stateData.buttonText}
              </button>
            ` : ''}
          </div>
          ${stateData.nextEvent ? `
            <div style="
              font-size: ${isUpcoming ? '0.875rem' : '0.875rem'}; 
              color: ${isUpcoming ? 'rgba(0,0,0,0.38)' : styles.textColor}; 
              opacity: ${isUpcoming ? '1' : '0.7'};
            ">
              ${stateData.nextEvent}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.addAnimationStyles();

    // Attach button click handler
    if (stateData.buttonText) {
      const button = this.container.querySelector('.action-button');
      if (button) {
        button.addEventListener('click', () => {
          if (stateData.buttonAction) {
            stateData.buttonAction();
          }
        });
      }
    }

    this.currentState = stateData.state;
  }

  addAnimationStyles() {
    if (document.getElementById('next-up-card-styles')) return;

    const style = document.createElement('style');
    style.id = 'next-up-card-styles';
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
      .action-button:hover {
        opacity: 0.9;
      }
      .action-button:active {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(style);
  }

  startTimer() {
    // Update every second if sleeping (to show live timer)
    // Update every 30 seconds otherwise (to update countdowns)
    const interval = this.babyState === 'sleeping' ? 1000 : 30000;
    
    this.timerInterval = setInterval(() => {
      this.render();
    }, interval);
  }

  update(options = {}) {
    if (options.babyState !== undefined) this.babyState = options.babyState;
    if (options.sleepStartTime !== undefined) this.sleepStartTime = options.sleepStartTime;
    if (options.nextEvent !== undefined) this.nextEvent = options.nextEvent;
    if (options.onWakeUp !== undefined) this.onWakeUp = options.onWakeUp;
    if (options.onLogFeed !== undefined) this.onLogFeed = options.onLogFeed;
    if (options.onStartSleep !== undefined) this.onStartSleep = options.onStartSleep;
    
    // Restart timer with new interval if state changed
    if (options.babyState !== undefined) {
      clearInterval(this.timerInterval);
      this.startTimer();
    }
    
    this.render();
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.container.innerHTML = '';
  }
}

// Example usage:
/*

// Example 1: Baby is sleeping
const cardContainer = document.getElementById('next-up-card');
const card = new NextUpCard(cardContainer, {
  babyState: 'sleeping',
  sleepStartTime: new Date(Date.now() - 3 * 60 * 60 * 1000 - 26 * 60 * 1000), // Started 3h 26m ago
  nextEvent: {
    type: 'feed',
    label: 'Feed',
    scheduledTime: new Date(Date.now() + 22 * 60 * 1000) // In 22 minutes
  },
  onWakeUp: () => {
    console.log('Wake up clicked!');
    // Handle wake up logic
    card.update({ 
      babyState: 'awake',
      sleepStartTime: null
    });
  }
});

// Example 2: Feed coming up soon (within 10 min)
const card2 = new NextUpCard(cardContainer, {
  babyState: 'awake',
  nextEvent: {
    type: 'feed',
    label: 'Feed',
    scheduledTime: new Date(Date.now() + 8 * 60 * 1000) // In 8 minutes
  },
  onLogFeed: () => {
    console.log('Log feed clicked!');
    // Handle feed logging
  }
});

// Example 3: Feed is overdue
const card3 = new NextUpCard(cardContainer, {
  babyState: 'awake',
  nextEvent: {
    type: 'feed',
    label: 'Feed',
    scheduledTime: new Date(Date.now() - 23 * 60 * 1000) // 23 minutes ago
  },
  onLogFeed: () => {
    console.log('Log late feed!');
  }
});

// Example 4: Upcoming event (not ready yet)
const card4 = new NextUpCard(cardContainer, {
  babyState: 'awake',
  nextEvent: {
    type: 'feed',
    label: 'Feed',
    scheduledTime: new Date(Date.now() + 45 * 60 * 1000) // In 45 minutes
  }
});

// Update the card when state changes
card.update({
  babyState: 'awake',
  sleepStartTime: null,
  nextEvent: {
    type: 'sleep',
    label: 'Nap',
    scheduledTime: new Date(Date.now() + 15 * 60 * 1000)
  }
});

*/

export default NextUpCard;