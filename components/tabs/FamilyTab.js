const FamilyTab = ({
  user,
  kidId,
  familyId,
  onKidChange,
  kids = [],
  themeKey,
  onThemeChange,
  requestAddChild,
  onRequestAddChildHandled,
  onRequestToggleActivitySheet
}) => {
  const [kidData, setKidData] = useState(null);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState({ babyWeight: null, preferredVolumeUnit: 'oz' });
  const [loading, setLoading] = useState(true);
  const [babyPhotoUrl, setBabyPhotoUrl] = useState(null);
  const [showUILab, setShowUILab] = useState(false);
  const themeTokens = (typeof window !== 'undefined' && window.TT && window.TT.themeTokens) ? window.TT.themeTokens : null;
  const [appearance, setAppearance] = useState(() => {
    if (typeof window !== 'undefined' && window.TT && window.TT.appearance) {
      return window.TT.appearance.get();
    }
    return themeTokens?.DEFAULT_APPEARANCE
      ? { darkMode: themeTokens.DEFAULT_APPEARANCE.darkMode }
      : { darkMode: false };
  });
  const TTCard = window.TT?.shared?.TTCard || window.TTCard;
  const TTCardHeader = window.TT?.shared?.TTCardHeader || window.TTCardHeader;
  const TTInputRow = window.TT?.shared?.TTInputRow || window.TTInputRow;
  const DatePickerTray = window.TT?.shared?.pickers?.DatePickerTray || null;
  const TTEditIcon = window.TT?.shared?.icons?.Edit2 || window.Edit2;
  const BabyIcon = window.TT?.shared?.icons?.BabyIcon || null;
  const ChevronRightIcon = window.TT?.shared?.icons?.ChevronRightIcon || window.ChevronRightIcon || null;

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

  // Temp fields
  const [tempBabyName, setTempBabyName] = useState(null);
  const [tempBirthDate, setTempBirthDate] = useState('');
  const [tempWeight, setTempWeight] = useState(null);

  const fileInputRef = React.useRef(null);
  // Add Child modal state
  const [showAddChild, setShowAddChild] = useState(false);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyWeight, setNewBabyWeight] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState('');
  const [savingChild, setSavingChild] = useState(false);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const handleOpenActivityVisibility = () => {
    if (typeof onRequestToggleActivitySheet === 'function') {
      onRequestToggleActivitySheet();
    }
  };

  const defaultThemeKey = themeTokens?.DEFAULT_THEME_KEY || 'theme1';
  const colorThemes = themeTokens?.COLOR_THEMES || {};
  const colorThemeOrder = themeTokens?.COLOR_THEME_ORDER || Object.keys(colorThemes);
  const resolveTheme = (key) =>
    (colorThemes && colorThemes[key])
    || (colorThemes && colorThemes[defaultThemeKey])
    || (colorThemes && Object.values(colorThemes)[0])
    || null;

  const handleAppearanceChange = async (partial) => {
    if (typeof window !== 'undefined' && window.TT && window.TT.appearance) {
      await window.TT.appearance.set(partial);
      setAppearance(window.TT.appearance.get());
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const syncAppearance = (event) => {
      const next = event?.detail?.appearance;
      if (next && typeof next.darkMode === 'boolean') {
        setAppearance(next);
        return;
      }
      if (window.TT?.appearance?.get) {
        setAppearance(window.TT.appearance.get());
      }
    };
    syncAppearance();
    window.addEventListener('tt:appearance-ready', syncAppearance);
    window.addEventListener('tt:appearance-changed', syncAppearance);
    return () => {
      window.removeEventListener('tt:appearance-ready', syncAppearance);
      window.removeEventListener('tt:appearance-changed', syncAppearance);
    };
  }, []);

  const handleThemeChange = async (nextKey) => {
    if (!nextKey) return;
    const resolvedNext = colorThemes[nextKey] ? nextKey : defaultThemeKey;
    const current = settings.themeKey || themeKey || defaultThemeKey;
    if (resolvedNext === current) return;
    try {
      const nextSettings = { ...settings, themeKey: resolvedNext };
      await firestoreStorage.saveSettings(nextSettings);
      setSettings(nextSettings);
      if (typeof onThemeChange === 'function') {
        onThemeChange(resolvedNext);
      }
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  const handleSignOut = async () => {
    if (confirm('Sign out of Tiny Tracker?')) {
      await signOut();
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = confirm(
      "Are you sure you want to delete your account?\n\n" +
      "- You will be removed from the family.\n" +
      "- If you are the owner, ownership will transfer to another member.\n" +
      "- Your baby's data will NOT be deleted.\n\n" +
      "This action cannot be undone."
    );
    
    if (!confirmDelete) return;

    try {
      await deleteCurrentUserAccount();
      alert("Your account has been deleted.");
    } catch (err) {
      console.error("Account deletion failed:", err);
      alert("Something went wrong deleting your account. Please try again.");
    }
  };

  // --------------------------------------
  // Data loading
  // --------------------------------------

  useEffect(() => {
    loadData();
  }, [kidId, familyId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.TT && window.TT.appearance) {
      const current = window.TT.appearance.get();
      setAppearance(current);
    }
  }, []);

  useEffect(() => {
    if (requestAddChild) {
      setShowAddChild(true);
      if (onRequestAddChildHandled) {
        onRequestAddChildHandled();
      }
    }
  }, [requestAddChild, onRequestAddChildHandled]);

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
          themeKey: settingsData.themeKey || themeKey || defaultThemeKey,
          preferredVolumeUnit: (settingsData.preferredVolumeUnit === 'ml') ? 'ml' : 'oz'
        };
        setSettings(merged);
        try {
          localStorage.setItem('tt_volume_unit', merged.preferredVolumeUnit);
        } catch (e) {}

      } else {
        const merged = {
          babyWeight: null,
          themeKey: themeKey || defaultThemeKey,
          preferredVolumeUnit: 'oz'
        };
        setSettings(merged);
        try {
          localStorage.setItem('tt_volume_unit', merged.preferredVolumeUnit);
        } catch (e) {}
      }

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
      const defaultTheme = themeKey || defaultThemeKey;

      await db
        .collection('families')
        .doc(familyId)
        .collection('kids')
        .doc(newKidId)
        .collection('settings')
        .doc('default')
        .set({
          babyWeight: weight,
          preferredVolumeUnit: 'oz',
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

  const handleVolumeUnitChange = async (nextUnit) => {
    const unit = nextUnit === 'ml' ? 'ml' : 'oz';
    try {
      await firestoreStorage.saveSettings({
        ...settings,
        preferredVolumeUnit: unit
      });
      setSettings((prev) => ({ ...prev, preferredVolumeUnit: unit }));
      try {
        localStorage.setItem('tt_volume_unit', unit);
      } catch (e) {}
      try {
        const event = new CustomEvent('tt:volume-unit-changed', { detail: { unit } });
        window.dispatchEvent(event);
      } catch (e) {}
    } catch (error) {
      console.error('Error updating volume unit:', error);
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
  // Members
  // --------------------------------------

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

  const AppearanceSection = () => {
    const themeKeys = Array.isArray(colorThemeOrder) && colorThemeOrder.length
      ? colorThemeOrder
      : Object.keys(colorThemes || {});
    return React.createElement(React.Fragment, null,
      React.createElement(TTCard, { variant: "default" },
        React.createElement('h2', { className: "text-lg font-semibold mb-4", style: { color: 'var(--tt-text-primary)' } }, 'Appearance'),
        React.createElement('div', { className: "space-y-4" },
          React.createElement('div', null,
            React.createElement('div', { className: "text-xs mb-1", style: { color: 'var(--tt-text-secondary)' } }, 'Dark Mode'),
            window.SegmentedToggle && React.createElement(window.SegmentedToggle, {
              value: appearance.darkMode ? 'dark' : 'light',
              options: [
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' }
              ],
              onChange: async (value) => {
                await handleAppearanceChange({ darkMode: value === 'dark' });
              },
              variant: 'body',
              size: 'medium'
            })
          ),

          React.createElement('div', null,
            React.createElement('div', { className: "text-xs mb-2", style: { color: 'var(--tt-text-secondary)' } }, 'Color Theme'),
            React.createElement('div', { className: "grid grid-cols-2 gap-3" },
              themeKeys.map((key) => {
                const theme = resolveTheme(key);
                if (!theme) return null;
                const isSelected = activeThemeKey === key;
                const swatchOrder = ['bottle', 'nursing', 'sleep', 'diaper', 'solids'];
                return React.createElement('button', {
                  key,
                  type: 'button',
                  onClick: () => handleThemeChange(key),
                  className: "w-full text-left rounded-xl border px-3 py-3 transition",
                  style: {
                    backgroundColor: isSelected ? 'var(--tt-subtle-surface)' : 'var(--tt-card-bg)',
                    borderColor: isSelected ? 'var(--tt-outline-strong)' : 'var(--tt-card-border)'
                  }
                },
                  React.createElement('div', { className: "text-sm font-semibold", style: { color: 'var(--tt-text-primary)' } }, theme.name || key),
                  React.createElement('div', { className: "flex items-center gap-2 mt-2" },
                    swatchOrder.map((cardKey) => {
                      const accent = theme.cards?.[cardKey]?.primary || 'transparent';
                      return React.createElement('span', {
                        key: `${key}-${cardKey}`,
                        className: "inline-block w-4 h-4 rounded-full border",
                        style: { backgroundColor: accent, borderColor: 'var(--tt-card-border)' }
                      });
                    })
                  )
                );
              })
            )
          )
        )
      )
    );
  };

  const AccountSection = () =>
    React.createElement('div', { className: "rounded-2xl shadow-lg p-6", style: { backgroundColor: 'var(--tt-card-bg)' } },
      React.createElement('h2', { className: "text-lg font-semibold mb-4", style: { color: 'var(--tt-text-primary)' } }, 'Account'),
      React.createElement('div', { className: "space-y-3" },
        React.createElement('div', { className: "flex items-center justify-between p-3 rounded-lg", style: { backgroundColor: 'var(--tt-card-bg)' } },
          React.createElement('div', null,
            React.createElement('div', { className: "text-sm font-medium", style: { color: 'var(--tt-text-primary)' } }, user.displayName || 'User'),
            React.createElement('div', { className: "text-xs", style: { color: 'var(--tt-text-secondary)' } }, user.email)
          ),
          user.photoURL &&
            React.createElement('img', {
              src: user.photoURL,
              alt: user.displayName,
              className: "w-10 h-10 rounded-full"
            })
        ),
        React.createElement('button', {
          onClick: handleSignOut,
          className: "w-full py-3 rounded-xl font-semibold transition",
          style: {
            backgroundColor: 'var(--tt-error-soft)',
            color: 'var(--tt-error)'
          }
        }, 'Sign Out'),
        React.createElement('button', {
          onClick: handleDeleteAccount,
          className: "w-full py-3 rounded-xl font-semibold transition",
          style: {
            backgroundColor: 'var(--tt-error)',
            color: 'white'
          }
        }, 'Delete My Account')
      )
    );

  const InternalSection = () =>
    React.createElement('div', { className: "rounded-2xl shadow-lg p-6", style: { backgroundColor: 'var(--tt-card-bg)' } },
      React.createElement('h2', { className: "text-lg font-semibold mb-4", style: { color: 'var(--tt-text-primary)' } }, 'Internal'),
      React.createElement('button', {
        onClick: () => setShowUILab(true),
        className: "w-full py-3 rounded-xl font-semibold transition",
        style: {
          backgroundColor: 'var(--tt-feed-soft)',
          color: 'var(--tt-feed)'
        }
      }, 'UI Lab')
    );

  // --------------------------------------
  // Render
  // --------------------------------------

  if (showUILab && window.TT?.tabs?.UILabTab) {
    return React.createElement(window.TT.tabs.UILabTab, { onClose: () => setShowUILab(false) });
  }

  if (loading) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement('div', { 
        style: { color: 'var(--tt-text-secondary)' }
      }, 'Loading...')
    );
  }

  const activeThemeKey = settings.themeKey || themeKey || defaultThemeKey;

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

    AppearanceSection(),

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
          'Active kid controls what you see in Tracker and Analytics.'
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
                  BabyIcon ? React.createElement(BabyIcon, {
                    className: 'w-12 h-12',
                    style: { color: 'var(--tt-feed)' }
                  }) : null
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
        { className: 'mt-4 pt-4 border-t', style: { borderColor: 'var(--tt-card-border)' } },
        React.createElement('div', { className: "text-base font-semibold mb-2", style: { color: 'var(--tt-text-primary)' } }, 'Feeding unit'),
        window.SegmentedToggle && React.createElement(window.SegmentedToggle, {
          value: settings.preferredVolumeUnit === 'ml' ? 'ml' : 'oz',
          options: [
            { value: 'oz', label: 'oz' },
            { value: 'ml', label: 'ml' }
          ],
          onChange: handleVolumeUnitChange,
          variant: 'body',
          size: 'medium'
        })
      ),
      React.createElement(
        'div',
        { className: 'mt-4 pt-4 border-t', style: { borderColor: 'var(--tt-card-border)' } },
        React.createElement('div', { className: "text-base font-semibold mb-2", style: { color: 'var(--tt-text-primary)' } }, 'Activity visibility'),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: handleOpenActivityVisibility,
            className: "w-full flex items-center justify-between rounded-2xl p-4 transition tt-tapable",
            style: { backgroundColor: 'var(--tt-input-bg)' },
            'aria-label': 'Show & hide activities'
          },
          React.createElement(
            'div',
            { className: "flex flex-col items-start" },
            React.createElement('div', { className: "text-sm font-medium", style: { color: 'var(--tt-text-primary)' } }, 'Show & hide activities'),
            React.createElement('div', { className: "text-xs", style: { color: 'var(--tt-text-secondary)' } }, 'Choose which Tracker cards appear')
          ),
          ChevronRightIcon
            ? React.createElement(ChevronRightIcon, { className: "w-4 h-4", style: { color: 'var(--tt-text-secondary)' } })
            : React.createElement('span', { style: { color: 'var(--tt-text-secondary)' } }, '›')
        )
      ),
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
      )
    ),

    AccountSection(),
    InternalSection(),

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
                  'px-4 py-2 text-white rounded-xl text-sm font-medium disabled:opacity-50',
                style: { backgroundColor: 'var(--tt-primary-action-bg)' }
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
