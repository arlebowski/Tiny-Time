/**
 * AdsContext — entitlement + consent gate for monetization (iOS-only).
 * RevenueCat is the sole source of truth for Remove Ads.
 * Unknown entitlement fails closed (no ads).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MONETIZATION_SUPPORTED } from '../services/monetization';
import {
  getEntitlementState,
  identifyPurchaser,
  initializePurchases,
  subscribeToEntitlement,
} from '../services/purchasesService';
import { gatherAdsConsent, initializeAds } from '../services/adsService';
import { useAuth } from './AuthContext';
import RemoveAdsSheet from '../components/sheets/RemoveAdsSheet';

const AdsContext = createContext(null);

const DEFAULT_PRESENTATION = {
  source: 'manual',
  trigger: null,
  logCount: null,
  appAgeHours: null,
  accountAgeHours: null,
};

const INERT_VALUE = {
  adsEnabled: false,
  adsPending: false,
  entitlement: 'unknown',
  canRequestAds: false,
  privacyOptionsRequired: false,
  openRemoveAds: () => {},
  refreshEntitlement: async () => {},
  refreshConsent: async () => {},
};

export function AdsProvider({ children }) {
  const { user } = useAuth();
  const removeAdsSheetRef = useRef(null);
  const presentationRef = useRef({ ...DEFAULT_PRESENTATION });

  const [entitlement, setEntitlement] = useState('unknown');
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [consentReady, setConsentReady] = useState(false);

  const openRemoveAds = useCallback((opts = {}) => {
    if (!MONETIZATION_SUPPORTED) return;
    presentationRef.current = {
      source: opts.source === 'auto' ? 'auto' : 'manual',
      trigger: opts.trigger || null,
      logCount: opts.logCount ?? null,
      appAgeHours: opts.appAgeHours ?? null,
      accountAgeHours: opts.accountAgeHours ?? null,
    };
    removeAdsSheetRef.current?.present?.();
  }, []);

  const getPresentation = useCallback(() => presentationRef.current, []);

  const refreshEntitlement = useCallback(async () => {
    if (!MONETIZATION_SUPPORTED) return;
    const next = await getEntitlementState();
    setEntitlement(next);
  }, []);

  const applyConsentResult = useCallback((result) => {
    const nextCanRequest = Boolean(result?.canRequestAds);
    setCanRequestAds(nextCanRequest);
    setPrivacyOptionsRequired(Boolean(result?.privacyOptionsRequired));
    setConsentReady(true);
    if (nextCanRequest) initializeAds();
  }, []);

  const refreshConsent = useCallback(async () => {
    if (!MONETIZATION_SUPPORTED) return;
    try {
      const result = await gatherAdsConsent();
      applyConsentResult(result);
    } catch {
      applyConsentResult({ canRequestAds: false, privacyOptionsRequired: false });
    }
  }, [applyConsentResult]);

  const handleEntitlementChange = useCallback((next) => {
    if (next === 'entitled' || next === 'notEntitled' || next === 'unknown') {
      setEntitlement(next);
    }
  }, []);

  useEffect(() => {
    if (!MONETIZATION_SUPPORTED) return undefined;

    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      await initializePurchases();
      if (user?.uid && user.uid !== 'local-user') {
        await identifyPurchaser(user.uid);
      }
      if (cancelled) return;
      const next = await getEntitlementState();
      if (!cancelled) setEntitlement(next);
      unsubscribe = subscribeToEntitlement((state) => {
        if (!cancelled) setEntitlement(state);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!MONETIZATION_SUPPORTED) return undefined;

    let cancelled = false;
    gatherAdsConsent()
      .then((result) => {
        if (cancelled) return;
        applyConsentResult(result);
      })
      .catch(() => {
        if (cancelled) return;
        applyConsentResult({ canRequestAds: false, privacyOptionsRequired: false });
      });

    return () => {
      cancelled = true;
    };
  }, [applyConsentResult]);

  const adsEnabled =
    MONETIZATION_SUPPORTED &&
    consentReady &&
    canRequestAds &&
    entitlement === 'notEntitled';

  // True while consent/entitlement are still resolving. Slots can reserve
  // layout space so the card doesn't jump in after the page paints.
  const adsPending =
    MONETIZATION_SUPPORTED &&
    entitlement !== 'entitled' &&
    (!consentReady || entitlement === 'unknown');

  const value = useMemo(
    () =>
      MONETIZATION_SUPPORTED
        ? {
            adsEnabled,
            adsPending,
            entitlement,
            canRequestAds,
            privacyOptionsRequired,
            openRemoveAds,
            refreshEntitlement,
            refreshConsent,
          }
        : INERT_VALUE,
    [
      adsEnabled,
      adsPending,
      entitlement,
      canRequestAds,
      privacyOptionsRequired,
      openRemoveAds,
      refreshEntitlement,
      refreshConsent,
    ]
  );

  if (!MONETIZATION_SUPPORTED) {
    return (
      <AdsContext.Provider value={INERT_VALUE}>{children}</AdsContext.Provider>
    );
  }

  return (
    <AdsContext.Provider value={value}>
      {children}
      <RemoveAdsSheet
        sheetRef={removeAdsSheetRef}
        entitlement={entitlement}
        onEntitlementChange={handleEntitlementChange}
        getPresentation={getPresentation}
        uid={user?.uid}
      />
    </AdsContext.Provider>
  );
}

export function useAds() {
  const ctx = useContext(AdsContext);
  if (!ctx) {
    // Safe default when provider is missing (shouldn't happen in app shell).
    return INERT_VALUE;
  }
  return ctx;
}
