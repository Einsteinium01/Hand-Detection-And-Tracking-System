import type { DetectionConfig } from '../types/hand';

interface ControlPanelProps {
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
  isConnected: boolean;
  fps: number;
  config: DetectionConfig;
  onConfigChange: (config: Partial<DetectionConfig>) => void;
}

export function ControlPanel({
  onStart,
  onStop,
  isRunning,
  isConnected,
  fps,
  config,
  onConfigChange,
}: ControlPanelProps) {
  const connectionStatus = isConnected ? 'Connected' : 'Disconnected';
  const connectionClass = isConnected ? 'connected' : 'disconnected';

  return (
    <div className="control-panel">
      <div className="control-panel__header">
        <h2 className="control-panel__title">Controls</h2>
      </div>

      {/* Connection Status */}
      <div className="control-panel__section">
        <div className="control-panel__status">
          <span className={`control-panel__dot control-panel__dot--${connectionClass}`} />
          <span className="control-panel__status-text">
            Server: {connectionStatus}
          </span>
        </div>
      </div>

      {/* Start/Stop Button */}
      <div className="control-panel__section">
        <button
          className={`control-panel__btn ${isRunning ? 'control-panel__btn--stop' : 'control-panel__btn--start'}`}
          onClick={isRunning ? onStop : onStart}
        >
          {isRunning ? (
            <>
              <span className="control-panel__btn-icon">⏹</span>
              Stop Detection
            </>
          ) : (
            <>
              <span className="control-panel__btn-icon">▶</span>
              Start Detection
            </>
          )}
        </button>
      </div>

      {/* FPS Display */}
      <div className="control-panel__section">
        <div className="control-panel__metric">
          <span className="control-panel__metric-label">Processing FPS</span>
          <span className="control-panel__metric-value">{fps.toFixed(1)}</span>
        </div>
      </div>

      {/* Visualization Toggles */}
      <div className="control-panel__section">
        <h3 className="control-panel__section-title">Visualization</h3>

        <label className="control-panel__toggle">
          <input
            type="checkbox"
            checked={config.showSkeleton}
            onChange={(e) => onConfigChange({ showSkeleton: e.target.checked })}
          />
          <span className="control-panel__toggle-slider" />
          <span className="control-panel__toggle-label">Show Skeleton</span>
        </label>

        <label className="control-panel__toggle">
          <input
            type="checkbox"
            checked={config.showBbox}
            onChange={(e) => onConfigChange({ showBbox: e.target.checked })}
          />
          <span className="control-panel__toggle-slider" />
          <span className="control-panel__toggle-label">Show Bounding Boxes</span>
        </label>
      </div>

      {/* Info */}
      <div className="control-panel__section control-panel__section--info">
        <p className="control-panel__info-text">
          🖐️ Point your hand at the camera and click Start to begin real-time tracking.
        </p>
      </div>
    </div>
  );
}
