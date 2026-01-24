UX Flows (v1) — End-to-End and Key Screens

1. Primary Flow: New Project → Better Bass
- Create Project (Two-channel / Sweet Spot default)
- Enter Room size (L/W/H)
- Add Opening (optional)
- Place Seat (required)
- Place Mains L/R (recommended; simplified)
- Place Sub (required)
- View Baseline Results (Top Problems + Scores)
- Select a problem → Fix This
- Apply recommended action(s)
- Save A/B snapshots and compare
- Generate Plan (export)

2. Room Setup Screen
Inputs:
- L/W/H
- Units toggle (imperial | metric)
- Opening (optional):
  - wall, position, width
  - type preset: Doorway/Hallway/Open-plan
  - door open/closed
UI:
- Confidence meter updates when opening changes
- Subtle note: opening reduces pressurization

3. Layout Screen (Top-Down)
Objects:
- Seat (chair icon)
- Mains L/R (speaker icons)
- Sub (sub icon)
Behavior:
- Snap-to-grid optional; allow fine movement
- Clearance warnings appear when sub port/driver too close to walls or cavities
- Mains auto-arranged on drop (reasonable triangle), user can override

4. Constraints (Right Panel / Settings Drawer)
Toggles:
- Lock seat position (seatLocked)
- Allow nearfield sub suggestions (allowNearfieldSuggestions)
Behavior:
- seatLocked suppresses seat move recommendations and seat micro-moves.
- allowNearfieldSuggestions controls inclusion of the nearfield candidate in ghost placements.

5. Results Screen (Baseline + Live)
Always visible summary:
- Smoothness score
- Tightness score
- Confidence
Top Problems panel (locked):
- Exactly 3 items
- Audibility-weighted (30–80 priority)
- Each item shows:
  - Peak/Null, ~center Hz, (region range)
  - Severity: mild/moderate/severe
  - Fixability badge: Seat Move / Sub Move / Add Treatment
  - Integration-sensitive tag (80–120)
- Deep Bass Watchlist appears separately if triggered (20–30 extreme)
Interaction:
- Clicking a problem enters Fix This view centered on that region.

6. Fix This View (Problem-Specific)
Displays:
- Frequency-region heatmap / energy map for the selected region
- Fixability explanation (“why this lever”)
- Exactly 3 recommended actions ranked
- Ghost markers (sub and/or seat) as applicable
- Treatment zone highlights if treatment is recommended
Recommendation behaviors:
- Nulls emphasize seat/sub moves; treatment is de-emphasized
- Peaks may recommend treatment and/or sub move
- 80–120 always shows integration-sensitive caution
- If seatLocked is true and the problem is seat-sensitive, show the seat-locked note and omit seat move recommendations.
- If zero meaningful actions exist, show the fallback banner and low-impact recommendations per PRD.
- Below-threshold recommendations show the “Impact: Low” pill and the why line.

7. Treatment Placement UI (Locked)
- Treatments are snapped to zones (corners, wall segments)
- Eligible zones highlight during drag
- Frequency-specific suggested zones may highlight when targeting a specific problem
Caps enforced:
- 4 corner, 1 rear absorber, 6 panels, 2 tuned traps
Strength:
- Light/Medium/Heavy
Tuned traps:
- Target Hz selector
UI for diminishing returns:
- Impact Preview card (Expected benefit + why)
- Zone saturation meter
- Frequency overlap meter
- Snap zone icons: Best / OK / Limited (frequency-specific)
- “You’re doubling up” tooltip when same zone + overlapping target band

8. Seat Micro-Move UI (Locked)
Shown only when seat-sensitive null:
- 1–2 ghost seat markers (Try 1 / Try 2)
- distances 6/12/18 and direction chosen automatically
- one-line rationale: “Moves off cancellation line”

9. A/B Snapshot & Compare (Locked)
Actions:
- Save A / Save B
- Lock A
- Revert to A
- Compare view
Compare view shows:
- Smoothness, Tightness, Confidence deltas
- Top Problems mapping with “Resolved/New”
- Curve compare (20–120) with shaded problem regions
- Tightness/decay compare (banded view)
- Change log (“Moved sub… Added traps…”)

10. Export (Generate Plan) (Locked)
Entry point:
- “Generate Plan (Export)” button in the Results header (and Compare view).
Outputs:
- Download Project JSON (.json): full current state for reloading.
- Download Plan Markdown (.md): summary + Top Problems + 3 actions per problem + confidence banner.
Plan Markdown template (locked order):
- Title
- Date/Time
- Units
- Confidence banner
- Room summary (dimensions + opening)
- Seat + mains + sub summary (including sub mode/preset and driver/port direction)
- Treatments list (tiers + zones + tuned trap targets)
- Results summary (Smoothness/Tightness + Deep Bass Watchlist if present)
- Top Problems (exactly 3)
- Fix Plan: for each Top Problem, exactly 3 recommended actions
- A/B summary (only if comparison is active)

11. Recommendation Tone Rules (Locked)
Based on confidence:
- High: “Best next move… likely… expect noticeable…”
- Medium: “Most likely… try… typically…”
- Low: “Directional guidance… worth testing… if/then…”
Always:
- Null honesty line for null problems
- Integration-sensitive caution for 80–120
