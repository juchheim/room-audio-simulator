Dev Tasks (v1) — Ticket Plan with Acceptance Criteria

This document breaks v1 into implementable tasks aligned to /docs/planning/README.md build phases and gated by /docs/planning/implementation_checklist_v1.md.

Rule: Do tasks in order unless explicitly re-prioritized in planning docs. Each task has an acceptance checklist; do not mark complete without passing it.

Phase 1 — Data Model + UI Skeleton
TASK 1.1 — Project State Schema + Serialization
Goal: Implement the v1 project state structure per data_model_v1.md.
Acceptance:
- Room, Opening, Seat, Mains, Sub, Treatments entities exist with the specified fields/enums.
- Full state can be serialized/deserialized without loss.
- State versioning placeholder exists (for future migrations).
- Project constraints include seatLocked and allowNearfieldSuggestions.

TASK 1.2 — Top-Down Room Canvas (Static)
Goal: Render the room rectangle and establish coordinate system and scaling.
Acceptance:
- Room renders at correct aspect ratio.
- Coordinate conversions work reliably (screen ↔ room units).
- Coordinate system matches data_model_v1.md (origin front-left, x right, y toward rear).
- Opening segment renders on selected wall.
- Opening span is clamped so it does not cross corners.
- Opening preset widths use PRD defaults (Doorway 3 ft, Hallway 4 ft, Open-plan 8 ft).

TASK 1.3 — Draggable Objects: Seat, Mains, Sub
Goal: Place and drag the seat, mains (L/R), and sub.
Acceptance:
- Seat can be placed and dragged.
- Mains can be enabled/disabled; L/R can be dragged.
- Sub can be placed and dragged.
- Default placements match PRD.md defaults (avoid symmetry traps).
- UI shows basic property panels for each object (even if analysis is mocked).

TASK 1.4 — Results Panel Shell + Fix This Shell
Goal: Build the UI layout for baseline results + Fix This view.
Acceptance:
- Smoothness/Tightness/Confidence placeholders are visible.
- Top Problems panel shows exactly 3 placeholder rows.
- Clicking a problem opens Fix This placeholder panel.

TASK 1.5 — Units Toggle + Conversion
Goal: Implement imperial/metric display switching with internal meters.
Acceptance:
- Project.units is stored and defaults to imperial.
- UI displays measurements in the active unit system.
- Unit switching does not change internal stored values (meters).
- Quick picks and seat micro-move distances render in the active units.
- Metric seat micro-move labels use rounded values: 15 cm / 30 cm / 45 cm.

Phase 2 — Snap Zones + Treatments (No Physics Required Yet)
TASK 2.1 — Snap Zone Generation (Room + Opening)
Goal: Generate snap zones and disable/adjust zones overlapped by the opening.
Acceptance:
- Zones include corners and wall segments as described in data_model_v1.md.
- Opening disables invalid segments (no splitting).
- Zones have stable IDs (for snapshot consistency).

TASK 2.2 — Treatment Placement + Snapping + Caps
Goal: Place treatments via snapping and enforce caps.
Acceptance:
- Treatments snap to valid zones only.
- Caps enforced exactly:
  - corner traps max 4
  - rear absorber max 1
  - thick panels max 6
  - tuned traps max 2
- Treatment strength tiers Light/Medium/Heavy exist.
- Tuned trap target Hz input exists.
- If a snapped zone becomes disabled (e.g., opening added), mark the treatment invalid (“Needs attention”), exclude it from analysis, and show a warning + “Fix placement” CTA.

TASK 2.3 — Diminishing Returns UI (Preview-Only)
Goal: Build the diminishing returns UI components (even with mocked benefit values).
Acceptance:
- Impact Preview card exists (Expected benefit + Why).
- Zone saturation meter exists (Low/Med/High).
- Frequency overlap meter exists (None/Some/Heavy).
- Zone icons Best/OK/Limited exist (frequency-specific placeholder).
- Doubling-up tooltip triggers only for same zone + overlapping targets.

TASK 2.4 — Sub Clearance Warnings (Logic + UI)
Goal: Implement clearance warnings and opening blockage warning.
Acceptance:
- Port clearance warning triggers (ported).
- Driver clearance warning triggers (any).
- “Blocks opening” warning triggers when placement overlaps opening segment.
- Warnings use copy from ui_copy_v1.md.
- Clearance thresholds are locked: port < 12 in (0.305 m), driver < 6 in (0.152 m).
- Down-firing uses floor clearance only for driver warnings.

