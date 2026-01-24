Room Audio Simulator (Web) — PRD (v1)

1. Product Summary
A web-based room audio simulation tool for audiophiles (two-channel first) that helps users reduce seat nulls and smooth bass response from 20–120 Hz by optimizing sub placement, seat position, and interactive acoustic treatment placement. The simulator uses a top-down room view with visually understandable representations of bass behavior (pressure/energy maps and guided overlays), and provides actionable recommendations with A/B comparison.

Core promise (v1):
Make bass problems easier to see and fix—especially seat nulls and boom/ringing—without requiring users to already be experts in acoustics.

2. Target Users
Primary
- Two-channel audiophiles optimizing a single “sweet spot” listening position.
- Users with one subwoofer (sealed or ported) and optional mains that contribute to bass.

Secondary (v1-compatible)
- Users with open-plan rooms who can describe one major opening.
- Users who want practical treatment guidance without deep acoustics knowledge.

3. Goals and Non-Goals
Goals (v1)
- Help users reduce audible bass issues by prioritizing the most perceptually important problems (default emphasis on 30–80 Hz).
- Provide 2–3 smart next actions for each identified problem (always exactly 3 actions shown).
- Support sealed and ported sub modes, including a richer ported model where driver and port act as separate outputs near tuning (Fb).
- Support rectangular rooms + one opening element with a leakage-aware effect on bass behavior and confidence.
- Provide interactive, snapped acoustic treatment objects that change predicted outcomes (especially peakiness and ringing).
- Include A/B snapshots (two slots only) with meaningful compare views to validate decisions.

Non-Goals (v1)
- No full architectural floorplan builder (only rectangular + one opening).
- No full multi-seat couch averaging (two-channel sweet spot first).
- No lab-grade exact dB predictions; results are directional and relative, with explicit confidence.
- No detailed crossover/phase alignment modeling for mains/sub integration (v1 mains model is simplified).
- No multi-sub simulation (mention as future only).

4. Key v1 Features (Locked)
4.1 Room Model
- Rectangular room with Length / Width / Height
- One opening element on a wall:
  - Wall selection + position
  - Width
  - Presets: Doorway / Hallway / Open-plan
  - Optional: Door open/closed
- Preset default widths (locked):
  - Doorway: 3 ft (0.914 m)
  - Hallway: 4 ft (1.219 m)
  - Open-plan: 8 ft (2.438 m)
- Opening position is stored as a normalized center along the wall; clamp span to avoid crossing corners.
- Opening modifies “pressurization/leakage” behavior and reduces confidence when large/open-plan.

4.2 Entities Users Place
- Seat (Sweet Spot): single listening position
- Main speakers (L/R): optional; simplified bass contributors
- Subwoofer (1): sealed or ported

4.3 Subwoofer Modeling (Locked)
- Sealed mode supported
  - User input: Lowest strong bass (Hz) (audible vs strong clarified)
  - Audiophile preset: “Tight & Accurate / Balanced / Warm & Full / Room-Filling”
- Ported mode supported
  - User input: Fb (tuning frequency)
  - Audiophile preset: “Tight & Controlled / Balanced / Deep & Smooth / Big & Bold”
  - Driver direction and Port direction
  - Richer model: driver and port treated as separate outputs near tuning (dominance shifts near Fb)
- Clearance warnings for port/driver proximity to boundaries or cavities
  - Port clearance warning threshold: < 12 in (0.305 m)
  - Driver clearance warning threshold: < 6 in (0.152 m)
  - Down-firing uses floor clearance only (no special horizontal directivity in v1)

4.4 Mains Modeling (Locked: Simplified Contributors)
- User places L/R speakers.
- Single control: “Mains lowest strong bass (Hz)”
- Mains act as two bass sources above their low limit with a smooth rolloff below.
- No explicit crossover slope / delay / phase alignment in v1.
- 80–120 Hz region carries an “integration-sensitive” caution tag.

