// NextUpCard.js - Vanilla JavaScript version

class NextUpCard {
  constructor(container, options = {}) {
    this.container = container;
    this.type = options.type || 'sleep'; // 'sleep' or 'feed'
    this.duration = options.duration || '0m';
    this.nextEvent = options.nextEvent || null;
    this.onAction = options.onAction || (() => {});
    
    this.render();
  }

  getStyles() {
    const isSleep = this.type === 'sleep';
    return {
      backgroundColor: isSleep ? '#4F46E5' : '#DB2777',
      buttonColor: isSleep ? '#4F46E5' : '#DB2777',
      buttonText: isSleep ? 'Wake Up' : 'Log Feed'
    };
  }

  render() {
    const styles = this.getStyles();
    const isSleep = this.type === 'sleep';

    this.container.innerHTML = `
      <div class="next-up-card" style="background: ${styles.backgroundColor}; border-radius: 1rem; padding: 1.25rem;">
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: baseline; gap: 0.5rem;">
              <span style="font-size: 1.875rem; font-weight: 300; color: white; font-variant-numeric: tabular-nums;">${this.duration}</span>
              ${isSleep ? `
                <span class="zzz" style="font-size: 1rem; color: white; opacity: 0.7;">
                  <span style="display: inline-block; animation: floatingZs 2s ease-in-out infinite; animation-delay: 0s;">z</span>
                  <span style="display: inline-block; animation: floatingZs 2s ease-in-out infinite; animation-delay: 0.3s;">Z</span>
                  <span style="display: inline-block; animation: floatingZs 2s ease-in-out infinite; animation-delay: 0.6s;">z</span>
                </span>
              ` : ''}
            </div>
            <button 
              class="action-button"
              style="
                padding: 0.375rem 0.75rem;
                border-radius: 9999px;
                font-size: 0.75rem;
                font-weight: 600;
                border: none;
                cursor: pointer;
                background: white;
                color: ${styles.buttonColor};
              "
            >
              ${styles.buttonText}
            </button>
          </div>
          ${this.nextEvent ? `
            <div style="font-size: 0.875rem; color: white; opacity: 0.7;">
              ${this.nextEvent}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Add CSS animation
    this.addAnimationStyles();

    // Attach click handler
    const button = this.container.querySelector('.action-button');
    if (button) {
      button.addEventListener('click', this.onAction);
    }
  }

  addAnimationStyles() {
    // Check if styles already exist
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

  update(options = {}) {
    if (options.type !== undefined) this.type = options.type;
    if (options.duration !== undefined) this.duration = options.duration;
    if (options.nextEvent !== undefined) this.nextEvent = options.nextEvent;
    if (options.onAction !== undefined) this.onAction = options.onAction;
    
    this.render();
  }

  destroy() {
    this.container.innerHTML = '';
  }
}

// Example usage:
/*
const cardContainer = document.getElementById('card-container');

// Sleep card
const sleepCard = new NextUpCard(cardContainer, {
  type: 'sleep',
  duration: '3h 26m',
  nextEvent: 'Feed around 1:08am',
  onAction: () => {
    console.log('Wake up clicked!');
    // Handle wake up
  }
});

// Feed card
const feedCard = new NextUpCard(cardContainer, {
  type: 'feed',
  duration: 'in 8 min',
  nextEvent: 'Feed around 1:08am',
  onAction: () => {
    console.log('Log feed clicked!');
    // Handle feed logging
  }
});

// Update card
sleepCard.update({ duration: '3h 45m' });
*/

export default NextUpCard;
