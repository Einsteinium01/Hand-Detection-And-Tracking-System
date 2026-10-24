import type { WebSocketMessage } from '../types/hand';

interface StatusBarProps {
  detectionResult: WebSocketMessage | null;
  isConnected: boolean;
  isRunning: boolean;
}

export function StatusBar({ detectionResult, isConnected, isRunning }: StatusBarProps) {
  const numHands = detectionResult?.data?.num_hands ?? 0;
  const processingTime = detectionResult?.processing_time_ms ?? 0;
  const hands = detectionResult?.data?.hands ?? [];

  const handednessInfo = hands.length > 0
    ? hands
        .map((h, i) => {
          const trackId = h.id != null ? h.id : i + 1;
          return `Hand #${trackId}: ${h.handedness} (${Math.round(h.confidence * 100)}%)`;
        })
        .join('  •  ')
    : 'No active hands';

  const gestureInfo = hands.length > 0
    ? hands
        .map((h, i) => {
          const trackId = h.id != null ? h.id : i + 1;
          const g = h.gesture && h.gesture !== 'Unknown' ? h.gesture : 'None';
          return `Hand #${trackId}: ${g}`;
        })
        .join('  •  ')
    : '—';

  let connectionStatusLabel: string;
  let connectionVariant: 'ok' | 'idle' | 'warning';

  if (!isRunning) {
    connectionStatusLabel = 'Pipeline Idle';
    connectionVariant = 'idle';
  } else if (isConnected) {
    connectionStatusLabel = 'Live Stream Processing';
    connectionVariant = 'ok';
  } else {
    connectionStatusLabel = 'Reconnecting to Server...';
    connectionVariant = 'warning';
  }

  return (
    <footer className="status-strip" role="status" aria-live="polite">
      {/* Hand Count Indicator */}
      <div className="status-strip__cell">
        <span className="status-strip__label">Tracks</span>
        <span className="status-strip__value status-strip__value--mono">
          {isRunning ? numHands : 0}
        </span>
      </div>

      <div className="status-strip__divider" aria-hidden="true" />

      {/* Latency Metric */}
      <div className="status-strip__cell">
        <span className="status-strip__label">Inference</span>
        <span className="status-strip__value status-strip__value--mono">
          {isRunning && processingTime > 0 ? `${processingTime.toFixed(1)} ms` : '—'}
        </span>
      </div>

      <div className="status-strip__divider" aria-hidden="true" />

      {/* Detection Breakdown */}
      <div className="status-strip__cell status-strip__cell--wide">
        <span className="status-strip__label">Telemetry</span>
        <span className="status-strip__value status-strip__value--truncate" title={handednessInfo}>
          {isRunning ? handednessInfo : 'Ready'}
        </span>
      </div>

      <div className="status-strip__divider" aria-hidden="true" />

      {/* Active Gesture Summary */}
      <div className="status-strip__cell status-strip__cell--wide">
        <span className="status-strip__label">Gesture</span>
        <span className="status-strip__value status-strip__value--truncate" title={gestureInfo}>
          {isRunning ? gestureInfo : '—'}
        </span>
      </div>

      <div className="status-strip__divider" aria-hidden="true" />

      {/* Pipeline Status Pill */}
      <div className="status-strip__cell">
        <span className="status-strip__label">Status</span>
        <span className={`status-pill status-pill--${connectionVariant}`}>
          <span className="status-pill__dot" aria-hidden="true" />
          {connectionStatusLabel}
        </span>
      </div>
    </footer>
  );
}
