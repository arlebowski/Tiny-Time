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
      viewBox: "0 0 256 256",
      fill: "currentColor"
    },
    React.createElement('path', {
      d: "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z"
    })
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

const TTSendIcon = (props) =>
  React.createElement(
    'svg',
    {
      ...props,
      xmlns: "http://www.w3.org/2000/svg",
      width: "18",
      height: "18",
      viewBox: "0 0 256 256",
      fill: "currentColor"
    },
    React.createElement('path', {
      d: "M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z"
    })
  );

const TTXIcon = (props) =>
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
    React.createElement('path', { d: "M18 6 6 18" }),
    React.createElement('path', { d: "m6 6 12 12" })
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
        fontWeight: 600,
        backgroundColor: 'var(--tt-input-bg)',
        border: '1px solid var(--tt-divider)',
        color: 'var(--tt-text-primary)',
        flex: '0 0 auto'
      }
    },
    label
  );
}

function ttChatAvatar(chat) {
  // iOS-ish: Family chat gets a special dual-circle icon, others get single initials
  if (chat?.id === 'family') {
    return React.createElement(
      'div',
      { style: { position: 'relative', width: 44, height: 44, flex: '0 0 auto' } },
      React.createElement('div', { 
        style: { 
          position: 'absolute', 
          left: 0, 
          top: 0,
          width: 32,
          height: 32,
          borderRadius: 9999,
          backgroundColor: 'var(--tt-input-bg)',
          border: '1.5px solid var(--tt-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--tt-text-primary)'
        } 
      }, 'F'),
      React.createElement('div', { 
        style: { 
          position: 'absolute', 
          right: 0, 
          bottom: 0,
          width: 32,
          height: 32,
          borderRadius: 9999,
          backgroundColor: 'var(--tt-input-bg)',
          border: '1.5px solid var(--tt-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--tt-text-primary)'
        } 
      }, 'TT')
    );
  }
  return ttAvatarCircle({ label: ttInitials(chat?.name || 'Chat'), size: 44 });
}

