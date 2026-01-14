// Chat Tab (Messenger-style): chat list + messages + @mentions + photos
// Uses Firestore database for chats/messages, and Supabase storage for photo files via firestoreStorage.upload* helpers.

function ttEnsureTapStyles() {
  if (document.getElementById('tt-tap-anim')) return;
  const style = document.createElement('style');
  style.id = 'tt-tap-anim';
  style.textContent = `
    .tt-tapable { position: relative; overflow: hidden; }
    .tt-tapable::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.05);
      opacity: 0;
      transition: opacity 0.12s ease-out;
      pointer-events: none;
      border-radius: inherit;
      z-index: 1;
    }
    .tt-tapable:active::before { opacity: 1; }
    .dark .tt-tapable::before { background: rgba(255,255,255,0.10); }
  `;
  document.head.appendChild(style);
}

const TTNewChatIcon = (props) =>
  React.createElement(
    'svg',
    {
      ...props,
      xmlns: "http://www.w3.org/2000/svg",
      width: "22",
      height: "22",
      viewBox: "0 0 256 256",
      fill: "currentColor"
    },
    React.createElement('path', {
      d: "M229.66,58.34l-32-32a8,8,0,0,0-11.32,0l-96,96A8,8,0,0,0,88,128v32a8,8,0,0,0,8,8h32a8,8,0,0,0,5.66-2.34l96-96A8,8,0,0,0,229.66,58.34ZM124.69,152H104V131.31l64-64L188.69,88ZM200,76.69,179.31,56,192,43.31,212.69,64ZM224,128v80a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V48A16,16,0,0,1,48,32h80a8,8,0,0,1,0,16H48V208H208V128a8,8,0,0,1,16,0Z"
    })
  );

