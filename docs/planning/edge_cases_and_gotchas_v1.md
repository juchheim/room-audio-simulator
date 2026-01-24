Edge Cases and Gotchas (v1) — Anticipated Failures and Guardrails

1. Users Expecting Treatments to Fix Nulls
- Risk: Users add panels to fix a -20 dB null and blame tool.
- Guardrail: Null problems explicitly state “cancellation; placement/seat is the lever.”
- Behavior: Nulls are rarely labeled treatment-responsive, especially if severe.

2. Users Confusing “Audible” vs “Strong” Low Bass
- Risk: Users enter 18 Hz because spec sheet says so.
- Guardrail: Define “lowest strong bass” clearly; quick-picks; “Not sure” default.

3. Open-Plan Rooms and Leakage
- Risk: Without modeling adjacent space, results diverge.
- Guardrail: Opening element reduces pressurization + confidence; avoid overconfident deep-bass claims; recommend verifying opening type.

4. Port Clearance / Cavity Loading
- Risk: Rear-ported sub placed into tight cavity; bass becomes weird; tool must warn.
- Guardrail: Clearance warnings and “near Fb port dominates” cues.

5. Symmetry Traps (Perfectly Centered Seat/Sub)
- Risk: Extreme null patterns; user thinks tool exaggerates.
- Guardrail: Default placements avoid perfect symmetry; recommendations include practical moves.

6. Upper Bass 80–120 (Integration-sensitive)
- Risk: User expects precise fixes without crossover modeling.
- Guardrail: Always tag integration-sensitive; soften language; avoid “fix” phrasing.

7. Too Many Treatments / Unrealistic Stacking
- Risk: Users “spam” treatments to chase perfect curves.
- Guardrail: Caps + zone-based diminishing returns + diminishing-return UI feedback.

8. Treatment Placement in Invalid Zones (Doorway/Open Segment)
- Risk: Floating trap in opening.
- Guardrail: Snap zones are disabled (not split) when overlapping an opening; no overlap allowed.
- If a zone becomes disabled after placement, mark the treatment invalid (“Needs attention”) and exclude it from analysis until fixed.

9. Seat “Fixed” Reality vs Suggesting Seat Moves
- Risk: Some users can’t move couch.
- Guardrail: seatLocked toggle; suppress seat-move recommendations and micro-moves when locked.
- If a null is seat-sensitive but seatLocked is true, show a soft note that seat movement would help.

10. Problem Jitter During Dragging
- Risk: Severity flips rapidly and feels untrustworthy.
- Guardrail: Small regions + hysteresis in severity + stable top-3 selection logic.

11. Nearfield Sub Suggestion Misuse
- Risk: Recommending nearfield where user can’t place it.
- Guardrail: Nearfield candidate used only when practical and allowNearfieldSuggestions is true (default false).
- Direct-path keep-out is enforced: capsule corridor midpoint(mains L/R) → seat with 0.60 m radius.
- Additional keep-out: rectangle in front of mains midpoint (0.50 m toward seat x 1.20 m wide).
