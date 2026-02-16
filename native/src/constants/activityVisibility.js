export const DEFAULT_ACTIVITY_VISIBILITY = {
  bottle: true,
  nursing: true,
  solids: true,
  sleep: true,
  diaper: true,
};

export const DEFAULT_ACTIVITY_ORDER = ['bottle', 'nursing', 'solids', 'sleep', 'diaper'];

export function normalizeActivityVisibility(value) {
  const base = DEFAULT_ACTIVITY_VISIBILITY;
  if (!value || typeof value !== 'object') {
    return { ...base };
  }
  return {
    bottle: typeof value.bottle === 'boolean' ? value.bottle : base.bottle,
    nursing: typeof value.nursing === 'boolean' ? value.nursing : base.nursing,
    solids: typeof value.solids === 'boolean' ? value.solids : base.solids,
    sleep: typeof value.sleep === 'boolean' ? value.sleep : base.sleep,
    diaper: typeof value.diaper === 'boolean' ? value.diaper : base.diaper,
  };
}

export function normalizeActivityOrder(value) {
  if (!Array.isArray(value)) return DEFAULT_ACTIVITY_ORDER.slice();
  const next = [];
  value.forEach((item) => {
    if (DEFAULT_ACTIVITY_ORDER.includes(item) && !next.includes(item)) {
      next.push(item);
    }
  });
  DEFAULT_ACTIVITY_ORDER.forEach((item) => {
    if (!next.includes(item)) next.push(item);
  });
  return next;
}

export function hasAtLeastOneActivityEnabled(visibility) {
  return Object.values(normalizeActivityVisibility(visibility)).some(Boolean);
}