const TTPhotoIcon = (props) =>
  React.createElement(
    'svg',
    {
      ...props,
      xmlns: "http://www.w3.org/2000/svg",
      width: "20",
      height: "20",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.25",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    React.createElement('rect', { x: "3", y: "3", width: "18", height: "18", rx: "3", ry: "3" }),
    React.createElement('circle', { cx: "8.5", cy: "8.5", r: "1.5" }),
    React.createElement('path', { d: "M21 15l-5-5L5 21" })
  );

const TTChevronRight = (props) =>
  React.createElement(
    'svg',
    {
      ...props,
      xmlns: "http://www.w3.org/2000/svg",
      width: "20",
      height: "20",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    React.createElement('polyline', { points: "9 18 15 12 9 6" })
  );

const TTBackChevron = (props) =>
  React.createElement(
    'svg',
    {
      ...props,
      xmlns: "http://www.w3.org/2000/svg",
      width: "22",
      height: "22",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    },
    React.createElement('polyline', { points: "15 18 9 12 15 6" })
  );

function ttGetFirebase() {
  return (typeof window !== 'undefined' && window.firebase) ? window.firebase : null;
}

function ttGetDb() {
  const fb = ttGetFirebase();
  if (!fb || !fb.firestore) return null;
  return fb.firestore();
}

function ttServerTimestamp() {
  const fb = ttGetFirebase();
  return fb?.firestore?.FieldValue?.serverTimestamp?.() || null;
}

function ttToMillis(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (ts?.seconds != null) return (ts.seconds * 1000) + Math.floor((ts.nanoseconds || 0) / 1e6);
  return 0;
}

function ttFormatTimeShort(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function ttIsTinyMention(text) {
  return /@tinytracker\b/i.test(text || '');
}

function ttRenderTextWithMentions(text) {
  const t = String(text || '');
  const parts = t.split(/(@[a-zA-Z0-9_]+)/g);
  return React.createElement(
    React.Fragment,
    null,
    parts.map((p, i) => {
      if (/^@[a-zA-Z0-9_]+$/.test(p)) {
        return React.createElement('span', { key: i, className: 'font-semibold' }, p);
      }
      return React.createElement('span', { key: i }, p);
    })
  );
}

function ttPickImageAsDataURL() {
  return new Promise((resolve) => {
    const inputEl = document.createElement('input');
    inputEl.type = 'file';
    inputEl.accept = 'image/*';
    inputEl.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        try { document.body.removeChild(inputEl); } catch {}
        return resolve(null);
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        try { document.body.removeChild(inputEl); } catch {}
        resolve(dataUrl);
      };
      reader.onerror = () => {
        try { document.body.removeChild(inputEl); } catch {}
        resolve(null);
      };
      reader.readAsDataURL(file);
    };
    try { document.body.appendChild(inputEl); } catch {}
    inputEl.click();
  });
}

function ttInitials(name) {
  const n = String(name || '').trim();
  if (!n) return '?';
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || '';
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '';
  const s = (a + b).toUpperCase();
  return s || (n[0] || '?').toUpperCase();
}

function ttAvatarCircle({ label, size = 40 }) {
  return React.createElement(
    'div',
    {
      style: {
        width: size,
        height: size,
        borderRadius: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(12, Math.floor(size * 0.32)),
        fontWeight: 800,
        backgroundColor: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'var(--tt-text-primary)',
        flex: '0 0 auto'
      }
    },
    label
  );
}

function ttChatAvatar(chat) {
  // iOS-ish: Family looks like a "group" (two stacked circles). Others: single initials circle.
  if (chat?.id === 'family') {
    return React.createElement(
      'div',
      { style: { position: 'relative', width: 44, height: 44, flex: '0 0 auto' } },
      React.createElement('div', { style: { position: 'absolute', left: 10, top: 4 } },
        ttAvatarCircle({ label: 'TT', size: 28 })
      ),
      React.createElement('div', { style: { position: 'absolute', left: 0, top: 14 } },
        ttAvatarCircle({ label: 'F', size: 28 })
      )
    );
  }
  return ttAvatarCircle({ label: ttInitials(chat?.name || 'Chat'), size: 44 });
}

const ChatRow = ({ chat, isUnread, onOpen, onDelete }) => {
  const [offset, setOffset] = React.useState(0);
  const [swiping, setSwiping] = React.useState(false);
  const ref = React.useRef(null);
  const startRef = React.useRef(null);
  const DELETE_W = 84;
  const THRESH = 72;
  const canDelete = chat.id !== 'family';

  // If a row re-mounts / changes (e.g., new chat added), never keep it in a half-swiped state
  React.useEffect(() => { setOffset(0); setSwiping(false); startRef.current = null; }, [chat?.id]);

  const onTouchStart = (e) => {
    if (!canDelete) return;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    setSwiping(false);
  };

  const onTouchMove = (e) => {
    if (!canDelete) return;
    if (!startRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = Math.abs(t.clientY - startRef.current.y);
    // Horizontal intent
    if (Math.abs(dx) > dy) {
      if (e.cancelable) e.preventDefault();
      setSwiping(true);
      // swipe left => reveal delete
      if (dx < 0) {
        const next = Math.max(-DELETE_W * 1.8, dx);
        setOffset(next);
      } else {
        // swipe right => close if open
        if (offset < 0) {
          const next = Math.min(0, -DELETE_W + dx);
          setOffset(next);
        }
      }
    }
  };

  const finalizeSwipe = () => {
    if (!canDelete) return;
    if (!swiping) return;
    const cur = offset;
    // hard-swipe left deletes
    if (cur < -DELETE_W * 1.35) {
      setOffset(0);
      onDelete?.(chat);
    } else if (cur < -THRESH) {
      setOffset(-DELETE_W);
    } else {
      setOffset(0);
    }
    setSwiping(false);
    startRef.current = null;
  };
  const onTouchEnd = () => finalizeSwipe();
  const onTouchCancel = () => finalizeSwipe();

  const bg = 'var(--tt-subtle-surface)';

  return React.createElement(
    'div',
    { ref, className: 'relative overflow-hidden rounded-2xl', style: { touchAction: 'pan-y' } },
    // delete behind
    canDelete && React.createElement(
      'div',
      {
        className: 'absolute inset-y-0 right-0 flex items-center justify-center',
        style: { width: DELETE_W + 'px', backgroundColor: '#ef4444', zIndex: 2 }
      },
      React.createElement(
        'button',
        {
          'data-tt-delete': 'true',
          className: 'text-white font-semibold text-sm',
          onClick: (e) => { e.stopPropagation(); onDelete?.(chat); }
        },
        'Delete'
      )
    ),
    // swipe content
    React.createElement(
      'div',
      {
        className: 'tt-tapable rounded-2xl',
        onClick: () => {
          // tap closes if delete is revealed
          if (offset < 0) { setOffset(0); return; }
          onOpen?.(chat);
        },
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onTouchCancel,
        style: {
          backgroundColor: bg,
          transform: offset ? `translateX(${offset}px)` : 'translateX(0px)',
          transition: swiping ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)',
          zIndex: offset < 0 ? 1 : 3
        }
      },
      React.createElement(
        'div',
        { className: 'p-4 flex items-center justify-between gap-3' },
        React.createElement(
          'div',
          { className: 'flex items-center gap-3 min-w-0' },
          // unread dot (Apple Messages style)
          React.createElement('div', {
            style: {
              width: 10,
              height: 10,
              borderRadius: 9999,
              backgroundColor: isUnread ? '#3b82f6' : 'transparent',
              flex: '0 0 auto'
            }
          }),
          // chat avatar (iOS/WhatsApp-ish)
          ttChatAvatar(chat),
          React.createElement(
            'div',
            { className: 'min-w-0' },
            React.createElement(
              'div',
              { className: 'font-semibold truncate', style: { color: 'var(--tt-text-secondary)' } },
              chat.name || 'Chat'
            ),
            React.createElement(
              'div',
              { className: 'text-[14px] truncate', style: { color: 'var(--tt-text-tertiary)' } },
              chat.lastMessageText || ''
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-2', style: { flex: '0 0 auto' } },
          React.createElement(
            'div',
            { className: 'text-[12px]', style: { color: 'var(--tt-text-tertiary)' } },
            ttFormatTimeShort(chat.lastMessageAtMs)
          ),
          React.createElement(TTChevronRight, { style: { color: 'var(--tt-text-secondary)' } })
        )
      )
    )
  );
};

const AIChatTab = ({ user, kidId, familyId, themeKey = 'indigo' }) => {
  ttEnsureTapStyles();
  const theme = KID_THEMES?.[themeKey] || KID_THEMES?.indigo || { primary: '#4f46e5' };
  const db = ttGetDb();

  const uid = user?.uid || null;
  const myName = user?.displayName || user?.email || 'You';

  const [view, setView] = React.useState('list'); // list | chat
  const [initializing, setInitializing] = React.useState(true);
  const [chats, setChats] = React.useState([]);
  const [activeChat, setActiveChat] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [resolvedKidId, setResolvedKidId] = React.useState(kidId || null);

  const messagesRef = React.useRef(null);

  const ensureStorageReady = React.useCallback(async () => {
    if (!familyId) return false;
    let activeKidId = resolvedKidId || kidId || null;
    if (!activeKidId) {
      try {
        const col = db
          ?.collection('families')
          .doc(familyId)
          .collection('kids');
        if (col) {
          const snap = await col.limit(1).get();
          if (!snap.empty) {
            activeKidId = snap.docs[0].id;
            setResolvedKidId(activeKidId);
          }
        }
      } catch (e) {
        console.warn('[ChatTab] Failed to resolve kidId for uploads:', e);
      }
    }
    if (!activeKidId) return false;
    if (firestoreStorage && typeof firestoreStorage.initialize === 'function') {
      await firestoreStorage.initialize(familyId, activeKidId);
    }
    return true;
  }, [db, familyId, kidId, resolvedKidId]);

  const lastReadKey = React.useCallback(
    (chatId) => `tt_chat_last_read:${familyId || 'family'}:${chatId}:${uid || 'anon'}`,
    [familyId, uid]
  );
  const getLastReadAt = React.useCallback(
    (chatId) => Number(localStorage.getItem(lastReadKey(chatId)) || 0),
    [lastReadKey]
  );
  const setLastReadAt = React.useCallback(
    (chatId, ms) => localStorage.setItem(lastReadKey(chatId), String(ms || Date.now())),
    [lastReadKey]
  );

  const safeLastReadWrite = React.useCallback((chatId, ms) => {
    const v = Number(ms || 0);
    if (!v || v < 1000) return; // never write 0 (causes permanent unread)
    setLastReadAt(chatId, v);
  }, [setLastReadAt]);

  const chatsCol = React.useCallback(() => {
    if (!db) return null;
    if (!familyId) return null;
    return db.collection('families').doc(familyId).collection('chats');
  }, [db, familyId]);

  const messagesCol = React.useCallback((chatId) => {
    const col = chatsCol();
    if (!col) return null;
    return col.doc(chatId).collection('messages');
  }, [chatsCol]);

  const ensureFamilyChat = React.useCallback(async () => {
    const col = chatsCol();
    if (!col) return;
    const docRef = col.doc('family');
    const snap = await docRef.get();
    if (!snap.exists) {
      await docRef.set({
        name: 'Family',
        isSystem: true,
        createdAt: ttServerTimestamp(),
        lastMessageAt: ttServerTimestamp(),
        lastMessageText: '',
        deletedAt: null
      }, { merge: true });
    }
  }, [chatsCol]);

  const loadChats = React.useCallback(async () => {
    if (!db || !familyId) {
      setChats([{ id: 'family', name: 'Family', lastMessageAtMs: 0, lastMessageText: '' }]);
      setInitializing(false);
      return;
    }
    setInitializing(true);
    try {
      await ensureFamilyChat();
      const col = chatsCol();
      const snap = await col.get();
      const list = [];
      snap.forEach((d) => {
        const data = d.data() || {};
        if (data.deletedAt) return;
        const lastMs = ttToMillis(data.lastMessageAt);
        list.push({
          id: d.id,
          name: data.name || (d.id === 'family' ? 'Family' : 'Chat'),
          isSystem: !!data.isSystem || d.id === 'family',
          lastMessageAtMs: lastMs || 0,
          lastMessageText: data.lastMessageText || ''
        });
      });
      if (!list.some(c => c.id === 'family')) {
        list.unshift({ id: 'family', name: 'Family', isSystem: true, lastMessageAtMs: 0, lastMessageText: '' });
      }
      list.sort((a, b) => {
        if (a.id === 'family') return -1;
        if (b.id === 'family') return 1;
        return (b.lastMessageAtMs || 0) - (a.lastMessageAtMs || 0);
      });
      setChats(list);
      const familyChat = list.find((c) => c.id === 'family');
      if (familyChat) {
        const lr = Number(getLastReadAt('family') || 0);
        const lm = Number(familyChat.lastMessageAtMs || 0);
        if ((!lr || lr < 1000) && lm > 1000) {
          safeLastReadWrite('family', lm);
        }
      }
    } catch (e) {
      console.error('[ChatTab] loadChats failed', e);
      setChats([{ id: 'family', name: 'Family', lastMessageAtMs: 0, lastMessageText: '' }]);
    } finally {
      setInitializing(false);
    }
  }, [db, familyId, chatsCol, ensureFamilyChat, safeLastReadWrite]);

  React.useEffect(() => {
    loadChats();
  }, [loadChats]);

  const isUnread = (chat) => {
    const lastRead = getLastReadAt(chat.id);
    const lm = Number(chat.lastMessageAtMs || 0);
    const lr = Number(lastRead || 0);
    if (!lm || lm < 1000) return false; // no usable last message time => treat as read
    if (!lr || lr < 1000) return false; // if we haven't tracked reads yet, don't show a stuck dot
    return lm > lr;
  };

  const computeUnreadCount = React.useCallback(() => {
    const count = chats.filter(isUnread).length;
    try { window.__TT_UNREAD_CHAT_COUNT = count; } catch {}
    return count;
  }, [chats]);

  React.useEffect(() => {
    computeUnreadCount();
  }, [computeUnreadCount]);

  const openChat = async (chat) => {
    setActiveChat(chat);
    setView('chat');
    await loadMessages(chat.id);
    // Mark as read using the chat's lastMessageAt if present (prevents stuck unread dot)
    const lm = Number(chat?.lastMessageAtMs || 0);
    if (lm && lm > 1000) safeLastReadWrite(chat.id, lm);
  };

  const loadMessages = React.useCallback(async (chatId) => {
    const col = messagesCol(chatId);
    if (!col) {
      setMessages([]);
      return;
    }
    try {
      const snap = await col.orderBy('createdAt', 'asc').limit(300).get();
      const list = [];
      snap.forEach((d) => {
        const m = d.data() || {};
        list.push({
          id: d.id,
          createdAtMs: ttToMillis(m.createdAt) || m.clientTimestamp || 0,
          senderId: m.senderId || null,
          senderName: m.senderName || null,
          senderType: m.senderType || (m.senderId ? 'user' : 'tinytracker'),
          text: m.text || '',
          photoURLs: Array.isArray(m.photoURLs) ? m.photoURLs : []
        });
      });
      setMessages(list);
      // Use the best timestamp we can; NEVER write 0 (causes permanent unread)
      const lastMs = list.length
        ? Math.max(...list.map(m => Number(m.createdAtMs || 0)).filter(v => v > 1000))
        : 0;
      if (lastMs && lastMs > 1000) safeLastReadWrite(chatId, lastMs);
      setTimeout(() => {
        const el = messagesRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }, 0);
      // refresh list (timestamps)
      await loadChats();
    } catch (e) {
      console.error('[ChatTab] loadMessages failed', e);
      setMessages([]);
    }
  }, [messagesCol, loadChats]);

  const createChat = async () => {
    const name = prompt('Name this chat');
    if (!name || !name.trim()) return;
    const col = chatsCol();
    if (!col) return;
    try {
      const docRef = await col.add({
        name: name.trim(),
        isSystem: false,
        createdAt: ttServerTimestamp(),
        lastMessageAt: ttServerTimestamp(),
        lastMessageText: '',
        deletedAt: null
      });
      await loadChats();
      const newChat = chats.find(c => c.id === docRef.id) || { id: docRef.id, name: name.trim() };
      await openChat(newChat);
    } catch (e) {
      console.error('[ChatTab] createChat failed', e);
      alert('Failed to create chat.');
    }
  };

  const deleteChat = async (chat) => {
    if (!chat || chat.id === 'family') return;
    if (!confirm(`Delete "${chat.name}"?`)) return;
    const col = chatsCol();
    if (!col) return;
    try {
      await col.doc(chat.id).set({ deletedAt: ttServerTimestamp() }, { merge: true });
      if (activeChat?.id === chat.id) {
        setActiveChat(null);
        setView('list');
        setMessages([]);
      }
      await loadChats();
    } catch (e) {
      console.error('[ChatTab] deleteChat failed', e);
      alert('Failed to delete chat.');
    }
  };

  const uploadPhoto = async () => {
    const ready = await ensureStorageReady();
    if (!ready) {
      alert('Select a kid before uploading photos.');
      return null;
    }
    const dataUrl = await ttPickImageAsDataURL();
    if (!dataUrl) return null;
    const uploader =
      (firestoreStorage && typeof firestoreStorage.uploadChatPhoto === 'function')
        ? firestoreStorage.uploadChatPhoto
        : (firestoreStorage && typeof firestoreStorage.uploadFeedingPhoto === 'function')
        ? firestoreStorage.uploadFeedingPhoto
        : null;
    if (!uploader) {
      alert('Photo upload is not available yet.');
      return null;
    }
    return await uploader(dataUrl);
  };

  const sendMessage = async ({ text = '', photoURLs = [] }) => {
    if (!activeChat) return;
    if (sending) return;
    const trimmed = String(text || '').trim();
    const hasPhoto = Array.isArray(photoURLs) && photoURLs.length > 0;
    if (!trimmed && !hasPhoto) return;

    const chatId = activeChat.id;
    const col = messagesCol(chatId);
    const chatsCollection = chatsCol();
    if (!col || !chatsCollection) return;

    const clientTimestamp = Date.now();
    const shouldCallAI = ttIsTinyMention(trimmed);
    const optimistic = {
      id: `local-${clientTimestamp}-${Math.random().toString(16).slice(2)}`,
      createdAtMs: clientTimestamp,
      senderId: uid,
      senderName: myName,
      senderType: 'user',
      text: trimmed,
      photoURLs: photoURLs
    };

    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setSending(true);

    try {
      await col.add({
        senderId: uid,
        senderName: myName,
        senderType: 'user',
        text: trimmed,
        photoURLs: photoURLs,
        createdAt: ttServerTimestamp(),
        clientTimestamp
      });
      await chatsCollection.doc(chatId).set({
        lastMessageAt: ttServerTimestamp(),
        lastMessageText: hasPhoto ? 'Photo' : trimmed
      }, { merge: true });

      setLastReadAt(chatId, clientTimestamp);
      await loadMessages(chatId);

      if (shouldCallAI) {
        const prompt = trimmed.replace(/@tinytracker\b/ig, '').trim() || trimmed;
        const aiText = await getAIResponse(prompt, kidId);
        await col.add({
          senderId: null,
          senderName: 'Tiny Tracker',
          senderType: 'tinytracker',
          text: aiText,
          photoURLs: [],
          createdAt: ttServerTimestamp(),
          clientTimestamp: Date.now()
        });
        await chatsCollection.doc(chatId).set({
          lastMessageAt: ttServerTimestamp(),
          lastMessageText: aiText
        }, { merge: true });
        await loadMessages(chatId);
      }
    } catch (e) {
      console.error('[ChatTab] sendMessage failed', e);
      alert('Failed to send message.');
      await loadMessages(chatId);
    } finally {
      setSending(false);
    }
  };

  const onSendPhoto = async () => {
    if (sending) return;
    const url = await uploadPhoto();
    if (!url) return;
    await sendMessage({ text: '', photoURLs: [url] });
  };

  const renderBubble = (m) => {
    const isMe = m.senderType === 'user' && uid && m.senderId === uid;
    const isTiny = m.senderType === 'tinytracker';
    const alignStyle = { justifyContent: isMe ? 'flex-end' : 'flex-start' };

    // iMessage-ish palette
    const incomingBg = 'rgba(255,255,255,0.10)'; // good in dark mode; in light it still reads as subtle
    const outgoingBg = theme.primary || '#4f46e5';
    const tinyBg = 'rgba(99,102,241,0.16)'; // slightly tinted "system" bubble

    const bubbleBg = isMe ? outgoingBg : (isTiny ? tinyBg : incomingBg);
    const bubbleColor = isMe ? 'white' : 'var(--tt-text-primary)';
    const timeColor = isMe ? 'rgba(255,255,255,0.70)' : 'var(--tt-text-secondary)';

    const showAvatar = !isMe && !isTiny;
    const header = isTiny ? 'Tiny Tracker' : (m.senderName || 'Family');

    return React.createElement(
      'div',
      {
        key: m.id,
        style: {
          display: 'flex',
          gap: '8px',
          ...alignStyle
        }
      },
      showAvatar && React.createElement(
        'div',
        {
          style: {
            width: 32,
            height: 32,
            borderRadius: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: 'rgba(255,255,255,0.10)',
            color: 'var(--tt-text-secondary)',
            flex: '0 0 auto'
          }
        },
        ttInitials(m.senderName)
      ),
      React.createElement(
        'div',
        {
          style: {
            maxWidth: '78%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMe ? 'flex-end' : 'flex-start'
          }
        },
        // sender label (small, like WhatsApp group chats)
        !isMe && React.createElement(
          'div',
          {
            style: {
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 4,
              paddingLeft: 6,
              paddingRight: 6,
              color: 'var(--tt-text-secondary)'
            }
          },
          header
        ),
        // bubble
        React.createElement(
          'div',
          {
            style: {
              backgroundColor: bubbleBg,
              color: bubbleColor,
              borderRadius: 22,
              padding: '10px 14px',
              boxShadow: isMe ? '0 1px 0 rgba(0,0,0,0.25)' : 'none',
              border: isMe ? 'none' : '1px solid rgba(255,255,255,0.06)'
            }
          },
          (m.photoURLs && m.photoURLs.length > 0) && React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: (m.text && m.text.trim()) ? 8 : 0 } },
            m.photoURLs.map((url, i) =>
              React.createElement('img', {
                key: i,
                src: url,
                alt: 'photo',
                style: {
                  width: 240,
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 14,
                  display: 'block'
                }
              })
            )
          ),
          (m.text && m.text.trim()) && React.createElement(
            'div',
            { style: { fontSize: 15, whiteSpace: 'pre-wrap' } },
            ttRenderTextWithMentions(m.text)
          ),
          React.createElement(
            'div',
            {
              style: {
                fontSize: 10,
                marginTop: 6,
                color: timeColor,
                textAlign: isMe ? 'right' : 'left'
              }
            },
            ttFormatTimeShort(m.createdAtMs)
          )
        )
      )
    );
  };

  if (initializing) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement('div', { style: { color: 'var(--tt-text-secondary)' } }, 'Loading chats.')
    );
  }

  const heightStyle = { height: 'calc(100vh - 170px)' };
  const composerBg = 'var(--tt-input-bg)';

  return React.createElement(
    'div',
    { className: 'flex flex-col', style: heightStyle },

    // header
    React.createElement(
      'div',
      { className: 'flex items-center justify-between px-4 pt-2 pb-2' },
      React.createElement(
        'div',
        { className: 'flex items-center gap-2' },
        view === 'chat' && React.createElement(
          'button',
          {
            className: 'tt-tapable rounded-full p-2',
            style: { color: 'var(--tt-text-secondary)' },
            onClick: () => {
              // when leaving a chat, mark it as read (based on the newest message we have)
              const newest = messages.length
                ? Math.max(...messages.map(m => Number(m.createdAtMs || 0)).filter(v => v > 1000))
                : 0;
              if (activeChat?.id && newest) safeLastReadWrite(activeChat.id, newest);
              setView('list'); setActiveChat(null); setMessages([]);
              // refresh list so dots/timestamps update
              loadChats();
            }
          },
          React.createElement(TTBackChevron, null)
        ),
        React.createElement(
          'div',
          { className: 'font-semibold', style: { color: 'var(--tt-text-primary)' } },
          view === 'chat' ? (activeChat?.name || 'Chat') : 'Chats'
        )
      ),
      view === 'list' && React.createElement(
        'button',
        {
          className: 'tt-tapable rounded-full p-2',
          style: { color: 'var(--tt-text-secondary)' },
          onClick: createChat,
          title: 'New chat'
        },
        React.createElement(TTNewChatIcon, null)
      )
    ),

    // body
    view === 'list'
      ? React.createElement(
          'div',
          { className: 'flex-1 overflow-y-auto px-4 pb-4 space-y-3', style: { minHeight: 0 } },
          chats.map((c) =>
            React.createElement(ChatRow, {
              key: c.id,
              chat: c,
              isUnread: isUnread(c),
              onOpen: openChat,
              onDelete: deleteChat
            })
          )
        )
      : React.createElement(
          React.Fragment,
          null,
          React.createElement(
            'div',
            {
              ref: messagesRef,
              className: 'flex-1 overflow-y-auto px-4 py-3 space-y-3',
              style: { minHeight: 0 }
            },
            messages.length === 0 && React.createElement(
              'div',
              { className: 'text-sm px-2', style: { color: 'var(--tt-text-secondary)' } },
              'This is your family chat. Mention @tinytracker to ask the AI.'
            ),
            messages.map(renderBubble)
          ),

          // composer: iMessage style (icons inside pill)
          React.createElement(
            'div',
            { className: 'border-t px-4 py-3', style: { borderColor: 'var(--tt-divider)' } },
            React.createElement(
              'div',
              {
                className: 'tt-tapable',
                style: {
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '9999px',
                  border: '1px solid var(--tt-divider)',
                  backgroundColor: composerBg
                }
              },

              // photo button (inside pill, left)
              React.createElement(
                'button',
                {
                  onClick: onSendPhoto,
                  disabled: sending,
                  title: 'Photo',
                  className: 'tt-tapable',
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--tt-text-secondary)',
                    opacity: sending ? 0.5 : 1,
                    flex: '0 0 auto'
                  }
                },
                React.createElement(TTPhotoIcon, null)
              ),

              // textarea (flexes; autosize)
              React.createElement('textarea', {
                value: input,
                placeholder: 'Message…',
                rows: 1,
                disabled: sending,
                onChange: (e) => {
                  setInput(e.target.value);
                  // autosize
                  try {
                    e.target.style.height = '0px';
                    const next = Math.min(120, Math.max(36, e.target.scrollHeight));
                    e.target.style.height = next + 'px';
                  } catch {}
                },
                onKeyDown: (e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage({ text: input });
                  }
                },
                style: {
                  flex: '1 1 auto',
                  resize: 'none',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--tt-text-primary)',
                  fontSize: '14px',
                  lineHeight: '18px',
                  padding: '9px 4px',
                  minHeight: '36px',
                  maxHeight: '120px',
                  overflowY: 'auto'
                }
              })
,
              // send button (inside pill, right)
              React.createElement(
                'button',
                {
                  onClick: () => sendMessage({ text: input }),
                  disabled: sending || !input.trim(),
                  title: 'Send',
                  className: 'tt-tapable',
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.primary,
                    color: 'white',
                    opacity: (sending || !input.trim()) ? 0.55 : 1,
                    flex: '0 0 auto'
                  }
                },
                React.createElement(
                  'svg',
                  { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
                  React.createElement('path', { d: 'M22 2L11 13' }),
                  React.createElement('path', { d: 'M22 2L15 22L11 13L2 9L22 2Z' })
                )
              )
            )
          )
        )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.AIChatTab = AIChatTab;
