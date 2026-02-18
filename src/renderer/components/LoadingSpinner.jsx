// Terminal-style loading spinner
function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizes = {
    sm: { spinner: 16, font: '11px' },
    md: { spinner: 24, font: '13px' },
    lg: { spinner: 32, font: '15px' },
  };

  const currentSize = sizes[size];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
    }}>
      {/* Terminal-style spinner */}
      <div
        className="terminal-spinner"
        style={{
          width: currentSize.spinner,
          height: currentSize.spinner,
          border: '2px solid var(--border-secondary)',
          borderTop: '2px solid var(--terminal-green)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />

      {/* Loading message with dots animation */}
      <div style={{
        fontSize: currentSize.font,
        color: 'var(--text-secondary)',
        fontFamily: "'Courier New', monospace",
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        <span>{message}</span>
        <span className="loading-dots">
          <span style={{ animationDelay: '0ms' }}>.</span>
          <span style={{ animationDelay: '200ms' }}>.</span>
          <span style={{ animationDelay: '400ms' }}>.</span>
        </span>
      </div>
    </div>
  );
}

export default LoadingSpinner;
