import { useEffect, useRef } from 'react';
import { MessageCircle, Lock, User } from 'lucide-react';
import useStore from '../store';
import MessageInput from './MessageInput';

function ChatWindow() {
  const { activeContact, messages, identity } = useStore();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const activeMessages = activeContact
    ? messages[activeContact.publicKey] || []
    : [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!activeContact) {
    return (
      <div className="chat-window">
        <div className="chat-empty">
          <MessageCircle className="chat-empty-icon" size={80} />
          <p>Select a contact to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-contact-info">
          <div className="contact-avatar">
            <User size={24} />
          </div>
          <div className="chat-contact-details">
            <h2>{activeContact.nickname || activeContact.username}</h2>
            <div className="chat-contact-status">
              <span className={`status-dot ${activeContact.status || 'offline'}`}></span>
              {activeContact.status === 'online' ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="encryption-indicator">
          <Lock size={14} />
          End-to-End Encrypted
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container" ref={messagesContainerRef}>
        {activeMessages.length === 0 ? (
          <div className="chat-empty">
            <MessageCircle className="chat-empty-icon" size={60} />
            <p>No messages yet. Say hi!</p>
          </div>
        ) : (
          activeMessages.map((message) => {
            const isFromMe = message.direction === 'sent';

            return (
              <div
                key={message.id}
                className={`message ${isFromMe ? 'from-me' : 'from-them'}`}
              >
                <div className="message-avatar">
                  <User size={16} />
                </div>

                <div className="message-content">
                  <div className="message-bubble">{message.content}</div>

                  <div className="message-meta">
                    <span className="message-time">
                      {formatTimestamp(message.timestamp)}
                    </span>

                    {isFromMe && (
                      <span className="message-status">
                        {message.delivered ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <MessageInput />
    </div>
  );
}

export default ChatWindow;
