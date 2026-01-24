Prompt Pack (v1) — Codex + Google Antigravity + Cursor AI

These prompts are designed to minimize drift and enforce all locked decisions. Use one prompt per ticket or small cluster of tickets. Do not bundle multiple phases into one run.

Global rule for every prompt you send:
Include the “Hard Constraints” block verbatim.

0) Hard Constraints (paste into every prompt)
HARD CONSTRAINTS (v1):
Follow /docs/planning/ as source of truth. Do not invent features.
Two-channel sweet spot only (single seat). Band is 20–120 Hz only.
Room is rectangular + exactly ONE opening element.
Exactly ONE subwoofer; must support sealed + ported.
Ported must treat driver + port as separate outputs near Fb; support driver direction + port direction.
Mains are simplified bass contributors only; single control: mains lowest strong bass (Hz). No detailed crossover/phase alignment in v1.
Treatments are snapped objects with tiers Light/Medium/Heavy. Caps enforced: 4 corner traps, 1 rear absorber, 6 thick panels, 2 tuned traps.
Diminishing returns are zone-based; tuned trap overlap uses ±5 heavy / ±10 some / >10 none; hybrid DR rules apply.
Top Problems list is exactly 3 and uses small regions (not single Hz). Audibility weighting prioritizes 30–80. Include Deep Bass Watchlist for extreme 20–30.
Selecting a problem shows exactly 3 ranked recommendations. Null honesty: do not claim treatments fill severe nulls.
Recommendation fallback rule: when no meaningful actions exist, show the fallback banner and 3 informational recommendations; below-threshold items use “Impact: Low” and the why line.
Ghost sub placements: generate 2–3 from the locked candidate pool with constraints and diversity + rationale.
Ghost nearfield candidate is allowed only when allowNearfieldSuggestions is true and practical.
Seat micro-moves only for seat-sensitive nulls (6/12/18 inches). Show 1–2 options. If seatLocked is true, suppress seat moves and show the seat-locked note.
A/B snapshots exactly two: A and B. Must support Lock A, Revert to A, and compare view per PRD.
Visualization: heatmap is relative only (no dB scale). Ripple overlay is teaching-only. No ray/reflection arrows.
Use copy rules from /docs/planning/ui_copy_v1.md. Use scoring rules from /docs/planning/scoring_and_confidence_v1.md.

Deliverables:
- Return a concise file list of changes, plus short notes explaining how each change satisfies the acceptance criteria for the requested task(s).
- Add TODO comments rather than guessing missing decisions.

1) Phase 1 Prompts — Data Model + UI Skeleton
Prompt 1.1 — Task 1.1 (Project State Schema + Serialization)
Implement TASK 1.1 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Use /docs/planning/data_model_v1.md as canonical.
- Ensure full state serialization/deserialization and stable enums.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.
- Minimal tests or usage examples if present in the repo patterns.

Prompt 1.2 — Task 1.2 (Top-Down Room Canvas Static)
Implement TASK 1.2 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Render room rectangle and opening segment accurately.
- Establish coordinate system conversions.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 1.3 — Task 1.3 (Draggable Seat/Mains/Sub)
Implement TASK 1.3 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Draggable seat, mains L/R, and sub.
- Defaults must match /docs/planning/PRD.md defaults (avoid symmetry traps).
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 1.4 — Task 1.4 (Results Panel Shell + Fix This Shell)
Implement TASK 1.4 from /docs/planning/dev_tasks_v1.md.
Requirements:
- UI placeholders for Smoothness/Tightness/Confidence.
- Top Problems panel shows exactly 3 placeholder rows.
- Click opens Fix This placeholder panel.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 1.5 — Task 1.5 (Units Toggle + Conversion)
Implement TASK 1.5 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Units toggle in room setup.
- Internal units remain meters; display switches between imperial/metric.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

2) Phase 2 Prompts — Snap Zones + Treatments (No Physics Yet)
Prompt 2.1 — Task 2.1 (Snap Zone Generation)
Implement TASK 2.1 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Generate snap zones per /docs/planning/data_model_v1.md.
- Opening disables/adjusts zones.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 2.2 — Task 2.2 (Treatment Placement + Snapping + Caps)
Implement TASK 2.2 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Snapping-only placement.
- Enforce caps and tiers exactly.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 2.3 — Task 2.3 (Diminishing Returns UI Preview)
Implement TASK 2.3 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Create the DR UI components even with mocked values.
- Use copy guidelines from /docs/planning/ui_copy_v1.md.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 2.4 — Task 2.4 (Clearance Warnings)
Implement TASK 2.4 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Port clearance, driver clearance, blocks opening.
- Use wording from /docs/planning/ui_copy_v1.md.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

