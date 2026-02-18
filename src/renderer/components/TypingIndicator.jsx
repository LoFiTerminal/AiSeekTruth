function TypingIndicator({ username }) {
  return (
    <div style={{
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: 'var(--text-muted)',
      fontStyle: 'italic',
    }}>
      <div style={{
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
      }}>
        <span className="typing-dot" style={{ animationDelay: '0ms' }}></span>
        <span className="typing-dot" style={{ animationDelay: '150ms' }}></span>
        <span className="typing-dot" style={{ animationDelay: '300ms' }}></span>
      </div>
      <span>{username} is typing...</span>
    </div>
  );
}

export default TypingIndicator;
