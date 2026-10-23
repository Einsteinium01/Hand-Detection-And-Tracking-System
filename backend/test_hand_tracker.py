"""Unit tests for HandTracker."""

import pytest
from hand_tracker import HandTracker


def create_hand(cx: float, cy: float, handedness: str = "Right", w: float = 0.2, h: float = 0.2):
    """Helper to create a synthetic hand detection dict."""
    return {
        "handedness": handedness,
        "confidence": 0.95,
        "bbox": {
            "x": cx - w / 2,
            "y": cy - h / 2,
            "width": w,
            "height": h,
        },
        "landmarks": [
            {"x": cx, "y": cy + 0.05, "z": 0.0},  # lm[0] (wrist)
            *([{"x": cx, "y": cy, "z": 0.0}] * 8), # lm[1..8]
            {"x": cx, "y": cy - 0.05, "z": 0.0},  # lm[9] (mid MCP)
            *([{"x": cx, "y": cy, "z": 0.0}] * 11),# lm[10..20]
        ],
        "gesture": "Open Palm 🖐️",
    }


def test_single_hand_persistent_id():
    tracker = HandTracker()
    
    # Frame 1: Hand appears at (0.3, 0.4)
    h1 = create_hand(0.3, 0.4)
    res = tracker.update([h1])
    assert len(res) == 1
    assert res[0]["id"] == 1
    
    # Frame 2: Hand moves slightly to (0.32, 0.41)
    h2 = create_hand(0.32, 0.41)
    res = tracker.update([h2])
    assert len(res) == 1
    assert res[0]["id"] == 1

    # Frame 3: Hand moves to (0.35, 0.42)
    h3 = create_hand(0.35, 0.42)
    res = tracker.update([h3])
    assert len(res) == 1
    assert res[0]["id"] == 1


def test_two_hands_different_ids():
    tracker = HandTracker()

    # Frame 1: Left hand on left (0.2, 0.5), Right hand on right (0.8, 0.5)
    left_hand = create_hand(0.2, 0.5, handedness="Left")
    right_hand = create_hand(0.8, 0.5, handedness="Right")

    res = tracker.update([left_hand, right_hand])
    assert len(res) == 2
    id_left = res[0]["id"]
    id_right = res[1]["id"]
    assert id_left != id_right

    # Frame 2: Order in array is inverted (Right hand first, Left hand second)
    # The tracker MUST preserve the correct IDs based on position!
    right_hand_moved = create_hand(0.81, 0.51, handedness="Right")
    left_hand_moved = create_hand(0.21, 0.49, handedness="Left")

    res2 = tracker.update([right_hand_moved, left_hand_moved])
    assert len(res2) == 2
    # First item in array is right hand: must have id_right
    assert res2[0]["id"] == id_right
    # Second item is left hand: must have id_left
    assert res2[1]["id"] == id_left


def test_grace_period_missing_frames():
    tracker = HandTracker(max_missing_frames=5)

    # Frame 1: Hand appears
    h = create_hand(0.5, 0.5)
    res = tracker.update([h])
    assert res[0]["id"] == 1

    # Frames 2-4: Hand temporarily lost (motion blur / occlusion)
    for _ in range(3):
        res = tracker.update([])
        assert len(res) == 0
        assert len(tracker.tracks) == 1
        assert tracker.tracks[0].missing_frames > 0

    # Frame 5: Hand reappears near same spot
    h_return = create_hand(0.52, 0.51)
    res = tracker.update([h_return])
    assert len(res) == 1
    # MUST still be Hand #1
    assert res[0]["id"] == 1


def test_track_expiration():
    tracker = HandTracker(max_missing_frames=3)

    # Frame 1: Hand appears
    h = create_hand(0.5, 0.5)
    res = tracker.update([h])
    assert res[0]["id"] == 1

    # Frames 2-5: Hand missing for 4 frames (> max_missing_frames=3)
    for _ in range(4):
        tracker.update([])

    # Track should now be expired and cleared
    assert len(tracker.tracks) == 0

    # Frame 6: Hand appears -> Gets a NEW ID (#2)
    h_new = create_hand(0.5, 0.5)
    res = tracker.update([h_new])
    assert res[0]["id"] == 2


def test_reset():
    tracker = HandTracker()
    h = create_hand(0.5, 0.5)
    tracker.update([h])
    assert len(tracker.tracks) == 1

    tracker.reset()
    assert len(tracker.tracks) == 0

    # After reset, new hand starts from ID 1
    res = tracker.update([h])
    assert res[0]["id"] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
