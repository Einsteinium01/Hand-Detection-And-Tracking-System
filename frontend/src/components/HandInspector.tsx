import React from 'react';
import type { HandDetection } from '../types/hand';

interface HandInspectorProps {
  hands: HandDetection[];
  isRunning: boolean;
}

export const HandInspector: React.FC<HandInspectorProps> = ({ hands, isRunning }) => {
  if (!isRunning) {
    return (
      <div className="hand-inspector hand-inspector--empty">
        <p className="hand-inspector__empty-title">Pipeline Inactive</p>
        <p className="hand-inspector__empty-text">Start detection to view real-time hand telemetry.</p>
      </div>
    );
  }

  if (hands.length === 0) {
    return (
      <div className="hand-inspector hand-inspector--empty">
        <div className="hand-inspector__radar-sweep" aria-hidden="true" />
        <p className="hand-inspector__empty-title">Searching for Hands</p>
        <p className="hand-inspector__empty-text">Position hands within webcam view.</p>
      </div>
    );
  }

  return (
    <div className="hand-inspector">
      <div className="hand-inspector__list">
        {hands.map((hand, idx) => {
          const trackId = hand.id != null ? hand.id : idx + 1;
          const confidencePct = Math.round(hand.confidence * 100);
          const gesture = hand.gesture && hand.gesture !== 'Unknown' ? hand.gesture : 'No gesture detected';
          const isLeft = hand.handedness === 'Left';

          return (
            <div
              key={trackId}
              className={`hand-card hand-card--${isLeft ? 'left' : 'right'}`}
            >
              <div className="hand-card__header">
                <div className="hand-card__identity">
                  <span className="hand-card__badge">Hand #{trackId}</span>
                  <span className={`hand-card__tag hand-card__tag--${isLeft ? 'left' : 'right'}`}>
                    {hand.handedness}
                  </span>
                </div>
                <div className="hand-card__confidence">
                  <span className="hand-card__conf-val">{confidencePct}%</span>
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div
                className="hand-card__progress-track"
                role="progressbar"
                aria-valuenow={confidencePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Detection confidence for Hand #${trackId}`}
              >
                <div
                  className="hand-card__progress-fill"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>

              {/* Active Gesture Badge */}
              <div className="hand-card__gesture-row">
                <span className="hand-card__gesture-label">Pose / Gesture</span>
                <span className="hand-card__gesture-value">{gesture}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
