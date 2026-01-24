Test Plan (v1) — Functional, UX, and Credibility Tests

1. Test Strategy
v1 must be validated on:
- correctness of directional behavior (rankings and trends),
- UX clarity and trust (confidence and honest messaging),
- stability (no jittery outputs),
- realistic constraints (opening, clearance, snapping).

2. Core Functional Tests
2.1 Room + Opening
- Rectangular room renders correctly.
- Opening:
  - snaps to wall, respects width
  - clamps center so span does not cross corners
  - disables snap zones that overlap the opening (no splitting)
  - reduces confidence appropriately (open-plan < hallway < doorway)
  - changes predicted behavior (e.g., less deep-bass pressurization)
- Units toggle switches displayed units without changing internal values.
- Opening presets default to Doorway 3 ft, Hallway 4 ft, Open-plan 8 ft.

2.2 Placement Objects
- Seat placement updates results.
- Mains placement and “lowest strong bass” affects upper bass contribution.
- Sub placement updates results.
- Ported vs sealed toggles update model and UI cues.

2.3 Ported Port/Driver Split (Locked)
When viewing frequency near Fb:
- UI indicates port dominance
- rotating port direction changes predicted behavior near tuning
- Clearance warnings trigger when port faces into too-tight boundary/cavity.
- Clearance thresholds: port < 0.305 m, driver < 0.152 m.
- Down-firing driver uses floor clearance only for warning logic.

2.4 Treatments (Interactive + Snapped)
- Each object snaps only to valid zones.
Caps enforced:
- 4 corner, 1 rear absorber, 6 panels, 2 tuned
Strength tiers affect results in plausible direction:
- heavier improves more, reaches lower
Diminishing returns:
- zone stacking reduces incremental improvement
- tuned trap hybrid DR behaves as locked
Invalid placement handling:
- If a previously valid snap zone becomes disabled, the treatment is marked invalid and excluded from analysis until fixed.
- Warning + “Fix placement” CTA appears.

2.5 Tuned Trap Overlap Logic (Locked)
Two tuned traps same zone:
- target within ±5 → heavy overlap meter + strong DR + tooltip
- within ±10 → some overlap + moderate DR
- beyond ±10 → minimal overlap + small DR
Two tuned traps different zones:
- minimal DR regardless

3. Top Problems and Recommendation Tests
3.1 Top Problems List (Locked)
- Exactly 3 problems always (unless no problems; then show “No major issues detected”)
Audibility weighting:
- problems in 30–80 outrank equal-magnitude problems in 20–30
- Deep Bass Watchlist triggers only for extreme 20–30 issues.
- “No major issues detected” uses scoring_and_confidence_v1.md criteria.

3.2 Problems as Regions (Locked)
- Problems display center + range.
- Fix scoring uses range, not single Hz.
- Region widths align with band rules (3–5 / 5–8 / 8–12).

3.3 Severity Stability
- Slow drag sub across small distances shouldn’t cause severity to flip rapidly.
- Hysteresis prevents mild/moderate flip-flopping.

3.4 Fixability Tags (Locked)
- Seat-sensitive triggers only when neighborhood seat sampling shows meaningful improvement.
- Placement-sensitive triggers when ghost placement pool contains meaningful improvement.
- Treatment-responsive triggers primarily on peaks and shows tightness improvements.
- Integration-sensitive always tags 80–120 problems.
- Meaningful improvement uses scoring_and_confidence_v1.md thresholds.

3.5 Recommendations (Locked)
- Always exactly 3 actions.
- Null problems lead with seat/sub moves, not treatments.
- Peak problems can recommend treatment and/or sub move.
- Confidence level changes phrasing correctly (high/medium/low vocabulary).
- 80–120 always includes integration-sensitive caution.
- If fewer than 3 meaningful actions exist, remaining slots show “Impact: Low” and the why line.
- If zero meaningful actions exist, show the fallback banner and the 3 informational recommendations in the locked order.
- Fallback copy matches ui_copy_v1.md (banner title/body + low-impact pill + why line).

4. Ghost Placements and Seat Micro-Moves
4.1 Ghost Sub Placement Quality
- Suggestions come from candidate pool (perimeter fractions, quarter points, midpoints, corners, optional nearfield).
- Suggestions respect opening and clearance constraints.
- Suggestions are diverse (not clustered; at least one on a different wall or >= 20% room size apart).
- Each suggestion includes a one-line rationale.
- Nearfield candidate appears only when allowNearfieldSuggestions is true and practical.
- Nearfield practical definition: 0.3–0.6 m from seat, avoids opening keep-out, avoids direct-path keep-outs:
  - capsule corridor midpoint(mains L/R) → seat with 0.60 m radius
  - rectangle in front of mains midpoint (0.50 m toward seat x 1.20 m wide)
- Ghost placement eligibility uses the stricter threshold (tier improvement or >= 2.5 deviation and +4.0 smoothness).

4.2 Seat Micro-Move Quality
- Only appears for seat-sensitive nulls.
- Recommends smallest effective move.
- Shows 1–2 ghost seat markers.
- In metric mode, seat micro-move labels are 15 cm / 30 cm / 45 cm.
- Seat micro-move uses the 2-of-3 guard (deviation, smoothness, Top Problems rank).

4.3 Constraints Toggles
- seatLocked true suppresses seat micro-moves and removes seat-move recommendations.
- If a null is seat-sensitive and seatLocked is true, Fix This shows the seat-locked note.
- allowNearfieldSuggestions false excludes nearfield candidate from ghost pool.

5. A/B Snapshot Tests (Locked)
- Save A, Lock A prevents overwrite.
- Save B updates sandbox.
Compare view:
- displays score deltas
- maps problems (resolved/new)
- shows curve compare with highlighted regions
- shows tightness/decay compare
- shows change log diffs accurately
- Revert to A resets state.
- Problem matching follows the locked rules (same type, center within 1/2 bandwidth, >50% overlap preferred).

5.2 Export Tests (Locked)
- Generate Plan (Export) produces two downloads:
  - Project JSON contains full current state for reload.
  - Plan Markdown contains configuration summary, Top Problems, 3 actions per problem, and confidence banner.
- Plan Markdown follows the locked section order from ux_flows_v1.md.

6. UX/Trust Tests (“Does it feel honest?”)
- Users can understand “lowest strong bass” without confusion.
- Users understand null vs peak difference.
- Users do not interpret treatment as null-filling.
- Opening reduces confidence; tool explains why concisely.
- Tool does not claim “will fix”; uses confidence ladder phrasing.

7. Performance / Responsiveness Targets (v1)
- UI remains responsive while dragging objects.
- Computation updates should feel near-instant; if not, show “updating” state and keep interactions smooth.
- Heavy computations run without blocking UI (plan for workers if needed).

8. Scenario Test Matrix (Suggested)
Test preset room scenarios:
- Small closed room, doorway opening, open-plan opening
- Sub near corner vs mid-wall vs quarter point
- Severe null at seat vs broad peak
- Ported near Fb behaviors with port facing wall vs away
- Heavy treatment stacking in one zone vs distributed
