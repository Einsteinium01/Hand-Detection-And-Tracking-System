import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useWebcam } from './hooks/useWebcam';
import { WebcamFeed } from './components/WebcamFeed';
import { ControlPanel } from './components/ControlPanel';
import { StatusBar } from './components/StatusBar';
import type { DetectionConfig, WebSocketMessage } from './types/hand';
import './App.css';

const SEND_INTERVAL_MS = 66; // ~15 fps to backend
const FPS_WINDOW_SIZE = 30; // number of timestamps to average over

function App() {
  const { sendFrame, lastResult, isConnected } = useWebSocket();
  const { videoRef, isWebcamReady, error: webcamError, startWebcam, stopWebcam, captureFrame } = useWebcam();

  const [config, setConfig] = useState<DetectionConfig>({
    isRunning: false,
    showSkeleton: true,
    showBbox: true,
    fps: 0,
  });

  const [latestResult, setLatestResult] = useState<WebSocketMessage | null>(null);
  const [fps, setFps] = useState(0);

  const sendIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fpsTimestampsRef = useRef<number[]>([]);

  /** Calculate FPS from response timestamps */
  useEffect(() => {
    if (lastResult) {
      setLatestResult(lastResult);

      const now = performance.now();
      const timestamps = fpsTimestampsRef.current;
      timestamps.push(now);

      // Keep only the last N timestamps
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

  /** Frame sending loop */
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
    setConfig((prev) => ({ ...prev, isRunning: true }));
    fpsTimestampsRef.current = [];
    setFps(0);
    // Frame sending will be started once webcam is ready (see effect below)
  }, [startWebcam]);

  /** Stop detection pipeline */
  const handleStop = useCallback(() => {
    stopSendingFrames();
    stopWebcam();
    setConfig((prev) => ({ ...prev, isRunning: false }));
    setLatestResult(null);
    setFps(0);
    fpsTimestampsRef.current = [];
  }, [stopSendingFrames, stopWebcam]);

  /** Start sending frames once webcam is ready and running */
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

  /** Config change handler */
  const handleConfigChange = useCallback((partial: Partial<DetectionConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  /** Cleanup on unmount */
  useEffect(() => {
    return () => {
      if (sendIntervalRef.current) {
        clearInterval(sendIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          <span className="app__title-icon">🖐️</span>
          Hand Detection & Tracking
        </h1>
        <p className="app__subtitle">Real-time hand detection powered by computer vision</p>
      </header>

      <main className="app__main">
        <div className="app__content">
          <div className="app__video-section">
            <WebcamFeed
              videoRef={videoRef}
              isWebcamReady={isWebcamReady}
              webcamError={webcamError}
              detectionResult={latestResult}
              config={config}
            />
            <StatusBar
              detectionResult={latestResult}
              isConnected={isConnected}
              isRunning={config.isRunning}
            />
          </div>

          <aside className="app__sidebar">
            <ControlPanel
              onStart={handleStart}
              onStop={handleStop}
              isRunning={config.isRunning}
              isConnected={isConnected}
              fps={fps}
              config={config}
              onConfigChange={handleConfigChange}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
