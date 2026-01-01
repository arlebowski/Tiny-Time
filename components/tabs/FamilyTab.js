const FamilyTab = ({
  user,
  kidId,
  familyId,
  onKidChange,
  kids = [],
  themeKey,
  onThemeChange,
  requestAddChild,
  onRequestAddChildHandled
}) => {
  const [kidData, setKidData] = useState(null);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState({ babyWeight: null, multiplier: 2.5 });
  const [sleepTargetInput, setSleepTargetInput] = useState('');
  const [daySleepStartMin, setDaySleepStartMin] = useState(390);
  const [daySleepEndMin, setDaySleepEndMin] = useState(1170);
  const [sleepSettings, setSleepSettings] = useState(null);
  const [isEditingSleepTarget, setIsEditingSleepTarget] = useState(false);
  const [sleepTargetLastSaved, setSleepTargetLastSaved] = useState('');
  const [sleepTargetDraftOverride, setSleepTargetDraftOverride] = useState(false);
  const [editingDayStart, setEditingDayStart] = useState(false);
  const [editingDayEnd, setEditingDayEnd] = useState(false);
  const [tempDayStartInput, setTempDayStartInput] = useState('');
  const [tempDayEndInput, setTempDayEndInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copying, setCopying] = useState(false);
  const [babyPhotoUrl, setBabyPhotoUrl] = useState(null);

  // Consistent icon-button styling for edit actions (✓ / ✕)
  const TT_ICON_BTN_BASE = "h-10 w-10 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center";
  const TT_ICON_BTN_OK = TT_ICON_BTN_BASE + " text-green-600";
  const TT_ICON_BTN_CANCEL = TT_ICON_BTN_BASE + " text-gray-500";
  const TT_ICON_SIZE = "w-5 h-5";

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState(false);
  const [editingUserName, setEditingUserName] = useState(false);

  // Temp fields
  const [tempBabyName, setTempBabyName] = useState('');
  const [tempBirthDate, setTempBirthDate] = useState('');
  const [tempWeight, setTempWeight] = useState('');
  const [tempMultiplier, setTempMultiplier] = useState('');
  const [tempUserName, setTempUserName] = useState('');

  const fileInputRef = React.useRef(null);

  // Add Child modal state
  const [showAddChild, setShowAddChild] = useState(false);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyWeight, setNewBabyWeight] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState('');
  const [savingChild, setSavingChild] = useState(false);

  const autoSleepTargetHrs = Number(sleepSettings?.sleepTargetAutoHours || 14);
  const sleepTargetOverride = !!sleepSettings?.sleepTargetIsOverride;

  const formatSleepTargetDisplay = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return Number.isInteger(num) ? String(num) : num.toFixed(1);
  };

  // --------------------------------------
  // Data loading
  // --------------------------------------

  useEffect(() => {
    loadData();
  }, [kidId, familyId]);

  useEffect(() => {
    if (requestAddChild) {
      setShowAddChild(true);
      if (onRequestAddChildHandled) {
        onRequestAddChildHandled();
      }
    }
  }, [requestAddChild, onRequestAddChildHandled]);

  useEffect(() => {
    if (!sleepSettings) return;
    const auto = Number(sleepSettings.sleepTargetAutoHours || 14);
    const current = sleepSettings.sleepTargetHours ?? auto;
    const formatted = formatSleepTargetDisplay(current);
    setSleepTargetInput(formatted);
    setSleepTargetLastSaved(formatted);
    setIsEditingSleepTarget(false);
    setSleepTargetDraftOverride(false);
    setDaySleepStartMin(Number(sleepSettings.sleepDayStart ?? 390));
    setDaySleepEndMin(Number(sleepSettings.sleepDayEnd ?? 1170));
  }, [sleepSettings]);

  useEffect(() => {
    if (!editingDayStart) {
      setTempDayStartInput(minutesToTimeValue(daySleepStartMin));
    }
    if (!editingDayEnd) {
      setTempDayEndInput(minutesToTimeValue(daySleepEndMin));
    }
  }, [daySleepStartMin, daySleepEndMin, editingDayStart, editingDayEnd]);

  const minutesToLabel = (m) => {
    const mm = ((Number(m) % 1440) + 1440) % 1440;
    const h24 = Math.floor(mm / 60);
    const min = mm % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = ((h24 + 11) % 12) + 1;
    return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
  };

  const minutesToTimeValue = (m) => {
    const mm = ((Number(m) % 1440) + 1440) % 1440;
    const h24 = Math.floor(mm / 60);
    const min = mm % 60;
    return `${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  };

  const parseTimeInput = (value) => {
    if (!value || typeof value !== "string") return null;
    const [hStr, mStr] = value.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return clamp(h * 60 + m, 0, 1439);
  };

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const saveDaySleepWindow = async (startMin, endMin) => {
    const startVal = clamp(Number(startMin), 0, 1439);
    const endVal = clamp(Number(endMin), 0, 1439);
    setDaySleepStartMin(startVal);
    setDaySleepEndMin(endVal);
    try {
      await firestoreStorage.updateSleepSettings({
        sleepDayStart: startVal,
        sleepDayEnd: endVal,
      });
      setSleepSettings((prev) => ({
        ...(prev || {}),
        sleepDayStart: startVal,
        sleepDayEnd: endVal,
        daySleepStartMinutes: startVal,
        daySleepEndMinutes: endVal
      }));
    } catch (e) {
      console.error("Error saving day sleep window:", e);
    }
  };

  const loadData = async () => {
    if (!kidId) return;
    setLoading(true);
    try {
      const kid = await firestoreStorage.getKidData();
      setKidData(kid);
      if (kid?.photoURL) {
        setBabyPhotoUrl(kid.photoURL);
      }

      const memberList = await firestoreStorage.getMembers();
      setMembers(memberList);

      const settingsData = await firestoreStorage.getSettings();
      if (settingsData) {
        const merged = {
          babyWeight:
            typeof settingsData.babyWeight === 'number'
              ? settingsData.babyWeight
              : null,
          multiplier:
            typeof settingsData.multiplier === 'number'
              ? settingsData.multiplier
              : 2.5,
          themeKey: settingsData.themeKey || themeKey || 'indigo'
        };
        setSettings(merged);

        if (onThemeChange && merged.themeKey && merged.themeKey !== themeKey) {
          onThemeChange(merged.themeKey);
        }
      } else {
        const merged = {
          babyWeight: null,
          multiplier: 2.5,
          themeKey: themeKey || 'indigo'
        };
        setSettings(merged);
      }

      const ss = await firestoreStorage.getSleepSettings();
      if (ss) setSleepSettings(ss);
    } catch (error) {
      console.error('Error loading family tab:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateKidPartial = async (updates) => {
    await firestoreStorage.updateKidData(updates);
  };

  // --------------------------------------
  // Add Child
  // --------------------------------------

  const handleCreateChild = async () => {
    if (!newBabyName.trim()) {
      alert("Please enter your child's name");
      return;
    }
    const weight = parseFloat(newBabyWeight);
    if (!weight || weight <= 0) {
      alert('Please enter a valid weight');
      return;
    }
    if (!newBabyBirthDate) {
      alert('Please enter birth date');
      return;
    }
    if (!familyId) return;

    setSavingChild(true);
    try {
      const birthTimestamp = new Date(newBabyBirthDate).getTime();

      const famDoc = await db.collection("families").doc(familyId).get();
      const famMembers = famDoc.exists && Array.isArray(famDoc.data().members)
        ? famDoc.data().members
        : [user.uid];
      
      const kidRef = await db
        .collection('families')
        .doc(familyId)
        .collection('kids')
        .add({
          name: newBabyName.trim(),
          ownerId: user.uid,
          birthDate: birthTimestamp,
          members: famMembers, // ✅ inherit all family members
          photoURL: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      const newKidId = kidRef.id;
      const defaultTheme = themeKey || 'indigo';

      await db
        .collection('families')
        .doc(familyId)
        .collection('kids')
        .doc(newKidId)
        .collection('settings')
        .doc('default')
        .set({
          babyWeight: weight,
          multiplier: 2.5,
          themeKey: defaultTheme,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      setShowAddChild(false);
      setNewBabyName('');
      setNewBabyWeight('');
      setNewBabyBirthDate('');

      if (typeof onKidChange === 'function') {
        onKidChange(newKidId);
      } else {
        await loadData();
      }
    } catch (err) {
      console.error('Error creating child:', err);
      alert('Failed to create child. Please try again.');
    } finally {
      setSavingChild(false);
    }
  };

  // --------------------------------------
  // Theme handling
  // --------------------------------------

  const handleThemeSelect = async (newThemeKey) => {
    if (!newThemeKey || newThemeKey === settings.themeKey) return;

    const updated = {
      ...settings,
      themeKey: newThemeKey
    };
    setSettings(updated);

    if (onThemeChange) {
      onThemeChange(newThemeKey);
    }

    try {
      await firestoreStorage.saveSettings(updated);
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  };

  // --------------------------------------
  // Updates: name, dates, settings
  // --------------------------------------

  const handleUpdateBabyName = async () => {
    if (!tempBabyName.trim()) return;
    try {
      await updateKidPartial({ name: tempBabyName.trim() });
      setEditingName(false);
      await loadData();
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleUpdateBirthDate = async () => {
    if (!tempBirthDate) return;
    try {
      const [year, month, day] = tempBirthDate.split('-').map((v) => Number(v));
      if (!year || !month || !day) {
        throw new Error('Invalid birth date');
      }
      const birthTimestamp = new Date(year, month - 1, day).getTime();
      await updateKidPartial({ birthDate: birthTimestamp });
      setEditingBirthDate(false);
      await loadData();
    } catch (error) {
      console.error('Error updating birth date:', error);
    }
  };

  const handleUpdateWeight = async () => {
    const weight = parseFloat(tempWeight);
    if (!weight || weight <= 0) return;
    try {
      await firestoreStorage.saveSettings({
        ...settings,
        babyWeight: weight
      });
      setEditingWeight(false);
      await loadData();
    } catch (error) {
      console.error('Error updating weight:', error);
    }
  };

  const handleUpdateMultiplier = async () => {
    const mult = parseFloat(tempMultiplier);
    if (!mult || mult <= 0) return;
    try {
      await firestoreStorage.saveSettings({
        ...settings,
        multiplier: mult
      });
      setEditingMultiplier(false);
      await loadData();
    } catch (error) {
      console.error('Error updating multiplier:', error);
    }
  };

  const handleUpdateUserName = async () => {
    if (!tempUserName.trim()) return;
    try {
      await firestoreStorage.updateUserProfile({ displayName: tempUserName.trim() });
      setEditingUserName(false);
      await loadData();
    } catch (error) {
      console.error('Error updating user name:', error);
    }
  };

  const saveSleepTargetOverride = async () => {
    const hrs = parseFloat(sleepTargetInput);
    const fallback = formatSleepTargetDisplay(autoSleepTargetHrs);

    if (!hrs || hrs <= 0) {
      alert('Please enter a valid daily sleep target.');
      setSleepTargetInput(fallback);
      return;
    }

    const isSameAsAuto = Math.abs(hrs - autoSleepTargetHrs) < 0.05;

    try {
      if (isSameAsAuto) {
        await firestoreStorage.setSleepTargetOverride(kidId, null);
      } else {
        await firestoreStorage.setSleepTargetOverride(kidId, hrs);
      }
      await loadData();
    } catch (error) {
      console.error('Error saving sleep target override:', error);
    }
  };

  const handleRevertSleepTarget = async () => {
    try {
      await firestoreStorage.setSleepTargetOverride(kidId, null);
      await loadData();
      setIsEditingSleepTarget(false);
      setSleepTargetDraftOverride(false);
    } catch (error) {
      console.error('Error reverting to recommended sleep target:', error);
    }
  };

  // --------------------------------------
  // Photo upload + compression (max ~2MB)
  // --------------------------------------

  const compressImage = (file, maxSizeKB = 2048) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const maxDimension = 1200;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const getApproxBytes = (b64) => Math.ceil((b64.length * 3) / 4);
          const maxBytes = maxSizeKB * 1024;

          let quality = 0.9;
          let base64 = canvas.toDataURL('image/jpeg', quality);
          let approxBytes = getApproxBytes(base64);

          while (approxBytes > maxBytes && quality > 0.3) {
            quality -= 0.1;
            base64 = canvas.toDataURL('image/jpeg', quality);
            approxBytes = getApproxBytes(base64);
          }

          resolve(base64);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const compressedBase64 = await compressImage(file, 2048);
      await firestoreStorage.uploadKidPhoto(compressedBase64);
      await loadData();
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    }
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // --------------------------------------
  // Invite / members
  // --------------------------------------

const handleInvite = async () => {
  const resolvedKidId = kidId || (kids && kids.length ? kids[0].id : null);

  if (!familyId || !resolvedKidId) {
    alert("Something went wrong. Try refreshing.");
    return;
  }

  let link;

  // ---- ONLY invite creation can fail ----
  try {
    const code = await createInvite(familyId, resolvedKidId);
    link = `${window.location.origin}${window.location.pathname}?invite=${code}`;
  } catch (err) {
    console.error("Invite creation failed:", err);
    alert("Failed to create invite");
    return;
  }

  // ---- Optional UX only ----
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Join Tiny Tracker",
        text: "Join our family on Tiny Tracker:",
        url: link
      });
      return; // shared successfully
    } catch {
      return; // user cancelled → STOP here
    }
  }

  // Only reach here if share is NOT supported
  setInviteLink(link);
  setShowInvite(true);
};

  const handleCopyLink = async () => {
    if (!inviteLink) return;
  
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      // Safari fallback that always works
      window.prompt("Copy this invite link:", inviteLink);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Remove this person's access?")) return;
    try {
      await removeMember(familyId, kidId, memberId);
      await loadData();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  // --------------------------------------
  // Render
  // --------------------------------------

  if (loading) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement('div', { className: 'text-gray-600' }, 'Loading...')
    );
  }

  const isOwner = kidData?.ownerId === user.uid;
  const activeThemeKey = settings.themeKey || themeKey || 'indigo';

  // Day sleep window (slider UI)
  // Anything that STARTS inside this window is counted as Day Sleep (naps). Everything else = Night Sleep.
  // Saved to Firebase on drag end (touchEnd/mouseUp) to avoid spamming writes.
  const dayStart = clamp(daySleepStartMin, 0, 1439);
  const dayEnd = clamp(daySleepEndMin, 0, 1439);
  const startPct = (dayStart / 1440) * 100;
  const endPct = (dayEnd / 1440) * 100;
  const leftPct = Math.min(startPct, endPct);
  const widthPct = Math.abs(endPct - startPct);

  const DaySleepWindowCard = React.createElement(
    "div",
    { className: "mt-5" },
    React.createElement(
      "div",
      { className: "flex items-start justify-between gap-3" },
      React.createElement(
        "div",
        null,
        React.createElement("div", { className: "text-sm font-semibold text-gray-800" }, "Day sleep window"),
        React.createElement(
          "div",
          { className: "text-sm text-gray-500 mt-1" },
          "Sleep that starts between these times counts as ",
          React.createElement("span", { className: "font-medium text-gray-700" }, "Day Sleep"),
          " (naps). Everything else counts as ",
          React.createElement("span", { className: "font-medium text-gray-700" }, "Night Sleep"),
          "."
        )
      )
    ),
    // Start/End “editable boxes”
    React.createElement(
      "div",
      { className: "grid grid-cols-2 gap-3 mt-4 items-start min-w-0" },

      // Start (match the affordance style used above in settings rows)
      React.createElement(
        "div",
        {
          className: "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 min-w-0 overflow-hidden",
          onClick: editingDayStart
            ? undefined
            : () => {
                setEditingDayStart(true);
                setTempDayStartInput(minutesToTimeValue(dayStart));
              }
        },
        React.createElement(
          "div",
          { className: "text-xs font-medium text-gray-500" },
          "Start"
        ),
        editingDayStart
          ? React.createElement(
              "div",
              // single grid controls both input + actions so edges ALWAYS match
              { className: "mt-2 grid grid-cols-2 gap-2 w-full" },
              React.createElement("input", {
                type: "time",
                value: tempDayStartInput,
                onChange: (e) => setTempDayStartInput(e.target.value),
                // Force the time input to obey the grid width on iOS
                className: "col-span-2 block w-full max-w-full min-w-0 box-border appearance-none bg-white px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm",
                // iOS Safari: hard-force intrinsic control sizing
                style: { width: "100%", maxWidth: "100%", minWidth: 0, WebkitAppearance: "none", appearance: "none" }
              }),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    const mins = parseTimeInput(tempDayStartInput);
                    if (mins == null) {
                      alert("Please enter a valid start time.");
                      return;
                    }
                    setDaySleepStartMin(mins);
                    saveDaySleepWindow(mins, daySleepEndMin);
                    setEditingDayStart(false);
                  },
                  className: `${TT_ICON_BTN_OK} w-full`,
                  type: "button"
                },
                React.createElement(Check, { className: TT_ICON_SIZE })
              ),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    setTempDayStartInput(minutesToTimeValue(dayStart));
                    setEditingDayStart(false);
                  },
                  className: `${TT_ICON_BTN_CANCEL} w-full`,
                  type: "button"
                },
                React.createElement(X, { className: TT_ICON_SIZE })
              )
            )
          : React.createElement(
              "div",
              { className: "flex items-center justify-between mt-1" },
              React.createElement(
                "div",
                { className: "text-base font-semibold text-gray-900" },
                minutesToLabel(dayStart)
              ),
              React.createElement(Edit2, {
                className: "w-4 h-4 text-indigo-600"
              })
            )
      ),

      // End (match the affordance style used above in settings rows)
      React.createElement(
        "div",
        {
          className: "rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 min-w-0 overflow-hidden",
          onClick: editingDayEnd
            ? undefined
            : () => {
                setEditingDayEnd(true);
                setTempDayEndInput(minutesToTimeValue(dayEnd));
              }
        },
        React.createElement(
          "div",
          { className: "text-xs font-medium text-gray-500" },
          "End"
        ),
        editingDayEnd
          ? React.createElement(
              "div",
              // single grid controls both input + actions so edges ALWAYS match
              { className: "mt-2 grid grid-cols-2 gap-2 w-full" },
              React.createElement("input", {
                type: "time",
                value: tempDayEndInput,
                onChange: (e) => setTempDayEndInput(e.target.value),
                // Force the time input to obey the grid width on iOS
                className: "col-span-2 block w-full max-w-full min-w-0 box-border appearance-none bg-white px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm",
                // iOS Safari: hard-force intrinsic control sizing
                style: { width: "100%", maxWidth: "100%", minWidth: 0, WebkitAppearance: "none", appearance: "none" }
              }),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    const mins = parseTimeInput(tempDayEndInput);
                    if (mins == null) {
                      alert("Please enter a valid end time.");
                      return;
                    }
                    setDaySleepEndMin(mins);
                    saveDaySleepWindow(daySleepStartMin, mins);
                    setEditingDayEnd(false);
                  },
                  className: `${TT_ICON_BTN_OK} w-full`,
                  type: "button"
                },
                React.createElement(Check, { className: TT_ICON_SIZE })
              ),
              React.createElement(
                "button",
                {
                  onClick: () => {
                    setTempDayEndInput(minutesToTimeValue(dayEnd));
                    setEditingDayEnd(false);
                  },
                  className: `${TT_ICON_BTN_CANCEL} w-full`,
                  type: "button"
                },
                React.createElement(X, { className: TT_ICON_SIZE })
              )
            )
          : React.createElement(
              "div",
              { className: "flex items-center justify-between mt-1" },
              React.createElement(
                "div",
                { className: "text-base font-semibold text-gray-900" },
                minutesToLabel(dayEnd)
              ),
              React.createElement(Edit2, {
                className: "w-4 h-4 text-indigo-600"
              })
            )
      )
    ),
    // Slider track + selection + handles
    React.createElement(
      "div",
      { className: "mt-4" },
      React.createElement(
        "div",
        { className: "relative h-12 rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 day-sleep-slider" },
        React.createElement("div", { className: "absolute inset-y-0", style: { left: `${leftPct}%`, width: `${widthPct}%`, background: "rgba(99,102,241,0.25)" } }),
        // left handle visual
        React.createElement("div", { className: "absolute top-1/2 -translate-y-1/2 w-3 h-8 rounded-full bg-white shadow-sm border border-gray-200", style: { left: `calc(${startPct}% - 6px)`, pointerEvents: "none" } }),
        // right handle visual
        React.createElement("div", { className: "absolute top-1/2 -translate-y-1/2 w-3 h-8 rounded-full bg-white shadow-sm border border-gray-200", style: { left: `calc(${endPct}% - 6px)`, pointerEvents: "none" } }),
        // two range inputs layered (one controls start, one controls end)
        React.createElement("input", {
          type: "range",
          min: 0,
          max: 1439,
          value: daySleepStartMin,
          onChange: (e) => setDaySleepStartMin(Number(e.target.value)),
          onMouseUp: (e) => saveDaySleepWindow(Number(e.target.value), daySleepEndMin),
          onTouchEnd: (e) => saveDaySleepWindow(Number(e.target.value), daySleepEndMin),
          className: "absolute inset-0 w-full h-full opacity-0"
        }),
        React.createElement("input", {
          type: "range",
          min: 0,
          max: 1439,
          value: daySleepEndMin,
          onChange: (e) => setDaySleepEndMin(Number(e.target.value)),
          onMouseUp: (e) => saveDaySleepWindow(daySleepStartMin, Number(e.target.value)),
          onTouchEnd: (e) => saveDaySleepWindow(daySleepStartMin, Number(e.target.value)),
          className: "absolute inset-0 w-full h-full opacity-0"
        })
      ),
      React.createElement(
        "div",
        { className: "flex justify-between text-xs text-gray-400 mt-2 px-3 select-none" },
        React.createElement("span", null, "6AM"),
        React.createElement("span", null, "9AM"),
        React.createElement("span", null, "12PM"),
        React.createElement("span", null, "3PM"),
        React.createElement("span", null, "6PM"),
        React.createElement("span", null, "9PM")
      )
    )
  );

  return React.createElement(
    'div',
    { className: 'space-y-4 relative' },

    // Hidden file input
    React.createElement('input', {
      ref: fileInputRef,
      type: 'file',
      accept: 'image/*',
      onChange: handlePhotoChange,
      style: { display: 'none' }
    }),

    // Kids Card (multi-kid)
    kids && kids.length > 0 &&
      React.createElement(
        'div',
        { className: 'bg-white rounded-2xl shadow-lg p-6' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-3' },
          React.createElement(
            'h2',
            { className: 'text-lg font-semibold text-gray-800' },
            'Kids'
          ),
          React.createElement(
            'button',
            {
              type: 'button',
              onClick: () => setShowAddChild(true),
              className: 'text-sm font-medium text-indigo-600 hover:text-indigo-700'
            },
            '+ Add Child'
          )
        ),
        React.createElement(
          'div',
          { className: 'space-y-2' },
          kids.map((k) => {
            const isCurrent = k.id === kidId;
            return React.createElement(
              'button',
              {
                key: k.id,
                onClick: () => {
                  if (isCurrent) return;
                  if (typeof onKidChange === 'function') {
                    onKidChange(k.id);
                  }
                },
                className:
                  'w-full px-4 py-3 rounded-xl border flex items-center justify-between text-sm ' +
                  (isCurrent
                    ? 'border-indigo-500 bg-indigo-50 text-gray-900'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100')
              },
              React.createElement(
                'span',
                { className: 'font-medium truncate' },
                k.name || 'Baby'
              ),
              isCurrent &&
                React.createElement(
                  'span',
                  { className: 'text-xs font-semibold text-indigo-600' },
                  'Active'
                )
            );
          })
        ),
        React.createElement(
          'p',
          { className: 'mt-3 text-xs text-gray-500' },
          'Active kid controls what you see in Tracker, Analytics, and AI Chat.'
        )
      ),

    // Baby Info Card
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl shadow-lg p-6' },
      React.createElement(
        'h2',
        { className: 'text-lg font-semibold text-gray-800 mb-4' },
        'Baby Info'
      ),

      React.createElement(
        'div',
        { className: 'flex items-start gap-4 mb-6' },
        // Photo
        React.createElement(
          'div',
          { className: 'relative flex-shrink-0 cursor-pointer', onClick: handlePhotoClick },
          React.createElement(
            'div',
            {
              className:
                'w-24 h-24 rounded-full overflow-hidden bg-gray-100 cursor-pointer hover:opacity-80 transition relative'
            },
            babyPhotoUrl
              ? React.createElement('img', {
                  src: babyPhotoUrl,
                  alt: kidData?.name || 'Baby',
                  className: 'w-full h-full object-cover'
                })
              : React.createElement(
                  'div',
                  {
                    className:
                      'w-full h-full flex items-center justify-center bg-indigo-100'
                  },
                  React.createElement(Baby, {
                    className: 'w-12 h-12 text-indigo-600'
                  })
                )
          ),
          React.createElement(
            'div',
            {
              className:
                'absolute bottom-0 right-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center border-2 border-white cursor-pointer',
              onClick: (e) => { e.stopPropagation(); handlePhotoClick(); }
            },
            React.createElement(Camera, { className: 'w-4 h-4 text-white' })
          )
        ),

        // Name + age + owner
        React.createElement(
          'div',
          { className: 'flex-1 space-y-2 min-w-0' },

          // Name row
          editingName
            ? React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement('input', {
                  type: 'text',
                  value: tempBabyName,
                  onChange: (e) => setTempBabyName(e.target.value),
                  className:
                    'flex-1 px-3 py-2 text-lg font-medium border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500',
                  style: { minWidth: 0 }
                }),
                React.createElement(
                  'button',
                  {
                    onClick: handleUpdateBabyName,
                    className: TT_ICON_BTN_OK
                  },
                  React.createElement(Check, { className: TT_ICON_SIZE })
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => setEditingName(false),
                    className: TT_ICON_BTN_CANCEL
                  },
                  React.createElement(X, { className: TT_ICON_SIZE })
                )
              )
            : React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement(
                  'h3',
                  {
                    className:
                      'text-lg font-semibold text-gray-800 truncate'
                  },
                  kidData?.name || 'Baby'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => {
                      setTempBabyName(kidData?.name || '');
                      setEditingName(true);
                    },
                    className: 'text-indigo-600 hover:text-indigo-700'
                  },
                  React.createElement(Edit2, { className: 'w-4 h-4' })
                )
              ),

          // Age
          React.createElement(
            'div',
            { className: 'text-sm text-gray-500' },
            kidData?.birthDate
              ? (() => {
                  const today = new Date();
                  const birth = new Date(kidData.birthDate);
                  const diffMs = today.getTime() - birth.getTime();
                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  if (diffDays < 7) return `${diffDays} days old`;
                  if (diffDays < 30)
                    return `${Math.floor(diffDays / 7)} weeks old`;
                  const months = Math.floor(diffDays / 30);
                  return `${months} month${months === 1 ? '' : 's'} old`;
                })()
              : 'Birth date not set'
          ),

          // Owner display / your name
          React.createElement(
            'div',
            { className: 'mt-1 text-sm text-gray-500' },
            'Owner: ',
            editingUserName
              ? React.createElement(
                  'span',
                  null,
                  React.createElement('input', {
                    type: 'text',
                    value: tempUserName,
                    onChange: (e) => setTempUserName(e.target.value),
                    className:
                      'px-2 py-1 text-sm border-2 border-indigo-300 rounded-lg focus:outline-none focus:border-indigo-500'
                  }),
                  React.createElement(
                    'button',
                    {
                      onClick: handleUpdateUserName,
                      className:
                        'ml-2 text-green-600 hover:text-green-700'
                    },
                    React.createElement(Check, { className: 'w-4 h-4' })
                  ),
                  React.createElement(
                    'button',
                    {
                      onClick: () => setEditingUserName(false),
                      className: 'ml-1 text-gray-400 hover:text-gray-600'
                    },
                    React.createElement(X, { className: 'w-4 h-4' })
                  )
                )
              : React.createElement(
                  'span',
                  null,
                  kidData?.ownerName || 'You',
                  isOwner &&
                    React.createElement(
                      'button',
                      {
                        onClick: () => {
                          setTempUserName(kidData?.ownerName || '');
                          setEditingUserName(true);
                        },
                        className:
                          'ml-2 text-indigo-600 hover:text-indigo-700'
                      },
                      'Edit'
                    )
                )
          )
        )
      ),

      // Baby info rows (mobile-friendly: full-width tappable rows)
      React.createElement(
        'div',
        { className: 'space-y-2 mb-3' },
        // Birth date
        React.createElement(
          'div',
          {
            className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3',
            onClick: editingBirthDate
              ? undefined
              : () => {
                  if (kidData?.birthDate) {
                    const d = new Date(kidData.birthDate);
                    const iso = d.toISOString().slice(0, 10);
                    setTempBirthDate(iso);
                  } else {
                    setTempBirthDate('');
                  }
                  setEditingBirthDate(true);
                }
          },
          React.createElement(
            'div',
            { className: 'text-xs font-medium text-gray-500' },
            'Birth date'
          ),
          editingBirthDate
            ? React.createElement(
                'div',
                { className: 'flex items-center gap-2 mt-2' },
                React.createElement('input', {
                  type: 'date',
                  value: tempBirthDate,
                  onChange: (e) => setTempBirthDate(e.target.value),
                  className:
                    'flex-1 px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm'
                }),
                React.createElement(
                  'button',
                  {
                    onClick: handleUpdateBirthDate,
                    className: TT_ICON_BTN_OK
                  },
                  React.createElement(Check, { className: TT_ICON_SIZE })
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => setEditingBirthDate(false),
                    className: TT_ICON_BTN_CANCEL
                  },
                  React.createElement(X, { className: TT_ICON_SIZE })
                )
              )
            : React.createElement(
                'div',
                { className: 'flex items-center justify-between mt-1' },
                React.createElement(
                  'div',
                  { className: 'text-base font-semibold text-gray-900' },
                  kidData?.birthDate
                    ? new Date(kidData.birthDate).toLocaleDateString()
                    : 'Not set'
                ),
                React.createElement(Edit2, {
                  className: 'w-4 h-4 text-indigo-600'
                })
              )
        ),
        // Current weight
        React.createElement(
          'div',
          {
            className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3',
            onClick: editingWeight
              ? undefined
              : () => {
                  setTempWeight(settings.babyWeight?.toString() || '');
                  setEditingWeight(true);
                }
          },
          React.createElement(
            'div',
            { className: 'text-xs font-medium text-gray-500' },
            'Current weight'
          ),
          editingWeight
            ? React.createElement(
                'div',
                { className: 'flex items-center gap-2 mt-2' },
                React.createElement('input', {
                  type: 'number',
                  step: '0.1',
                  value: tempWeight,
                  onChange: (e) => setTempWeight(e.target.value),
                  placeholder: '8.5',
                  className:
                    'w-28 px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm text-right'
                }),
                React.createElement(
                  'span',
                  { className: 'text-gray-600' },
                  'lbs'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: handleUpdateWeight,
                    className: TT_ICON_BTN_OK
                  },
                  React.createElement(Check, { className: TT_ICON_SIZE })
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => setEditingWeight(false),
                    className: TT_ICON_BTN_CANCEL
                  },
                  React.createElement(X, { className: TT_ICON_SIZE })
                )
              )
            : React.createElement(
                'div',
                { className: 'flex items-center justify-between mt-1' },
                React.createElement(
                  'div',
                  { className: 'text-base font-semibold text-gray-900' },
                  settings.babyWeight ? `${settings.babyWeight} lbs` : 'Not set'
                ),
                React.createElement(Edit2, {
                  className: 'w-4 h-4 text-indigo-600'
                })
              )
        )
      ),
      // Target multiplier (full-width row)
      React.createElement(
        'div',
        {
          className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 mt-2',
          onClick: editingMultiplier
            ? undefined
            : () => {
                setTempMultiplier(settings.multiplier?.toString() || '2.5');
                setEditingMultiplier(true);
              }
        },
        React.createElement(
          'div',
          { className: 'flex items-center' },
          React.createElement(
            'div',
            { className: 'text-xs font-medium text-gray-500' },
            'Target multiplier (oz/lb)'
          ),
          React.createElement(InfoDot, {
            onClick: (e) => {
              if (e && e.stopPropagation) e.stopPropagation();
              alert(
                'Target multiplier (oz/lb)\n\n' +
                  'This is used to estimate a daily feeding target:\n' +
                  'weight (lb) × multiplier (oz/lb).\n\n' +
                  'Common rule-of-thumb for formula is ~2.5 oz per lb per day, but needs vary. If your pediatrician gave you a different plan, use that.'
              );
            }
          })
        ),
        editingMultiplier
          ? React.createElement(
              'div',
              { className: 'flex items-center gap-2 mt-2' },
              React.createElement('input', {
                type: 'number',
                step: '0.1',
                value: tempMultiplier,
                onChange: (e) => setTempMultiplier(e.target.value),
                placeholder: '2.5',
                className:
                  'w-28 px-3 py-2 border-2 border-indigo-300 rounded-lg text-sm text-right'
              }),
              React.createElement(
                'span',
                { className: 'text-gray-600' },
                'x'
              ),
              React.createElement(
                'button',
                {
                  onClick: handleUpdateMultiplier,
                  className: TT_ICON_BTN_OK
                },
                React.createElement(Check, { className: TT_ICON_SIZE })
              ),
              React.createElement(
                'button',
                {
                  onClick: () => setEditingMultiplier(false),
                  className: TT_ICON_BTN_CANCEL
                },
                React.createElement(X, { className: TT_ICON_SIZE })
              )
            )
          : React.createElement(
              'div',
              { className: 'flex items-center justify-between mt-1' },
              React.createElement(
                'div',
                { className: 'text-base font-semibold text-gray-900' },
                `${settings.multiplier}x`
              ),
              React.createElement(Edit2, {
                className: 'w-4 h-4 text-indigo-600'
              })
            )
      ),

      sleepSettings && React.createElement('div', { className: "mt-4 pt-4 border-t border-gray-100" },
        React.createElement('div', { className: "text-base font-semibold text-gray-800 mb-2" }, 'Sleep settings'),
        React.createElement( 'div', { className: 'rounded-xl border border-gray-200 bg-gray-50 px-4 py-3', onClick: isEditingSleepTarget ? undefined : () => { setIsEditingSleepTarget(true); } },
          React.createElement('div', { className: "flex items-center" },
            React.createElement('div', { className: "text-xs font-medium text-gray-500" }, 'Daily sleep target (hrs)'),
            React.createElement(InfoDot, { onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); alert( "Daily sleep target\n\n" + "We auto-suggest a target based on age using widely cited pediatric sleep recommendations for total sleep per 24 hours (including naps).\n\n" + "If your baby’s clinician suggested a different target, you can override it here." ); } })
          ),
          isEditingSleepTarget ? React.createElement('div', { className: "flex items-center gap-3 mt-2" },
            React.createElement('input', {
              type: 'number',
              inputMode: 'decimal',
              value: sleepTargetInput,
              onChange: (e) => {
                const v = e.target.value;
                setSleepTargetInput(v);
                const n = parseFloat(v);
                if (!n || n <= 0) {
                  setSleepTargetDraftOverride(false);
                  return;
                }
                setSleepTargetDraftOverride(Math.abs(n - autoSleepTargetHrs) >= 0.05);
              },
              onFocus: () => {
                const n = parseFloat(sleepTargetInput);
                if (!n || n <= 0) setSleepTargetDraftOverride(false);
                else setSleepTargetDraftOverride(Math.abs(n - autoSleepTargetHrs) >= 0.05);
              },
              className: "w-28 h-10 px-3 rounded-lg border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-indigo-300",
              step: "0.1",
              min: "0"
            }),
            React.createElement('button', { type: 'button', disabled: !sleepTargetDraftOverride && (sleepTargetInput === sleepTargetLastSaved), onClick: async () => { await saveSleepTargetOverride(); setSleepTargetLastSaved(sleepTargetInput); setIsEditingSleepTarget(false); }, className: TT_ICON_BTN_OK }, React.createElement(Check, { className: TT_ICON_SIZE })),
            React.createElement('button', { type: 'button', onClick: () => { setSleepTargetInput(sleepTargetLastSaved || formatSleepTargetDisplay(autoSleepTargetHrs)); setSleepTargetDraftOverride(false); setIsEditingSleepTarget(false); }, className: TT_ICON_BTN_CANCEL }, React.createElement(X, { className: TT_ICON_SIZE }))
          ) : React.createElement( 'div', { className: 'flex items-center justify-between mt-1' },
            React.createElement( 'div', { className: 'text-base font-semibold text-gray-900' }, sleepTargetInput || formatSleepTargetDisplay(autoSleepTargetHrs) ),
            React.createElement(Edit2, { className: 'w-4 h-4 text-indigo-600' })
          )
        ),
        sleepSettings?.sleepTargetIsOverride && Math.abs(Number(sleepSettings.sleepTargetHours ?? 0) - Number(sleepSettings.sleepTargetAutoHours ?? 0)) >= 0.05 && React.createElement('div', { className: "flex items-center justify-between mt-2 text-xs text-gray-600" },
          React.createElement('div', null, `Recommended: ${formatSleepTargetDisplay(sleepSettings.sleepTargetAutoHours)} hrs`),
          React.createElement('button', { type: 'button', onClick: handleRevertSleepTarget, className: "text-indigo-600 font-medium" }, 'Revert to recommended')
        ),
        DaySleepWindowCard
      ),

      // Theme picker
      React.createElement(
        'div',
        { className: 'mt-6 pt-4 border-t border-gray-100' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between mb-3' },
          React.createElement(
            'span',
            { className: 'text-base font-semibold text-gray-800' },
            'App Color'
          ),
          React.createElement(
            'span',
            { className: 'text-xs text-gray-500' },
            'Applies to top bar & tabs'
          )
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-3' },
          Object.keys(KID_THEMES).map((key) =>
            React.createElement(
              'button',
              {
                key,
                type: 'button',
                onClick: () => handleThemeSelect(key),
                className:
                  'w-9 h-9 rounded-full border-2 flex items-center justify-center ' +
                  (activeThemeKey === key
                    ? 'border-indigo-600'
                    : 'border-transparent'),
                style: {
                  backgroundColor: KID_THEMES[key].bg
                }
              },
              activeThemeKey === key
                ? React.createElement('div', {
                    className: 'w-4 h-4 rounded-full',
                    style: { backgroundColor: KID_THEMES[key].accent }
                  })
                : null
            )
          )
        )
      )
    ),

    // Family Members Card
    React.createElement(
      'div',
      { className: 'bg-white rounded-2xl shadow-lg p-6' },
      React.createElement(
        'h2',
        { className: 'text-lg font-semibold text-gray-800 mb-4' },
        'Family Members'
      ),
      React.createElement(
        'div',
        { className: 'space-y-3 mb-4' },
        members.map((member) =>
          React.createElement(
            'div',
            {
              key: member.uid,
              className:
                'flex items-center gap-3 p-3 bg-gray-50 rounded-xl'
            },
            React.createElement(
              'div',
              { className: 'flex-shrink-0' },
              member.photoURL
                ? React.createElement('img', {
                    src: member.photoURL,
                    alt: member.displayName || member.email,
                    className: 'w-12 h-12 rounded-full'
                  })
                : React.createElement(
                    'div',
                    {
                      className:
                        'w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold'
                    },
                    (member.displayName || member.email || '?')
                      .charAt(0)
                      .toUpperCase()
                  )
            ),
            React.createElement(
              'div',
              { className: 'flex-1 min-w-0' },
              React.createElement(
                'div',
                { className: 'text-sm font-medium text-gray-800 truncate' },
                member.displayName || member.email || 'Member'
              ),
              React.createElement(
                'div',
                { className: 'text-xs text-gray-500 truncate' },
                member.email
              )
            ),
            member.uid !== user.uid &&
              React.createElement(
                'button',
                {
                  onClick: () => handleRemoveMember(member.uid),
                  className:
                    'text-xs text-red-500 hover:text-red-600 font-medium'
                },
                'Remove'
              )
          )
        )
      ),
      React.createElement(
        'button',
        {
          onClick: handleInvite,
          className:
            'w-full mt-1 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2 py-3'
        },
        React.createElement(UserPlus, { className: 'w-5 h-5' }),
        '+ Invite Partner'
      )
    ),

    // Invite link panel
    showInvite &&
      React.createElement(
        'div',
        { className: 'bg-indigo-50 rounded-2xl p-4' },
        React.createElement(
          'div',
          { className: 'text-sm text-gray-600 mb-2' },
          'Share this link with your partner:'
        ),
        React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement('input', {
            type: 'text',
            value: inviteLink,
            readOnly: true,
            className:
              'flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm'
          }),
          React.createElement(
            'button',
            {
              onClick: handleCopyLink,
              className:
                'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium'
            },
            copying ? 'Copied!' : 'Copy'
          )
        ),
        React.createElement(
          'button',
          {
            onClick: () => setShowInvite(false),
            className:
              'mt-2 text-sm text-gray-600 hover:text-gray-800'
          },
          'Close'
        )
      ),

    // Add Child Modal
    showAddChild &&
      React.createElement(
        'div',
        {
          className:
            'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4'
        },
        React.createElement(
          'div',
          {
            className:
              'bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm'
          },
          React.createElement(
            'h2',
            { className: 'text-lg font-semibold text-gray-800 mb-2' },
            'Add Child'
          ),
          React.createElement(
            'p',
            { className: 'text-xs text-gray-500 mb-4' },
            'This child will share the same family and members.'
          ),
          React.createElement(
            'div',
            { className: 'space-y-3' },
            React.createElement(
              'div',
              null,
              React.createElement(
                'label',
                {
                  className:
                    'block text-xs font-medium text-gray-700 mb-1'
                },
                "Child's Name"
              ),
              React.createElement('input', {
                type: 'text',
                value: newBabyName,
                onChange: (e) => setNewBabyName(e.target.value),
                className:
                  'w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400'
              })
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-3 min-w-0' }, // FIX: Prevent grid overflow on mobile
              React.createElement(
                'div',
                null,
                React.createElement(
                  'label',
                  {
                    className:
                      'block text-xs font-medium text-gray-700 mb-1'
                  },
                  'Weight (lbs)'
                ),
                React.createElement('input', {
                  type: 'number',
                  step: '0.1',
                  value: newBabyWeight,
                  onChange: (e) => setNewBabyWeight(e.target.value),
                  className:
                    'w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400'
                })
              ),
              React.createElement(
                'div',
                { className: 'min-w-0' }, // FIX: Prevent date input overflow on mobile - allow grid item to shrink
                React.createElement(
                  'label',
                  {
                    className:
                      'block text-xs font-medium text-gray-700 mb-1'
                  },
                  'Birth date'
                ),
                React.createElement('input', {
                  type: 'date',
                  value: newBabyBirthDate,
                  onChange: (e) => setNewBabyBirthDate(e.target.value),
                  className:
                    'w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400'
                })
              )
            )
          ),
          React.createElement(
            'div',
            { className: 'mt-5 flex justify-end gap-3' },
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: () => setShowAddChild(false),
                className:
                  'text-sm text-gray-600 hover:text-gray-800'
              },
              'Cancel'
            ),
            React.createElement(
              'button',
              {
                type: 'button',
                onClick: handleCreateChild,
                disabled: savingChild,
                className:
                  'px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50'
              },
              savingChild ? 'Saving...' : 'Add Child'
            )
          )
        )
      )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.FamilyTab = FamilyTab;
