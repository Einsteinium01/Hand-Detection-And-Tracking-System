export interface Landmark {
  x: number; // 0-1 normalized
  y: number;
  z: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HandDetection {
  id?: number;
  landmarks: Landmark[];
  handedness: 'Left' | 'Right';
  confidence: number;
  bbox: BoundingBox;
  gesture: string;
}

export interface DetectionResult {
  hands: HandDetection[];
  num_hands: number;
}

export interface WebSocketMessage {
  type: 'detection';
  data: DetectionResult;
  processing_time_ms: number;
}

export type VisualizationMode = 'skeleton' | 'bbox' | 'both';

export interface DetectionConfig {
  isRunning: boolean;
  showSkeleton: boolean;
  showBbox: boolean;
  fps: number;
}
