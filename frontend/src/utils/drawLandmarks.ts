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
  // Palm base connections
  [5, 9], [9, 13], [13, 17],
];

/** Fingertip landmark indices */
const FINGERTIP_INDICES = new Set([4, 8, 12, 16, 20]);

/** Distinct high-contrast palette per handedness and tracking ID */
const PALETTES = {
  Left: {
    primary: '#38bdf8',       // Sky blue
    fill: '#0284c7',
    glow: 'rgba(56, 189, 248, 0.35)',
    connection: 'rgba(56, 189, 248, 0.65)',
    connectionGlow: 'rgba(56, 189, 248, 0.2)',
    bbox: 'rgba(56, 189, 248, 0.75)',
    bboxFill: 'rgba(14, 165, 233, 0.06)',
    labelBg: 'rgba(12, 18, 34, 0.92)',
  },
  Right: {
    primary: '#34d399',      // Emerald green
    fill: '#059669',
    glow: 'rgba(52, 211, 153, 0.35)',
    connection: 'rgba(52, 211, 153, 0.65)',
    connectionGlow: 'rgba(52, 211, 153, 0.2)',
    bbox: 'rgba(52, 211, 153, 0.75)',
    bboxFill: 'rgba(16, 185, 129, 0.06)',
    labelBg: 'rgba(10, 26, 20, 0.92)',
  },
} as const;

interface DrawOptions {
  landmarkRadius?: number;
  connectionWidth?: number;
}

/**
 * Draws the 21 hand landmarks with specialized styling for fingertips and joints.
 */
export function drawHandLandmarks(
  ctx: CanvasRenderingContext2D,
  hand: HandDetection,
  canvasWidth: number,
  canvasHeight: number,
  options: DrawOptions = {}
): void {
  const { landmarkRadius = 4.5 } = options;
  const palette = PALETTES[hand.handedness] || PALETTES.Right;

  ctx.save();

  for (let idx = 0; idx < hand.landmarks.length; idx++) {
    const lm = hand.landmarks[idx];
    const x = lm.x * canvasWidth;
    const y = lm.y * canvasHeight;
    const isTip = FINGERTIP_INDICES.has(idx);
    const isWrist = idx === 0;

    const radius = isTip ? landmarkRadius * 1.25 : isWrist ? landmarkRadius * 1.1 : landmarkRadius * 0.85;

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, radius + 2.5, 0, Math.PI * 2);
    ctx.fillStyle = palette.glow;
    ctx.fill();

    // Main node circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? palette.primary : palette.fill;
    ctx.fill();

    // Inner bright center dot for high-tech precision look
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.5, radius * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws connections between landmarks with a soft anti-aliased glow.
 */
export function drawHandConnections(
  ctx: CanvasRenderingContext2D,
  hand: HandDetection,
  canvasWidth: number,
  canvasHeight: number,
  options: DrawOptions = {}
): void {
  const { connectionWidth = 2.5 } = options;
  const palette = PALETTES[hand.handedness] || PALETTES.Right;

  if (hand.landmarks.length < 21) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pass 1: Soft outer glow line
  ctx.strokeStyle = palette.connectionGlow;
  ctx.lineWidth = connectionWidth * 2.2;
  ctx.beginPath();
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const start = hand.landmarks[startIdx];
    const end = hand.landmarks[endIdx];
    if (start && end) {
      ctx.moveTo(start.x * canvasWidth, start.y * canvasHeight);
      ctx.lineTo(end.x * canvasWidth, end.y * canvasHeight);
    }
  }
  ctx.stroke();

  // Pass 2: Sharp core line
  ctx.strokeStyle = palette.connection;
  ctx.lineWidth = connectionWidth;
  ctx.beginPath();
  for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
    const start = hand.landmarks[startIdx];
    const end = hand.landmarks[endIdx];
    if (start && end) {
      ctx.moveTo(start.x * canvasWidth, start.y * canvasHeight);
      ctx.lineTo(end.x * canvasWidth, end.y * canvasHeight);
    }
  }
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a precision bounding box with corner brackets, un-mirrored label badge, and gesture pill.
 */
