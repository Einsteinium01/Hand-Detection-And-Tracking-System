import type { HandDetection } from '../types/hand';

/**
 * Standard MediaPipe hand landmark connections.
 * Each pair [a, b] means landmark a connects to landmark b.
 */
const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index finger
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle finger
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring finger
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm connections
  [5, 9], [9, 13], [13, 17],
];

/** Color scheme: left hand = blue, right hand = green */
const COLORS = {
  Left: {
    primary: '#4A90D9',
    fill: 'rgba(74, 144, 217, 0.8)',
    connection: 'rgba(74, 144, 217, 0.5)',
    bbox: 'rgba(74, 144, 217, 0.7)',
    bboxFill: 'rgba(74, 144, 217, 0.08)',
    label: 'rgba(74, 144, 217, 0.9)',
  },
  Right: {
    primary: '#27AE60',
    fill: 'rgba(39, 174, 96, 0.8)',
    connection: 'rgba(39, 174, 96, 0.5)',
    bbox: 'rgba(39, 174, 96, 0.7)',
    bboxFill: 'rgba(39, 174, 96, 0.08)',
    label: 'rgba(39, 174, 96, 0.9)',
  },
} as const;

interface DrawOptions {
  landmarkRadius?: number;
  connectionWidth?: number;
}

/**
 * Draws the 21 hand landmarks as small filled circles.
 */
export function drawHandLandmarks(
  ctx: CanvasRenderingContext2D,
  hand: HandDetection,
  canvasWidth: number,
  canvasHeight: number,
  options: DrawOptions = {}
): void {
  const { landmarkRadius = 4 } = options;
  const colors = COLORS[hand.handedness];

  ctx.save();

  for (const landmark of hand.landmarks) {
    const x = landmark.x * canvasWidth;
    const y = landmark.y * canvasHeight;

    // Outer glow
    ctx.beginPath();
    ctx.arc(x, y, landmarkRadius + 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    // Main circle
    ctx.beginPath();
    ctx.arc(x, y, landmarkRadius, 0, Math.PI * 2);
    ctx.fillStyle = colors.fill;
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(x, y, landmarkRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws connections between landmarks using the standard MediaPipe hand topology.
 */
export function drawHandConnections(
  ctx: CanvasRenderingContext2D,
  hand: HandDetection,
  canvasWidth: number,
  canvasHeight: number,
  options: DrawOptions = {}
): void {
  const { connectionWidth = 2.5 } = options;
  const colors = COLORS[hand.handedness];

  if (hand.landmarks.length < 21) return;

  ctx.save();
  ctx.strokeStyle = colors.connection;
  ctx.lineWidth = connectionWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const start = hand.landmarks[startIdx];
    const end = hand.landmarks[endIdx];

    if (!start || !end) continue;

    const x1 = start.x * canvasWidth;
    const y1 = start.y * canvasHeight;
    const x2 = end.x * canvasWidth;
    const y2 = end.y * canvasHeight;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws a bounding box around the detected hand with handedness label and confidence.
 */
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  hand: HandDetection,
  canvasWidth: number,
  canvasHeight: number
): void {
  const colors = COLORS[hand.handedness];
  const { bbox } = hand;

  const x = bbox.x * canvasWidth;
  const y = bbox.y * canvasHeight;
  const w = bbox.width * canvasWidth;
  const h = bbox.height * canvasHeight;
  const radius = 8;

  ctx.save();

  // Draw filled background
  ctx.fillStyle = colors.bboxFill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // Draw dashed border
  ctx.strokeStyle = colors.bbox;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw label background
  const gesture = hand.gesture && hand.gesture !== 'Unknown' ? hand.gesture : '';
  const idPrefix = hand.id != null ? `Hand #${hand.id} • ` : '';
  const label = `${idPrefix}${hand.handedness} ${Math.round(hand.confidence * 100)}%`;
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  const textMetrics = ctx.measureText(label);
  const textHeight = 20;
  const padding = 6;
  const labelWidth = textMetrics.width + padding * 2;
  const labelHeight = textHeight + padding;
  const labelX = x;
  const labelY = y - labelHeight - 4;

  ctx.fillStyle = colors.label;
  ctx.beginPath();
  ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
  ctx.fill();

  // Draw label text (un-mirror so text reads correctly on the flipped canvas)
  ctx.save();
  const textCenterX = labelX + labelWidth / 2;
  ctx.translate(textCenterX, 0);
  ctx.scale(-1, 1);
  ctx.translate(-textCenterX, 0);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, labelX + padding, labelY + labelHeight / 2);
  ctx.restore();

  // Draw gesture label below the bounding box if a gesture is detected
  if (gesture) {
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    const gestureMetrics = ctx.measureText(gesture);
    const gesturePad = 8;
    const gestureWidth = gestureMetrics.width + gesturePad * 2;
    const gestureHeight = 26;
    const gestureX = x + w / 2 - gestureWidth / 2;
    const gestureY = y + h + 6;

    // Gesture pill background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(gestureX, gestureY, gestureWidth, gestureHeight, 13);
    ctx.fill();

    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.roundRect(gestureX, gestureY, gestureWidth, gestureHeight, 13);
    ctx.stroke();

    // Gesture text (un-mirror)
    ctx.save();
    const gestureCenterX = gestureX + gestureWidth / 2;
    ctx.translate(gestureCenterX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-gestureCenterX, 0);
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(gesture, gestureX + gesturePad, gestureY + gestureHeight / 2);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Clears the entire canvas.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}