4.5 Interactive Acoustic Treatments (Locked)
Treatments affect predicted results (especially peaks and ringing/decay). Objects are snapped to valid zones.
Treatment objects:
- Corner Bass Trap (porous)
- Rear Wall Bass Absorber (thick porous)
- Thick Panel (broadband)
- Tuned Trap (frequency-targeted)
Strength tiers (simplified, locked):
- Light / Medium / Heavy (mapped internally to realistic behavior; not presented as exact thickness)
Snapping (locked):
- Treatments snap to eligible zones (corners, rear wall segments, side/front wall segments).
- Zones highlight when dragging; suggested zones can be frequency-specific.
Caps (locked):
- Corner traps: up to 4
- Rear wall absorber: up to 1
- Thick panels: up to 6
- Tuned traps: up to 2
Diminishing returns (locked):
- Zone-based diminishing returns
- Tuned traps use hybrid logic:
  - Same zone + overlapping target band → strong diminishing returns
  - Same zone + different target band → small diminishing returns
  - Different zones → minimal diminishing returns
- Tuned trap overlap detection (locked option 1):
  - Simple ±X Hz comparison:
  - ±5 Hz → heavy overlap
  - ±10 Hz → some overlap
  - ±10 Hz → none

4.6 Problems, Priorities, and Recommendations (Locked)
Primary band: 20–120 Hz
Default problem prioritization: “Most audible issues”
- Highest priority: 30–80 Hz
- Medium: 80–120 Hz (tagged integration-sensitive)
- Lower: 20–30 Hz
Deep Bass Watchlist override appears if 20–30 has extreme issues.
Top Problems list: exactly 3 items
Problems are small regions (locked): not single Hz points.
Typical region widths:
- 20–40: ~3–5 Hz
- 40–80: ~5–8 Hz
- 80–120: ~8–12 Hz
Severity labels (locked):
- Mild / Moderate / Severe based on deviation + width + audibility weighting
- Stability via hysteresis to prevent constant flipping.
Fixability tags (locked):
- Seat-sensitive
- Placement-sensitive
- Treatment-responsive
- Integration-sensitive (80–120)

4.7 Ghost Sub Placement Suggestions (Locked)
When fixing a selected problem, tool generates 2–3 ghost sub placements:
- Candidate pool: perimeter fractions (1/6, 1/3, 1/2, 2/3, 5/6), corners, quarter points, wall midpoints
- Optional nearfield candidate (~1–2 ft from seat) only when allowNearfieldSuggestions is true and practical
- Nearfield practical definition (locked): 0.3–0.6 m from seat, avoids opening keep-out, avoids the direct path between mains and seat.
- Enforce constraints (opening, clearance, optional furniture keep-out)
- Ensure diversity between suggestions (not clustered)
- Include a one-line rationale per suggestion
Seat adjustments are handled in the Seat Micro-Moves section; ghost placement pool is sub-only.

4.8 Seat Micro-Move Suggestions (Locked)
For null problems that are “seat-sensitive,” recommend:
- Candidate seat moves: 6", 12", 18" in forward/back/left/right
- Pick smallest move that yields meaningful region improvement
- Show 1–2 seat ghost markers (Try 1 / Try 2)

4.9 Recommendation Presentation and Tone (Locked)
Always show exactly 3 next actions for a selected problem.
Recommendation order (two-channel v1):
- Move sub
- Seat micro-move
- Add treatment
- Change sub mode/preset (sealed/ported, tight/bold)
- Mention multi-sub as future only (when plateauing)
Confidence-aware phrasing:
- High confidence: “Best next move… likely… expect noticeable…”
- Medium: “Most likely… try… typically…”
- Low: “Directional guidance… worth testing… if/then…”
Null honesty:
- Nulls are cancellations; treatments don’t “fill” severe nulls
80–120 caution:
- Integration-sensitive; directional guidance only

4.9.1 Recommendation Fallback Rule (v1, Locked)
The system must always display exactly 3 recommendations for a selected problem.
Candidate actions are evaluated against the Meaningful Improvement thresholds (see scoring_and_confidence_v1.md).
Build the recommendation list in this order:
Step A — Meaningful actions:
- Add all candidates that meet Meaningful Improvement, ranked by expected benefit, until either 3 are filled or none remain.
Step B — Best-available (below threshold):
- If fewer than 3 meaningful actions exist, fill remaining slots with the best-ranked candidates below Meaningful Improvement.
- These must be labeled:
  - Impact: Low (pill)
  - Why line: “Below the meaningful-improvement threshold; worth testing.”
