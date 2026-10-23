"""Rotation-invariant gesture recognition from MediaPipe hand landmarks.

Uses dual distance-based finger extension checks (tip-to-MCP AND
tip-to-wrist) so gestures are detected accurately regardless of hand
orientation.  Only the 8 gestures listed below are supported; anything
else returns "Unknown".

MediaPipe Hand Landmark Indices:
    0:  WRIST
    1:  THUMB_CMC    2: THUMB_MCP    3: THUMB_IP     4: THUMB_TIP
    5:  INDEX_MCP    6: INDEX_PIP    7: INDEX_DIP    8: INDEX_TIP
    9:  MIDDLE_MCP  10: MIDDLE_PIP  11: MIDDLE_DIP  12: MIDDLE_TIP
   13:  RING_MCP    14: RING_PIP    15: RING_DIP    16: RING_TIP
   17:  PINKY_MCP   18: PINKY_PIP   19: PINKY_DIP   20: PINKY_TIP
"""

import math
import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _dist(a: dict, b: dict) -> float:
    """Euclidean distance between two landmarks (2D, ignoring z)."""
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


def _palm_size(landmarks: list[dict]) -> float:
    """Approximate palm size as distance from wrist to middle-finger MCP."""
    return _dist(landmarks[0], landmarks[9])


# ---------------------------------------------------------------------------
# Finger extension detection (rotation-invariant, dual-check)
# ---------------------------------------------------------------------------

# For each finger: (MCP index, PIP index, DIP index, TIP index)
_FINGER_JOINTS = {
    "index":  (5,  6,  7,  8),
    "middle": (9,  10, 11, 12),
    "ring":   (13, 14, 15, 16),
    "pinky":  (17, 18, 19, 20),
}


def _is_finger_extended(landmarks: list[dict], finger: str) -> bool:
    """Dual-check finger extension (rotation-invariant).

    A finger is considered extended only when BOTH conditions hold:
      1. Tip is further from MCP than PIP is from MCP
      2. Tip is further from wrist than PIP is from wrist

    Requiring both checks eliminates false positives from curled
    fingers whose tips swing past the MCP on the other side.
    """
    mcp_i, pip_i, _dip_i, tip_i = _FINGER_JOINTS[finger]
    wrist = landmarks[0]
    mcp = landmarks[mcp_i]
    pip = landmarks[pip_i]
    tip = landmarks[tip_i]

    # Check 1: tip further from MCP than PIP is
    check_mcp = _dist(tip, mcp) > _dist(pip, mcp)

    # Check 2: tip further from wrist than PIP is
    check_wrist = _dist(tip, wrist) > _dist(pip, wrist)

    return check_mcp and check_wrist


def _is_thumb_extended(landmarks: list[dict]) -> bool:
    """Thumb is extended if tip–CMC distance is large relative to palm size.

    When the thumb is tucked (fist), the tip wraps close to the CMC,
    giving a short straight-line distance.  When extended, the tip
    moves far from the CMC.
    """
    thumb_cmc = landmarks[1]
    thumb_tip = landmarks[4]
    palm = _palm_size(landmarks)

    if palm < 0.01:
        return False

    cmc_to_tip = _dist(thumb_cmc, thumb_tip)
    return cmc_to_tip > palm * 0.55


def _get_finger_states(landmarks: list[dict]) -> tuple[bool, bool, bool, bool, bool]:
    """Return (thumb, index, middle, ring, pinky) extension states."""
    return (
        _is_thumb_extended(landmarks),
        _is_finger_extended(landmarks, "index"),
        _is_finger_extended(landmarks, "middle"),
        _is_finger_extended(landmarks, "ring"),
        _is_finger_extended(landmarks, "pinky"),
    )


# ---------------------------------------------------------------------------
# Thumb direction (up vs down)
# ---------------------------------------------------------------------------

def _thumb_direction(landmarks: list[dict]) -> str:
    """Determine if thumb points 'up' or 'down' relative to the hand.

    Uses the dot product of the thumb vector (CMC → tip) against the
    hand's own up-axis (wrist → middle MCP).  Positive dot = same
    direction as fingers = up.
    """
    wrist = landmarks[0]
    mid_mcp = landmarks[9]

    # Hand 'up' vector: wrist → middle MCP
    hx = mid_mcp["x"] - wrist["x"]
    hy = mid_mcp["y"] - wrist["y"]

    # Thumb vector: CMC → tip
    thumb_cmc = landmarks[1]
    thumb_tip = landmarks[4]
    tx = thumb_tip["x"] - thumb_cmc["x"]
    ty = thumb_tip["y"] - thumb_cmc["y"]

    dot = hx * tx + hy * ty
    return "up" if dot > 0 else "down"


# ---------------------------------------------------------------------------
# Gesture classification
# ---------------------------------------------------------------------------

def recognise_gesture(landmarks: list[dict], handedness: str) -> str:
    """Classify the hand gesture from 21 normalised landmarks.

    Supported gestures (only these 8):
        👍 Thumbs Up  |  👎 Thumbs Down  |  ✌️ Peace
        🖐️ Open Palm  |  ✊ Fist         |  ☝️ Pointing Up
        🤟 Rock       |  👌 OK

    Args:
        landmarks: List of 21 dicts with ``x``, ``y``, ``z`` keys.
        handedness: ``"Left"`` or ``"Right"``.

    Returns:
        A human-readable gesture name string, or ``"Unknown"``.
    """
    if len(landmarks) < 21:
        return "Unknown"

    thumb, index, middle, ring, pinky = _get_finger_states(landmarks)
    extended_count = sum([thumb, index, middle, ring, pinky])

    # ── OK sign: thumb tip and index tip very close, others extended ──
    thumb_index_dist = _dist(landmarks[4], landmarks[8])
    palm = _palm_size(landmarks)
    if palm > 0.01 and thumb_index_dist < palm * 0.2:
        # Thumb and index forming a circle, at least middle+ring extended
        if middle and ring:
            return "OK 👌"

    # ── Fist: no fingers extended ──
    if extended_count == 0:
        return "Fist ✊"

    # ── Thumbs Up / Down: ONLY thumb extended ──
    if thumb and not index and not middle and not ring and not pinky:
        return "Thumbs Up 👍" if _thumb_direction(landmarks) == "up" else "Thumbs Down 👎"

    # ── Pointing Up: ONLY index extended ──
    if not thumb and index and not middle and not ring and not pinky:
        return "Pointing ☝️"

    # ── Peace: ONLY index + middle extended ──
    if not thumb and index and middle and not ring and not pinky:
        return "Peace ✌️"

    # ── Rock: thumb + index + pinky extended, middle + ring closed ──
    if thumb and index and not middle and not ring and pinky:
        return "Rock 🤟"

    # ── Open Palm: ALL five fingers extended ──
    if thumb and index and middle and ring and pinky:
        return "Open Palm 🖐️"

    return "Unknown"
