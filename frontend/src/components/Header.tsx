import React from 'react';

interface HeaderProps {
  isConnected: boolean;
  isRunning: boolean;
  numHands: number;
  fps: number;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  isRunning,
  numHands,
  fps,
}) => {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__logo">
          <span className="app-header__icon" aria-hidden="true">🖐️</span>
        </div>
        <div className="app-header__title-group">
          <h1 className="app-header__title">Hand Detection & Tracking</h1>
        </div>
      </div>

      <div className="app-header__status-group">
        {/* Backend Connectivity Badge */}
        <div className="status-badge" role="status" aria-label={`Server status: ${isConnected ? 'Connected' : 'Disconnected'}`}>
          <span className={`status-badge__dot ${isConnected ? 'status-badge__dot--live' : 'status-badge__dot--offline'}`} />
          <span className="status-badge__label">Server:</span>
          <span className="status-badge__value">{isConnected ? 'Online' : 'Offline'}</span>
        </div>

        {/* Live FPS Counter */}
        <div className="status-badge" role="status" aria-label={`Processing speed: ${fps.toFixed(0)} FPS`}>
          <span className="status-badge__label">Throughput:</span>
          <span className="status-badge__value status-badge__value--mono">
            {isRunning ? `${fps.toFixed(1)} fps` : '—'}
          </span>
        </div>

        {/* Active Hand Count */}
        <div className="status-badge" role="status" aria-label={`Detected hands: ${numHands}`}>
          <span className="status-badge__label">Active:</span>
          <span className="status-badge__value">
            {isRunning ? (numHands === 1 ? '1 Hand' : `${numHands} Hands`) : 'Idle'}
          </span>
        </div>
      </div>
    </header>
  );
};
