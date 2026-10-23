"""Rotation-invariant gesture recognition from MediaPipe hand landmarks.

Uses angle-based finger extension checks (joint angles at PIP/IP)
which are inherently rotation-invariant, combined with robust thumb
direction detection using the hand's own coordinate frame.

Supported gestures (8):
    Thumbs Up, Thumbs Down, Peace, Open Palm, Fist,
    Pointing Up, Rock, OK
"""

import math
import logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _dist(a: dict, b: dict) -> float:
    """Euclidean distance between two landmarks (2D, using x and y)."""
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


def _dist3d(a: dict, b: dict) -> float:
    """Euclidean distance between two landmarks (3D)."""
    return math.sqrt(
        (a["x"] - b["x"]) ** 2 +
        (a["y"] - b["y"]) ** 2 +
        (a.get("z", 0) - b.get("z", 0)) ** 2
    )


def _palm_size(landmarks: list[dict]) -> float:
    """Approximate palm size as distance from wrist to middle-finger MCP."""
    return _dist(landmarks[0], landmarks[9])


def _angle_at_joint(a: dict, joint: dict, c: dict) -> float:
    """Angle (degrees) at the middle point 'joint' formed by a-joint-c.

    Uses the law of cosines. Returns 0-180 degrees.
    A straight (extended) finger has ~160-180 degrees.
    A bent (curled) finger has ~30-90 degrees.
    """
    # Vectors from joint to a and from joint to c
    v1x = a["x"] - joint["x"]
    v1y = a["y"] - joint["y"]
    v2x = c["x"] - joint["x"]
    v2y = c["y"] - joint["y"]

    dot = v1x * v2x + v1y * v2y
    mag1 = math.hypot(v1x, v1y)
    mag2 = math.hypot(v2x, v2y)

    if mag1 < 1e-6 or mag2 < 1e-6:
        return 180.0  # degenerate case

    cos_angle = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_angle))


# ---------------------------------------------------------------------------
# Finger extension detection — angle-based
# ---------------------------------------------------------------------------

# Finger joints: (MCP, PIP, DIP, TIP) landmark indices
_FINGER_JOINTS = {
    "index":  (5,  6,  7,  8),
    "middle": (9,  10, 11, 12),
    "ring":   (13, 14, 15, 16),
    "pinky":  (17, 18, 19, 20),
}

# Thresholds
_EXTENDED_ANGLE_THRESHOLD = 140.0   # degrees — finger is "extended" if PIP angle > this
_CURLED_ANGLE_THRESHOLD = 130.0     # degrees — finger is "curled" if PIP angle < this


def _is_finger_extended(landmarks: list[dict], finger: str) -> bool:
    """Check if a finger is extended using the angle at PIP joint.

    A finger is extended when the MCP-PIP-DIP angle is close to 180
    (straight). When curled, this angle becomes small (~60-90 degrees).

    This is inherently rotation-invariant since we measure the angle
    between bone segments, not their absolute screen direction.

    We also verify the tip is farther from wrist than the MCP
    to catch edge cases where angles are misleading.
    """
    mcp_i, pip_i, dip_i, tip_i = _FINGER_JOINTS[finger]
    mcp = landmarks[mcp_i]
    pip_joint = landmarks[pip_i]
    dip = landmarks[dip_i]
    tip = landmarks[tip_i]
    wrist = landmarks[0]

    # Angle at PIP joint (MCP-PIP-DIP)
    pip_angle = _angle_at_joint(mcp, pip_joint, dip)

    # Angle at DIP joint (PIP-DIP-TIP)
    dip_angle = _angle_at_joint(pip_joint, dip, tip)

    # Average of the two joint angles — both should be straight for extension
    avg_angle = (pip_angle + dip_angle) / 2.0

    # Distance check: tip must be farther from wrist than PIP
    tip_wrist = _dist(tip, wrist)
    pip_wrist = _dist(pip_joint, wrist)

    is_straight = avg_angle > _EXTENDED_ANGLE_THRESHOLD
    is_reaching = tip_wrist > pip_wrist

    return is_straight and is_reaching


