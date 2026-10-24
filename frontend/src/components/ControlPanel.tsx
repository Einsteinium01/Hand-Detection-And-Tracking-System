import React from 'react';
import type { DetectionConfig, HandDetection } from '../types/hand';
import type { RecordingInfo } from '../hooks/useVideoRecorder';
import { HandInspector } from './HandInspector';

interface ControlPanelProps {
  onStart: () => void;
  onStop: () => void;
  isRunning: boolean;
  isConnected: boolean;
  fps: number;
  config: DetectionConfig;
  onConfigChange: (config: Partial<DetectionConfig>) => void;
  // Detected hands for inspector
  activeHands: HandDetection[];
  // Recording controls
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

export const ControlPanel: React.FC<ControlPanelProps> = ({
  onStart,
  onStop,
  isRunning,
  isConnected,
  fps,
  config,
  onConfigChange,
  activeHands,
  isRecording,
  recordingDuration,
  recordedInfo,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
  onClearRecording,
}) => {
  return (
    <aside className="control-sidebar" aria-label="System control panel">
      {/* 1. Main Pipeline Action Card */}
      <section className="card card--primary-action">
        <button
          type="button"
          className={`btn-action ${isRunning ? 'btn-action--stop' : 'btn-action--start'}`}
          onClick={isRunning ? onStop : onStart}
          aria-pressed={isRunning}
        >
          <span className="btn-action__icon" aria-hidden="true">
            {isRunning ? '⏹' : '▶'}
          </span>
          <span className="btn-action__label">
            {isRunning ? 'Stop Detection' : 'Start Detection'}
          </span>
          <kbd className="btn-action__kbd" aria-hidden="true">Space</kbd>
        </button>
      </section>

      {/* 2. Live Hand Telemetry & Pose Inspector */}
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Tracked Hands</h2>
          <span className="card__badge-counter">
            {isRunning ? activeHands.length : 0}
          </span>
        </div>
        <HandInspector hands={activeHands} isRunning={isRunning} />
      </section>

      {/* 3. Session Video Recording Studio */}
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Session Recorder</h2>
          {isRecording && (
            <span className="card__badge-live">LIVE</span>
          )}
        </div>

        {!isRecording ? (
          <button
            type="button"
            className="btn-recorder btn-recorder--start"
            onClick={onStartRecording}
            disabled={!isRunning}
            title={!isRunning ? 'Start detection pipeline first' : 'Record live video with overlays'}
            aria-label="Start session recording"
          >
            <span className="btn-recorder__dot" aria-hidden="true" />
            <span>Record Session</span>
          </button>
        ) : (
          <div className="recording-panel">
            <div className="recording-panel__status">
              <span className="recording-panel__beacon" aria-hidden="true" />
              <div className="recording-panel__meta">
                <span className="recording-panel__title">Recording in Progress</span>
                <span className="recording-panel__time">{formatDuration(recordingDuration)}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn-recorder btn-recorder--stop"
              onClick={onStopRecording}
              aria-label="Stop recording"
            >
              <span aria-hidden="true">⏹</span> Stop Recording
            </button>
          </div>
        )}

        {recordedInfo && !isRecording && (
          <div className="recording-card-ready" role="region" aria-label="Recorded session ready for export">
            <div className="recording-card-ready__header">
              <span className="recording-card-ready__status">✓ Recording Ready</span>
              <span className="recording-card-ready__meta">
                {recordedInfo.duration.toFixed(1)}s • {formatFileSize(recordedInfo.sizeBytes)}
              </span>
            </div>
            <div className="recording-card-ready__actions">
              <button
                type="button"
                className="btn-download"
                onClick={onDownloadRecording}
                aria-label="Download recorded video"
              >
                <span aria-hidden="true">💾</span> Download Video
              </button>
              <button
                type="button"
                className="btn-discard"
                onClick={onClearRecording}
                title="Discard recording"
                aria-label="Discard recording"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Visualization Layer Controls */}
      <section className="card">
        <div className="card__header">
          <h2 className="card__title">Overlays & Layers</h2>
        </div>

        <div className="toggle-group">
          <label className="toggle-item">
            <input
              type="checkbox"
              className="toggle-item__input"
              checked={config.showSkeleton}
              onChange={(e) => onConfigChange({ showSkeleton: e.target.checked })}
              aria-label="Toggle hand skeleton overlay"
            />
            <span className="toggle-item__track">
              <span className="toggle-item__thumb" />
            </span>
            <span className="toggle-item__label">Skeleton</span>
          </label>

          <label className="toggle-item">
            <input
              type="checkbox"
              className="toggle-item__input"
              checked={config.showBbox}
              onChange={(e) => onConfigChange({ showBbox: e.target.checked })}
              aria-label="Toggle bounding boxes and gesture pills overlay"
            />
            <span className="toggle-item__track">
              <span className="toggle-item__thumb" />
            </span>
            <span className="toggle-item__label">Bounding Box & Reticle</span>
          </label>
        </div>
      </section>

      {/* 5. Performance Telemetry */}
      <section className="card card--telemetry">
        <div className="card__header">
          <h2 className="card__title">Pipeline Telemetry</h2>
        </div>
        <div className="telemetry-grid">
          <div className="telemetry-metric">
            <span className="telemetry-metric__label">Render Rate</span>
            <span className="telemetry-metric__value">{isRunning ? `${fps.toFixed(1)}` : '0.0'} <span className="telemetry-metric__unit">FPS</span></span>
          </div>
          <div className="telemetry-metric">
            <span className="telemetry-metric__label">Socket Health</span>
            <span className={`telemetry-metric__value ${isConnected ? 'text-success' : 'text-danger'}`}>
              {isConnected ? 'Stable' : 'Offline'}
            </span>
          </div>
        </div>
      </section>
    </aside>
  );
};
