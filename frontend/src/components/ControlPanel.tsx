import type { DetectionConfig } from '../types/hand';
import type { RecordingInfo } from '../hooks/useVideoRecorder';

interface ControlPanelProps {
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
  isConnected: boolean;
  fps: number;
  config: DetectionConfig;
  onConfigChange: (config: Partial<DetectionConfig>) => void;
  // Recording props
  isRecording: boolean;
  recordingDuration: number;
  recordedInfo: RecordingInfo | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  onClearRecording: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ControlPanel({
  onStart,
  onStop,
  isRunning,
  isConnected,
  fps,
  config,
  onConfigChange,
  isRecording,
  recordingDuration,
  recordedInfo,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
  onClearRecording,
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

      {/* Session Recording */}
      <div className="control-panel__section">
        <h3 className="control-panel__section-title">Session Recording</h3>

        {!isRecording ? (
          <button
            className="control-panel__btn control-panel__btn--record"
            onClick={onStartRecording}
            disabled={!isRunning}
            title={!isRunning ? 'Start detection first to record' : 'Record session with overlays'}
          >
            <span className="control-panel__record-dot" />
            Start Recording
          </button>
        ) : (
          <div className="control-panel__recording-active">
            <div className="control-panel__recording-badge">
              <span className="control-panel__record-dot control-panel__record-dot--pulsing" />
              <span>REC {formatDuration(recordingDuration)}</span>
            </div>
            <button
              className="control-panel__btn control-panel__btn--stop-record"
              onClick={onStopRecording}
            >
              ⏹ Stop Recording
            </button>
          </div>
        )}

        {recordedInfo && !isRecording && (
          <div className="control-panel__recording-ready">
            <div className="control-panel__recording-meta">
              <span className="control-panel__recording-ready-label">✓ Ready:</span>
              <span>{recordedInfo.duration.toFixed(1)}s</span>
              <span>•</span>
              <span>{formatFileSize(recordedInfo.sizeBytes)}</span>
            </div>
            <div className="control-panel__recording-actions">
              <button
                className="control-panel__btn control-panel__btn--download"
                onClick={onDownloadRecording}
              >
                💾 Download Video
              </button>
              <button
                className="control-panel__btn-clear"
                onClick={onClearRecording}
                title="Discard recording"
              >
                ✕
              </button>
            </div>
          </div>
        )}
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
