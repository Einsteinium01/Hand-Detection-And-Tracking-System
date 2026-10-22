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
        .map((h) => `${h.handedness} (${Math.round(h.confidence * 100)}%)`)
        .join(', ')
    : 'No hands detected';

  let connectionText: string;
  if (!isRunning) {
    connectionText = 'Idle';
  } else if (isConnected) {
    connectionText = 'Connected & Processing';
  } else {
    connectionText = 'Reconnecting...';
  }

  return (
    <div className="status-bar">
      <div className="status-bar__item">
        <span className="status-bar__label">Hands</span>
        <span className="status-bar__value">{numHands}</span>
      </div>
      <div className="status-bar__divider" />
      <div className="status-bar__item">
        <span className="status-bar__label">Processing</span>
        <span className="status-bar__value">{processingTime.toFixed(1)} ms</span>
      </div>
      <div className="status-bar__divider" />
      <div className="status-bar__item status-bar__item--wide">
        <span className="status-bar__label">Detection</span>
        <span className="status-bar__value">{handednessInfo}</span>
      </div>
      <div className="status-bar__divider" />
      <div className="status-bar__item">
        <span className="status-bar__label">Status</span>
        <span className={`status-bar__value status-bar__value--${isConnected && isRunning ? 'ok' : 'idle'}`}>
          {connectionText}
        </span>
      </div>
    </div>
  );
}
