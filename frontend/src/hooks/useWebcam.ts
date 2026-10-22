import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isWebcamReady: boolean;
  error: string | null;
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
  captureFrame: () => string | null;
}

const PREFERRED_WIDTH = 1280;
const PREFERRED_HEIGHT = 720;
const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;
const CAPTURE_WIDTH = 640;
const CAPTURE_HEIGHT = 480;

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a hidden capture canvas once
  useEffect(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    captureCanvasRef.current = canvas;
  }, []);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamReady(false);
  }, []);

  const startWebcam = useCallback(async () => {
    setError(null);

    // Stop any existing stream first
    stopWebcam();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: PREFERRED_WIDTH, min: MIN_WIDTH },
          height: { ideal: PREFERRED_HEIGHT, min: MIN_HEIGHT },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsWebcamReady(true);
      }
    } catch (err) {
      const mediaError = err as DOMException;
      let message = 'Failed to access webcam.';

      switch (mediaError.name) {
        case 'NotAllowedError':
          message = 'Camera permission denied. Please allow camera access in your browser settings.';
          break;
        case 'NotFoundError':
          message = 'No camera found. Please connect a webcam and try again.';
          break;
        case 'NotReadableError':
          message = 'Camera is in use by another application. Please close it and try again.';
          break;
        case 'OverconstrainedError':
          message = 'Camera does not meet the required constraints. Trying with lower resolution...';
          // Fallback to minimal constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
              setIsWebcamReady(true);
              setError(null);
              return;
            }
          } catch {
            message = 'Unable to access camera with any configuration.';
          }
          break;
      }

      setError(message);
      setIsWebcamReady(false);
    }
  }, [stopWebcam]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;

    if (!video || !canvas || video.readyState < video.HAVE_CURRENT_DATA) {
      return null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw the current video frame onto the hidden canvas at capture resolution
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);

    // Convert to base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    isWebcamReady,
    error,
    startWebcam,
    stopWebcam,
    captureFrame,
  };
}
