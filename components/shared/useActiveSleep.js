// Shared active sleep hook (single source of truth from Firebase)
(() => {
  if (typeof window === 'undefined') return;

  const root = window.TT = window.TT || {};
  root.shared = root.shared || {};

  const store = {
    session: null,
    loaded: typeof firestoreStorage === 'undefined',
    kidId: null,
    unsubscribe: null,
    listeners: new Set()
  };

  const notify = () => {
    const snapshot = { session: store.session, loaded: store.loaded, kidId: store.kidId };
    store.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        // Ignore listener failures
      }
    });
  };

  const resetSubscription = (kidId) => {
    if (store.unsubscribe) {
      try {
        store.unsubscribe();
      } catch (e) {
        // Ignore unsubscribe errors
      }
      store.unsubscribe = null;
    }

    store.kidId = kidId || null;
    store.session = null;
    store.loaded = typeof firestoreStorage === 'undefined' || !kidId;
    notify();

    if (!kidId || typeof firestoreStorage === 'undefined') return;

    store.loaded = false;
    notify();

    store.unsubscribe = firestoreStorage.subscribeActiveSleep((session) => {
      store.session = session || null;
      store.loaded = true;
      notify();
    });
  };

  const useActiveSleep = (kidId) => {
    const [state, setState] = React.useState(() => ({
      session: store.session,
      loaded: store.loaded,
      kidId: store.kidId
    }));

    React.useEffect(() => {
      const listener = (next) => {
        setState({
          session: next.session,
          loaded: next.loaded,
          kidId: next.kidId
        });
      };
      store.listeners.add(listener);
      return () => {
        store.listeners.delete(listener);
      };
    }, []);

    React.useEffect(() => {
      if (!kidId) return;
      if (kidId !== store.kidId) {
        resetSubscription(kidId);
      }
    }, [kidId]);

    React.useEffect(() => {
      const handler = (event) => {
        const detail = event && event.detail ? event.detail : {};
        const nextKidId = detail.kidId || kidId || null;
        if (!nextKidId) return;
        if (detail.kidId && kidId && detail.kidId !== kidId) return;
        // Storage-ready can fire after an initial no-op subscribe (fast-boot).
        // Always re-subscribe so active sleep updates once storage is initialized.
        resetSubscription(nextKidId);
      };
      if (typeof window !== 'undefined') {
        window.addEventListener('tt:storage-ready', handler);
      }
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('tt:storage-ready', handler);
        }
      };
    }, [kidId]);

    return { activeSleep: state.session, activeSleepLoaded: state.loaded };
  };

  root.shared.useActiveSleep = useActiveSleep;
})();
