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
import { AppState } from 'react-native';
import { MONETIZATION_SUPPORTED } from '../services/monetization';
import {
  getEntitlementState,
  identifyPurchaser,
  initializePurchases,
  subscribeToEntitlement,
} from '../services/purchasesService';
import { gatherAdsConsent, initializeAds } from '../services/adsService';
import { requestTrackingPermissionOnce } from '../services/trackingTransparencyService';
import { useAuth } from './AuthContext';
import RemoveAdsSheet from '../components/sheets/RemoveAdsSheet';

const { getAdsGate } = require('../services/adsGatePolicy.cjs');

const ADS_RESOLUTION_TIMEOUT_MS = 8_000;

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
  removeAdsOpen: false,
  openRemoveAds: () => {},
  refreshEntitlement: async () => {},
  refreshConsent: async () => {},
};

export function AdsProvider({ children }) {
  const { user } = useAuth();
  const removeAdsSheetRef = useRef(null);
  const presentationRef = useRef({ ...DEFAULT_PRESENTATION });
  const entitlementRef = useRef('unknown');
  const entitlementUidRef = useRef(null);
  const consentGenerationRef = useRef(0);
  const consentStartedUidRef = useRef(null);
  const consentRequestRef = useRef(null);
  const consentRetryNeededRef = useRef(false);
  const consentRetryUsedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const [entitlement, setEntitlement] = useState('unknown');
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [consentReady, setConsentReady] = useState(false);
  const [adsInitialized, setAdsInitialized] = useState(false);
  const [resolutionTimedOut, setResolutionTimedOut] = useState(false);
  const [removeAdsOpen, setRemoveAdsOpen] = useState(false);

  const currentUid =
    typeof user?.uid === 'string' && user.uid !== 'local-user'
      ? user.uid
      : null;

  const openRemoveAds = useCallback((opts = {}) => {
    if (!MONETIZATION_SUPPORTED) return false;
    presentationRef.current = {
      source: opts.source === 'auto' ? 'auto' : 'manual',
      trigger: opts.trigger || null,
      logCount: opts.logCount ?? null,
      appAgeHours: opts.appAgeHours ?? null,
      accountAgeHours: opts.accountAgeHours ?? null,
    };
    if (removeAdsSheetRef.current?.present) {
      // Block interstitials immediately, before the sheet's opening animation.
      setRemoveAdsOpen(true);
      removeAdsSheetRef.current.present();
      return true;
    }
    return false;
  }, []);

  const getPresentation = useCallback(() => presentationRef.current, []);

  const handleEntitlementChange = useCallback((next) => {
    if (next !== 'entitled' && next !== 'notEntitled' && next !== 'unknown') {
      return;
    }
    entitlementRef.current = next;
    setEntitlement(next);
    if (next === 'entitled') {
      consentGenerationRef.current += 1;
      consentStartedUidRef.current = null;
      consentRetryNeededRef.current = false;
      consentRetryUsedRef.current = false;
      setCanRequestAds(false);
      setAdsInitialized(false);
      setPrivacyOptionsRequired(false);
      setConsentReady(true);
      setResolutionTimedOut(false);
    } else if (next === 'unknown') {
      setCanRequestAds(false);
      setAdsInitialized(false);
      setPrivacyOptionsRequired(false);
      setConsentReady(false);
    }
  }, []);

  const refreshEntitlement = useCallback(async () => {
    if (!MONETIZATION_SUPPORTED || !currentUid) return;
    await initializePurchases();
    await identifyPurchaser(currentUid);
    const next = await getEntitlementState();
    if (entitlementUidRef.current !== currentUid) return;
    handleEntitlementChange(next);
  }, [currentUid, handleEntitlementChange]);

  const applyConsentResult = useCallback(async (result) => {
    const nextCanRequest = Boolean(result?.canRequestAds);
    setCanRequestAds(nextCanRequest);
    setPrivacyOptionsRequired(Boolean(result?.privacyOptionsRequired));
    setConsentReady(true);
    if (!nextCanRequest || entitlementRef.current !== 'notEntitled') {
      setAdsInitialized(false);
      return;
    }

    const initialized = await initializeAds();
    if (entitlementRef.current === 'notEntitled') {
      setAdsInitialized(Boolean(initialized));
    }
  }, []);

  const runConsentRequest = useCallback(async ({ isRetry = false } = {}) => {
    if (!MONETIZATION_SUPPORTED || entitlementRef.current !== 'notEntitled') {
      return;
    }
    if (appStateRef.current !== 'active') {
      consentStartedUidRef.current = null;
      return;
    }
    if (consentRequestRef.current) return consentRequestRef.current;
    if (isRetry) consentRetryUsedRef.current = true;

    const generation = consentGenerationRef.current;
    const requestUid = entitlementUidRef.current;
    const request = (async () => {
      await requestTrackingPermissionOnce();
      if (
        appStateRef.current !== 'active' ||
        generation !== consentGenerationRef.current ||
        entitlementRef.current !== 'notEntitled'
      ) {
        consentStartedUidRef.current = null;
        return;
      }
      let result;
      try {
        result = await gatherAdsConsent({
          canPresent: () => (
            generation === consentGenerationRef.current &&
            entitlementRef.current === 'notEntitled' &&
            requestUid === entitlementUidRef.current
          ),
        });
      } catch {
        result = {
          canRequestAds: false,
          privacyOptionsRequired: false,
          hadError: true,
        };
      }
      if (result?.cancelled) return;
      if (
        generation !== consentGenerationRef.current ||
        entitlementRef.current !== 'notEntitled'
      ) {
        return;
      }
      consentRetryNeededRef.current = Boolean(result?.hadError);
      await applyConsentResult(result);
    })();
    consentRequestRef.current = request;
    try {
      await request;
    } finally {
      if (consentRequestRef.current === request) {
        consentRequestRef.current = null;
      }
    }
  }, [applyConsentResult]);

  const refreshConsent = useCallback(async () => {
    await runConsentRequest();
  }, [runConsentRequest]);

  useEffect(() => {
    setResolutionTimedOut(false);
    if (!MONETIZATION_SUPPORTED) return undefined;
    const timer = setTimeout(() => {
      setResolutionTimedOut(true);
    }, ADS_RESOLUTION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [user?.uid]);

  useEffect(() => {
    if (!MONETIZATION_SUPPORTED) return undefined;

    consentGenerationRef.current += 1;
    consentStartedUidRef.current = null;
    consentRequestRef.current = null;
    consentRetryNeededRef.current = false;
    consentRetryUsedRef.current = false;
    entitlementUidRef.current = currentUid;
    entitlementRef.current = 'unknown';
    setEntitlement('unknown');
    setCanRequestAds(false);
    setAdsInitialized(false);
    setPrivacyOptionsRequired(false);
    setConsentReady(false);

    if (!currentUid) return undefined;

    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      await initializePurchases();
      await identifyPurchaser(currentUid);
      if (cancelled) return;
      const next = await getEntitlementState();
      if (cancelled || entitlementUidRef.current !== currentUid) return;
      handleEntitlementChange(next);
      if (cancelled) return;
      unsubscribe = subscribeToEntitlement((state) => {
        if (!cancelled && entitlementUidRef.current === currentUid) {
          handleEntitlementChange(state);
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUid, handleEntitlementChange]);

  useEffect(() => {
    if (!MONETIZATION_SUPPORTED || !currentUid) return;
    if (entitlementUidRef.current !== currentUid) return;
    if (entitlement === 'entitled') return;
    if (entitlement !== 'notEntitled') return;
    if (consentStartedUidRef.current === currentUid) return;
    consentStartedUidRef.current = currentUid;
    void runConsentRequest();
  }, [currentUid, entitlement, runConsentRequest]);

  useEffect(() => {
    if (!MONETIZATION_SUPPORTED) return undefined;
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState !== 'active' || previousState === 'active') return;

      if (entitlementRef.current === 'unknown') {
        void refreshEntitlement();
        return;
      }
      if (
        entitlementRef.current === 'notEntitled' &&
        consentRetryNeededRef.current &&
        !consentRetryUsedRef.current
      ) {
        void runConsentRequest({ isRetry: true });
        return;
      }
      if (
        entitlementRef.current === 'notEntitled' &&
        currentUid &&
        consentStartedUidRef.current !== currentUid
      ) {
        consentStartedUidRef.current = currentUid;
        void runConsentRequest();
      }
    });
    return () => subscription.remove();
  }, [currentUid, refreshEntitlement, runConsentRequest]);

  const { adsEnabled, adsPending } = getAdsGate({
    monetizationSupported: MONETIZATION_SUPPORTED,
    entitlement,
    consentReady,
    canRequestAds,
    adsInitialized,
    resolutionTimedOut,
  });

  const value = useMemo(
    () =>
      MONETIZATION_SUPPORTED
        ? {
            adsEnabled,
            adsPending,
            entitlement,
            canRequestAds,
            privacyOptionsRequired,
            removeAdsOpen,
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
      removeAdsOpen,
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
        onOpenChange={setRemoveAdsOpen}
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
