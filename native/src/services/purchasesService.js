/**
 * purchasesService — RevenueCat (iOS-only).
 * Sole source of truth for the Remove Ads entitlement. Lazy-requires the SDK
 * so Android (where the native module is excluded) never loads it.
 */
import { MONETIZATION_SUPPORTED } from './monetization';

export const ENTITLEMENT_ID = 'no_ads';

const LOCAL_USER_UID = 'local-user';

const getStringEnv = (name) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

let initPromise = null;
let lastIdentifiedUid = null;

function getPurchasesModule() {
  if (!MONETIZATION_SUPPORTED) return null;
  try {
    // Lazy require — top-level import would throw on Android.
    return require('react-native-purchases');
  } catch (error) {
    console.warn('[Purchases] native module unavailable:', error);
    return null;
  }
}

function getPurchases() {
  return getPurchasesModule()?.default ?? null;
}

function entitlementFromCustomerInfo(customerInfo) {
  const active = customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
  return active ? 'entitled' : 'notEntitled';
}

export function initializePurchases() {
  if (!MONETIZATION_SUPPORTED) return Promise.resolve();
  if (initPromise) return initPromise;

  const Purchases = getPurchases();
  if (!Purchases) return Promise.resolve();

  const apiKey = getStringEnv('EXPO_PUBLIC_REVENUECAT_IOS_KEY');
  if (!apiKey) {
    console.warn('[Purchases] Missing EXPO_PUBLIC_REVENUECAT_IOS_KEY; initialization skipped.');
    return Promise.resolve();
  }

  initPromise = Promise.resolve()
    .then(() => {
      const LOG_LEVEL = getPurchasesModule()?.LOG_LEVEL;
      if (LOG_LEVEL) {
        Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
      }
      Purchases.configure({ apiKey });
    })
    .catch((error) => {
      console.error('[Purchases] configure failed:', error);
      initPromise = null;
    });

  return initPromise;
}

export async function identifyPurchaser(uid) {
  if (!MONETIZATION_SUPPORTED) return;
  const normalizedId = typeof uid === 'string' ? uid.trim() : '';
  if (!normalizedId || normalizedId === LOCAL_USER_UID) return;
  if (normalizedId === lastIdentifiedUid) return;

  const Purchases = getPurchases();
  if (!Purchases) return;

  await initializePurchases();
  try {
    await Purchases.logIn(normalizedId);
    lastIdentifiedUid = normalizedId;
  } catch (error) {
    console.warn('[Purchases] logIn failed:', error);
  }
}

export async function resetPurchaser() {
  if (!MONETIZATION_SUPPORTED) return;
  const Purchases = getPurchases();
  if (!Purchases) return;

  await initializePurchases();
  try {
    await Purchases.logOut();
  } catch (error) {
    // logOut throws if already anonymous — ignore.
  }
  lastIdentifiedUid = null;
}

/**
 * Returns 'entitled' | 'notEntitled' | 'unknown'.
 * Unknown includes any failure and the pre-login window — fail closed for ads.
 */
export async function getEntitlementState() {
  if (!MONETIZATION_SUPPORTED) return 'unknown';
  const Purchases = getPurchases();
  if (!Purchases) return 'unknown';

  try {
    await initializePurchases();
    if (!lastIdentifiedUid) return 'unknown';
    const customerInfo = await Purchases.getCustomerInfo();
    return entitlementFromCustomerInfo(customerInfo);
  } catch (error) {
    console.warn('[Purchases] getEntitlementState failed:', error);
    return 'unknown';
  }
}

export function subscribeToEntitlement(callback) {
  if (!MONETIZATION_SUPPORTED) return () => {};
  const Purchases = getPurchases();
  if (!Purchases) return () => {};

  const listener = (customerInfo) => {
    if (!lastIdentifiedUid) {
      callback('unknown');
      return;
    }
    callback(entitlementFromCustomerInfo(customerInfo));
  };

  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    try {
      Purchases.removeCustomerInfoUpdateListener(listener);
    } catch {
      /* ignore */
    }
  };
}

export async function getRemoveAdsPackage() {
  if (!MONETIZATION_SUPPORTED) return null;
  const Purchases = getPurchases();
  if (!Purchases) return null;

  try {
    await initializePurchases();
    const offerings = await Purchases.getOfferings();
    // Offering identifier in RevenueCat: "default"
    const current = offerings?.current || offerings?.all?.default;
    if (!current) return null;

    // Prefer explicit Remove Ads package — never fall back to packages[0].
    const packages = current.availablePackages || [];
    return (
      packages.find((pkg) => pkg?.identifier === '$rc_lifetime') ||
      current.lifetime ||
      packages.find(
        (pkg) => pkg?.product?.identifier === 'io.tinytracker.removeads'
      ) ||
      null
    );
  } catch (error) {
    console.warn('[Purchases] getRemoveAdsPackage failed:', error);
    return null;
  }
}

export async function purchaseRemoveAds() {
  if (!MONETIZATION_SUPPORTED) {
    return { status: 'unsupported' };
  }
  const Purchases = getPurchases();
  if (!Purchases) return { status: 'unavailable' };

  const pkg = await getRemoveAdsPackage();
  if (!pkg) return { status: 'no_package' };

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return {
      status: entitlementFromCustomerInfo(customerInfo) === 'entitled' ? 'purchased' : 'pending',
      customerInfo,
    };
  } catch (error) {
    if (error?.userCancelled || error?.code === Purchases.PURCHASES_ERROR_CODE?.PURCHASE_CANCELLED_ERROR) {
      return { status: 'cancelled' };
    }
    console.warn('[Purchases] purchaseRemoveAds failed:', error);
    return { status: 'error', error };
  }
}

export async function restorePurchases() {
  if (!MONETIZATION_SUPPORTED) {
    return { status: 'unsupported' };
  }
  const Purchases = getPurchases();
  if (!Purchases) return { status: 'unavailable' };

  try {
    await initializePurchases();
    const customerInfo = await Purchases.restorePurchases();
    return {
      status: entitlementFromCustomerInfo(customerInfo) === 'entitled' ? 'restored' : 'none',
      customerInfo,
    };
  } catch (error) {
    console.warn('[Purchases] restorePurchases failed:', error);
    return { status: 'error', error };
  }
}
