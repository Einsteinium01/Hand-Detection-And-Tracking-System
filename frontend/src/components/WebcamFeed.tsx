import { useEffect, useRef, useCallback } from 'react';
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
}

export function WebcamFeed({
  videoRef,
  isWebcamReady,
  webcamError,
  detectionResult,
  config,
}: WebcamFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  /** Sync canvas size with the displayed video size */
  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const rect = video.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas drawing dimensions to match the video element's display size
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Set canvas CSS size to match video display size
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
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

    if (!detectionResult || !detectionResult.data || !detectionResult.data.hands.length) {
      return;
    }

    ctx.save();

    // Mirror the canvas to match the mirrored video
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

  /** Use requestAnimationFrame for smooth drawing */
  useEffect(() => {
    const draw = () => {
      drawOverlays();
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [drawOverlays]);

  /** Resize observer to keep canvas in sync with video dimensions */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
    });

    resizeObserver.observe(video);

    // Also sync on video metadata load
    const handleLoadedMetadata = () => syncCanvasSize();
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      resizeObserver.disconnect();
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoRef, syncCanvasSize]);

  return (
    <div className="webcam-feed" ref={containerRef}>
      <div className="webcam-feed__video-container">
        <video
          ref={videoRef}
          className="webcam-feed__video"
          playsInline
          muted
          autoPlay
        />
        <canvas
          ref={canvasRef}
          className="webcam-feed__canvas"
        />

        {/* Placeholder when webcam is not active */}
        {!isWebcamReady && !webcamError && (
          <div className="webcam-feed__placeholder">
            <div className="webcam-feed__placeholder-icon">📷</div>
            <p className="webcam-feed__placeholder-text">
              Click <strong>Start Detection</strong> to begin
            </p>
            <p className="webcam-feed__placeholder-subtext">
              Camera access will be requested
            </p>
          </div>
        )}

        {/* Error message */}
        {webcamError && (
          <div className="webcam-feed__error">
            <div className="webcam-feed__error-icon">⚠️</div>
            <p className="webcam-feed__error-text">{webcamError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
