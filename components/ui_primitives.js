(function () {
  window.TT = window.TT || {};
  window.TT.ui = window.TT.ui || {};

  function findScrollParent(el) {
    let node = el?.parentElement;
    while (node) {
      const s = window.getComputedStyle(node);
      const oy = s.overflowY;
      if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
    return null;
  }

  function msOrIsoToHHMM(raw) {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  // Smart date logic: if time is >3 hours in future, assume yesterday
  function _hhmmToMsForDate(hhmm, baseMs) {
    if (!hhmm || typeof hhmm !== 'string') return null;
    const parts = hhmm.split(':');
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    const base = new Date(baseMs);
    base.setHours(h, m, 0, 0);
    return base.getTime();
  }

  function _hhmmToMsNearNowSmart(hhmm, nowMs = Date.now(), futureCutoffHours = 3) {
    const ms = _hhmmToMsForDate(hhmm, nowMs);
    if (!ms) return null;
    const cutoff = futureCutoffHours * 3600000;
    return (ms > (nowMs + cutoff)) ? (ms - 86400000) : ms;
  }

  function applyPickedHHMMSmart(rawValue, pickedHHMM) {
    // Use smart logic: if no existing value or it's "now", use smart date inference
    const nowMs = Date.now();
    const existingMs = rawValue ? new Date(rawValue).getTime() : nowMs;
    
    // If existing value is very recent (within last hour), treat as "new entry" and use smart logic
    const isNewEntry = !rawValue || (nowMs - existingMs < 3600000);
    
    if (isNewEntry) {
      // Use smart logic for new entries
      const smartMs = _hhmmToMsNearNowSmart(pickedHHMM, nowMs);
      if (smartMs) {
        return new Date(smartMs).toISOString();
      }
    } else {
      // Preserve existing date for edits
      const base = new Date(rawValue);
      if (isNaN(base.getTime())) return null;
      const [h, m] = pickedHHMM.split(":").map((x) => parseInt(x, 10));
      base.setHours(h, m, 0, 0);
      return base.toISOString();
    }
    return null;
  }

  window.TT.ui.openAnchoredTimePicker = function ({ anchorEl, rawValue, onChange }) {
    if (!anchorEl) return;

    const rect = anchorEl.getBoundingClientRect();

    // iOS Safari: visual viewport offset (keyboard / URL bar / sheets)
    const vv = window.visualViewport;
    const vvOffsetTop = vv?.offsetTop ?? 0;
    const vvOffsetLeft = vv?.offsetLeft ?? 0;

    const input = document.createElement("input");
    input.type = "time";

    const hhmm = msOrIsoToHHMM(rawValue);
    if (hhmm) input.value = hhmm;

    // Anchor exactly over the visible field
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.width = `${Math.max(1, rect.width)}px`;
    input.style.height = `${Math.max(1, rect.height)}px`;
    input.style.left = `${rect.left + vvOffsetLeft}px`;
    input.style.top = `${rect.top + vvOffsetTop}px`;
    input.style.border = "0";
    input.style.padding = "0";
    input.style.margin = "0";
    input.style.zIndex = "2147483647";
    input.style.pointerEvents = "none";

    const scrollParent = findScrollParent(anchorEl);

    const winX = window.scrollX;
    const winY = window.scrollY;
    const parentScrollTop = scrollParent ? scrollParent.scrollTop : null;

    let rafId = null;
    let alive = true;
    let pickedValue = null; // Store the picked value

    const lockScroll = () => {
      if (!alive) return;

      // Lock window scroll
      if (window.scrollX !== winX || window.scrollY !== winY) window.scrollTo(winX, winY);

      // Lock half-sheet scroll container
      if (scrollParent && scrollParent.scrollTop !== parentScrollTop) {
        scrollParent.scrollTop = parentScrollTop;
      }

      rafId = requestAnimationFrame(lockScroll);
    };

    const cleanup = () => {
      alive = false;
      if (rafId) cancelAnimationFrame(rafId);
      input.onchange = null;
      input.onblur = null;
      try { document.body.removeChild(input); } catch {}
    };

    // Store value on change, but don't call onChange yet
    input.onchange = (e) => {
      pickedValue = e.target?.value; // Store "HH:MM" but don't apply yet
    };

    // Only call onChange when picker is dismissed (user pressed Done or Cancel)
    input.onblur = () => {
      cleanup();
      if (pickedValue) {
        // Use smart logic for new entries, preserve date for edits
        const nextIso = applyPickedHHMMSmart(rawValue, pickedValue);
        if (nextIso) onChange(nextIso);
      }
    };

    document.body.appendChild(input);

    // Start scroll lock BEFORE focus/click (prevents scroll jump)
    rafId = requestAnimationFrame(lockScroll);

    // Focus without scroll if supported
    try { input.focus({ preventScroll: true }); } catch { input.focus(); }

    // Open native picker
    if (typeof input.showPicker === "function") {
      try {
        const pickerPromise = input.showPicker();
        if (pickerPromise && typeof pickerPromise.catch === "function") {
          pickerPromise.catch(() => input.click());
        } else {
          input.click();
        }
      } catch {
        input.click();
      }
    } else {
      input.click();
    }

    setTimeout(cleanup, 8000);
  };
})();

