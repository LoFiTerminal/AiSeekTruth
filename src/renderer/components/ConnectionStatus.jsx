import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, ArrowDown, ArrowUp } from 'lucide-react';

function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [traffic, setTraffic] = useState({ inKBps: '0.00', outKBps: '0.00' });
  const [serverStatus, setServerStatus] = useState('unknown');
  const [pingTime, setPingTime] = useState(null);

  useEffect(() => {
    // Listen for connection status updates
    const handleConnectionStatus = (status) => {
      setIsConnected(status.status === 'online');
      if (status.status) {
        setServerStatus(status.status);
      }
      if (status.pingTime !== undefined) {
        setPingTime(status.pingTime);
      }
    };

    // Listen for relay ping updates
    const handleRelayPing = (data) => {
      setServerStatus(data.status);
      setPingTime(data.pingTime || null);
    };

    // Listen for traffic updates
    const handleTrafficUpdate = (stats) => {
      setTraffic(stats);
    };

    if (window.api) {
      window.api.onConnectionStatus(handleConnectionStatus);
      window.api.onRelayPing && window.api.onRelayPing(handleRelayPing);
      window.api.onTrafficUpdate(handleTrafficUpdate);
    }

    return () => {
      if (window.api) {
        window.api.removeAllListeners('connection:status');
        window.api.removeAllListeners('relay:ping');
        window.api.removeAllListeners('traffic:update');
      }
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative'
    }}>
      {/* Connection Status */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          background: isConnected ? 'rgba(0, 255, 65, 0.1)' : 'rgba(107, 114, 128, 0.1)',
          border: `1px solid ${isConnected ? 'rgba(0, 255, 65, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
          borderRadius: '8px',
          fontSize: '10px',
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
            <Activity size={10} className="pulse" />
            <span>ONLINE</span>
          </>
        ) : (
          <>
            <WifiOff size={10} />
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
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
              P2P Network Status
            </div>
            {isConnected ? (
              <>
                <div style={{ color: 'var(--terminal-green)', marginBottom: '4px' }}>✓ Connected to relays</div>
                <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                  Acting as hybrid node (client + relay)
                </div>
              </>
            ) : (
              <>
                <div style={{ color: 'var(--status-dnd)', marginBottom: '4px' }}>✗ Not connected</div>
                <div style={{ fontSize: '10px', marginBottom: '8px' }}>
                  Check your internet connection
                </div>
              </>
            )}
            <div style={{
              borderTop: '1px solid var(--border-secondary)',
              paddingTop: '8px',
              marginTop: '8px'
            }}>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', fontSize: '10px' }}>
                Railway Relay Server
              </div>
              {serverStatus === 'online' ? (
                <div style={{ color: 'var(--terminal-green)', fontSize: '10px' }}>
                  🟢 Online {pingTime ? `(${pingTime}ms)` : ''}
                </div>
              ) : serverStatus === 'offline' ? (
                <div style={{ color: 'var(--status-dnd)', fontSize: '10px' }}>
                  🔴 Offline
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                  ⚪ Checking...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Relay Traffic Monitor - Compact Horizontal */}
      {isConnected && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(0, 255, 65, 0.15)',
          borderRadius: '8px',
          fontSize: '9px',
          fontFamily: "'Courier New', monospace",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ArrowDown size={9} color="#00ff41" />
            <span style={{ color: '#00ff41' }}>{traffic.inKBps}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <ArrowUp size={9} color="#00ffff" />
            <span style={{ color: '#00ffff' }}>{traffic.outKBps}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
