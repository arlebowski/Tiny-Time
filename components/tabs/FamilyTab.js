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
  const [sleepTargetInput, setSleepTargetInput] = useState(null);
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
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const TTCardHeader = window.TT?.shared?.TTCardHeader || window.TTCardHeader;
  const TTInputRow = window.TT?.shared?.TTInputRow || window.TTInputRow;
  const DatePickerTray = window.TT?.shared?.pickers?.DatePickerTray || null;
  const TimePickerTray = window.TT?.shared?.pickers?.TimePickerTray || null;
  const TTEditIcon = window.TT?.shared?.icons?.Edit2 || window.Edit2;

  // Consistent icon-button styling for edit actions (✓ / ✕)
  const TT_ICON_BTN_BASE =
    "h-10 w-10 rounded-lg border flex items-center justify-center transition " +
    "border-[var(--tt-card-border)] bg-[var(--tt-card-bg)] hover:bg-[var(--tt-subtle-surface)]";
  const TT_ICON_BTN_OK = TT_ICON_BTN_BASE + " text-green-600";
  const TT_ICON_BTN_CANCEL = TT_ICON_BTN_BASE + " text-[var(--tt-text-tertiary)]";
  const TT_ICON_SIZE = "w-5 h-5";

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState(false);

  // Temp fields
  const [tempBabyName, setTempBabyName] = useState(null);
  const [tempBirthDate, setTempBirthDate] = useState('');
  const [tempWeight, setTempWeight] = useState(null);
  const [tempMultiplier, setTempMultiplier] = useState(null);

  const fileInputRef = React.useRef(null);
  // Add Child modal state
  const [showAddChild, setShowAddChild] = useState(false);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyWeight, setNewBabyWeight] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState('');
  const [savingChild, setSavingChild] = useState(false);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [showDayStartPicker, setShowDayStartPicker] = useState(false);
  const [showDayEndPicker, setShowDayEndPicker] = useState(false);

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

  const dateStringToIso = (value) => {
    if (!value) return null;
    try {
      return new Date(`${value}T12:00:00`).toISOString();
    } catch {
      return null;
    }
  };

  const isoToDateString = (value) => {
    if (!value) return '';
    try {
      return new Date(value).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const timeValueToIso = (value) => {
    const mins = parseTimeInput(value);
    if (mins == null) return null;
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setMinutes(mins);
    return d.toISOString();
  };

  const isoToMinutes = (value) => {
    if (!value) return null;
    try {
      const d = new Date(value);
      return d.getHours() * 60 + d.getMinutes();
    } catch {
      return null;
    }
  };

  const formatAgeFromDate = (birthDate) => {
    if (!birthDate) return '';
    const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return '';
    const today = new Date();
    const diffMs = today.getTime() - birth.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '';
    if (diffDays < 7) return `${diffDays} days old`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks old`;
    const months = Math.floor(diffDays / 30);
    return `${months} month${months === 1 ? '' : 's'} old`;
  };

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

        // Note: onThemeChange callback removed - themeKey no longer affects global appearance
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

  const saveBirthDateFromIso = async (iso) => {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return;
      const birthTimestamp = d.getTime();
      await updateKidPartial({ birthDate: birthTimestamp });
      await loadData();
    } catch (error) {
      console.error('Error updating birth date:', error);
    }
  };

  const handleWeightChange = (nextValue) => {
    if (!editingWeight) setEditingWeight(true);
    setTempWeight(nextValue);
  };

  const handleMultiplierChange = (nextValue) => {
    if (!editingMultiplier) setEditingMultiplier(true);
    setTempMultiplier(nextValue);
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
  // Updates: name, dates, settings
  // --------------------------------------

  const handleBabyNameChange = (nextValue) => {
    if (!editingName) setEditingName(true);
    setTempBabyName(nextValue);
  };

  const handleUpdateBabyName = async () => {
    if (tempBabyName === null) {
      setEditingName(false);
      return;
    }
    const raw = String(tempBabyName).trim();
    if (!raw) {
      setTempBabyName(kidData?.name || null);
      setEditingName(false);
      return;
    }
    try {
      await updateKidPartial({ name: raw });
      setKidData((prev) => (prev ? { ...prev, name: raw } : prev));
      setTempBabyName(null);
      setEditingName(false);
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
    if (tempWeight === null) {
      setEditingWeight(false);
      return;
    }
    const raw = String(tempWeight).trim();
    if (!raw) {
      setTempWeight(null);
      setEditingWeight(false);
      return;
    }
    const weight = parseFloat(raw);
    if (!weight || weight <= 0) {
      setTempWeight(settings.babyWeight?.toString() || null);
      setEditingWeight(false);
      return;
    }
    try {
      await firestoreStorage.saveSettings({
        ...settings,
        babyWeight: weight
      });
      setSettings((prev) => ({ ...prev, babyWeight: weight }));
      setTempWeight(null);
      setEditingWeight(false);
    } catch (error) {
      console.error('Error updating weight:', error);
    }
  };

  const handleUpdateMultiplier = async () => {
    if (tempMultiplier === null) {
      setEditingMultiplier(false);
      return;
    }
    const raw = String(tempMultiplier).trim();
    if (!raw) {
      setTempMultiplier(null);
      setEditingMultiplier(false);
      return;
    }
    const mult = parseFloat(raw);
    if (!mult || mult <= 0) {
      setTempMultiplier(settings.multiplier?.toString() || null);
      setEditingMultiplier(false);
      return;
    }
    try {
      await firestoreStorage.saveSettings({
        ...settings,
        multiplier: mult
      });
      setSettings((prev) => ({ ...prev, multiplier: mult }));
      setTempMultiplier(null);
      setEditingMultiplier(false);
    } catch (error) {
      console.error('Error updating multiplier:', error);
    }
  };


  const saveSleepTargetOverride = async (value) => {
    const hrs = parseFloat(value);
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

  const handleSleepTargetChange = (nextValue) => {
    if (!isEditingSleepTarget) setIsEditingSleepTarget(true);
    setSleepTargetInput(nextValue);
  };

  const handleUpdateSleepTarget = async () => {
    if (sleepTargetInput === null) {
      setIsEditingSleepTarget(false);
      return;
    }
    const raw = String(sleepTargetInput).trim();
    if (!raw) {
      const fallback = sleepTargetLastSaved || formatSleepTargetDisplay(autoSleepTargetHrs);
      setSleepTargetInput(fallback);
      setIsEditingSleepTarget(false);
      return;
    }
    const n = parseFloat(raw);
    if (!n || n <= 0) {
      const fallback = sleepTargetLastSaved || formatSleepTargetDisplay(autoSleepTargetHrs);
      setSleepTargetInput(fallback);
      setIsEditingSleepTarget(false);
      return;
    }
    setSleepTargetDraftOverride(Math.abs(n - autoSleepTargetHrs) >= 0.05);
    await saveSleepTargetOverride(raw);
    setSleepTargetLastSaved(raw);
    setIsEditingSleepTarget(false);
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
      React.createElement('div', { 
        style: { color: 'var(--tt-text-secondary)' }
      }, 'Loading...')
    );
  }

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
        React.createElement("div", { 
          className: "text-base font-semibold",
          style: { color: 'var(--tt-text-primary)' }
        }, "Day sleep window"),
        React.createElement(
          "div",
          { 
            className: "text-xs mt-1",
            style: { color: 'var(--tt-text-secondary)' }
          },
          "Sleep that starts between these times counts as ",
          React.createElement("span", { 
            className: "font-medium",
            style: { color: 'var(--tt-text-primary)' }
          }, "Day Sleep"),
          " (naps). Everything else counts as ",
          React.createElement("span", { 
            className: "font-medium",
            style: { color: 'var(--tt-text-primary)' }
          }, "Night Sleep"),
          "."
        )
      )
    ),
    // Start/End time rows (TTInputRow + time picker)
    React.createElement(
      "div",
      { className: "grid grid-cols-2 gap-3 mt-4 items-start min-w-0" },
      React.createElement(
        "div",
        { className: "min-w-0" },
        TTInputRow && React.createElement(TTInputRow, {
          label: "Start",
          type: "datetime",
          icon: TTEditIcon,
          rawValue: timeValueToIso(tempDayStartInput || minutesToTimeValue(dayStart)),
          placeholder: minutesToLabel(dayStart),
          formatDateTime: (iso) => {
            if (!iso) return minutesToLabel(dayStart);
            return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          },
          useWheelPickers: () => true,
          pickerMode: "time",
          onOpenPicker: () => {
            setEditingDayStart(true);
            if (!tempDayStartInput) {
              setTempDayStartInput(minutesToTimeValue(dayStart));
            }
            setShowDayStartPicker(true);
          },
          onChange: () => {}
        })
      ),
      React.createElement(
        "div",
        { className: "min-w-0" },
        TTInputRow && React.createElement(TTInputRow, {
          label: "End",
          type: "datetime",
          icon: TTEditIcon,
          rawValue: timeValueToIso(tempDayEndInput || minutesToTimeValue(dayEnd)),
          placeholder: minutesToLabel(dayEnd),
          formatDateTime: (iso) => {
            if (!iso) return minutesToLabel(dayEnd);
            return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          },
          useWheelPickers: () => true,
          pickerMode: "time",
          onOpenPicker: () => {
            setEditingDayEnd(true);
            if (!tempDayEndInput) {
              setTempDayEndInput(minutesToTimeValue(dayEnd));
            }
            setShowDayEndPicker(true);
          },
          onChange: () => {}
        })
      )
    ),
    // Slider track + selection + handles
    React.createElement(
      "div",
      { className: "mt-4" },
      React.createElement(
        "div",
        { 
          className: "relative h-12 rounded-2xl overflow-hidden border day-sleep-slider",
          style: {
            backgroundColor: 'var(--tt-input-bg)',
            borderColor: 'var(--tt-card-border)'
          }
        },
        React.createElement("div", { className: "absolute inset-y-0", style: { left: `${leftPct}%`, width: `${widthPct}%`, background: "rgba(99,102,241,0.25)" } }),
        // left handle visual
        React.createElement("div", { 
          className: "absolute top-1/2 -translate-y-1/2 w-3 h-8 rounded-full shadow-sm border",
          style: { 
            left: `calc(${startPct}% - 6px)`,
            pointerEvents: "none",
            backgroundColor: 'var(--tt-card-bg)',
            borderColor: 'var(--tt-card-border)'
          }
        }),
        // right handle visual
        React.createElement("div", { 
          className: "absolute top-1/2 -translate-y-1/2 w-3 h-8 rounded-full shadow-sm border",
          style: { 
            left: `calc(${endPct}% - 6px)`,
            pointerEvents: "none",
            backgroundColor: 'var(--tt-card-bg)',
            borderColor: 'var(--tt-card-border)'
          }
        }),
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
        { 
          className: "flex justify-between text-xs mt-2 px-3 select-none",
          style: { color: 'var(--tt-text-tertiary)' }
        },
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
        TTCard,
        { variant: 'tracker' },
        TTCardHeader
          ? React.createElement(TTCardHeader, {
              title: React.createElement(
                'div',
                { 
                  className: 'text-base font-semibold',
                  style: { color: 'var(--tt-text-primary)' }
                },
                'Kids'
              ),
              right: React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setShowAddChild(true),
                  className: 'text-sm font-medium',
                  style: { color: 'var(--tt-feed)' }
                },
                '+ Add Child'
              ),
              showIcon: false,
              showTitle: true,
              className: 'mb-3'
            })
          : React.createElement(
              'div',
              { className: 'flex items-center justify-between mb-3' },
              React.createElement(
                'h2',
                { 
                  className: 'text-lg font-semibold',
                  style: { color: 'var(--tt-text-primary)' }
                },
                'Kids'
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => setShowAddChild(true),
                  className: 'text-sm font-medium',
                  style: { color: 'var(--tt-feed)' }
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
                className: 'w-full px-4 py-3 rounded-xl border flex items-center justify-between text-sm',
                style: isCurrent
                  ? {
                      borderColor: 'var(--tt-feed)',
                      backgroundColor: 'var(--tt-feed-soft)',
                      color: 'var(--tt-text-primary)'
                    }
                  : {
                      borderColor: 'var(--tt-card-border)',
                      backgroundColor: 'var(--tt-input-bg)',
                      color: 'var(--tt-text-secondary)'
                    }
              },
              React.createElement(
                'span',
                { className: 'font-medium truncate' },
                k.name || 'Baby'
              ),
              isCurrent &&
                React.createElement(
                  'span',
                  { 
                    className: 'text-xs font-semibold',
                    style: { color: 'var(--tt-feed)' }
                  },
                  'Active'
                )
            );
          })
        ),
        React.createElement(
          'p',
          { 
            className: 'mt-3 text-xs',
            style: { color: 'var(--tt-text-secondary)' }
          },
          'Active kid controls what you see in Tracker, Analytics, and AI Chat.'
        )
      ),

    // Baby Info Card
    React.createElement(
      TTCard,
      { variant: 'tracker' },
      TTCardHeader
        ? React.createElement(TTCardHeader, {
            title: React.createElement(
              'div',
              { className: 'text-base font-semibold', style: { color: 'var(--tt-text-primary)' } },
              'Baby Info'
            ),
            showIcon: false,
            showTitle: true,
            className: 'mb-4'
          })
        : React.createElement(
            'h2',
            { className: 'text-base font-semibold mb-4', style: { color: 'var(--tt-text-primary)' } },
            'Baby Info'
          ),

      React.createElement(
        'div',
        { className: 'flex items-center gap-4 mb-6' },
        // Photo
        React.createElement(
          'div',
          { className: 'relative flex-shrink-0 cursor-pointer', onClick: handlePhotoClick },
          React.createElement(
            'div',
            {
              className:
                'w-24 h-24 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition relative',
                style: { backgroundColor: 'var(--tt-input-bg)' }
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
                      'w-full h-full flex items-center justify-center',
                      style: { backgroundColor: 'var(--tt-feed-soft)' }
                  },
                  React.createElement(Baby, {
                    className: 'w-12 h-12',
                    style: { color: 'var(--tt-feed)' }
                  })
                )
          ),
          React.createElement(
            'div',
            {
              className:
                'absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center border-2 cursor-pointer',
                style: {
                  backgroundColor: 'var(--tt-feed)',
                  borderColor: 'var(--tt-card-bg)'
                },
              onClick: (e) => { e.stopPropagation(); handlePhotoClick(); }
            },
            React.createElement(Camera, { className: 'w-4 h-4 text-white' })
          )
        ),

        // Name row
        React.createElement(
          'div',
          { className: 'flex-1 min-w-0', style: { marginTop: '10px' } },
          TTInputRow && React.createElement(TTInputRow, {
            label: 'Name',
            type: 'text',
            size: 'compact',
            icon: TTEditIcon,
            value: tempBabyName !== null ? tempBabyName : (kidData?.name || ''),
            placeholder: 'Baby',
            onChange: handleBabyNameChange,
            onFocus: () => setEditingName(true),
            onBlur: handleUpdateBabyName,
            onKeyDown: (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }
          })
        )
      ),

      // Baby info rows (mobile-friendly: full-width tappable rows)
      React.createElement(
        'div',
        { className: 'space-y-2 mb-3' },
        React.createElement(
          'div',
          null,
          TTInputRow && React.createElement(TTInputRow, {
            label: 'Birth date',
            type: 'datetime',
            icon: TTEditIcon,
            rawValue: editingBirthDate
              ? dateStringToIso(tempBirthDate)
              : (kidData?.birthDate ? new Date(kidData.birthDate).toISOString() : null),
            placeholder: kidData?.birthDate
              ? `${new Date(kidData.birthDate).toLocaleDateString()} • ${formatAgeFromDate(kidData.birthDate)}`
              : 'Not set',
            formatDateTime: (iso) => {
              const d = new Date(iso);
              const dateLabel = d.toLocaleDateString();
              const ageLabel = formatAgeFromDate(d);
              return ageLabel ? `${dateLabel} • ${ageLabel}` : dateLabel;
            },
            renderValue: (valueText) => {
              const [dateText, ageText] = String(valueText || '').split(' • ');
              return React.createElement(
                'span',
                null,
                React.createElement('span', null, dateText || valueText || ''),
                ageText
                  ? React.createElement(
                      'span',
                      { style: { color: 'var(--tt-text-secondary)' } },
                      ` • ${ageText}`
                    )
                  : null
              );
            },
            useWheelPickers: () => true,
            pickerMode: 'date',
            onOpenPicker: () => {
              if (kidData?.birthDate && !tempBirthDate) {
                setTempBirthDate(isoToDateString(new Date(kidData.birthDate).toISOString()));
              }
              setEditingBirthDate(true);
              setShowBirthDatePicker(true);
            },
            onChange: () => {}
          })
        ),
        React.createElement(
          'div',
          null,
          TTInputRow && React.createElement(TTInputRow, {
            label: 'Current weight (lbs)',
            type: 'number',
            icon: TTEditIcon,
            value: tempWeight !== null ? tempWeight : (settings.babyWeight?.toString() || ''),
            placeholder: 'Not set',
            onChange: handleWeightChange,
            onFocus: () => setEditingWeight(true),
            onBlur: handleUpdateWeight,
            onKeyDown: (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }
          })
        )
      ),
      React.createElement(
        'div',
        { className: 'mt-2' },
        TTInputRow && React.createElement(TTInputRow, {
          label: React.createElement(
            'span',
            { className: 'inline-flex items-center gap-2' },
            'Target multiplier (oz/lb)',
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
          type: 'number',
          icon: TTEditIcon,
          value: tempMultiplier !== null ? tempMultiplier : (settings.multiplier?.toString() || ''),
          placeholder: '2.5',
          onChange: handleMultiplierChange,
          onFocus: () => setEditingMultiplier(true),
          onBlur: handleUpdateMultiplier,
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }
        })
      ),

        sleepSettings && React.createElement('div', { className: "mt-4 pt-4 border-t", style: { borderColor: 'var(--tt-card-border)' } },
          React.createElement('div', { className: "text-base font-semibold mb-2", style: { color: 'var(--tt-text-primary)' } }, 'Sleep settings'),
          TTInputRow && React.createElement(TTInputRow, {
            label: React.createElement(
              'span',
              { className: 'inline-flex items-center gap-2' },
              'Daily sleep target (hrs)',
              React.createElement(InfoDot, { onClick: (e) => { if (e && e.stopPropagation) e.stopPropagation(); alert( "Daily sleep target\n\n" + "We auto-suggest a target based on age using widely cited pediatric sleep recommendations for total sleep per 24 hours (including naps).\n\n" + "If your baby’s clinician suggested a different target, you can override it here." ); } })
            ),
            type: 'number',
            value: sleepTargetInput !== null
              ? sleepTargetInput
              : (sleepTargetLastSaved || formatSleepTargetDisplay(autoSleepTargetHrs)),
            placeholder: formatSleepTargetDisplay(autoSleepTargetHrs),
            onChange: handleSleepTargetChange,
            onFocus: () => setIsEditingSleepTarget(true),
            onBlur: handleUpdateSleepTarget,
            onKeyDown: (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }
          }),
          sleepSettings?.sleepTargetIsOverride && Math.abs(Number(sleepSettings.sleepTargetHours ?? 0) - Number(sleepSettings.sleepTargetAutoHours ?? 0)) >= 0.05 && React.createElement('div', { className: "flex items-center justify-between mt-2 text-xs", style: { color: 'var(--tt-text-secondary)' } },
            React.createElement('div', null, `Recommended: ${formatSleepTargetDisplay(sleepSettings.sleepTargetAutoHours)} hrs`),
            React.createElement('button', { type: 'button', onClick: handleRevertSleepTarget, className: "font-medium hover:opacity-80", style: { color: 'var(--tt-feed)' } }, 'Revert to recommended')
          ),
          DaySleepWindowCard
        )
    ),

    // Family Members Card
    React.createElement(
      TTCard,
      { variant: 'tracker' },
      TTCardHeader
        ? React.createElement(TTCardHeader, {
            title: React.createElement(
              'div',
              { className: 'text-base font-semibold', style: { color: 'var(--tt-text-primary)' } },
              'Family Members'
            ),
            showIcon: false,
            showTitle: true,
            className: 'mb-4'
          })
        : React.createElement(
            'h2',
            { className: 'text-base font-semibold mb-4', style: { color: 'var(--tt-text-primary)' } },
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
                'flex items-center gap-3 p-3 rounded-xl',
              style: { backgroundColor: 'var(--tt-input-bg)' }
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
                        'w-12 h-12 rounded-full flex items-center justify-center font-semibold',
                      style: { backgroundColor: 'var(--tt-subtle-surface)', color: 'var(--tt-text-primary)' }
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
                { className: 'text-sm font-medium truncate', style: { color: 'var(--tt-text-primary)' } },
                member.displayName || member.email || 'Member'
              ),
              React.createElement(
                'div',
                { className: 'text-xs truncate', style: { color: 'var(--tt-text-secondary)' } },
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
        TTCard,
        { variant: 'tracker', className: 'p-4' },
        React.createElement(
          'div',
          { className: 'text-sm mb-2', style: { color: 'var(--tt-text-secondary)' } },
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
              'flex-1 px-3 py-2 border rounded-lg text-sm',
            style: { backgroundColor: 'var(--tt-card-bg)', borderColor: 'var(--tt-card-border)', color: 'var(--tt-text-primary)' }
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
            className: 'mt-2 text-sm hover:opacity-80',
            style: { color: 'var(--tt-text-secondary)' }
          },
          'Close'
        )
      ),

    DatePickerTray && React.createElement(DatePickerTray, {
      isOpen: showBirthDatePicker,
      onClose: () => {
        setShowBirthDatePicker(false);
        setEditingBirthDate(false);
      },
      title: 'Birth date',
      value: dateStringToIso(tempBirthDate || (kidData?.birthDate ? new Date(kidData.birthDate).toISOString().slice(0, 10) : '')),
      onChange: (iso) => {
        const dateStr = isoToDateString(iso);
        setTempBirthDate(dateStr);
        setEditingBirthDate(true);
        saveBirthDateFromIso(iso);
      }
    }),

    TimePickerTray && React.createElement(TimePickerTray, {
      isOpen: showDayStartPicker,
      onClose: () => {
        setShowDayStartPicker(false);
        setEditingDayStart(false);
      },
      title: 'Start time',
      value: timeValueToIso(tempDayStartInput || minutesToTimeValue(dayStart)),
      onChange: (iso) => {
        const mins = isoToMinutes(iso);
        if (mins == null) return;
        setTempDayStartInput(minutesToTimeValue(mins));
        setEditingDayStart(true);
        setDaySleepStartMin(mins);
        saveDaySleepWindow(mins, daySleepEndMin);
      }
    }),

    TimePickerTray && React.createElement(TimePickerTray, {
      isOpen: showDayEndPicker,
      onClose: () => {
        setShowDayEndPicker(false);
        setEditingDayEnd(false);
      },
      title: 'End time',
      value: timeValueToIso(tempDayEndInput || minutesToTimeValue(dayEnd)),
      onChange: (iso) => {
        const mins = isoToMinutes(iso);
        if (mins == null) return;
        setTempDayEndInput(minutesToTimeValue(mins));
        setEditingDayEnd(true);
        setDaySleepEndMin(mins);
        saveDaySleepWindow(daySleepStartMin, mins);
      }
    }),

    // Add Child Modal
    showAddChild &&
      React.createElement(
        'div',
        {
          className:
            'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4'
        },
        React.createElement(
          TTCard,
          {
            variant: 'tracker',
            className:
              'shadow-2xl p-6 w-full max-w-sm'
          },
          React.createElement(
            'h2',
            { className: 'text-lg font-semibold mb-2', style: { color: 'var(--tt-text-primary)' } },
            'Add Child'
          ),
          React.createElement(
            'p',
            { className: 'text-xs mb-4', style: { color: 'var(--tt-text-secondary)' } },
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
                    'tt-card-label',
                  style: { color: 'var(--tt-text-secondary)' }
                },
                "Child's Name"
              ),
              React.createElement('input', {
                type: 'text',
                value: newBabyName,
                onChange: (e) => setNewBabyName(e.target.value),
                className:
                  'w-full px-3 py-2 border rounded-xl text-sm focus:outline-none',
                style: { backgroundColor: 'var(--tt-input-bg)', color: 'var(--tt-text-primary)', borderColor: 'var(--tt-card-border)' }
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
                      'tt-card-label',
                    style: { color: 'var(--tt-text-secondary)' }
                  },
                  'Weight (lbs)'
                ),
                React.createElement('input', {
                  type: 'number',
                  step: '0.1',
                  value: newBabyWeight,
                  onChange: (e) => setNewBabyWeight(e.target.value),
                  className:
                    'w-full px-3 py-2 border rounded-xl text-sm focus:outline-none',
                  style: { backgroundColor: 'var(--tt-input-bg)', color: 'var(--tt-text-primary)', borderColor: 'var(--tt-card-border)' }
                })
              ),
              React.createElement(
                'div',
                { className: 'min-w-0' }, // FIX: Prevent date input overflow on mobile - allow grid item to shrink
                React.createElement(
                  'label',
                  {
                    className:
                      'tt-card-label',
                    style: { color: 'var(--tt-text-secondary)' }
                  },
                  'Birth date'
                ),
                React.createElement('input', {
                  type: 'date',
                  value: newBabyBirthDate,
                  onChange: (e) => setNewBabyBirthDate(e.target.value),
                  className:
                    'w-full px-3 py-2 border rounded-xl text-sm focus:outline-none',
                  style: { backgroundColor: 'var(--tt-input-bg)', color: 'var(--tt-text-primary)', borderColor: 'var(--tt-card-border)' }
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
                className: 'text-sm hover:opacity-80',
                style: { color: 'var(--tt-text-secondary)' }
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
