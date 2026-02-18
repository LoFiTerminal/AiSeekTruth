import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, ArrowDown, ArrowUp } from 'lucide-react';

function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [traffic, setTraffic] = useState({ inKBps: '0.00', outKBps: '0.00' });

  useEffect(() => {
    // Listen for connection status updates
    const handleConnectionStatus = (status) => {
      setIsConnected(status.status === 'online');
    };

    // Listen for traffic updates
    const handleTrafficUpdate = (stats) => {
      setTraffic(stats);
    };

    if (window.api) {
      window.api.onConnectionStatus(handleConnectionStatus);
      window.api.onTrafficUpdate(handleTrafficUpdate);
    }

    return () => {
      if (window.api) {
        window.api.removeAllListeners('connection:status');
        window.api.removeAllListeners('traffic:update');
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Connection Status */}
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: isConnected ? 'rgba(0, 255, 65, 0.1)' : 'rgba(107, 114, 128, 0.1)',
          border: `1px solid ${isConnected ? 'rgba(0, 255, 65, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '600',
          color: isConnected ? 'var(--terminal-green)' : 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {isConnected ? (
          <>
            <Activity size={12} className="pulse" />
            <span>ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff size={12} />
            <span>OFFLINE</span>
          </>
        )}

        {/* Tooltip */}
        {showTooltip && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            right: '0',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
            padding: '12px',
            minWidth: '200px',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '11px',
            lineHeight: '1.5',
            color: 'var(--text-secondary)',
            zIndex: 1000,
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
              P2P Network Status
            </div>
            {isConnected ? (
              <>
                <div style={{ color: 'var(--terminal-green)' }}>✓ Connected to relays</div>
                <div style={{ marginTop: '4px', fontSize: '10px' }}>
                  Acting as hybrid node (client + relay)
                </div>
              </>
            ) : (
              <>
                <div style={{ color: 'var(--status-dnd)' }}>✗ Not connected</div>
                <div style={{ marginTop: '4px', fontSize: '10px' }}>
                  Check your internet connection
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Relay Traffic Monitor */}
      {isConnected && (
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '6px 10px',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(0, 255, 65, 0.2)',
          borderRadius: '8px',
          fontSize: '10px',
          fontFamily: "'Courier New', monospace",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowDown size={10} color="#00ff41" />
            <span style={{ color: '#00ff41' }}>{traffic.inKBps}</span>
            <span style={{ color: 'var(--text-muted)' }}>KB/s</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUp size={10} color="#00ffff" />
            <span style={{ color: '#00ffff' }}>{traffic.outKBps}</span>
            <span style={{ color: 'var(--text-muted)' }}>KB/s</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
