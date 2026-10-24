import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketMessage, DetectionConfig } from '../types/hand';
import {
  drawHandLandmarks,
  drawHandConnections,
  drawBoundingBox,
  clearCanvas,
} from '../utils/drawLandmarks';

interface WebcamFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isWebcamReady: boolean;
  webcamError: string | null;
  detectionResult: WebSocketMessage | null;
  config: DetectionConfig;
  isRecording?: boolean;
  recordingDuration?: number;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function WebcamFeed({
  videoRef,
  isWebcamReady,
  webcamError,
  detectionResult,
  config,
  isRecording = false,
  recordingDuration = 0,
}: WebcamFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number } | null>(null);

  /** Sync canvas drawing dimensions with the displayed video size */
  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    if (video.videoWidth && video.videoHeight) {
      setStreamResolution({ width: video.videoWidth, height: video.videoHeight });
    }
  }, [videoRef]);

  /** Draw detection overlays on the canvas */
  const drawOverlays = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;

    clearCanvas(ctx, canvas.width, canvas.height);

    if (!detectionResult?.data?.hands?.length) {
      return;
    }

    ctx.save();

    // Mirror the canvas horizontally to match the mirrored selfie webcam video
    ctx.translate(displayWidth, 0);
    ctx.scale(-1, 1);

    for (const hand of detectionResult.data.hands) {
      if (config.showSkeleton) {
        drawHandConnections(ctx, hand, displayWidth, displayHeight);
        drawHandLandmarks(ctx, hand, displayWidth, displayHeight);
      }
      if (config.showBbox) {
        drawBoundingBox(ctx, hand, displayWidth, displayHeight);
      }
    }

    ctx.restore();
  }, [detectionResult, config.showSkeleton, config.showBbox]);

  /** Smooth animation loop */
  useEffect(() => {
    const draw = () => {
      drawOverlays();
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [drawOverlays]);

  /** Keep canvas dimensions in sync with window/video resize */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
    });

    resizeObserver.observe(video);

    const handleLoadedMetadata = () => {
      syncCanvasSize();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      resizeObserver.disconnect();
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef, syncCanvasSize]);

  return (
    <div className="webcam-viewport" ref={containerRef}>
      <div className="webcam-viewport__screen" role="region" aria-label="Camera detection view">
        <video
          ref={videoRef}
          className="webcam-viewport__video"
          playsInline
          muted
          autoPlay
          aria-label="Live webcam feed"
        />
        <canvas
          ref={canvasRef}
          className="webcam-viewport__canvas"
          aria-hidden="true"
        />

        {/* Viewfinder crosshairs at center */}
        {isWebcamReady && !webcamError && (
          <div className="webcam-viewport__crosshair" aria-hidden="true" />
        )}

        {/* Live Recording Badge */}
        {isRecording && (
          <div className="recording-beacon" role="status" aria-label={`Recording active: ${formatDuration(recordingDuration)}`}>
            <span className="recording-beacon__dot" aria-hidden="true" />
            <span className="recording-beacon__text">REC</span>
            <span className="recording-beacon__time">{formatDuration(recordingDuration)}</span>
          </div>
        )}

        {/* Stream Resolution & FPS Metadata Badge */}
        {isWebcamReady && streamResolution && (
          <div className="stream-badge" aria-label={`Stream resolution: ${streamResolution.width} by ${streamResolution.height}`}>
            <span className="stream-badge__dot" />
            <span>{streamResolution.width}×{streamResolution.height}</span>
          </div>
        )}

        {/* Idle Placeholder */}
        {!isWebcamReady && !webcamError && (
          <div className="viewport-placeholder">
            <div className="viewport-placeholder__card">
              <div className="viewport-placeholder__icon-wrap">
                <span className="viewport-placeholder__icon" aria-hidden="true">📷</span>
              </div>
              <h2 className="viewport-placeholder__title">Webcam Offline</h2>
              <p className="viewport-placeholder__desc">
                Click <strong>Start Detection</strong> to initialize camera and real-time computer vision pipeline.
              </p>
              <div className="viewport-placeholder__hint">
                <span className="keycap">Space</span> or click button to toggle
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {webcamError && (
          <div className="viewport-error" role="alert">
            <div className="viewport-error__icon" aria-hidden="true">⚠️</div>
            <h2 className="viewport-error__title">Camera Access Error</h2>
            <p className="viewport-error__message">{webcamError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