3) Phase 3 Prompts — Analysis Engine v1
Prompt 3.1 — Task 3.1 (Analysis Pipeline Scaffolding)
Implement TASK 3.1 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Output Smoothness (0–100), Tightness (0–100), Confidence (High/Med/Low).
- Confidence triggers per /docs/planning/scoring_and_confidence_v1.md.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 3.2 — Task 3.2 (Top Problems Extraction — Exactly 3)
Implement TASK 3.2 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Exactly 3 Top Problems, region-based, audibility-weighted 30–80.
- Deep Bass Watchlist for extreme 20–30.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 3.3 — Task 3.3 (Severity + Hysteresis)
Implement TASK 3.3 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Hysteresis to prevent jitter.
- Stable Top Problems ordering for tiny moves.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 3.4 — Task 3.4 (Fixability Tags)
Implement TASK 3.4 from /docs/planning/dev_tasks_v1.md.
Requirements:
- seat-sensitive neighborhood test
- placement-sensitive candidate improvement test
- treatment-responsive mostly peaks
- integration-sensitive for 80–120
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 3.5 — Task 3.5 (Ported Near-Fb Split)
Implement TASK 3.5 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Near Fb behavior differs and responds to port direction.
- Generate “port dominates / driver dominates” state for UI.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

4) Phase 4 Prompts — Ghost Suggestions + Fix This
Prompt 4.1 — Task 4.1 (Ghost Sub Placements 2–3)
Implement TASK 4.1 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Candidate pool exactly per PRD.
- Enforce opening + clearance constraints and diversity.
- Provide one-line rationale per placement.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 4.2 — Task 4.2 (Seat Micro-Moves)
Implement TASK 4.2 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Only for seat-sensitive nulls.
- 6/12/18 inch moves. 1–2 ghost markers.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 4.3 — Task 4.3 (Recommendations — Exactly 3 Actions)
Implement TASK 4.3 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Exactly 3 ranked recommendations.
- Confidence ladder phrasing and null honesty.
- 80–120 integration-sensitive caution.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 4.4 — Task 4.4 (Fix This View Interactive)
Implement TASK 4.4 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Selected problem drives region visualization and recommendations.
- Ghost markers apply actions.
- Treatment zones highlight Best/OK/Limited.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 4.5 — Task 4.5 (Constraints Toggles)
Implement TASK 4.5 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Seat Locked toggle suppresses seat micro-moves and seat recommendations.
- Allow Nearfield Suggestions toggle gates nearfield candidate.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

5) Phase 5 Prompts — Visualization
Prompt 5.1 — Task 5.1 (Heatmap Layer)
Implement TASK 5.1 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Relative-only heatmap (no dB scale).
- Default to Most Audible / Selected Problem behavior per visualization_spec_v1.md.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 5.2 — Task 5.2 (Ripple Overlay Teaching Layer)
Implement TASK 5.2 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Toggleable, subtle.
- No ray/reflection arrows.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 5.3 — Task 5.3 (Port Contribution UI Pill)
Implement TASK 5.3 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Appears only when ported and near Fb.
- Uses ui_copy_v1.md copy intent.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

6) Phase 6 Prompts — A/B Snapshots + Compare
Prompt 6.1 — Task 6.1 (Snapshots A/B + Lock A)
Implement TASK 6.1 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Exactly two slots: A and B.
- Lock A, Save A/Save B, restore.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 6.2 — Task 6.2 (Change Log Diff Summary)
Implement TASK 6.2 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Detect and summarize meaningful diffs (sub/seat/opening/treatments).
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 6.3 — Task 6.3 (Compare View)
Implement TASK 6.3 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Deltas, problems mapping, curve compare, tightness compare, revert.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 6.4 — Task 6.4 (Export)
Implement TASK 6.4 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Generate Plan (Export) with Project JSON + Plan Markdown downloads.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

7) Phase 7 Prompts — Defaults, Copy, Trust Polish
Prompt 7.1 — Task 7.1 (Defaults Audit)
Implement TASK 7.1 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Ensure all defaults match PRD.
- Avoid symmetry traps.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 7.2 — Task 7.2 (Copy Enforcement Audit)
Implement TASK 7.2 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Enforce UI copy and tooltips from ui_copy_v1.md.
- Remove false precision language.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes.

Prompt 7.3 — Task 7.3 (Run Minimum Test Set)
Implement TASK 7.3 from /docs/planning/dev_tasks_v1.md.
Requirements:
- Ensure core tests and checklist pass.
- Fix any regressions.
HARD CONSTRAINTS (v1):
[PASTE HARD CONSTRAINTS BLOCK HERE]
Deliverables:
- File list + short notes, and what was validated.
