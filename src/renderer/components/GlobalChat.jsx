import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

export default function GlobalChat({ identity }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Load initial messages
  useEffect(() => {
    loadMessages();

    // Check connection status
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 2000);
  }, []);

  // Listen for incoming messages
  useEffect(() => {
    const unsubscribe = window.api.onGlobalMessage((message) => {
      console.log('Received global message:', message);
      setConnectionStatus('connected');
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
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ fontSize: '2rem' }}>🌍</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>
              Global Chat
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>
              Public community channel
            </p>
          </div>
        </div>
        <div style={{
          fontSize: '0.85rem',
          color: connectionStatus === 'connected' ? '#5AC8FA' : '#FF453A',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: connectionStatus === 'connected' ? '#5AC8FA' : '#FF453A'
          }}></span>
          {connectionStatus === 'connected' ? 'Connected' : 'Connecting...'}
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
        backgroundColor: '#2C2C2E'
      }}>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '0.75rem',
          padding: '1rem',
          alignItems: 'flex-end'
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
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #3A3A3C',
              backgroundColor: '#1C1C1E',
              color: 'white',
              fontSize: '1rem',
              resize: 'none',
              fontFamily: 'inherit',
              outline: 'none',
              minHeight: '44px',
              maxHeight: '120px'
            }}
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim() || connectionStatus !== 'connected'}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: (!inputText.trim() || isSending || connectionStatus !== 'connected') ? '#3A3A3C' : '#007AFF',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (!inputText.trim() || isSending || connectionStatus !== 'connected') ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              minHeight: '44px',
              transition: 'background-color 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            {isSending ? (
              <span>Sending...</span>
            ) : connectionStatus !== 'connected' ? (
              <span>Connecting...</span>
            ) : (
              <>
                <Send size={16} />
                <span>Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
