const FOOD_ICON_ASSETS = {
  bamba: require('../../assets/icons/bamba.png'),
  hummus: require('../../assets/icons/hummus.png'),
};

export const resolveFoodIconAsset = (icon) => {
  if (!icon) return null;
  return FOOD_ICON_ASSETS[String(icon).toLowerCase()] || null;
};

