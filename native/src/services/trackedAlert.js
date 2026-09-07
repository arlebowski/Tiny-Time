import { Alert as NativeAlert } from 'react-native';

const {
  beginPresentation,
  endPresentation,
} = require('./presentationActivityService.cjs');

const ALERT_DISMISS_GUARD_MS = 500;

function alert(title, message, buttons, options) {
  const token = beginPresentation('alert');
  let released = false;
  let releaseScheduled = false;
  const release = () => {
    if (released) return;
    released = true;
    endPresentation(token);
  };
  const releaseAfterDismissal = () => {
    if (released || releaseScheduled) return;
    releaseScheduled = true;
    setTimeout(release, ALERT_DISMISS_GUARD_MS);
  };

  const sourceButtons = Array.isArray(buttons) && buttons.length > 0
    ? buttons
    : [{ text: 'OK' }];
  const wrappedButtons = sourceButtons.map((button) => ({
    ...button,
    onPress: (...args) => {
      try {
        return button?.onPress?.(...args);
      } finally {
        // iOS has no dependable Alert dismissal callback. Preserve the old
        // token through UIKit's animation (and any synchronous replacement
        // alert opened by this callback) before declaring the lane idle.
        releaseAfterDismissal();
      }
    },
  }));

  try {
    NativeAlert.alert(title, message, wrappedButtons, {
      ...options,
      onDismiss: (...args) => {
        try {
          return options?.onDismiss?.(...args);
        } finally {
          releaseAfterDismissal();
        }
      },
    });
  } catch (error) {
    release();
    throw error;
  }
}

export default { alert };
