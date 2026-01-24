Scoring & Confidence (v1) — Definitions, Scale, and Rules

1) Purpose
Scores must:
- be stable while dragging,
- align with human perception (30–80 prioritized),
- support A/B comparisons meaningfully,
- avoid implying lab precision.

2) Score Outputs (Locked)
v1 outputs:
- Smoothness Score
- Tightness Score
- Confidence Level
- Confidence Score (0–1, internal diagnostics)
Scores are shown as 0–100 (locked for clarity), with labels:
- 0–39: Poor
- 40–59: Fair
- 60–79: Good
- 80–100: Excellent
(These are UI bands, not scientific thresholds.)

3) Smoothness Score — Definition (Locked)
Smoothness is “how even the bass response is at the seat” across 20–120, weighted by audibility.
Weighting (Locked):
- Highest weight: 30–80 Hz
- Medium: 80–120 Hz (but tagged integration-sensitive in problem list)
- Lowest: 20–30 Hz, unless Deep Bass Watchlist triggers
Smoothness should respond to:
- sub placement
- seat position
- opening (leakage reduces pressurization; can reduce peaks but also reduce extension)
- treatments (mainly by reducing peaks and slightly smoothing)
Smoothness stability rules (Locked):
- computed using region-based analysis (not single Hz bins)
- severity hysteresis prevents jitter

4) Tightness Score — Definition (Locked)
Tightness is a proxy for “how controlled the bass feels,” strongly related to:
- reduced ringing/decay tendencies,
- reduced boundary overloading,
- improved peak behavior.
Tightness should respond strongly to:
- treatments (especially corner traps and rear wall absorber)
- opening (can reduce “pressurization boom” but may reduce deep bass)
- moving sub away from extreme boundary reinforcement
- reducing peak dominance in the most audible band
Tightness should respond weakly to:
- tiny changes that only alter deep bass watchlist without affecting 30–80
- minor seat shifts unless they also reduce peak dominance

5) Problem Severity Thresholds (Locked)
Severity classification uses an internal deviation scale (relative; do not display as dB):
- Mild: ~3–6
- Moderate: ~6–10
- Severe: >10

6) Confidence Level — Definition (Locked)
Confidence is not “accuracy”—it’s “how robust this prediction is likely to be.”
Confidence uses a numeric score mapped to a level:
- confidenceScore: 0–1
- confidenceLevel mapping:
  - >= 0.67: High
  - 0.34–0.66: Medium
  - < 0.34: Low
Baseline (locked):
- Start at 0.55 (Medium) before adjustments.
Adjustments (locked):
- Opening type/state:
  - open_plan: clamp max to 0.40
  - hallway: -0.15
  - doorway open: -0.10
  - doorway closed: -0.05
- “Not sure” tuning selection: -0.07 each (sealed lowest strong bass, ported Fb, mains lowest strong bass)
- Missing tuning inputs are treated as “Not sure” for confidence scoring.
- Selected problem in 80–120: -0.05
- Mains disabled: no penalty
Small opening definition (locked):
- width <= 0.914 m (3 ft) and type doorway with door closed.
Derived outputs:
- confidenceLevel is derived from confidenceScore; do not persist confidence in project state.

7) Deep Bass Watchlist — Rule (Locked)
Watchlist appears when 20–30 Hz has an extreme condition (e.g., strong boom/pressurization risk or severe loss), even if not top-ranked.
Behavior:
- Watchlist is shown separately from the Top 3 list.
- Recommendations should use cautious phrasing and highlight opening/leakiness impact.

8) No Major Issues State (Locked)
Show “No major issues detected” when:
- no region is Moderate or Severe, and
- Smoothness >= 80, and
- Deep Bass Watchlist is not triggered.

9) How Scores Drive Recommendations (Locked)
Recommendations must remain exactly 3 actions.
Ranking logic:
- prioritize actions that improve Top Problem severity in the most audible band first
- consider Tightness improvements when peak problems exist
- do not recommend treatments as primary fix for severe nulls
Meaningful improvement thresholds (locked; use internal deviation units, not displayed):
A) Primary (all moves)
- A move is meaningful if it improves the selected region by at least one severity tier
  (Severe→Moderate, Moderate→Mild, Mild→None).
B) Secondary fallback (all moves)
- If severity tier does not change, it is meaningful only if BOTH are true:
  - RegionDeviationDelta >= 2.0
  - SmoothnessDelta >= +3.0 (0–100 scale)
C) Seat micro-moves (extra guard)
- In addition to A or B, at least 2 of 3 must improve:
  - RegionDeviationDelta >= 2.0
  - SmoothnessDelta >= +3.0
  - Top Problems rank improves (moves to a higher priority position or drops out of Top 3)
D) Ghost sub placements (stricter)
- Eligible if either:
  - A (tier improves), or
  - RegionDeviationDelta >= 2.5 AND SmoothnessDelta >= +4.0
