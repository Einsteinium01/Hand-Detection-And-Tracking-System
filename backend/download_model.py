"""Download the MediaPipe HandLandmarker model file.

Downloads the float16 hand_landmarker.task model from Google's MediaPipe
model repository and saves it to backend/models/hand_landmarker.task.
Skips download if the file already exists.
"""

import os
import sys
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
)
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "hand_landmarker.task")


def download_model() -> str:
    """Download the HandLandmarker model if it doesn't already exist.

    Returns:
        The absolute path to the downloaded model file.
    """
    if os.path.isfile(MODEL_PATH):
        logger.info("Model already exists at %s — skipping download.", MODEL_PATH)
        return MODEL_PATH

    os.makedirs(MODEL_DIR, exist_ok=True)
    logger.info("Downloading HandLandmarker model from %s ...", MODEL_URL)

    try:
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
        file_size_mb = os.path.getsize(MODEL_PATH) / (1024 * 1024)
        logger.info(
            "Model downloaded successfully (%.1f MB) → %s",
            file_size_mb,
            MODEL_PATH,
        )
    except Exception as exc:
        # Clean up partial download
        if os.path.isfile(MODEL_PATH):
            os.remove(MODEL_PATH)
        logger.error("Failed to download model: %s", exc)
        raise

    return MODEL_PATH


if __name__ == "__main__":
    try:
        download_model()
    except Exception:
        sys.exit(1)