def _is_finger_curled(landmarks: list[dict], finger: str) -> bool:
    """Check if a finger is definitely curled (not just 'not extended').

    Uses a stricter threshold to avoid ambiguous states.
    """
    mcp_i, pip_i, dip_i, tip_i = _FINGER_JOINTS[finger]
    mcp = landmarks[mcp_i]
    pip_joint = landmarks[pip_i]
    dip = landmarks[dip_i]
    tip = landmarks[tip_i]

    pip_angle = _angle_at_joint(mcp, pip_joint, dip)
    dip_angle = _angle_at_joint(pip_joint, dip, tip)
    avg_angle = (pip_angle + dip_angle) / 2.0

    return avg_angle < _CURLED_ANGLE_THRESHOLD


def _is_thumb_extended(landmarks: list[dict]) -> bool:
    """Thumb extended if the angle at IP joint is straight AND
    the thumb tip is far enough from the palm center.

    Uses both angle check and distance ratio for robustness.
    """
    thumb_cmc = landmarks[1]
    thumb_mcp = landmarks[2]
    thumb_ip = landmarks[3]
    thumb_tip = landmarks[4]

    # Angle at IP joint (MCP-IP-TIP)
    ip_angle = _angle_at_joint(thumb_mcp, thumb_ip, thumb_tip)

    # Distance: CMC to TIP vs palm size
    palm = _palm_size(landmarks)
    if palm < 0.01:
        return False

    cmc_tip_dist = _dist(thumb_cmc, thumb_tip)
    # In a fist, thumb wraps around fingers — CMC-to-TIP is short
    # When extended (thumbs up/out), CMC-to-TIP is long
    dist_ratio = cmc_tip_dist / palm

    # Thumb is extended if:
    # 1. The IP joint is reasonably straight (> 120 degrees)
    # 2. The CMC-to-TIP distance is significant (> 0.65 of palm size)
    #
    # The 0.65 threshold is higher than before (0.55) to prevent
    # fist from being detected as thumb-extended. In a fist the
    # ratio is typically 0.5-0.6, while extended thumb is 0.7+.
    return ip_angle > 120.0 and dist_ratio > 0.65


def _is_thumb_curled(landmarks: list[dict]) -> bool:
    """Check if thumb is definitely curled into the palm."""
    thumb_cmc = landmarks[1]
    thumb_tip = landmarks[4]
    palm = _palm_size(landmarks)
    if palm < 0.01:
        return True

    cmc_tip_dist = _dist(thumb_cmc, thumb_tip)
    return cmc_tip_dist / palm < 0.55


def _get_finger_states(landmarks: list[dict]) -> tuple[bool, bool, bool, bool, bool]:
    """Return (thumb, index, middle, ring, pinky) extension states."""
    return (
        _is_thumb_extended(landmarks),
        _is_finger_extended(landmarks, "index"),
        _is_finger_extended(landmarks, "middle"),
        _is_finger_extended(landmarks, "ring"),
        _is_finger_extended(landmarks, "pinky"),
    )


def _count_extended_no_thumb(index: bool, middle: bool, ring: bool, pinky: bool) -> int:
    """Count extended fingers excluding thumb."""
    return sum([index, middle, ring, pinky])


# ---------------------------------------------------------------------------
# Thumb direction (up vs down) — using hand coordinate frame
# ---------------------------------------------------------------------------

