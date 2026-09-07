import React, { useLayoutEffect, useRef } from 'react';
import { Modal } from 'react-native';

const {
  beginPresentation,
  endPresentation,
} = require('../../services/presentationActivityService.cjs');

const MODAL_UNMOUNT_DISMISS_GUARD_MS = 500;

export default function PresentationTrackedModal({ visible, onDismiss, ...props }) {
  const tokenRef = useRef(null);

  useLayoutEffect(() => {
    if (visible && !tokenRef.current) {
      tokenRef.current = beginPresentation('modal');
    }
  }, [visible]);

  useLayoutEffect(() => () => {
    // Conditional callers can remove the wrapper before native onDismiss.
    // Transfer ownership to a short guard through UIKit's exit animation.
    if (tokenRef.current) {
      const token = tokenRef.current;
      tokenRef.current = null;
      setTimeout(
        () => endPresentation(token),
        MODAL_UNMOUNT_DISMISS_GUARD_MS
      );
    }
  }, []);

  const handleDismiss = (...args) => {
    // Keep the token while visible=false is animating out. The native
    // onDismiss callback is the first reliable point at which UIKit is free.
    if (!visible && tokenRef.current) {
      endPresentation(tokenRef.current);
      tokenRef.current = null;
    }
    return onDismiss?.(...args);
  };

  return <Modal visible={visible} onDismiss={handleDismiss} {...props} />;
}
