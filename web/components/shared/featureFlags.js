// Shared feature flags (initialize once at startup)

const __ttReadBool = (key, fallback = false) => {
  try {
    const v = localStorage.getItem(key);
    if (v === null || v === undefined) return fallback;
    return v === 'true';
  } catch (e) {
    return fallback;
  }
};

const __ttWriteBool = (key, val) => {
  try {
    localStorage.setItem(key, val ? 'true' : 'false');
  } catch (e) {}
};

if (typeof window !== 'undefined') {
  window.TT = window.TT || {};
  window.TT.shared = window.TT.shared || {};
  window.TT.shared.flags = window.TT.shared.flags || {
    useWheelPickers: {
      get: () => true,
      set: () => {}
    }
  };

  window.TT.shared.flags.useWheelPickers = {
    get: () => __ttReadBool('tt_use_wheel_pickers', true),
    set: (val) => __ttWriteBool('tt_use_wheel_pickers', val)
  };

  window.TT.shared.flags.useAmountStepper = {
    get: () => __ttReadBool('tt_use_amount_stepper', true),
    set: (val) => __ttWriteBool('tt_use_amount_stepper', val)
  };
}
