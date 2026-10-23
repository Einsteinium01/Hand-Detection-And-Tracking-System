"""Rotation-invariant gesture recognition from MediaPipe hand landmarks.

Uses distance-based finger extension checks instead of positional (x/y)
comparisons so gestures are detected correctly regardless of hand
orientation or rotation.

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
# Finger extension detection (rotation-invariant)
# ---------------------------------------------------------------------------

# For each finger: (MCP index, PIP index, DIP index, TIP index)
_FINGER_JOINTS = {
    "index":  (5,  6,  7,  8),
    "middle": (9,  10, 11, 12),
    "ring":   (13, 14, 15, 16),
    "pinky":  (17, 18, 19, 20),
}


def _is_finger_extended(landmarks: list[dict], finger: str) -> bool:
    """A finger is extended if its tip is further from its MCP than its PIP is.

    This is rotation-invariant because it compares relative distances
    rather than absolute y-positions.
    """
    mcp_i, pip_i, _dip_i, tip_i = _FINGER_JOINTS[finger]
    mcp = landmarks[mcp_i]
    pip = landmarks[pip_i]
    tip = landmarks[tip_i]

    tip_to_mcp = _dist(tip, mcp)
    pip_to_mcp = _dist(pip, mcp)

    # Tip must be meaningfully further out than PIP (not just barely)
    return tip_to_mcp > pip_to_mcp * 1.1


def _is_thumb_extended(landmarks: list[dict]) -> bool:
    """Thumb is extended if its tip is far from the palm center.

    We compare distance(thumb_tip → palm_center) vs
    distance(thumb_ip → palm_center).  When the thumb is tucked in
    (fist), the tip sits close to the palm; when extended, it moves away.
    """
    thumb_tip = landmarks[4]
    thumb_ip = landmarks[3]

    # Palm center ≈ average of wrist, index MCP, pinky MCP
    pcx = (landmarks[0]["x"] + landmarks[5]["x"] + landmarks[17]["x"]) / 3
    pcy = (landmarks[0]["y"] + landmarks[5]["y"] + landmarks[17]["y"]) / 3
    palm = {"x": pcx, "y": pcy}

    tip_to_palm = _dist(thumb_tip, palm)
    ip_to_palm = _dist(thumb_ip, palm)

    return tip_to_palm > ip_to_palm * 1.2


def _get_finger_states(landmarks: list[dict]) -> dict[str, bool]:
    """Return which fingers are extended (rotation-invariant)."""
    return {
        "thumb":  _is_thumb_extended(landmarks),
        "index":  _is_finger_extended(landmarks, "index"),
        "middle": _is_finger_extended(landmarks, "middle"),
        "ring":   _is_finger_extended(landmarks, "ring"),
        "pinky":  _is_finger_extended(landmarks, "pinky"),
    }


# ---------------------------------------------------------------------------
# Gesture classification
# ---------------------------------------------------------------------------

def _thumb_direction(landmarks: list[dict]) -> str:
    """Determine if the thumb points 'up' or 'down' relative to the hand.

    We compare the thumb-tip position to the thumb CMC (base) along the
    axis defined by the wrist → middle-finger MCP (the hand's natural
    'up' direction).  This works regardless of absolute orientation.
    """
    wrist = landmarks[0]
    mid_mcp = landmarks[9]

    # Hand 'up' vector: wrist → middle MCP
    hand_up_x = mid_mcp["x"] - wrist["x"]
    hand_up_y = mid_mcp["y"] - wrist["y"]

    # Thumb vector: thumb CMC → thumb tip
    thumb_base = landmarks[2]
    thumb_tip = landmarks[4]
    thumb_dx = thumb_tip["x"] - thumb_base["x"]
    thumb_dy = thumb_tip["y"] - thumb_base["y"]

    # Dot product tells us if thumb points in the same direction as fingers
    dot = hand_up_x * thumb_dx + hand_up_y * thumb_dy
    return "up" if dot > 0 else "down"


def recognise_gesture(landmarks: list[dict], handedness: str) -> str:
    """Classify the hand gesture from 21 normalised landmarks.

    All checks are rotation-invariant (distance-based), so gestures
    are detected correctly regardless of hand orientation.

    Supported gestures:
        Thumbs Up, Thumbs Down, Peace, Open Palm, Fist,
        Pointing Up, Rock, OK, Three, Four

    Args:
        landmarks: List of 21 dicts with ``x``, ``y``, ``z`` keys.
        handedness: ``"Left"`` or ``"Right"`` (used for display only).

    Returns:
        A human-readable gesture name string.
    """
    if len(landmarks) < 21:
        return "Unknown"

    f = _get_finger_states(landmarks)
    thumb, index, middle, ring, pinky = (
        f["thumb"], f["index"], f["middle"], f["ring"], f["pinky"],
    )
    extended_count = sum([thumb, index, middle, ring, pinky])

    # ── OK sign: thumb and index tips very close, others extended ──
    thumb_index_dist = _dist(landmarks[4], landmarks[8])
    palm = _palm_size(landmarks)
    if palm > 0 and thumb_index_dist < palm * 0.25 and middle and ring:
        return "OK 👌"

    # ── Fist: no fingers extended ──
    if extended_count == 0:
        return "Fist ✊"

    # ── Thumbs Up / Down: only thumb extended ──
    if thumb and not index and not middle and not ring and not pinky:
        direction = _thumb_direction(landmarks)
        if direction == "up":
            return "Thumbs Up 👍"
        else:
            return "Thumbs Down 👎"

    # ── Pointing: only index extended ──
    if not thumb and index and not middle and not ring and not pinky:
        return "Pointing ☝️"

    # ── Peace / Victory: index + middle extended, others closed ──
    if index and middle and not ring and not pinky and not thumb:
        return "Peace ✌️"

    # ── Three: index + middle + ring (or thumb + index + middle) ──
    if extended_count == 3 and index and middle:
        return "Three 🤟"

    # ── Four: all except thumb ──
    if not thumb and index and middle and ring and pinky:
        return "Four 🖖"

    # ── Rock / I Love You: thumb + index + pinky extended ──
    if thumb and index and not middle and not ring and pinky:
        return "Rock 🤟"

    # ── Open Palm: all five fingers extended ──
    if extended_count >= 4 and index and middle and ring:
        return "Open Palm 🖐️"

    return "Unknown"
