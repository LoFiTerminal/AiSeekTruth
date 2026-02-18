import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import useStore from '../store';

function MessageInput({ onSendMessage, placeholder, disabled }) {
  const { activeContact, activeGroup, identity, addMessage, addGroupMessage } = useStore();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  const isGroupChat = !!activeGroup;
  const activeChat = isGroupChat ? activeGroup : activeContact;

  // If custom onSendMessage is provided, this is a standalone input (like GlobalChat)
  const isStandalone = !!onSendMessage;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim() || isSending) {
      return;
    }

    // For standalone mode, check if disabled
    if (isStandalone && disabled) {
      return;
    }

    // For store-connected mode, check if activeChat exists
    if (!isStandalone && !activeChat) {
      return;
    }

    const messageText = text.trim();
    setText(''); // Clear input immediately

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setIsSending(true);

    try {
      // Standalone mode - use custom callback
      if (isStandalone) {
        await onSendMessage(messageText);
        return;
      }

      // Store-connected mode
      if (isGroupChat) {
        // Send group message
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          groupId: activeGroup.id,
          senderPublicKey: identity.publicKey,
          senderUsername: identity.username,
          content: messageText,
          timestamp: Date.now(),
          delivered: false,
        };

        addGroupMessage(activeGroup.id, optimisticMessage);

        const result = await window.api.sendGroupMessage(
          activeGroup.id,
          messageText
        );

        if (result.success) {
          // Replace optimistic message with actual message
          addGroupMessage(activeGroup.id, result.message);
        } else {
          console.error('Failed to send group message:', result.error);
        }
      } else {
        // Send direct message
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          contactPublicKey: activeContact.publicKey,
          direction: 'sent',
          content: messageText,
          timestamp: Date.now(),
          delivered: false,
          read: false,
        };

        addMessage(activeContact.publicKey, optimisticMessage);

        const result = await window.api.sendMessage(
          activeContact.publicKey,
          messageText
        );

        if (result.success) {
          // Replace optimistic message with actual message
          addMessage(activeContact.publicKey, result.message);
        } else {
          console.error('Failed to send message:', result.error);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e) => {
    setText(e.target.value);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  };

  const placeholderText = placeholder || (
    isGroupChat
      ? `Message #${activeGroup?.name || 'group'}`
      : activeContact
      ? `Message ${activeContact.nickname || activeContact.username}`
      : 'Select a chat to start messaging'
  );

  const isDisabled = isStandalone
    ? (disabled || isSending)
    : (!activeChat || isSending);

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholderText}
        disabled={isDisabled}
        rows={1}
      />

      <button
        type="submit"
        className="send-button"
        disabled={isDisabled || !text.trim()}
      >
        {isSending ? (
          <span className="loading-spinner"></span>
        ) : (
          <>
            <Send size={16} />
            Send
          </>
        )}
      </button>
    </form>
  );
}

export default MessageInput;