const ChatRow = ({ chat, isUnread, onOpen, onDelete }) => {
  if (window.TT?.shared?.TTSwipeRow) {
    const Row = window.TT.shared.TTSwipeRow;
    return React.createElement(Row, {
      entry: {
        id: chat.id,
        notes: null,
        photoURLs: [],
        timestamp: chat.lastMessage?.createdAtMs || null,
        startTime: null,
        endTime: null,
        isActive: false,
        sleepType: null,
        ounces: 0
      },
      mode: 'feed',
      variant: 'chat',
      chat: { ...chat, isUnread },
      showIcon: false,
      showText: false,
      showChevron: true,
      enableExpansion: false,
      enableSwipeDelete: !!onDelete,
      onClick: () => onOpen(chat),
      onDelete: onDelete ? () => onDelete(chat.id) : null
    });
  }
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const itemRef = React.useRef(null);
  const touchStartRef = React.useRef({ x: 0, y: 0 });
  
  const SWIPE_THRESHOLD = 80;
  const DELETE_BUTTON_WIDTH = 80;
  const DELETE_BUTTON_MAX_WIDTH = 100;
  const canDelete = chat.id !== 'family';

  // Reset swipe state when chat changes
  React.useEffect(() => { 
    setSwipeOffset(0); 
    setIsSwiping(false); 
    touchStartRef.current = { x: 0, y: 0 };
  }, [chat?.id]);

  // Reset swipe when clicking elsewhere
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (itemRef.current && !itemRef.current.contains(e.target) && swipeOffset < 0) {
        setSwipeOffset(0);
      }
    };
    if (swipeOffset < 0) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [swipeOffset]);

  const handleTouchStart = (e) => {
    if (!canDelete) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (!canDelete || !touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Only handle horizontal swipes (more horizontal than vertical)
    if (Math.abs(deltaX) > deltaY && deltaX < 0) {
      setIsSwiping(true);
      // Allow swiping beyond delete button for full-swipe delete
      const newOffset = Math.max(-DELETE_BUTTON_WIDTH * 2, deltaX);
      setSwipeOffset(newOffset);
    }
  };

  const handleTouchEnd = () => {
    if (!canDelete || !isSwiping) {
      touchStartRef.current = { x: 0, y: 0 };
      return;
    }
    
    // Full swipe delete (swiped past delete button width)
    if (swipeOffset < -DELETE_BUTTON_WIDTH * 1.5) {
      if (navigator.vibrate) navigator.vibrate(10);
      setSwipeOffset(0);
      setIsSwiping(false);
      touchStartRef.current = { x: 0, y: 0 };
      onDelete(chat.id);
    } else if (swipeOffset < -SWIPE_THRESHOLD) {
      // Partial swipe - reveal delete button
      if (navigator.vibrate) navigator.vibrate(5);
      setSwipeOffset(-DELETE_BUTTON_WIDTH);
      setIsSwiping(false);
      touchStartRef.current = { x: 0, y: 0 };
    } else {
      // Snap back
      setSwipeOffset(0);
      setIsSwiping(false);
      touchStartRef.current = { x: 0, y: 0 };
    }
  };

  // Add non-passive touch listeners
  React.useEffect(() => {
    if (!canDelete) return;
    const element = itemRef.current;
    if (!element) return;
    
    const swipeableElement = element.querySelector('.swipeable-content');
    if (!swipeableElement) return;
    
    const touchMoveHandler = (e) => {
      if (!touchStartRef.current) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      if (Math.abs(deltaX) > deltaY && deltaX < 0) {
        setIsSwiping(true);
        e.preventDefault();
        const newOffset = Math.max(-DELETE_BUTTON_WIDTH * 2, deltaX);
        setSwipeOffset(newOffset);
      }
    };
    
    swipeableElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    swipeableElement.addEventListener('touchmove', touchMoveHandler, { passive: false });
    swipeableElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      swipeableElement.removeEventListener('touchstart', handleTouchStart);
      swipeableElement.removeEventListener('touchmove', touchMoveHandler);
      swipeableElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canDelete, swipeOffset]);

  const handleClick = (e) => {
    // Don't trigger onClick if swiping or delete button is visible
    if (isSwiping || swipeOffset < 0) {
      e.stopPropagation();
      setSwipeOffset(0);
      return;
    }
    onOpen(chat);
  };

  const lastMsgText = chat.lastMessage?.text || '';
  const preview = lastMsgText.length > 50 ? lastMsgText.slice(0, 50) + '…' : lastMsgText;

  return React.createElement(
    'div',
    {
      ref: itemRef,
      className: 'relative overflow-hidden rounded-2xl',
      style: { touchAction: 'pan-y' }
    },
    // Swipeable content wrapper
    React.createElement(
      'div',
      {
        className: 'swipeable-content rounded-2xl cursor-pointer transition-colors duration-150 tt-tapable',
        style: {
          backgroundColor: 'var(--tt-subtle-surface)',
          position: 'relative',
          transition: isSwiping 
            ? 'none' 
            : 'transform 0.4s cubic-bezier(0.2, 0, 0, 1)',
          zIndex: 1,
          overflow: 'hidden'
        },
        onClick: handleClick
      },
      // Main content wrapper
      React.createElement(
        'div',
        {
          className: 'p-4',
          style: { 
            transform: swipeOffset < 0 
              ? `translateX(${swipeOffset}px)`
              : 'translateX(0px)',
            transition: isSwiping 
              ? 'none' 
              : 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
          }
        },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between' },
          React.createElement(
            'div',
            { className: 'flex items-center gap-3 flex-1 min-w-0' },
            ttChatAvatar(chat),
            React.createElement(
              'div',
              { className: 'flex-1 min-w-0' },
              React.createElement(
                'div',
                { className: 'flex items-center justify-between mb-1' },
                React.createElement(
                  'div',
                  { 
                    className: 'font-semibold truncate',
                    style: { color: 'var(--tt-text-primary)' }
                  },
                  chat.name
                ),
                chat.lastMessage?.createdAtMs && React.createElement(
                  'div',
                  { 
                    className: 'text-xs ml-2',
                    style: { color: 'var(--tt-text-secondary)', flex: '0 0 auto' }
                  },
                  ttFormatTimeShort(chat.lastMessage.createdAtMs)
                )
              ),
              React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement(
                  'div',
                  { 
                    className: 'text-sm truncate',
                    style: { color: 'var(--tt-text-secondary)', flex: '1 1 auto' }
                  },
                  preview || 'No messages yet'
                ),
                isUnread && React.createElement('div', {
                  style: {
                    width: 8,
                    height: 8,
                    borderRadius: 9999,
                    backgroundColor: '#007AFF', // iOS blue
                    flex: '0 0 auto'
                  }
                })
              )
            )
          ),
          // Hide chevron when swiped
          swipeOffset >= -SWIPE_THRESHOLD && React.createElement(TTChevronRight, { 
            style: { 
              color: 'var(--tt-text-secondary)',
              flex: '0 0 auto'
            }
          })
        )
      ),
      // Delete button - absolutely positioned on right, expands inward from right edge
      canDelete && React.createElement(
        'div',
        {
          className: 'absolute right-0 top-0 bottom-0 flex items-center justify-center rounded-r-2xl',
          style: {
            width: swipeOffset < 0 
              ? (() => {
                  const absOffset = Math.abs(swipeOffset);
                  if (absOffset <= DELETE_BUTTON_WIDTH) {
                    return `${absOffset}px`;
                  } else {
                    const extra = absOffset - DELETE_BUTTON_WIDTH;
                    return `${Math.min(DELETE_BUTTON_MAX_WIDTH, DELETE_BUTTON_WIDTH + extra * 0.3)}px`;
                  }
                })()
              : '0px',
            backgroundColor: '#ef4444',
            transition: isSwiping 
              ? 'none' 
              : 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: swipeOffset < 0 ? Math.min(1, Math.abs(swipeOffset) / 60) : 0,
            overflow: 'hidden'
          }
        },
        React.createElement(
          'button',
          {
            onClick: (e) => {
              e.stopPropagation();
              onDelete(chat.id);
            },
            style: {
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              padding: '0 16px',
              whiteSpace: 'nowrap',
              opacity: swipeOffset < -40 ? 1 : 0,
              transition: 'opacity 0.2s ease-out'
            }
          },
          'Delete'
        )
      )
    )
  );
};

