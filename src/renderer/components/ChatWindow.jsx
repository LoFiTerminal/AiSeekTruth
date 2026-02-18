import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Lock, User, Hash, Users } from 'lucide-react';
import useStore from '../store';
import MessageInput from './MessageInput';
import GroupMembers from './GroupMembers';
import GlobalChat from './GlobalChat';

function ChatWindow() {
  const { activeContact, activeGroup, messages, groupMessages, identity } = useStore();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const isGroupChat = !!activeGroup;
  const activeChat = isGroupChat ? activeGroup : activeContact;

  const activeMessages = isGroupChat
    ? (groupMessages[activeGroup?.id] || [])
    : (activeContact ? (messages[activeContact.publicKey] || []) : []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return 'just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }

    // Today
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday ' + date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    // This week
    if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
        date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
    }

    // Older
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (!activeChat) {
    return (
      <div className="chat-window" style={{ flexDirection: 'column' }}>
        <GlobalChat identity={identity} />
      </div>
    );
  }

  return (
    <div className="chat-window" style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-contact-info">
            <div className="contact-avatar">
              {isGroupChat ? <Hash size={20} /> : <User size={20} />}
            </div>
            <div className="chat-contact-details">
              <h2>
                {isGroupChat
                  ? activeGroup.name
                  : (activeContact.nickname || activeContact.username)}
              </h2>
              {!isGroupChat && (
                <div className="chat-contact-status">
                  <span className={`status-dot ${activeContact.status || 'offline'}`}></span>
                  {activeContact.status === 'online' ? 'Online' : 'Offline'}
                </div>
              )}
              {isGroupChat && activeGroup.description && (
                <div className="chat-contact-status">
                  {activeGroup.description}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="encryption-indicator">
              <Lock size={12} />
              E2E
            </div>
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
            const isFromMe = isGroupChat
              ? message.senderPublicKey === identity?.publicKey
              : message.direction === 'sent';

            const senderName = isGroupChat && !isFromMe
              ? message.senderUsername
              : null;

            return (
              <div
                key={message.id}
                className={`message ${isFromMe ? 'from-me' : 'from-them'}`}
              >
                <div className="message-avatar">
                  <User size={14} />
                </div>

                <div className="message-content">
                  {senderName && (
                    <div style={{
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: 'var(--icq-blue)',
                      marginBottom: '2px'
                    }}>
                      {senderName}
                    </div>
                  )}
                  <div className="message-bubble">{message.content}</div>

                  <div className="message-meta">
                    <span className="message-time">
                      {formatTimestamp(message.timestamp)}
                    </span>

                    {isFromMe && !isGroupChat && (
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

      {/* Group Members Panel - Always visible for group chats (Discord-style) */}
      {isGroupChat && activeGroup && (
        <GroupMembers group={activeGroup} />
      )}
    </div>
  );
}

export default ChatWindow;
