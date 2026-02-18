import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import soundManager from '../utils/sounds';

export default function GlobalChat({ identity }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Don't load old messages on startup - only show new messages from current session
  useEffect(() => {
    // Don't load old messages
    setIsLoading(false);

    // Add yourself to online users
    if (identity?.publicKey) {
      setOnlineUsers(new Set([identity.publicKey]));
    }

    // Check connection status
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 2000);
  }, [identity]);

  // Listen for incoming messages
  useEffect(() => {
    const unsubscribe = window.api.onGlobalMessage((message) => {
      console.log('Received global message:', message);
      setConnectionStatus('connected');

      // Track online users (users who sent messages in last 5 minutes)
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.add(message.publicKey);
        return updated;
      });

      setMessages((prevMessages) => {
        // Check if message already exists
        if (prevMessages.some(m => m.id === message.id)) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });
    });

    return unsubscribe;
  }, []);

  // Listen for connection status
  useEffect(() => {
    const unsubscribe = window.api.onConnectionStatus?.((statusData) => {
      console.log('🔌 Connection status event received:', statusData);
      // The event has structure: { status: 'online' | 'offline', relay, pingTime }
      if (statusData && statusData.status === 'online') {
        console.log('✅ Setting connectionStatus to: connected');
        setConnectionStatus('connected');
      } else {
        console.log('❌ Setting connectionStatus to: disconnected');
        setConnectionStatus('disconnected');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const result = await window.api.getGlobalMessages(100);
      if (result.success) {
        setMessages(result.messages || []);
      }
    } catch (error) {
      console.error('Failed to load global messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!inputText.trim() || isSending) {
      return;
    }

    const messageText = inputText.trim();
    console.log('GlobalChat: Sending message:', messageText);

    setInputText(''); // Clear input immediately
    setIsSending(true);

    // Reset textarea height and keep focus
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus(); // Keep focus after sending
    }

    try {
      const result = await window.api.sendGlobalMessage(messageText);
      console.log('GlobalChat: Send result:', result);

      if (!result.success) {
        console.error('GlobalChat: Failed to send message:', result.error);
        alert('Failed to send message: ' + result.error);
        setInputText(messageText); // Restore message on failure
      } else {
        console.log('GlobalChat: Message sent successfully');
        soundManager.messageSent();
      }
    } catch (error) {
      console.error('GlobalChat: Error sending message:', error);
      alert('Failed to send message: ' + (error.message || 'Unknown error'));
      setInputText(messageText); // Restore message on failure
    } finally {
      setIsSending(false);

      // Ensure focus returns to textarea after all state updates
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderMessages = () => {
    if (isLoading) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          Loading messages...
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>👋 Welcome to Global Chat!</p>
          <p>Say hello to the AiSeekTruth community.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '1rem' }}>This is a public channel - anyone can read your messages.</p>
        </div>
      );
    }

    let lastDate = null;
    return messages.map((message, index) => {
      const messageDate = new Date(message.timestamp).toDateString();
      const showDateSeparator = messageDate !== lastDate;
      lastDate = messageDate;

      const isOwnMessage = message.publicKey === identity?.publicKey;

      return (
        <React.Fragment key={message.id}>
          {showDateSeparator && (
            <div style={{
              textAlign: 'center',
              margin: '1rem 0',
              color: '#888',
              fontSize: '0.85rem'
            }}>
              {formatDate(message.timestamp)}
            </div>
          )}
          <div style={{
            marginBottom: '0.75rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            display: 'flex',
            justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '70%',
              backgroundColor: isOwnMessage ? '#007AFF' : '#2C2C2E',
              color: 'white',
              padding: '0.75rem 1rem',
              borderRadius: '1rem',
              wordBreak: 'break-word'
            }}>
              {!isOwnMessage && (
                <div style={{
                  fontSize: '0.85rem',
                  color: '#5AC8FA',
                  marginBottom: '0.25rem',
                  fontWeight: '600'
                }}>
                  {message.username}
                </div>
              )}
              <div style={{ fontSize: '1rem', lineHeight: '1.4' }}>
                {message.message}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.6)',
                marginTop: '0.25rem',
                textAlign: 'right'
              }}>
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1C1C1E'
      }}>
      {/* Header */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#2C2C2E',
        borderBottom: '1px solid #3A3A3C',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}>
        <div style={{ fontSize: '2rem' }}>🌍</div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: '600' }}>
            Global Chat
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>
            Public community channel
          </p>
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#00ff41',
          textShadow: '0 0 10px rgba(0, 255, 65, 0.6)',
          opacity: 0.8
        }}>
          [AST]
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem 0'
      }}>
        {renderMessages()}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div style={{
        borderTop: '1px solid #3A3A3C',
        backgroundColor: '#2C2C2E',
        padding: '1rem'
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end',
          backgroundColor: '#1C1C1E',
          borderRadius: '8px',
          border: '1px solid #3A3A3C',
          padding: '0.5rem'
        }}>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Message everyone..."
            disabled={isSending}
            rows={1}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'white',
              fontSize: '1rem',
              resize: 'none',
              fontFamily: 'inherit',
              outline: 'none',
              minHeight: '32px',
              maxHeight: '120px',
              lineHeight: '1.5'
            }}
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim() || connectionStatus !== 'connected'}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: (!inputText.trim() || isSending || connectionStatus !== 'connected') ? '#3A3A3C' : '#007AFF',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: (!inputText.trim() || isSending || connectionStatus !== 'connected') ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'background-color 0.2s',
              whiteSpace: 'nowrap',
              height: '32px',
              flexShrink: 0
            }}
          >
            {isSending ? (
              <span>...</span>
            ) : connectionStatus !== 'connected' ? (
              <span>...</span>
            ) : (
              <>
                <Send size={14} />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}