Phase 3 — Analysis Engine v1 (Directional + Honest)
TASK 3.1 — Analysis Pipeline Scaffolding
Goal: Implement the analysis runner and output container.
Acceptance:
- Analysis outputs include Smoothness/Tightness/Confidence per scoring_and_confidence_v1.md.
- Outputs update when moving seat/sub or adding/removing treatments.
- Confidence starts Medium and changes based on opening + missing inputs.

TASK 3.2 — Region Model + Top Problems Extraction (Exactly 3)
Goal: Compute region-based issues and produce exactly 3 Top Problems.
Acceptance:
- Problems are regions with center + (low/high) range.
- Region width rules respected by band:
  - 20–40 ~3–5 Hz
  - 40–80 ~5–8 Hz
  - 80–120 ~8–12 Hz
- Exactly 3 Top Problems are always shown (or “No major issues” state).
- Audibility weighting prioritizes 30–80 by default.
- Deep Bass Watchlist triggers for extreme 20–30 conditions.
- “No major issues” state uses scoring_and_confidence_v1.md criteria.

TASK 3.3 — Severity Classification + Hysteresis
Goal: Classify mild/moderate/severe and prevent jitter.
Acceptance:
- Severity uses hysteresis (no rapid flip while dragging).
- Top Problems list doesn’t reshuffle excessively for tiny drags.

TASK 3.4 — Fixability Tag Assignment
Goal: Assign Seat-sensitive / Placement-sensitive / Treatment-responsive / Integration-sensitive.
Acceptance:
- Seat-sensitive only when neighborhood seat sampling finds meaningful improvement.
- Placement-sensitive only when candidate placements improve meaningfully.
- Treatment-responsive primarily for peaks; nulls are not labeled treatment-responsive by default.
- Integration-sensitive applied for 80–120 regions.
- Meaningful improvement uses scoring_and_confidence_v1.md thresholds.

TASK 3.5 — Ported Near-Fb Driver/Port Split Behavior
Goal: Ensure ported mode changes behavior near Fb and supports port direction effects.
Acceptance:
- Behavior changes near Fb and responds to port direction.
- “Contribution” pill logic can determine port vs driver dominance near Fb (for UI).
- No separate port-only heatmap in v1 (combined output only).
- Near-Fb band and dominance crossfade use simulation_assumptions_v1.md.

Phase 4 — Fix This Workflow + Ghost Suggestions
TASK 4.1 — Ghost Sub Placement Generator (2–3)
Goal: Generate 2–3 suggested sub placements from the locked candidate pool with constraints and diversity.
Acceptance:
- Candidate pool matches PRD.md.
- Constraints enforced (opening, clearance, optional furniture keep-out).
- allowNearfieldSuggestions gates the optional nearfield candidate.
- Nearfield is practical only when 0.3–0.6 m from the seat, avoids opening keep-out, and avoids the direct-path keep-outs:
  - capsule corridor midpoint(mains L/R) → seat with 0.60 m radius
  - rectangle in front of mains midpoint (0.50 m toward seat x 1.20 m wide)
- 2–3 suggestions are diverse: at least one on a different wall or >= 20% of the room’s larger dimension away.
- Each suggestion has a one-line rationale.
- Ghost placement eligibility uses scoring_and_confidence_v1.md thresholds.

TASK 4.2 — Seat Micro-Move Suggestions (1–2)
Goal: For seat-sensitive nulls, generate seat move suggestions.
Acceptance:
- Appears only for seat-sensitive nulls.
- Uses 6/12/18 inch moves in cardinal directions.
- Picks smallest effective move.
- Shows 1–2 ghost seat markers with labels.
- Seat micro-move meaningfulness uses the 2-of-3 guard in scoring_and_confidence_v1.md.

TASK 4.3 — Recommendations Engine (Exactly 3 Actions)
Goal: Produce exactly 3 ranked recommendations per selected problem with correct tone.
Acceptance:
- Exactly 3 actions always.
- Null honesty enforced (no “treatments fill severe nulls”).
- Confidence phrasing ladder enforced.
- 80–120 always includes integration-sensitive caution.
- Recommendations must use meaningful improvement thresholds from scoring_and_confidence_v1.md.
- If fewer than 3 meaningful actions exist, fill remaining slots with below-threshold actions labeled “Impact: Low” plus the why line.
- If zero meaningful actions exist, show the fallback banner and 3 informational recommendations in the locked order (see PRD.md).

