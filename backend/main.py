"""FastAPI backend for the Hand Detection and Tracking System.

Exposes a WebSocket endpoint that receives base64-encoded JPEG frames from the
browser, runs MediaPipe hand detection, and returns structured JSON results so
the frontend can render overlays.
"""

import base64
import json
import logging
import time

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from hand_detector import HandDetector

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App & detector
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Hand Detection & Tracking API",
    version="1.0.0",
    description="Real-time hand landmark detection via WebSocket.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector: HandDetector | None = None


@app.on_event("startup")
async def startup_event() -> None:
    """Initialise the HandDetector once when the server starts."""
    global detector  # noqa: PLW0603
    try:
        detector = HandDetector()
        logger.info("HandDetector loaded successfully.")
    except FileNotFoundError:
        logger.error(
            "HandLandmarker model not found. "
            "Run `python download_model.py` before starting the server."
        )
    except Exception:
        logger.exception("Failed to initialise HandDetector")


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health() -> dict:
    """Simple liveness probe."""
    return {"status": "ok"}


@app.get("/api/status")
async def status() -> dict:
    """Return current detector readiness information."""
    if detector is None:
        return {
            "is_ready": False,
            "model_loaded": False,
            "model_path": None,
            "detail": "Detector failed to initialise — check server logs.",
        }
    return {
        "is_ready": detector.is_ready,
        "model_loaded": detector.is_ready,
        "model_path": detector.model_path,
    }


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

def _decode_frame(b64_data: str) -> np.ndarray | None:
    """Decode a base64-encoded JPEG into a BGR numpy array.

    Returns ``None`` on any decoding error.
    """
    try:
        img_bytes = base64.b64decode(b64_data)
        np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            logger.warning("cv2.imdecode returned None — invalid image data.")
        return frame
    except Exception:
        logger.exception("Failed to decode base64 frame")
        return None


@app.websocket("/ws/detect")
async def websocket_detect(ws: WebSocket) -> None:
    """Handle a single WebSocket client session.

    Protocol
    --------
    *Client → Server* (JSON):
        ``{"frame": "<base64_jpeg>", "config": {...optional...}}``

    *Server → Client* (JSON):
        ``{"type": "detection", "data": {...}, "processing_time_ms": float}``
    """
    await ws.accept()
    client = ws.client
    client_label = f"{client.host}:{client.port}" if client else "unknown"
    logger.info("WebSocket connected: %s", client_label)

    frame_count = 0
    fps_start = time.monotonic()

    try:
        while True:
            raw = await ws.receive_text()

            # --- Parse incoming message ---
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            b64_frame = message.get("frame")
            if not b64_frame:
                await ws.send_json(
                    {"type": "error", "message": "Missing 'frame' field"}
                )
                continue

            # --- Decode frame ---
            frame = _decode_frame(b64_frame)
            if frame is None:
                await ws.send_json(
                    {"type": "error", "message": "Failed to decode frame"}
                )
                continue

            # --- Run detection ---
            if detector is None or not detector.is_ready:
                await ws.send_json(
                    {"type": "error", "message": "Detector not ready"}
                )
                continue

            t0 = time.perf_counter()
            result = detector.detect(frame)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0

            # --- FPS tracking ---
            frame_count += 1
            elapsed_total = time.monotonic() - fps_start
            if elapsed_total >= 5.0:
                fps = frame_count / elapsed_total
                logger.info(
                    "Client %s — server FPS: %.1f  (last detection: %.1f ms)",
                    client_label,
                    fps,
                    elapsed_ms,
                )
                frame_count = 0
                fps_start = time.monotonic()

            # --- Send result ---
            await ws.send_json(
                {
                    "type": "detection",
                    "data": result,
                    "processing_time_ms": round(elapsed_ms, 2),
                }
            )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", client_label)
    except Exception:
        logger.exception("WebSocket error for client %s", client_label)


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
