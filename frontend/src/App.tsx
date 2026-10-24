import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useWebcam } from './hooks/useWebcam';
import { useVideoRecorder } from './hooks/useVideoRecorder';
import { Header } from './components/Header';
import { WebcamFeed } from './components/WebcamFeed';
import { ControlPanel } from './components/ControlPanel';
import { StatusBar } from './components/StatusBar';
import type { DetectionConfig, WebSocketMessage } from './types/hand';
import './App.css';

const SEND_INTERVAL_MS = 66; // ~15 fps transmission to backend
const FPS_WINDOW_SIZE = 30;  // Moving average frame window

export default function App() {
  const { sendFrame, resetTracking, lastResult, isConnected } = useWebSocket();
  const { videoRef, isWebcamReady, error: webcamError, startWebcam, stopWebcam, captureFrame } = useWebcam();

  const [config, setConfig] = useState<DetectionConfig>({
    isRunning: false,
    showSkeleton: true,
    showBbox: true,
    fps: 0,
  });

  const [latestResult, setLatestResult] = useState<WebSocketMessage | null>(null);
  const [fps, setFps] = useState<number>(0);

  const {
    isRecording,
    recordingDuration,
    recordedInfo,
    startRecording,
    stopRecording,
    downloadRecording,
    clearRecording,
  } = useVideoRecorder({
    videoRef,
    detectionResult: latestResult,
    config,
  });

  const sendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsTimestampsRef = useRef<number[]>([]);

  /** Calculate smooth client-side FPS from server responses */
  useEffect(() => {
    if (lastResult) {
      setLatestResult(lastResult);

      const now = performance.now();
      const timestamps = fpsTimestampsRef.current;
      timestamps.push(now);

      while (timestamps.length > FPS_WINDOW_SIZE) {
        timestamps.shift();
      }

      if (timestamps.length >= 2) {
        const elapsed = timestamps[timestamps.length - 1] - timestamps[0];
        const calculatedFps = ((timestamps.length - 1) / elapsed) * 1000;
        setFps(calculatedFps);
      }
    }
  }, [lastResult]);

  /** Frame sending loop to backend WebSocket */
  const startSendingFrames = useCallback(() => {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
    }

    sendIntervalRef.current = setInterval(() => {
      const frame = captureFrame();
      if (frame) {
        sendFrame(frame);
      }
    }, SEND_INTERVAL_MS);
  }, [captureFrame, sendFrame]);

  const stopSendingFrames = useCallback(() => {
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
  }, []);

  /** Start detection pipeline */
  const handleStart = useCallback(async () => {
    await startWebcam();
    resetTracking();
    setConfig((prev) => ({ ...prev, isRunning: true }));
    fpsTimestampsRef.current = [];
    setFps(0);
  }, [startWebcam, resetTracking]);

  /** Stop detection pipeline */
  const handleStop = useCallback(() => {
    stopSendingFrames();
    stopWebcam();
    setConfig((prev) => ({ ...prev, isRunning: false }));
    setLatestResult(null);
    setFps(0);
    fpsTimestampsRef.current = [];
  }, [stopSendingFrames, stopWebcam]);

  /** Start/stop frame transmission based on pipeline readiness */
  useEffect(() => {
    if (config.isRunning && isWebcamReady && isConnected) {
      startSendingFrames();
    } else {
      stopSendingFrames();
    }

    return () => {
      stopSendingFrames();
    };
  }, [config.isRunning, isWebcamReady, isConnected, startSendingFrames, stopSendingFrames]);

  /** Keyboard shortcut: Space toggles Start/Stop */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is interacting with an input or button
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (config.isRunning) {
          handleStop();
        } else {
          handleStart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.isRunning, handleStart, handleStop]);

  /** Config change handler */
  const handleConfigChange = useCallback((partial: Partial<DetectionConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  /** Cleanup timers on unmount */
  useEffect(() => {
    return () => {
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
      }
    };
  }, []);

  // Derive detected hands array
  const activeHands = useMemo(() => {
    return latestResult?.data?.hands ?? [];
  }, [latestResult]);

  return (
    <div className="app-shell">
      <Header
        isConnected={isConnected}
        isRunning={config.isRunning}
        numHands={activeHands.length}
        fps={fps}
      />

      <main className="app-main">
        <div className="app-layout">
          {/* Main Video Viewport & Telemetry Strip */}
          <section className="viewport-column" aria-label="Live feed and metrics">
            <WebcamFeed
              videoRef={videoRef}
              isWebcamReady={isWebcamReady}
              webcamError={webcamError}
              detectionResult={latestResult}
              config={config}
              isRecording={isRecording}
              recordingDuration={recordingDuration}
            />
            <StatusBar
              detectionResult={latestResult}
              isConnected={isConnected}
              isRunning={config.isRunning}
            />
          </section>

          {/* Interactive Control Sidebar */}
          <ControlPanel
            onStart={handleStart}
            onStop={handleStop}
            isRunning={config.isRunning}
            isConnected={isConnected}
            fps={fps}
            config={config}
            onConfigChange={handleConfigChange}
            activeHands={activeHands}
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            recordedInfo={recordedInfo}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onDownloadRecording={downloadRecording}
            onClearRecording={clearRecording}
          />
        </div>
      </main>
    </div>
  );
}