const AIChatTab = ({ theme = { primary: 'var(--tt-primary)' } }) => {
  ttEnsureTapStyles();

  const [view, setView] = React.useState('list');
  const [chats, setChats] = React.useState([]);
  const [activeChat, setActiveChat] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const [lastReadMap, setLastReadMap] = React.useState({});
  const [pendingPhoto, setPendingPhoto] = React.useState(null);
  const [familyReadReceipts, setFamilyReadReceipts] = React.useState({}); // { userId: timestamp }
  const messagesRef = React.useRef(null);
  const unsubChatsRef = React.useRef(null);
  const unsubMsgsRef = React.useRef(null);
  const unsubReadReceiptsRef = React.useRef(null);

  const db = ttGetDb();
  const userId = React.useMemo(() => {
    const fb = ttGetFirebase();
    const uid = fb?.auth?.()?.currentUser?.uid || null;
    console.log('AIChatTab: Firebase check', { 
      hasFirebase: !!fb, 
      hasAuth: !!fb?.auth, 
      hasUser: !!fb?.auth?.()?.currentUser,
      userId: uid 
    });
    return uid;
  }, []);

  // Get user profile info (name and photo from Google)
  const [userProfiles, setUserProfiles] = React.useState({});
  
  React.useEffect(() => {
    const fb = ttGetFirebase();
    const currentUser = fb?.auth?.()?.currentUser;
    if (currentUser) {
      setUserProfiles(prev => ({
        ...prev,
        [currentUser.uid]: {
          name: currentUser.displayName || 'You',
          photoURL: currentUser.photoURL || null
        }
      }));
    }
  }, [userId]);

  React.useEffect(() => {
    console.log('AIChatTab mounted', { hasDb: !!db, userId });
  }, []);

  React.useEffect(() => {
    if (!db || !userId) return;
    const docRef = db.collection('userPrefs').doc(userId);
    docRef.get().then((snap) => {
      if (snap.exists) {
        const d = snap.data();
        setLastReadMap(d?.chatLastRead || {});
      }
    }).catch(() => {});
  }, [db, userId]);

  const safeLastReadWrite = React.useCallback((chatId, ms) => {
    if (!db || !userId || !chatId || !ms) return;
    const docRef = db.collection('userPrefs').doc(userId);
    docRef.set({ chatLastRead: { [chatId]: ms } }, { merge: true }).catch(() => {});
  }, [db, userId]);

  const loadChats = React.useCallback(async () => {
    if (!db || !userId) {
      console.log('loadChats: no db or userId', { db: !!db, userId });
      return;
    }
    if (unsubChatsRef.current) unsubChatsRef.current();
    
    try {
      // Ensure family chat exists in Firestore
      const familyRef = db.collection('chats').doc('family');
      const familySnap = await familyRef.get();
      if (!familySnap.exists) {
        console.log('Creating family chat...');
        await familyRef.set({
          name: 'Family',
          members: [userId],
          createdAt: ttServerTimestamp(),
          updatedAt: new Date(),
          lastMessage: null
        });
        console.log('Family chat created');
      } else {
        console.log('Family chat already exists');
      }
      
      // Query all chats - try without orderBy first to avoid index issues
      const q = db.collection('chats').where('members', 'array-contains', userId);
      unsubChatsRef.current = q.onSnapshot((snap) => {
        console.log('Chats snapshot:', snap.docs.length, 'docs');
        const arr = snap.docs.map((d) => {
          const data = d.data();
          console.log('Chat doc:', d.id, data);
          return { id: d.id, ...data };
        });
        
        // Sort manually: family first, then by updatedAt
        const familyChat = arr.find(c => c.id === 'family');
        const otherChats = arr.filter(c => c.id !== 'family').sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || a.updatedAt?.getTime?.() || 0;
          const bTime = b.updatedAt?.toMillis?.() || b.updatedAt?.getTime?.() || 0;
          return bTime - aTime;
        });
        const sortedChats = familyChat ? [familyChat, ...otherChats] : otherChats;
        
        console.log('Setting chats:', sortedChats.length, sortedChats.map(c => c.id));
        setChats(sortedChats);
        setInitializing(false);
      }, (error) => { 
        console.error('Chats snapshot error:', error);
        setInitializing(false); 
      });
    } catch (error) {
      console.error('loadChats error:', error);
      setInitializing(false);
    }
  }, [db, userId]);

  React.useEffect(() => {
    loadChats();
    return () => { if (unsubChatsRef.current) unsubChatsRef.current(); };
  }, [loadChats]);

  const openChat = React.useCallback((chat) => {
    if (!db || !userId) return;
    console.log('Opening chat:', chat.id, chat.name);
    setActiveChat(chat);
    setView('chat');
    setMessages([]);
    
    // Unsubscribe from previous chat messages
    if (unsubMsgsRef.current) unsubMsgsRef.current();
    
    // Unsubscribe from previous read receipts
    if (unsubReadReceiptsRef.current) unsubReadReceiptsRef.current();
    
    // Subscribe to messages
    const q = db.collection('chats').doc(chat.id).collection('messages').orderBy('createdAt', 'asc');
    unsubMsgsRef.current = q.onSnapshot((snap) => {
      console.log('Messages snapshot for', chat.id, ':', snap.docs.length, 'messages');
      const arr = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAtMs: ttToMillis(data.createdAt)
        };
      });
      console.log('Setting messages:', arr);
      setMessages(arr);
      setTimeout(() => {
        if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }, 50);
    }, (error) => {
      console.error('Messages snapshot error:', error);
    });
    
    // Subscribe to all family members' read receipts
    // Get all members from the chat
    if (chat.members && Array.isArray(chat.members)) {
      const unsubscribers = [];
      
      chat.members.forEach(memberId => {
        if (memberId === userId) return; // Skip current user
        
        const unsubMember = db.collection('userPrefs').doc(memberId)
          .onSnapshot((doc) => {
            if (doc.exists) {
              const data = doc.data();
              const memberLastRead = data?.chatLastRead?.[chat.id] || 0;
              setFamilyReadReceipts(prev => ({
                ...prev,
                [memberId]: memberLastRead
              }));
            }
          });
        
        unsubscribers.push(unsubMember);
      });
      
      // Store combined unsubscriber
      unsubReadReceiptsRef.current = () => {
        unsubscribers.forEach(unsub => unsub());
      };
    }
  }, [db, userId]);

  const createChat = React.useCallback(async () => {
    if (!db || !userId) {
      console.log('createChat: no db or userId');
      return;
    }
    const name = prompt('Chat name:');
    if (!name || !name.trim()) {
      console.log('createChat: no name provided');
      return;
    }
    try {
      console.log('Creating new chat:', name.trim());
      const chatRef = db.collection('chats').doc();
      await chatRef.set({
        name: name.trim(),
        members: [userId],
        createdAt: ttServerTimestamp(),
        updatedAt: new Date(),
        lastMessage: null
      });
      console.log('Chat created successfully:', chatRef.id);
      loadChats();
    } catch (error) {
      console.error('createChat error:', error);
      alert('Failed to create chat: ' + error.message);
    }
  }, [db, userId, loadChats]);

  const deleteChat = React.useCallback(async (chatId) => {
    if (!db || chatId === 'family') return;
    const sure = confirm('Delete this chat?');
    if (!sure) return;
    await db.collection('chats').doc(chatId).delete();
    loadChats();
  }, [db, loadChats]);

  const sendMessage = React.useCallback(async ({ text, photoURLs }) => {
    if (!db || !userId || !activeChat) return;
    if (!text?.trim() && (!photoURLs || photoURLs.length === 0)) return;
    setSending(true);
    try {
      // Upload photo if it's a data URL
      let finalPhotoURLs = photoURLs || [];
      if (photoURLs && photoURLs.length > 0) {
        const uploadedURLs = [];
        for (const url of photoURLs) {
          if (url.startsWith('data:')) {
            // It's a data URL, upload it
            if (window.firestoreStorage?.uploadBase64) {
              const uploaded = await window.firestoreStorage.uploadBase64(url, 'chat-photos');
              uploadedURLs.push(uploaded?.url || url);
            } else {
              uploadedURLs.push(url);
            }
          } else {
            uploadedURLs.push(url);
          }
        }
        finalPhotoURLs = uploadedURLs;
      }

      const chatRef = db.collection('chats').doc(activeChat.id);
      const msgRef = chatRef.collection('messages').doc();
      const msgData = {
        senderId: userId,
        text: text?.trim() || '',
        photoURLs: finalPhotoURLs,
        createdAt: ttServerTimestamp()
      };
      await msgRef.set(msgData);
      await chatRef.set({
        updatedAt: ttServerTimestamp(),
        lastMessage: {
          text: text?.trim() || (finalPhotoURLs?.length ? '[Photo]' : ''),
          senderId: userId,
          createdAt: ttServerTimestamp()
        }
      }, { merge: true });

      if (ttIsTinyMention(text)) {
        const recentMsgs = messages.slice(-5).map(m => m.text).join('\n');
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyAMQF8q_cQ3QK2BsVJvX_d7x_KVEz8KnKU`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${recentMsgs}\n${text}` }] }]
            })
          }
        );
        const geminiData = await geminiResp.json();
        const aiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
        const aiMsgRef = chatRef.collection('messages').doc();
        await aiMsgRef.set({
          senderId: 'ai',
          text: aiText,
          photoURLs: [],
          createdAt: ttServerTimestamp()
        });
        await chatRef.set({
          updatedAt: ttServerTimestamp(),
          lastMessage: {
            text: aiText,
            senderId: 'ai',
            createdAt: ttServerTimestamp()
          }
        }, { merge: true });
      }
      setInput('');
      setPendingPhoto(null);
    } catch (e) {
      console.error('Send message error:', e);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  }, [db, userId, activeChat, messages]);

  const onSendPhoto = React.useCallback(async () => {
    if (sending) return;
    try {
      const dataUrl = await ttPickImageAsDataURL();
      if (!dataUrl) return;
      setPendingPhoto(dataUrl);
    } catch (e) {
      console.error('Photo selection error:', e);
      alert('Failed to select photo.');
    }
  }, [sending]);

  const isUnread = React.useCallback((chat) => {
    if (!chat.lastMessage) return false;
    const lastMsgMs = ttToMillis(chat.lastMessage.createdAt);
    if (!lastMsgMs) return false;
    const lastRead = lastReadMap[chat.id] || 0;
    // Only unread if the last message was sent by someone else AND it's newer than last read
    const wasNotMe = chat.lastMessage.senderId !== userId;
    return wasNotMe && lastMsgMs > lastRead;
  }, [lastReadMap, userId]);

  const renderBubble = (m) => {
    const isMe = m.senderId === userId;
    const isAI = m.senderId === 'ai';
    
    // Get sender info
    const senderProfile = isAI 
      ? { name: 'Tiny Tracker', photoURL: null }
      : userProfiles[m.senderId] || { name: 'Unknown', photoURL: null };
    
    // Apple Messages bubble styling
    const bubbleRadius = '18px';
    
    // Different colors for sent vs received
    // Use --tt-feed as the accent color for sent messages (matches app's primary color)
    const bgColor = isMe ? 'var(--tt-feed)' : 'var(--tt-subtle-surface)';
    const textColor = isMe ? 'white' : 'var(--tt-text-primary)';
    const timeColor = isMe ? 'rgba(255,255,255,0.7)' : 'var(--tt-text-tertiary)';
    
    // Avatar component
    const avatar = React.createElement(
      'div',
      {
        style: {
          width: 32,
          height: 32,
          borderRadius: 9999,
          overflow: 'hidden',
          backgroundColor: 'var(--tt-input-bg)',
          border: '1px solid var(--tt-divider)',
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      },
      senderProfile.photoURL 
        ? React.createElement('img', {
            src: senderProfile.photoURL,
            alt: senderProfile.name,
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }
          })
        : React.createElement('div', {
            style: {
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--tt-text-primary)'
            }
          }, isAI ? 'TT' : ttInitials(senderProfile.name))
    );

    return React.createElement(
      'div',
      { 
        key: m.id, 
        style: { 
          display: 'flex', 
          flexDirection: isMe ? 'row-reverse' : 'row',
          gap: 8,
          alignItems: 'flex-end',
          marginBottom: 12
        } 
      },
      // Avatar (only show for received messages)
      !isMe && avatar,
      // Bubble container
      React.createElement(
        'div',
        {
          style: {
            maxWidth: '75%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMe ? 'flex-end' : 'flex-start'
          }
        },
        // Bubble
        React.createElement(
          'div',
          {
            style: {
              padding: '10px 14px',
              borderRadius: bubbleRadius,
              borderTopRightRadius: isMe ? '4px' : bubbleRadius,
              borderTopLeftRadius: isMe ? bubbleRadius : '4px',
              backgroundColor: bgColor,
              color: textColor,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              position: 'relative'
            }
          },
          // Photos
          (m.photoURLs && m.photoURLs.length > 0) && React.createElement(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: (m.text && m.text.trim()) ? 8 : 0 } },
            m.photoURLs.map((url, i) =>
              React.createElement('img', {
                key: i,
                src: url,
                alt: 'photo',
                style: {
                  maxWidth: 240,
                  width: '100%',
                  height: 'auto',
                  borderRadius: 12,
                  display: 'block',
                  cursor: 'pointer'
                }
              })
            )
          ),
          // Text content
          (m.text && m.text.trim()) && React.createElement(
            'div',
            { style: { fontSize: 15, lineHeight: '20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' } },
            ttRenderTextWithMentions(m.text)
          )
        ),
        // Timestamp
        React.createElement(
          'div',
          {
            style: {
              fontSize: 11,
              marginTop: 2,
              color: 'var(--tt-text-tertiary)',
              paddingLeft: isMe ? 0 : 4,
              paddingRight: isMe ? 4 : 0
            }
          },
          ttFormatTimeShort(m.createdAtMs)
        ),
        // Read receipt (only for messages you sent)
        isMe && (() => {
          // Check if anyone has read this message
          const readBy = Object.entries(familyReadReceipts).filter(([memberId, lastRead]) => {
            return lastRead >= m.createdAtMs;
          });
          
          if (readBy.length > 0) {
            return React.createElement(
              'div',
              {
                style: {
                  fontSize: 11,
                  marginTop: 2,
                  color: 'var(--tt-text-tertiary)',
                  paddingRight: 4
                }
              },
              'Read'
            );
          }
          return null;
        })()
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
      { className: 'flex items-center justify-between pt-2 pb-2' },
      React.createElement(
        'div',
        { 
          className: 'flex items-center gap-2',
          style: view === 'list' ? { paddingLeft: 12 } : undefined
        },
        view === 'chat' && React.createElement(
          'button',
          {
            className: 'tt-tapable rounded-full p-2',
            style: { color: 'var(--tt-text-secondary)' },
            onClick: () => {
              const newest = messages.length
                ? Math.max(...messages.map(m => Number(m.createdAtMs || 0)).filter(v => v > 1000))
                : 0;
              if (activeChat?.id && newest) safeLastReadWrite(activeChat.id, newest);
              setView('list'); 
              setActiveChat(null); 
              setMessages([]);
              setFamilyReadReceipts({}); // Clear read receipts
              if (unsubReadReceiptsRef.current) unsubReadReceiptsRef.current(); // Cleanup
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
          style: { color: 'var(--tt-text-primary)', marginRight: 3 },
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
          { className: 'flex-1 overflow-y-auto pb-4 space-y-3', style: { minHeight: 0 } },
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
              className: 'flex-1 overflow-y-auto px-4 py-3',
              style: { minHeight: 0 }
            },
            messages.length === 0 && React.createElement(
              'div',
              { className: 'text-sm px-2', style: { color: 'var(--tt-text-secondary)' } },
              'This is your family chat. Mention @tinytracker to ask the AI.'
            ),
            messages.map(renderBubble)
          ),

          // Photo preview (above composer, like Apple Messages)
          pendingPhoto && React.createElement(
            'div',
            { 
              className: 'border-t px-4 py-3',
              style: { borderColor: 'var(--tt-divider)' }
            },
            React.createElement(
              'div',
              {
                className: 'aspect-square rounded-2xl border relative',
                style: { 
                  backgroundColor: 'var(--tt-input-bg)', 
                  borderColor: 'var(--tt-card-border)', 
                  width: '80px', 
                  height: '80px',
                  cursor: 'pointer'
                }
              },
              React.createElement('img', {
                src: pendingPhoto,
                alt: 'Selected photo',
                className: 'w-full h-full object-cover rounded-2xl'
              }),
              React.createElement(
                'button',
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    setPendingPhoto(null);
                  },
                  className: 'absolute -top-2 -right-2 w-6 h-6 bg-black rounded-full flex items-center justify-center z-10'
                },
                React.createElement(TTXIcon, { className: 'w-3.5 h-3.5 text-white' })
              )
            )
          ),

          // composer
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

              // photo button
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

              // textarea
              React.createElement('textarea', {
                value: input,
                placeholder: 'Message…',
                rows: 1,
                disabled: sending,
                onChange: (e) => {
                  setInput(e.target.value);
                  try {
                    e.target.style.height = '0px';
                    const next = Math.min(120, Math.max(36, e.target.scrollHeight));
                    e.target.style.height = next + 'px';
                  } catch {}
                },
                onKeyDown: (e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const hasContent = input.trim() || pendingPhoto;
                    if (hasContent) {
                      sendMessage({ 
                        text: input, 
                        photoURLs: pendingPhoto ? [pendingPhoto] : [] 
                      });
                    }
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
              }),

              // send button
              React.createElement(
                'button',
                {
                  onClick: () => {
                    const hasContent = input.trim() || pendingPhoto;
                    if (hasContent) {
                      sendMessage({ 
                        text: input, 
                        photoURLs: pendingPhoto ? [pendingPhoto] : [] 
                      });
                    }
                  },
                  disabled: sending || (!input.trim() && !pendingPhoto),
                  title: 'Send',
                  className: 'tt-tapable',
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--tt-feed)',
                    color: 'white',
                    opacity: (sending || (!input.trim() && !pendingPhoto)) ? 0.55 : 1,
                    flex: '0 0 auto'
                  }
                },
                React.createElement(TTSendIcon, null)
              )
            )
          )
        )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.AIChatTab = AIChatTab;