def _thumb_direction(landmarks: list[dict]) -> str:
    """Determine if thumb points 'up' or 'down' relative to gravity.

    Uses the hand's own coordinate frame:
    - hand_axis = wrist -> middle_mcp (direction fingers point)
    - perpendicular = rotated 90 degrees clockwise
    - project thumb vector onto the perpendicular
    - positive projection = thumb points in "up" direction relative to hand

    Then we combine with screen orientation to resolve ambiguity:
    if the hand axis is roughly vertical (fingers up), use screen-Y.
    If the hand is rotated, use the perpendicular projection.
    """
    wrist = landmarks[0]
    mid_mcp = landmarks[9]
    thumb_cmc = landmarks[1]
    thumb_tip = landmarks[4]

    # Hand axis: wrist -> middle MCP
    hx = mid_mcp["x"] - wrist["x"]
    hy = mid_mcp["y"] - wrist["y"]
    h_len = math.hypot(hx, hy)

    if h_len < 0.01:
        return "up" if thumb_tip["y"] < wrist["y"] else "down"

    # Normalize hand axis
    hx_n = hx / h_len
    hy_n = hy / h_len

    # Thumb vector: CMC -> TIP
    tx = thumb_tip["x"] - thumb_cmc["x"]
    ty = thumb_tip["y"] - thumb_cmc["y"]

    # Perpendicular to hand axis (rotated 90 degrees)
    # Two possible perpendiculars: (-hy, hx) and (hy, -hx)
    # We want the one that points "towards screen top" (negative y direction)
    perp_x = -hy_n
    perp_y = hx_n

    # If this perpendicular points downward (positive y), flip it
    if perp_y > 0:
        perp_x = -perp_x
        perp_y = -perp_y

    # Project thumb vector onto the perpendicular
    projection = tx * perp_x + ty * perp_y

    # Positive projection = thumb points in same direction as perp = UP
    # Negative projection = thumb points opposite to perp = DOWN
    return "up" if projection > 0 else "down"


# ---------------------------------------------------------------------------
# Gesture classification
# ---------------------------------------------------------------------------

def recognise_gesture(landmarks: list[dict], handedness: str) -> str:
    """Classify hand gesture from 21 landmarks.

    Key design decisions:
    - Uses angle-based finger extension (rotation-invariant)
    - Peace/Pointing don't require thumb to be tucked (natural poses)
    - OK checked first (thumb+index close overrides other patterns)
    - Fist requires ALL fingers curled including thumb
    - Open Palm requires ALL fingers extended
    - Thumbs up/down uses hand-frame perpendicular for direction
    """
    if len(landmarks) < 21:
        return "Unknown"

    thumb, index, middle, ring, pinky = _get_finger_states(landmarks)
    non_thumb_extended = _count_extended_no_thumb(index, middle, ring, pinky)

    palm = _palm_size(landmarks)

    # ── OK sign: thumb tip and index tip very close ──
    # Check this FIRST because it can look like other gestures
    if palm > 0.01:
        thumb_index_dist = _dist(landmarks[4], landmarks[8])
        # OK: thumb and index tips touching, other fingers extended or relaxed
        if thumb_index_dist < palm * 0.20:
            # At least middle finger should be extended for OK
            # (otherwise it's just a pinch)
            if middle or (ring and pinky):
                return "OK 👌"

    # ── Fist: ALL fingers curled (including thumb) ──
    # Check this BEFORE thumbs up so a fist with borderline thumb doesn't
    # become thumbs up
    if not thumb and non_thumb_extended == 0:
        return "Fist ✊"

    # ── Also detect fist when thumb is borderline but clearly curled ──
    if non_thumb_extended == 0 and _is_thumb_curled(landmarks):
        return "Fist ✊"

    # ── Thumbs Up / Down: thumb extended, ALL other fingers curled ──
    if thumb and non_thumb_extended == 0:
        direction = _thumb_direction(landmarks)
        return "Thumbs Up 👍" if direction == "up" else "Thumbs Down 👎"

    # ── Pointing: index extended, middle+ring+pinky curled ──
    # (thumb can be in any position — natural pointing often has thumb out)
    if index and not middle and not ring and not pinky:
        return "Pointing ☝️"

    # ── Peace: index + middle extended, ring + pinky curled ──
    # (thumb can be in any position — natural peace often has thumb free)
    if index and middle and not ring and not pinky:
        return "Peace ✌️"

    # ── Rock: index + pinky extended, middle + ring curled ──
    # (thumb typically extended too but don't require it)
    if index and not middle and not ring and pinky:
        return "Rock 🤟"

    # ── Open Palm: ALL five fingers extended ──
    if thumb and index and middle and ring and pinky:
        return "Open Palm 🖐️"

    # ── Partial matches for robustness ──
    # 4 fingers extended (thumb might be borderline) = likely Open Palm
    if non_thumb_extended == 4:
        return "Open Palm 🖐️"

    return "Unknown"
