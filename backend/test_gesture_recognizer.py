"""Unit tests for gesture recognition algorithms."""

import pytest
from gesture_recognizer import (
    recognise_gesture,
    _get_finger_states,
    _is_thumb_extended,
    _is_thumb_curled,
    _thumb_direction,
    _dist,
    _palm_size,
    _angle_at_joint,
    _is_finger_extended,
)


def lm(x: float, y: float, z: float = 0.0) -> dict:
    return {"x": x, "y": y, "z": z}


def build_hand(wrist, thumb, index, middle, ring, pinky):
    landmarks = [None] * 21
    landmarks[0] = lm(*wrist)
    for i, pos in enumerate(thumb):
        landmarks[1 + i] = lm(*pos)
    for i, pos in enumerate(index):
        landmarks[5 + i] = lm(*pos)
    for i, pos in enumerate(middle):
        landmarks[9 + i] = lm(*pos)
    for i, pos in enumerate(ring):
        landmarks[13 + i] = lm(*pos)
    for i, pos in enumerate(pinky):
        landmarks[17 + i] = lm(*pos)
    return landmarks


def test_fist_gesture():
    hand = build_hand(
        wrist=(0.5, 0.8),
        thumb=((0.58, 0.70), (0.60, 0.64), (0.57, 0.60), (0.53, 0.62)),
        index=((0.50, 0.62), (0.47, 0.57), (0.49, 0.60), (0.51, 0.63)),
        middle=((0.47, 0.60), (0.44, 0.55), (0.46, 0.58), (0.48, 0.61)),
        ring=((0.45, 0.62), (0.42, 0.57), (0.44, 0.60), (0.46, 0.63)),
        pinky=((0.43, 0.65), (0.41, 0.61), (0.42, 0.63), (0.44, 0.66)),
    )
    assert recognise_gesture(hand, "Right") == "Fist ✊"


def test_thumbs_up_gesture():
    hand = build_hand(
        wrist=(0.5, 0.8),
        thumb=((0.58, 0.70), (0.60, 0.60), (0.60, 0.48), (0.60, 0.38)),
        index=((0.50, 0.62), (0.47, 0.57), (0.49, 0.60), (0.51, 0.63)),
        middle=((0.47, 0.60), (0.44, 0.55), (0.46, 0.58), (0.48, 0.61)),
        ring=((0.45, 0.62), (0.42, 0.57), (0.44, 0.60), (0.46, 0.63)),
        pinky=((0.43, 0.65), (0.41, 0.61), (0.42, 0.63), (0.44, 0.66)),
    )
    assert recognise_gesture(hand, "Right") == "Thumbs Up 👍"


def test_thumbs_down_gesture():
    hand = build_hand(
        wrist=(0.5, 0.25),
        thumb=((0.55, 0.32), (0.57, 0.42), (0.58, 0.52), (0.58, 0.62)),
        index=((0.48, 0.35), (0.46, 0.40), (0.47, 0.38), (0.49, 0.36)),
        middle=((0.46, 0.33), (0.44, 0.38), (0.45, 0.36), (0.47, 0.34)),
        ring=((0.44, 0.34), (0.42, 0.38), (0.43, 0.37), (0.45, 0.35)),
        pinky=((0.42, 0.36), (0.40, 0.40), (0.41, 0.38), (0.43, 0.37)),
    )
    assert recognise_gesture(hand, "Left") == "Thumbs Down 👎"


def test_peace_gesture():
    hand = build_hand(
        wrist=(0.5, 0.85),
        thumb=((0.58, 0.72), (0.60, 0.65), (0.57, 0.62), (0.54, 0.64)),
        index=((0.50, 0.65), (0.48, 0.50), (0.47, 0.38), (0.46, 0.28)),
        middle=((0.46, 0.63), (0.44, 0.48), (0.43, 0.36), (0.42, 0.26)),
        ring=((0.43, 0.65), (0.41, 0.58), (0.42, 0.62), (0.43, 0.65)),
        pinky=((0.40, 0.68), (0.38, 0.62), (0.39, 0.65), (0.40, 0.68)),
    )
    assert recognise_gesture(hand, "Right") == "Peace ✌️"


def test_pointing_gesture():
    hand = build_hand(
        wrist=(0.5, 0.85),
        thumb=((0.58, 0.72), (0.60, 0.65), (0.57, 0.62), (0.54, 0.64)),
        index=((0.50, 0.65), (0.48, 0.50), (0.47, 0.38), (0.46, 0.25)),
        middle=((0.47, 0.63), (0.45, 0.57), (0.46, 0.60), (0.47, 0.63)),
        ring=((0.44, 0.65), (0.42, 0.59), (0.43, 0.62), (0.44, 0.65)),
        pinky=((0.41, 0.68), (0.39, 0.63), (0.40, 0.66), (0.41, 0.68)),
    )
    assert recognise_gesture(hand, "Right") == "Pointing ☝️"


def test_open_palm_gesture():
    hand = build_hand(
        wrist=(0.5, 0.9),
        thumb=((0.62, 0.78), (0.68, 0.70), (0.73, 0.65), (0.77, 0.60)),
        index=((0.52, 0.68), (0.52, 0.52), (0.52, 0.40), (0.52, 0.28)),
        middle=((0.48, 0.66), (0.47, 0.50), (0.47, 0.38), (0.47, 0.26)),
        ring=((0.44, 0.68), (0.43, 0.52), (0.42, 0.40), (0.42, 0.30)),
        pinky=((0.40, 0.72), (0.38, 0.58), (0.37, 0.48), (0.36, 0.38)),
    )
    assert recognise_gesture(hand, "Right") == "Open Palm 🖐️"


def test_rock_gesture():
    hand = build_hand(
        wrist=(0.5, 0.85),
        thumb=((0.58, 0.72), (0.63, 0.66), (0.67, 0.63), (0.70, 0.60)),
        index=((0.50, 0.65), (0.48, 0.50), (0.47, 0.38), (0.46, 0.28)),
        middle=((0.47, 0.63), (0.45, 0.57), (0.46, 0.60), (0.47, 0.63)),
        ring=((0.44, 0.65), (0.42, 0.59), (0.43, 0.62), (0.44, 0.65)),
        pinky=((0.40, 0.68), (0.38, 0.54), (0.37, 0.44), (0.36, 0.34)),
    )
    assert recognise_gesture(hand, "Right") == "Rock 🤟"


def test_ok_gesture():
    hand = build_hand(
        wrist=(0.5, 0.85),
        thumb=((0.58, 0.72), (0.60, 0.65), (0.57, 0.58), (0.52, 0.55)),
        index=((0.50, 0.65), (0.48, 0.57), (0.49, 0.55), (0.52, 0.55)),
        middle=((0.46, 0.63), (0.44, 0.48), (0.43, 0.36), (0.42, 0.26)),
        ring=((0.43, 0.65), (0.41, 0.50), (0.40, 0.40), (0.39, 0.30)),
        pinky=((0.40, 0.68), (0.38, 0.55), (0.37, 0.45), (0.36, 0.35)),
    )
    assert recognise_gesture(hand, "Right") == "OK 👌"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
