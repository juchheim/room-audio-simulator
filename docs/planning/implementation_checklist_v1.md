Implementation Checklist (v1) — Pre-Merge Gate

Use this checklist before merging any substantial feature or refactor. If any item fails, fix it or update planning docs first (do not improvise).

A) Hard Scope Compliance (Must Pass)
- Room geometry is rectangular only.
- Room supports exactly one opening element (doorway/hallway/open-plan). No second opening possible.
- Frequency scope is 20–120 Hz only (no UI or logic outside this band).
- Mode is two-channel sweet spot only (single seat).
- Supports exactly one subwoofer (no multi-sub code paths exposed).

B) Locked UI Invariants (Must Pass)
- Top Problems list shows exactly 3 items at all times (or a single “No major issues detected” state).
- Problems are displayed as small regions: ~X Hz (low–high), not single Hz.
- Any selected problem produces exactly 3 recommendations, ranked.
- 80–120 Hz problems are tagged Integration-sensitive with softened guidance.
- Units toggle switches display between imperial/metric while keeping internal meters.

C) Subwoofer Requirements (Must Pass)
- Sealed mode supported with Lowest strong bass (Hz) input and audiophile presets.
- Ported mode supported with Fb input and audiophile presets.
- Ported model includes driver direction AND port direction.
- Ported model treats driver and port as separate outputs near Fb (combined output shown, but behavior changes near tuning).
- Clearance warnings exist for:
  - Port clearance tight
  - Driver clearance tight
  - Placement blocks opening

D) Mains Simplified Model (Must Pass)
- Mains are optional and act as simplified bass contributors.
- Only mains bass control is mains lowest strong bass (Hz).
- No crossover/phase alignment system exists in v1 (no detailed slopes/delay UI).

E) Treatments System (Must Pass)
Snapping & Zones
- Treatments can only be placed via snap zones.
- Snap zones update correctly when an opening is added (zones overlapping opening are disabled; no splitting).
- Invalid placements are prevented (no “floating” traps in opening).
- If a previously valid zone becomes disabled, the treatment is marked invalid and excluded from analysis until fixed.

Caps (Locked)
- Corner traps max 4
- Rear wall absorber max 1
- Thick panels max 6
- Tuned traps max 2

Strength Tiers (Locked)
- Treatments support Light / Medium / Heavy tiers consistently.

Diminishing Returns (Locked)
- Zone-based diminishing returns apply for all treatment types.
- Tuned trap DR hybrid works:
  - same zone + overlapping target band => strong DR
  - same zone + different band => small DR
  - different zones => minimal DR
- Overlap detection uses simple ±X:
  - ±5 Hz => heavy overlap
  - ±10 Hz => some overlap
  - >10 Hz => none

DR UI (Locked)
- Impact Preview card exists (Expected benefit + Why)
- Zone saturation meter exists (Low/Med/High)
- Frequency overlap meter exists (None/Some/Heavy)
- Best/OK/Limited zone guidance appears (frequency-specific)
- “Doubling up” tooltip appears only when same zone + overlapping target band

F) Analysis Outputs (Must Pass)
App outputs:
- Smoothness score (0–100)
- Tightness score (0–100)
- Confidence (High/Medium/Low)
- Scores update with sub/seat/treatments/opening changes.
- Confidence decreases with open-plan and missing tuning inputs, per spec.
- Deep Bass Watchlist appears when 20–30 Hz is extreme.

Stability (Locked)
- Severity uses hysteresis (no constant flipping while dragging).
- Scoring and fixes operate on regions, not single Hz bins.

G) Fixability & Recommendations (Must Pass)
Fixability Tags (Locked)
- Seat-sensitive only when neighborhood seat sampling shows meaningful improvement.
- Placement-sensitive only when candidate placement pool offers meaningful improvement.
- Treatment-responsive primarily for peaks; nulls are not labeled treatment-responsive by default.
- Integration-sensitive tag applied for 80–120.
Meaningful Improvement (Locked)
- Use the scoring_and_confidence_v1.md thresholds for moves and ghost placements.
- Seat micro-moves require the 2-of-3 guard (deviation, smoothness, Top Problems rank).

Recommendation Truthfulness (Locked)
- Null messaging explicitly indicates cancellation; no “treatments fill null” claims.
- Confidence-aware phrasing ladder is enforced (High/Med/Low wording).
- Recommendations remain exactly 3 actions always.
- Fallback rule enforced: when no meaningful actions exist, show the banner and 3 informational recommendations; below-threshold items use “Impact: Low” and why line.

H) Ghost Suggestions (Must Pass)
Ghost Sub Placements
- Generates 2–3 placements from the locked candidate pool:
  - perimeter fractions 1/6, 1/3, 1/2, 2/3, 5/6
  - corners
  - quarter points
  - wall midpoints
  - optional nearfield (only if practical and allowNearfieldSuggestions is true)
- Enforces constraints (opening, clearance, optional furniture keep-out).
- Ensures diversity (not clustered; at least one on a different wall or >= 20% room size apart).
- Includes a one-line rationale for each.

Seat Micro-Moves
- Only shown for seat-sensitive nulls.
- Uses 6/12/18 inch moves in cardinal directions.
- Chooses smallest effective move; shows 1–2 ghost markers.
- Suppressed entirely when seatLocked is true (with seat-locked note in Fix This).

I) A/B Snapshots & Compare (Must Pass)
- Exactly two snapshots: A and B
- Lock A prevents overwriting baseline.
- Revert to A restores state.
- Compare view includes:
  - Smoothness/Tightness/Confidence deltas
  - Top Problems mapping (Resolved/New)
  - Curve compare (20–120) with shaded problem regions
  - Tightness/decay compare (banded)
- Change log (diff summary)

I.5) Export (Generate Plan) (Must Pass)
- Export produces Project JSON and Plan Markdown.
- Plan Markdown includes configuration summary, Top Problems, 3 actions per problem, and confidence banner.

J) Visualization Truthfulness (Must Pass)
- Heatmap is labeled as relative pressure/energy (no dB scale).
- Ripples are a teaching overlay only (no reflection arrows implying precise bounces).
- Low confidence banner appears when confidence is Low.

K) Copy & Microcopy (Must Pass)
- UI uses required definitions for:
  - Lowest strong bass (Hz)
  - Fb (tuning)
  - Null vs peak explanations
  - Integration-sensitive tooltip
  - Diminishing returns tooltips/meters
- No absolute promises (“will fix completely”), no false precision.

L) Regression Set (Recommended to run each time)
- Closed room baseline (no opening) behaves plausibly.
- Doorway opening reduces confidence and deep bass pressurization.
- Open-plan opening yields Low confidence and softened guidance.
- Ported near Fb shows port dominance messaging and responds to port direction.
- Treatment stacking in same zone shows diminishing returns UI and reduced incremental benefit.
- A/B compare correctly marks “Resolved” and “New” problems.