export function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  hand: HandDetection,
  canvasWidth: number,
  canvasHeight: number
): void {
  const palette = PALETTES[hand.handedness] || PALETTES.Right;
  const { bbox } = hand;

  const x = bbox.x * canvasWidth;
  const y = bbox.y * canvasHeight;
  const w = bbox.width * canvasWidth;
  const h = bbox.height * canvasHeight;
  const radius = 10;
  const cornerLen = Math.min(18, Math.min(w, h) * 0.25);

  ctx.save();

  // 1. Subtle bounding box fill
  ctx.fillStyle = palette.bboxFill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  // 2. Subtle dashed perimeter
  ctx.strokeStyle = palette.bbox;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Precision corner brackets (CV reticle style)
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = palette.primary;

  // Top-Left corner
  ctx.beginPath();
  ctx.moveTo(x, y + cornerLen);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.lineTo(x + cornerLen, y);
  ctx.stroke();

  // Top-Right corner
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y);
  ctx.lineTo(x + w - radius, y);
  ctx.arcTo(x + w, y, x + w, y + radius, radius);
  ctx.lineTo(x + w, y + cornerLen);
  ctx.stroke();

  // Bottom-Left corner
  ctx.beginPath();
  ctx.moveTo(x, y + h - cornerLen);
  ctx.lineTo(x, y + h - radius);
  ctx.arcTo(x, y + h, x + radius, y + h, radius);
  ctx.lineTo(x + cornerLen, y + h);
  ctx.stroke();

  // Bottom-Right corner
  ctx.beginPath();
  ctx.moveTo(x + w - cornerLen, y + h);
  ctx.lineTo(x + w - radius, y + h);
  ctx.arcTo(x + w, y + h, x + w, y + h - radius, radius);
  ctx.lineTo(x + w, y + h - cornerLen);
  ctx.stroke();

  // 4. Label Badge Header: Hand #ID, Handedness & Confidence
  const gesture = hand.gesture && hand.gesture !== 'Unknown' ? hand.gesture : '';
  const idPrefix = hand.id != null ? `Hand #${hand.id} • ` : '';
  const label = `${idPrefix}${hand.handedness} ${Math.round(hand.confidence * 100)}%`;

  ctx.font = '600 12px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const textMetrics = ctx.measureText(label);
  const paddingH = 9;
  const badgeHeight = 22;
  const badgeWidth = textMetrics.width + paddingH * 2 + 10; // extra room for indicator dot
  const badgeX = x;
  const badgeY = Math.max(4, y - badgeHeight - 6);

  // Badge background with dark glass styling
  ctx.fillStyle = palette.labelBg;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.fill();

  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 6);
  ctx.stroke();

  // Draw un-mirrored label content
  ctx.save();
  const badgeCenterX = badgeX + badgeWidth / 2;
  ctx.translate(badgeCenterX, 0);
  ctx.scale(-1, 1);
  ctx.translate(-badgeCenterX, 0);

  // Status dot
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.arc(badgeX + paddingH + 3, badgeY + badgeHeight / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, badgeX + paddingH + 11, badgeY + badgeHeight / 2 + 0.5);
  ctx.restore();

  // 5. Gesture Pill (floats below bounding box)
  if (gesture) {
    ctx.font = '700 14px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const gestureMetrics = ctx.measureText(gesture);
    const gPadH = 12;
    const gHeight = 28;
    const gWidth = gestureMetrics.width + gPadH * 2;
    const gX = x + w / 2 - gWidth / 2;
    const gY = y + h + 8;

    // Gesture pill background
    ctx.fillStyle = 'rgba(10, 14, 26, 0.92)';
    ctx.beginPath();
    ctx.roundRect(gX, gY, gWidth, gHeight, 14);
    ctx.fill();

    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(gX, gY, gWidth, gHeight, 14);
    ctx.stroke();

    // Draw un-mirrored gesture text
    ctx.save();
    const gCenterX = gX + gWidth / 2;
    ctx.translate(gCenterX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-gCenterX, 0);
    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    ctx.fillText(gesture, gX + gPadH, gY + gHeight / 2 + 0.5);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Clears the entire canvas viewport cleanly.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}