Step C — No meaningful actions at all:
- If zero candidates meet Meaningful Improvement, the UI must show a banner:
  - Title: “No meaningful improvements found”
  - Subtext: “Within current constraints, predicted gains are small. Try the options below.”
- Then display exactly 3 informational recommendations, ranked deterministically as:
  1) If opening is doorway and doorState is open:
     “Close the door (test) to increase pressurization and raise confidence.”
     Else if seatLocked = true:
     “Unlock seat movement to allow micro-moves (often the only real fix for cancellations).”
     Else if allowNearfieldSuggestions = false:
     “Allow nearfield sub suggestions to widen placement options.”
     Else:
     “Try an alternate sub mode/preset (e.g., sealed → Tight / ported → Balanced) to trade extension vs control.”
  2) “Validate with a quick sub-crawl or a simple measurement sweep to confirm where the null/peak actually sits.”
  3) “If you need larger gains than single-sub placement can deliver, consider a second sub or DSP/EQ (Future).”
Null honesty remains mandatory:
- In severe null cases, treatments must not be presented as primary fixes; any treatment suggestion must be labeled low-impact unless it meets thresholds.

4.10 A/B Snapshots and Compare (Locked)
- Two snapshots only: A and B
- Option to Lock A
- Snapshot stores:
  - Full state (room, opening, seat, speakers, sub, treatments)
  - Results summary (scores, confidence, top problems, watchlist)
- Compare view shows:
  - Smoothness, Tightness, Confidence deltas
  - Side-by-side Top Problems mapping (“Resolved”, “New”)
  - Curve compare (20–120) with highlighted problem regions
  - Tightness/decay compare (simple banded view)
  - Change log (diff summary)
  - “Revert to A” one-click
- Problem matching (A ↔ B) is locked:
  - Same type required (peak/null)
  - Center within 1/2 of the wider region’s bandwidth
  - >50% region overlap preferred
  - Unmatched items are labeled “New” or “Resolved”
- Change log order is locked: seat move, sub move (including mode/preset/directions), opening changes, treatments.

4.11 User Constraints (Locked)
- Seat Locked (seatLocked): when true, do not generate seat micro-moves or seat-move recommendations.
- If a null is seat-sensitive but seat is locked, Fix This should note: “Seat movement would help, but it’s locked.”
- Allow Nearfield Suggestions (allowNearfieldSuggestions): when false, exclude nearfield candidate from ghost pool.

4.12 Export (Generate Plan) (Locked)
- Export produces two downloads:
  - Project JSON (.json): full current state for reload.
  - Plan Markdown (.md): summary of current configuration + Top Problems + 3 actions per problem + confidence banner.
- Export uses existing state + analysis output only; no new persistent fields.

5. Default Settings (Locked)
- Project mode: Two-channel / Sweet Spot
- Units default: imperial (internal values stored in meters)
- Band: 20–120 Hz
- Top Problems: 3 (audibility-weighted)
- Room seeded default (if blank): ~12×16×8 ft
- Seat default: centered, ~38% room length from front wall
- Opening default: off; when added defaults to “Doorway”, ~3 ft, closed
- Mains default: positioned into a reasonable triangle; lowest strong bass default ~55–60 Hz
- Sub default:
  - Placed front wall at ~1/4 room width from left (with clearance)
  - Default mode: sealed
  - Sub lowest strong bass default: ~28–30 Hz
  - Sub preset default: Balanced
- Treatments default: none
- Tuned traps: default target = dominant peak region center
- Seat Locked default: false
- Allow Nearfield Suggestions default: false

6. Success Metrics (v1)
Users can get a “better” Snapshot B vs A:
- Improved Smoothness and/or Tightness
- Reduced severity of at least one Top Problem
Users report recommendations are practical and “match what I hear.”
Low rate of “sim is obviously wrong” complaints (confidence + honesty messaging prevents overclaiming).

7. Roadmap (Post-v1)
- Multi-seat listening area averaging (couch)
- Multi-sub support
- Irregular rooms / multiple openings
- Measurement import (REW, mic sweeps) for calibration
- More detailed integration modeling (crossovers, delay/phase, slopes)
- 3D representation and height/vertical modes (optional)
