// AI Chat Tab - iMessage Style
// ========================================

// AI Chat Tab - iMessage Style
const AIChatTab = ({ user, kidId, familyId, themeKey = 'indigo' }) => {
  const theme = KID_THEMES[themeKey] || KID_THEMES.indigo;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(localStorage.getItem('aiChatDraft') || '');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = React.useRef(null);
  const messagesContainerRef = React.useRef(null);

  useEffect(() => {
    loadConversation();
  }, [kidId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!initializing) {
      scrollToBottom();
    }
  }, [initializing]);

  // persist draft input across tab/app switches
  useEffect(() => {
    localStorage.setItem('aiChatDraft', input);
  }, [input]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      // wait for layout to settle then jump to bottom
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 0);
    }
  };

  const loadConversation = async () => {
    if (!kidId) return;
    setInitializing(true);
    try {
      const conversation = await firestoreStorage.getConversation();
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
    setInitializing(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      await firestoreStorage.saveMessage(userMessage);
      const aiResponse = await getAIResponse(input.trim(), kidId);

      const assistantMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      await firestoreStorage.saveMessage(assistantMessage);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const handleClearConversation = async () => {
    if (!confirm('Clear all conversation history?')) return;
    try {
      await firestoreStorage.clearConversation();
      setMessages([]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const suggestedQuestions = [
    'How much should my baby be eating?',
    'Is cluster feeding normal?',
    'Why is my baby eating less today?',
    "What\'s a normal feeding schedule?"
  ];

  if (initializing) {
    return React.createElement(
      'div',
      { className: 'flex items-center justify-center py-12' },
      React.createElement(
        'div',
        { className: 'text-gray-600' },
        'Loading conversation.'
      )
    );
  }

  return React.createElement(
    'div',
    {
      className: 'flex flex-col',
      style: { height: 'calc(100vh - 160px)' } // viewport minus header + nav
    },

    // Top row – just Clear button on the right
    React.createElement(
      'div',
      { className: 'flex justify-end px-4 pt-2 pb-1' },
      messages.length > 0 &&
        React.createElement(
          'button',
          {
            onClick: handleClearConversation,
            className: 'text-[11px] underline underline-offset-2 hover:text-red-500',
            style: { color: 'var(--tt-text-secondary)' }
          },
          'Clear'
        )
    ),

    // Messages area
    React.createElement(
      'div',
      {
        ref: messagesContainerRef,
        className: 'flex-1 overflow-y-auto px-4 py-3 space-y-3',
        style: { minHeight: 0 }
      },

      // Empty-state intro + suggestions
      messages.length === 0 &&
        React.createElement(
          React.Fragment,
          null,

          // Intro bubble
          React.createElement(
            'div',
            { className: 'flex justify-start' },
            React.createElement(
              'div',
              {
                className: 'max-w-[75%] rounded-2xl px-4 py-3',
                style: { backgroundColor: 'var(--tt-input-bg)' }
              },
              React.createElement(
                'div',
                {
                  className: 'font-semibold text-sm mb-1',
                  style: { color: 'var(--tt-text-secondary)' }
                },
                'Tiny Tracker'
              ),
              React.createElement(
                'div',
                { style: { color: 'var(--tt-text-primary)' } },
                "Hi! I can help you understand your baby's feeding patterns. Ask me anything!"
              )
            )
          ),

          // Suggested questions
          React.createElement(
            'div',
            { className: 'flex justify-start mt-2' },
            React.createElement(
              'div',
              { className: 'max-w-[75%] space-y-2' },
              React.createElement(
                'div',
                {
                  className: 'text-xs px-2 mb-1',
                  style: { color: 'var(--tt-text-secondary)' }
                },
                'Try asking:'
              ),
              suggestedQuestions.map((q, i) =>
                React.createElement(
                  'button',
                  {
                    key: i,
                    onClick: () => setInput(q),
                    className: 'block w-full text-left px-4 py-2 border rounded-xl text-sm transition',
                    style: {
                      backgroundColor: 'var(--tt-card-bg)',
                      borderColor: 'var(--tt-card-border)',
                      color: 'var(--tt-feed)'
                    }
                  },
                  q
                )
              )
            )
          )
        ),

      // Conversation messages
      messages.map((message, index) =>
        React.createElement(
          'div',
          {
            key: index,
            className:
              'flex ' +
              (message.role === 'user'
                ? 'justify-end'
                : 'justify-start')
          },
          React.createElement(
            'div',
            {
              className: 'max-w-[75%] rounded-2xl px-4 py-3',
              style: message.role === 'user'
                ? { backgroundColor: 'var(--tt-feed)', color: 'white' }
                : message.error
                ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(185, 28, 28)' }
                : { backgroundColor: 'var(--tt-input-bg)', color: 'var(--tt-text-primary)' }
            },
            message.role === 'assistant' &&
              !message.error &&
              React.createElement(
                'div',
                {
                  className: 'font-semibold text-sm mb-1',
                  style: { color: 'var(--tt-text-secondary)' }
                },
                'Tiny Tracker'
              ),
            React.createElement(
              'div',
              {
                className:
                  'whitespace-pre-wrap text-[15px]'
              },
              message.content
            ),
            React.createElement(
              'div',
              {
                className: 'text-[11px] mt-1',
                style: { 
                  color: message.role === 'user'
                    ? 'rgba(255,255,255,0.7)'
                    : 'var(--tt-text-secondary)'
                }
              },
              formatTimestamp(message.timestamp)
            )
          )
        )
      ),

      // Loading indicator
      loading &&
        React.createElement(
          'div',
          { className: 'flex justify-start' },
          React.createElement(
            'div',
            {
              className: 'rounded-2xl px-4 py-3',
              style: { backgroundColor: 'var(--tt-input-bg)' }
            },
            React.createElement(
              'div',
              { className: 'flex gap-1' },
              React.createElement('div', {
                className: 'w-2 h-2 rounded-full animate-bounce',
                style: { 
                  backgroundColor: 'var(--tt-text-tertiary)',
                  animationDelay: '0ms' 
                }
              }),
              React.createElement('div', {
                className: 'w-2 h-2 rounded-full animate-bounce',
                style: { 
                  backgroundColor: 'var(--tt-text-tertiary)',
                  animationDelay: '150ms' 
                }
              }),
              React.createElement('div', {
                className: 'w-2 h-2 rounded-full animate-bounce',
                style: { 
                  backgroundColor: 'var(--tt-text-tertiary)',
                  animationDelay: '300ms' 
                }
              })
            )
          )
        ),

      React.createElement('div', { ref: messagesEndRef })
    ),

    // Input area
    React.createElement(
      'div',
      {
        className: 'px-4 pb-4 pt-2',
        style: { backgroundColor: theme.bg }
      },
      React.createElement(
        'div',
        {
          className: 'flex items-center gap-2 rounded-2xl px-3 py-1.5 border',
          style: {
            backgroundColor: 'var(--tt-card-bg)',
            borderColor: inputFocused ? theme.accent : 'var(--tt-card-border)',
            boxShadow: inputFocused ? `0 0 0 3px ${theme.soft || theme.bg}` : 'none'
          }
        },
        React.createElement('textarea', {
          value: input,
          onChange: (e) => {
            setInput(e.target.value);
            const el = e.target;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          },
          onFocus: () => setInputFocused(true),
          onBlur: () => setInputFocused(false),
          onKeyPress: (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          },
          placeholder: 'Message',
          disabled: loading,
          rows: 1,
          className:
            'flex-1 px-2 py-2 bg-transparent resize-none focus:outline-none text-[15px] disabled:opacity-50',
          style: { maxHeight: '100px' }
        }),
        React.createElement(
          'button',
          {
            onClick: handleSend,
            disabled: loading || !input.trim(),
            className:
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition',
            style: { backgroundColor: theme.accent }
          },
          React.createElement(
            'svg',
            {
              className: 'w-4 h-4 text-white',
              fill: 'currentColor',
              viewBox: '0 0 24 24'
            },
            React.createElement('path', {
              d: 'M2.01 21L23 12 2.01 3 2 10l15 2-15 2z'
            })
          )
        )
      )
    )
  );
};

window.TT = window.TT || {};
window.TT.tabs = window.TT.tabs || {};
window.TT.tabs.AIChatTab = AIChatTab;
