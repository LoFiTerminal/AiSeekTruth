import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import useStore from '../store';

function MessageInput() {
  const { activeContact, identity, addMessage } = useStore();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!text.trim() || !activeContact || isSending) {
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
      // Optimistic update - add message to UI immediately
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

      // Send message via API
      const result = await window.api.sendMessage(
        activeContact.publicKey,
        messageText
      );

      if (result.success) {
        // Replace optimistic message with actual message
        addMessage(activeContact.publicKey, result.message);
      } else {
        console.error('Failed to send message:', result.error);
        // Could implement retry logic or error notification here
      }
    } catch (error) {
      console.error('Error sending message:', error);
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

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={
          activeContact
            ? 'Type a message... (Enter to send, Shift+Enter for new line)'
            : 'Select a contact to start messaging'
        }
        disabled={!activeContact || isSending}
        rows={1}
      />

      <button
        type="submit"
        className="send-button"
        disabled={!activeContact || !text.trim() || isSending}
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
