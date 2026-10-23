import { useState, useRef, useCallback, useEffect } from 'react';
import type { WebSocketMessage, DetectionConfig } from '../types/hand';
import {
  drawHandLandmarks,
  drawHandConnections,
  drawBoundingBox,
} from '../utils/drawLandmarks';

interface UseVideoRecorderOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  detectionResult: WebSocketMessage | null;
  config: DetectionConfig;
}

export interface RecordingInfo {
  url: string;
  blob: Blob;
  duration: number;
  sizeBytes: number;
  filename: string;
}

export interface UseVideoRecorderReturn {
  isRecording: boolean;
  recordingDuration: number;
  recordedInfo: RecordingInfo | null;
  startRecording: () => boolean;
  stopRecording: () => void;
  downloadRecording: () => void;
  clearRecording: () => void;
  error: string | null;
}

function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || !('MediaRecorder' in window)) {
    return '';
  }

  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

export function useVideoRecorder({
  videoRef,
  detectionResult,
  config,
}: UseVideoRecorderOptions): UseVideoRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedInfo, setRecordedInfo] = useState<RecordingInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // References for active recording
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const startTimeRef = useRef<number>(0);

  // Keep latest refs so the requestAnimationFrame draw loop always accesses current state
  const detectionResultRef = useRef<WebSocketMessage | null>(detectionResult);
  detectionResultRef.current = detectionResult;

  const configRef = useRef<DetectionConfig>(config);
  configRef.current = config;

  // Cleanup blob URL on unmount or when clearing
  const cleanupUrl = useCallback((info: RecordingInfo | null) => {
    if (info?.url) {
      URL.revokeObjectURL(info.url);
    }
  }, []);

  const clearRecording = useCallback(() => {
    setRecordedInfo((prev) => {
      cleanupUrl(prev);
      return null;
    });
    setRecordingDuration(0);
    setError(null);
  }, [cleanupUrl]);

  /** Stop recording */
  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    setIsRecording(false);
  }, []);

  /** Start recording */
  const startRecording = useCallback((): boolean => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError('Webcam video stream is not ready for recording');
      return false;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setError('MediaRecorder is not supported in this browser');
      return false;
    }

    // Clear previous recording if any
    clearRecording();
    setError(null);

    // Create offscreen recording canvas
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    let canvas = recordCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      recordCanvasRef.current = canvas;
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setError('Unable to get canvas 2D rendering context');
      return false;
    }

    // Capture 30 FPS stream from canvas
    const stream = canvas.captureStream(30);
    chunksRef.current = [];

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_500_000, // 2.5 Mbps crisp video
      });
    } catch {
      // Fallback without videoBitsPerSecond option if unsupported
      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch (e) {
        setError(`Failed to create MediaRecorder: ${(e as Error).message}`);
        return false;
      }
    }

    recorderRef.current = recorder;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const chunks = chunksRef.current;
      if (chunks.length === 0) return;

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `hand-tracking-${timestamp}.${ext}`;
      const totalDuration = Math.max(1, (Date.now() - startTimeRef.current) / 1000);

      setRecordedInfo({
        url,
        blob,
        duration: totalDuration,
        sizeBytes: blob.size,
        filename,
      });
    };

    // Continuous composite draw loop for recording
    const renderLoop = () => {
      if (!video || !ctx || video.paused || video.ended) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      ctx.save();
      // Mirror horizontally so the video matches user perspective
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);

      // Draw detection overlays on top of the recorded video
      const latestResult = detectionResultRef.current;
      const currentConfig = configRef.current;

      if (latestResult?.data?.hands) {
        for (const hand of latestResult.data.hands) {
          if (currentConfig.showSkeleton) {
            drawHandConnections(ctx, hand, width, height);
            drawHandLandmarks(ctx, hand, width, height);
          }
          if (currentConfig.showBbox) {
            drawBoundingBox(ctx, hand, width, height);
          }
        }
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    try {
      recorder.start(100); // 100ms chunk intervals
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      animFrameRef.current = requestAnimationFrame(renderLoop);
      return true;
    } catch (e) {
      setError(`Failed to start recording: ${(e as Error).message}`);
      return false;
    }
  }, [videoRef, clearRecording]);

  /** Download the current recording */
  const downloadRecording = useCallback(() => {
    if (!recordedInfo) return;

    const a = document.createElement('a');
    a.href = recordedInfo.url;
    a.download = recordedInfo.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [recordedInfo]);

  // If detection stops, stop recording automatically to save the session
  useEffect(() => {
    if (!config.isRunning && isRecording) {
      stopRecording();
    }
  }, [config.isRunning, isRecording, stopRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    recordingDuration,
    recordedInfo,
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
    error,
  };
}
