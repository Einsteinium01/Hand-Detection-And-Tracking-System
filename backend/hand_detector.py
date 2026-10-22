"""Hand detection wrapper around MediaPipe's HandLandmarker Task Vision API."""

import os
import logging
from dataclasses import dataclass

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Padding (as a fraction of bounding-box size) added around the tight
# landmark-derived bounding box so the rectangle isn't flush against the hand.
_BBOX_PADDING = 0.05

# Default path to the model file, relative to *this* file's directory.
_DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "models", "hand_landmarker.task"
)


@dataclass
class DetectorConfig:
    """Configuration knobs exposed to callers."""

    num_hands: int = 2
    min_detection_confidence: float = 0.5
    min_tracking_confidence: float = 0.5


class HandDetector:
    """Thin wrapper around MediaPipe HandLandmarker (Task Vision API).

    Usage::

        detector = HandDetector()
        result = detector.detect(bgr_frame)
        print(result["num_hands"])
    """

    def __init__(
        self,
        model_path: str = _DEFAULT_MODEL_PATH,
        config: DetectorConfig | None = None,
    ) -> None:
        cfg = config or DetectorConfig()
        self._model_path = model_path
        self._is_ready = False

        if not os.path.isfile(model_path):
            logger.error("Model file not found at %s", model_path)
            raise FileNotFoundError(
                f"HandLandmarker model not found at {model_path}. "
                "Run `python download_model.py` first."
            )

        base_options = mp_python.BaseOptions(model_asset_path=model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_hands=cfg.num_hands,
            min_hand_detection_confidence=cfg.min_detection_confidence,
            min_hand_presence_confidence=cfg.min_tracking_confidence,
        )

        self._detector = vision.HandLandmarker.create_from_options(options)
        self._is_ready = True
        logger.info(
            "HandDetector initialised (num_hands=%d, det_conf=%.2f, track_conf=%.2f)",
            cfg.num_hands,
            cfg.min_detection_confidence,
            cfg.min_tracking_confidence,
        )

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    @property
    def is_ready(self) -> bool:
        """Whether the detector was successfully initialised."""
        return self._is_ready

    @property
    def model_path(self) -> str:
        return self._model_path

    # ------------------------------------------------------------------
    # Detection
    # ------------------------------------------------------------------

    def detect(self, frame: np.ndarray) -> dict:
        """Run hand detection on a BGR OpenCV frame.

        Args:
            frame: A numpy array in BGR colour order (as returned by
                ``cv2.imread`` / ``cv2.imdecode``).

        Returns:
            A dict with the schema::

                {
                    "hands": [
                        {
                            "landmarks": [{"x": float, "y": float, "z": float}, ...],
                            "handedness": "Left" | "Right",
                            "confidence": float,
                            "bbox": {"x": float, "y": float, "width": float, "height": float}
                        },
                        ...
                    ],
                    "num_hands": int
                }

            Landmark coordinates and the bounding box are normalised to [0, 1].
        """
        if not self._is_ready:
            logger.warning("detect() called but detector is not ready")
            return {"hands": [], "num_hands": 0}

        try:
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)  # BGR → RGB (contiguous)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            result = self._detector.detect(mp_image)
        except Exception:
            logger.exception("MediaPipe detection failed")
            return {"hands": [], "num_hands": 0}

        hands: list[dict] = []
        for hand_landmarks, handedness_list in zip(
            result.hand_landmarks, result.handedness
        ):
            top_handedness = handedness_list[0]  # highest-confidence category
            landmarks = [
                {"x": lm.x, "y": lm.y, "z": lm.z} for lm in hand_landmarks
            ]
            bbox = self._bbox_from_landmarks(landmarks)
            hands.append(
                {
                    "landmarks": landmarks,
                    "handedness": top_handedness.category_name,
                    "confidence": round(top_handedness.score, 4),
                    "bbox": bbox,
                }
            )

        return {"hands": hands, "num_hands": len(hands)}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _bbox_from_landmarks(
        landmarks: list[dict],
    ) -> dict:
        """Compute a padded, normalised bounding box from 21 landmarks."""
        xs = [lm["x"] for lm in landmarks]
        ys = [lm["y"] for lm in landmarks]

        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)

        w = x_max - x_min
        h = y_max - y_min

        pad_x = w * _BBOX_PADDING
        pad_y = h * _BBOX_PADDING

        x_min = max(0.0, x_min - pad_x)
        y_min = max(0.0, y_min - pad_y)
        box_w = min(1.0 - x_min, w + 2 * pad_x)
        box_h = min(1.0 - y_min, h + 2 * pad_y)

        return {
            "x": round(x_min, 6),
            "y": round(y_min, 6),
            "width": round(box_w, 6),
            "height": round(box_h, 6),
        }