// Helper function to get unread chat count (for nav badge)
// This can be called from your main app to show a badge on the Chat tab icon
window.TT.tabs.getUnreadChatCount = async () => {
  try {
    const fb = typeof window !== 'undefined' && window.firebase ? window.firebase : null;
    if (!fb || !fb.firestore) return 0;
    
    const db = fb.firestore();
    const userId = fb.auth?.()?.currentUser?.uid;
    if (!userId) return 0;
    
    // Get user's last read times
    const userPrefsDoc = await db.collection('userPrefs').doc(userId).get();
    const lastReadMap = userPrefsDoc.exists ? (userPrefsDoc.data()?.chatLastRead || {}) : {};
    
    // Get all chats
    const chatsSnapshot = await db.collection('chats')
      .where('members', 'array-contains', userId)
      .get();
    
    let unreadCount = 0;
    chatsSnapshot.forEach(doc => {
      const chat = doc.data();
      if (!chat.lastMessage) return;
      
      const lastMsgMs = chat.lastMessage.createdAt?.toMillis?.() || 
                       (chat.lastMessage.createdAt?.seconds * 1000) || 0;
      if (!lastMsgMs) return;
      
      const lastRead = lastReadMap[doc.id] || 0;
      const wasNotMe = chat.lastMessage.senderId !== userId;
      
      if (wasNotMe && lastMsgMs > lastRead) {
        unreadCount++;
      }
    });
    
    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Real-time subscription for unread count (better for nav badge)
// Usage: const unsubscribe = window.TT.tabs.subscribeToUnreadCount((count) => { setBadgeCount(count); });
window.TT.tabs.subscribeToUnreadCount = (callback) => {
  try {
    const fb = typeof window !== 'undefined' && window.firebase ? window.firebase : null;
    if (!fb || !fb.firestore) {
      callback(0);
      return () => {};
    }
    
    const db = fb.firestore();
    const userId = fb.auth?.()?.currentUser?.uid;
    if (!userId) {
      callback(0);
      return () => {};
    }
    
    let lastReadMap = {};
    let chatsData = [];
    
    // Subscribe to user prefs for last read times
    const unsubPrefs = db.collection('userPrefs').doc(userId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          lastReadMap = doc.data()?.chatLastRead || {};
          calculateAndNotify();
        }
      });
    
    // Subscribe to chats
    const unsubChats = db.collection('chats')
      .where('members', 'array-contains', userId)
      .onSnapshot((snapshot) => {
        chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        calculateAndNotify();
      });
    
    const calculateAndNotify = () => {
      let unreadCount = 0;
      chatsData.forEach(chat => {
        if (!chat.lastMessage) return;
        
        const lastMsgMs = chat.lastMessage.createdAt?.toMillis?.() || 
                         (chat.lastMessage.createdAt?.seconds * 1000) || 0;
        if (!lastMsgMs) return;
        
        const lastRead = lastReadMap[chat.id] || 0;
        const wasNotMe = chat.lastMessage.senderId !== userId;
        
        if (wasNotMe && lastMsgMs > lastRead) {
          unreadCount++;
        }
      });
      
      callback(unreadCount);
    };
    
    // Return cleanup function
    return () => {
      unsubPrefs();
      unsubChats();
    };
  } catch (error) {
    console.error('Error subscribing to unread count:', error);
    callback(0);
    return () => {};
  }
};