TASK 4.4 — Fix This View (Interactive)
Goal: Implement Fix This view with problem-focused visualization and interactive application of ghost actions.
Acceptance:
- Selected problem drives the visualization region.
- Ghost markers appear and can be applied.
- Recommended treatment zones highlight Best/OK/Limited.
- UI copy uses ui_copy_v1.md definitions.

TASK 4.5 — Constraints Toggles (Seat Locked + Nearfield)
Goal: Add and enforce v1 constraint toggles that affect recommendations and ghost suggestions.
Acceptance:
- Seat Locked (seatLocked) toggle exists in the constraints UI.
- When seatLocked is true:
  - Seat micro-moves are not generated.
  - Recommendations never include seat movement.
  - Fix This shows the seat-locked note when a null is seat-sensitive.
- Allow Nearfield Suggestions (allowNearfieldSuggestions) toggle exists.
- When allowNearfieldSuggestions is false, exclude nearfield candidate from ghost pool.

Phase 5 — Visualization (Per Spec)
TASK 5.1 — Heatmap Layer (Primary)
Goal: Implement the relative pressure/energy heatmap for the selected region.
Acceptance:
- Heatmap uses no dB scale (relative only).
- Updates with state changes.
- Defaults to Most Audible/Selected Problem behavior.

TASK 5.2 — Ripple Overlay Layer (Teaching Only)
Goal: Add subtle animated ripples that do not imply exact reflections.
Acceptance:
- Ripples have low intensity and are optional/toggleable.
- No reflection arrows or ray paths.
- Ripples do not contradict heatmap.

TASK 5.3 — Port Contribution UI Pill
Goal: Show “port dominates” vs “driver dominates” messaging near Fb.
Acceptance:
- Pill appears only when ported and region near Fb.
- Copy matches ui_copy_v1.md.

Phase 6 — A/B Snapshots + Compare
TASK 6.1 — Snapshot Save/Load (A/B) + Lock A
Goal: Implement Save A / Save B, Lock A protection, and state restore.
Acceptance:
- Exactly two slots: A and B.
- Lock A prevents overwriting baseline.
- Snapshot stores full state + analysis summary.

TASK 6.2 — Change Log Diff Summary
Goal: Generate human-readable change log between snapshot saves.
Acceptance:
- Logs meaningful changes (sub moved, seat moved, opening changed, treatments added).
- Copy is concise and consistent.
- Log order is locked: seat move, sub move (including mode/preset/directions), opening changes, treatments (add/remove/invalid/target changes).

TASK 6.3 — Compare View
Goal: Implement compare view per PRD.md.
Acceptance:
- Smoothness/Tightness/Confidence deltas shown.
- Top Problems mapping shows Resolved/New.
- Curve compare (20–120) with highlighted regions exists.
- Tightness/decay banded compare exists.
- Revert to A works.
- Problem matching uses locked rules (same type; center within 1/2 bandwidth; >50% overlap preferred).

TASK 6.4 — Export (Generate Plan)
Goal: Provide deterministic exports based on current state + analysis.
Acceptance:
- “Generate Plan (Export)” opens download options for Project JSON and Plan Markdown.
- Project JSON includes full current state for reload.
- Plan Markdown includes configuration summary, Top Problems, 3 actions per problem, and confidence banner.
- Export is derived only from current state + analysis output (no new persisted fields).

Phase 7 — Defaults + Copy + Trust Polish
TASK 7.1 — Defaults Enforcement Audit
Goal: Ensure all defaults match PRD.md.
Acceptance:
- Seed room size if blank.
- Seat at ~38% from front wall, centered.
- Opening off by default; doorway closed ~3 ft when added.
- Sub default position and mode sealed + Balanced.
- Treatments default none.

TASK 7.2 — Copy Enforcement Audit
Goal: Ensure all UI copy follows ui_copy_v1.md and tone rules.
Acceptance:
- Confidence banners match spec.
- Null/Peak explanations present where needed.
- Integration-sensitive tooltips present.
- No false precision language.

TASK 7.3 — Test Plan Execution (Minimum Set)
Goal: Run the scenario matrix and core tests in test_plan_v1.md.
Acceptance:
- All core functional tests pass.
- Edge cases behave per edge_cases_and_gotchas_v1.md.
- Implementation checklist passes.

Release Gate (Required)
Before v1 release, confirm /docs/planning/implementation_checklist_v1.md is 100% checked.
