"""Multi-object hand tracker for persistent hand IDs across video frames.

Matches detected hands across sequential frames using centroid distance,
bounding box overlap, and handedness consistency. Maintains IDs through
brief occlusions and tracking dropouts.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Track:
    """Represents an active or temporarily lost hand track."""

    track_id: int
    centroid: tuple[float, float]  # (x, y) normalized [0, 1]
    bbox: dict[str, float]         # {"x": ..., "y": ..., "width": ..., "height": ...}
    handedness: str                # "Left" or "Right"
    missing_frames: int = 0
    total_frames: int = 1
    # Moving average velocity (dx, dy) per frame
    velocity: tuple[float, float] = (0.0, 0.0)

    def predict_centroid(self) -> tuple[float, float]:
        """Estimate next centroid based on current position and velocity."""
        vx, vy = self.velocity
        px = max(0.0, min(1.0, self.centroid[0] + vx))
        py = max(0.0, min(1.0, self.centroid[1] + vy))
        return (px, py)

    def update(
        self,
        centroid: tuple[float, float],
        bbox: dict[str, float],
        handedness: str,
    ) -> None:
        """Update track with a newly matched detection."""
        # Calculate instant velocity and smooth with exponential moving average
        dx = centroid[0] - self.centroid[0]
        dy = centroid[1] - self.centroid[1]
        alpha = 0.4  # smoothing factor
        vx = alpha * dx + (1.0 - alpha) * self.velocity[0]
        vy = alpha * dy + (1.0 - alpha) * self.velocity[1]

        self.centroid = centroid
        self.bbox = bbox
        self.handedness = handedness
        self.velocity = (vx, vy)
        self.missing_frames = 0
        self.total_frames += 1


class HandTracker:
    """Tracks hands across video frames and assigns persistent unique IDs.

    Features:
    - Centroid + velocity predictive matching
    - Handedness consistency weighting
    - Grace period: retains lost tracks for up to `max_missing_frames`
    - Per-session isolation (one tracker instance per WebSocket client)
    """

    def __init__(
        self,
        max_missing_frames: int = 8,
        max_distance: float = 0.30,
    ) -> None:
        """
        Args:
            max_missing_frames: Number of consecutive frames a track can be missing
                before being removed (~0.5s at 15 fps).
            max_distance: Maximum normalized distance allowed between a track and
                a detection to be considered a match.
        """
        self.max_missing_frames = max_missing_frames
        self.max_distance = max_distance
        self.tracks: list[Track] = []
        self._next_id = 1

    def reset(self) -> None:
        """Clear all active tracks and reset the ID counter."""
        self.tracks.clear()
        self._next_id = 1

    @staticmethod
    def _compute_centroid(hand: dict[str, Any]) -> tuple[float, float]:
        """Compute the hand center.

        Uses palm center (average of wrist lm[0] and middle MCP lm[9])
        if landmarks are present; otherwise falls back to bbox center.
        """
        landmarks = hand.get("landmarks")
        if landmarks and len(landmarks) >= 10:
            wrist = landmarks[0]
            mid_mcp = landmarks[9]
            cx = (wrist["x"] + mid_mcp["x"]) / 2.0
            cy = (wrist["y"] + mid_mcp["y"]) / 2.0
            return (cx, cy)

        bbox = hand["bbox"]
        cx = bbox["x"] + bbox["width"] / 2.0
        cy = bbox["y"] + bbox["height"] / 2.0
        return (cx, cy)

    def _cost(self, track: Track, det_centroid: tuple[float, float], det_handedness: str) -> float:
        """Compute matching cost between a track and a detection.

        Lower is better. Returns infinity if distance exceeds threshold.
        """
        pred_cx, pred_cy = track.predict_centroid()
        dist = math.hypot(det_centroid[0] - pred_cx, det_centroid[1] - pred_cy)

        if dist > self.max_distance:
            return float("inf")

        cost = dist

        # Favor same handedness
        if track.handedness != det_handedness:
            cost += 0.08  # small penalty for handedness flip, but still permits match if close

        # Penalize tracks that have been missing for multiple frames
        cost += track.missing_frames * 0.03

        return cost

    def update(self, hands: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Match incoming hand detections with existing tracks and assign IDs.

        Modifies the hand dictionaries in-place by adding an `"id"` field,
        and returns the list of hands.
        """
        if not hands:
            # Increment missing frames for all tracks
            for track in self.tracks:
                track.missing_frames += 1
            # Remove expired tracks
            self.tracks = [t for t in self.tracks if t.missing_frames <= self.max_missing_frames]
            return []

        # Compute centroids for all detections
        det_data = []
        for hand in hands:
            centroid = self._compute_centroid(hand)
            handedness = hand.get("handedness", "Right")
            bbox = hand.get("bbox", {"x": 0, "y": 0, "width": 0, "height": 0})
            det_data.append((centroid, handedness, bbox))

        # Build pairwise cost matrix between existing tracks and detections
        num_tracks = len(self.tracks)
        num_dets = len(hands)

        matches: list[tuple[int, int]] = []  # (track_idx, det_idx)
        unmatched_tracks = set(range(num_tracks))
        unmatched_dets = set(range(num_dets))

        if num_tracks > 0 and num_dets > 0:
            # Compute all costs
            cost_list: list[tuple[float, int, int]] = []
            for t_idx, track in enumerate(self.tracks):
                for d_idx, (centroid, handedness, _) in enumerate(det_data):
                    c = self._cost(track, centroid, handedness)
                    if c < float("inf"):
                        cost_list.append((c, t_idx, d_idx))

            # Greedy assignment by minimum cost
            cost_list.sort(key=lambda x: x[0])
            for _cost_val, t_idx, d_idx in cost_list:
                if t_idx in unmatched_tracks and d_idx in unmatched_dets:
                    matches.append((t_idx, d_idx))
                    unmatched_tracks.remove(t_idx)
                    unmatched_dets.remove(d_idx)

        # 1. Update matched tracks
        for t_idx, d_idx in matches:
            track = self.tracks[t_idx]
            centroid, handedness, bbox = det_data[d_idx]
            track.update(centroid, bbox, handedness)
            hands[d_idx]["id"] = track.track_id

        # 2. Handle unmatched detections -> create new tracks
        for d_idx in unmatched_dets:
            centroid, handedness, bbox = det_data[d_idx]
            new_id = self._next_id
            self._next_id += 1
            new_track = Track(
                track_id=new_id,
                centroid=centroid,
                bbox=bbox,
                handedness=handedness,
            )
            self.tracks.append(new_track)
            hands[d_idx]["id"] = new_id

        # 3. Handle unmatched tracks -> age them
        for t_idx in unmatched_tracks:
            self.tracks[t_idx].missing_frames += 1

        # 4. Remove expired tracks
        self.tracks = [t for t in self.tracks if t.missing_frames <= self.max_missing_frames]

        return hands
