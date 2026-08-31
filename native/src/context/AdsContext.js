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
import { gatherAdsConsent } from '../services/adsService';
import { useAuth } from './AuthContext';
import RemoveAdsSheet from '../components/sheets/RemoveAdsSheet';

const AdsContext = createContext(null);

const INERT_VALUE = {
  adsEnabled: false,
  entitlement: 'unknown',
  canRequestAds: false,
  privacyOptionsRequired: false,
  openRemoveAds: () => {},
  refreshEntitlement: async () => {},
};

export function AdsProvider({ children }) {
  const { user } = useAuth();
  const removeAdsSheetRef = useRef(null);

  const [entitlement, setEntitlement] = useState('unknown');
  const [canRequestAds, setCanRequestAds] = useState(false);
  const [privacyOptionsRequired, setPrivacyOptionsRequired] = useState(false);
  const [consentReady, setConsentReady] = useState(false);

  const openRemoveAds = useCallback(() => {
    if (!MONETIZATION_SUPPORTED) return;
    removeAdsSheetRef.current?.present?.();
  }, []);

  const refreshEntitlement = useCallback(async () => {
    if (!MONETIZATION_SUPPORTED) return;
    const next = await getEntitlementState();
    setEntitlement(next);
  }, []);

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
        setCanRequestAds(Boolean(result.canRequestAds));
        setPrivacyOptionsRequired(Boolean(result.privacyOptionsRequired));
        setConsentReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCanRequestAds(false);
        setPrivacyOptionsRequired(false);
        setConsentReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const adsEnabled =
    MONETIZATION_SUPPORTED &&
    consentReady &&
    canRequestAds &&
    entitlement === 'notEntitled';

  const value = useMemo(
    () =>
      MONETIZATION_SUPPORTED
        ? {
            adsEnabled,
            entitlement,
            canRequestAds,
            privacyOptionsRequired,
            openRemoveAds,
            refreshEntitlement,
          }
        : INERT_VALUE,
    [
      adsEnabled,
      entitlement,
      canRequestAds,
      privacyOptionsRequired,
      openRemoveAds,
      refreshEntitlement,
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
        onEntitlementChange={handleEntitlementChange}
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
