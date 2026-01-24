Room Audio Simulator (v1) — Planning Index + Build Order (for Cursor + Codex)

This folder contains the authoritative planning documents for v1. These docs encode all locked scope, behavior, constraints, UX rules, and copy. Cursor’s AI, Codex, and Google Antigravity should treat these as source-of-truth and must not “improvise” beyond them unless you explicitly update the docs.

1) Document Index (links)
Core Specs
- PRD (v1 scope + locked decisions): ./PRD.md
- Simulation assumptions (truthfulness + constraints): ./simulation_assumptions_v1.md
- UX flows (screens + interactions + rules): ./ux_flows_v1.md
- Data model (entities + fields + enums): ./data_model_v1.md
- Presets + tiers (audiophile-language behaviors): ./presets_and_tiers_v1.md
- Edge cases + gotchas (guardrails): ./edge_cases_and_gotchas_v1.md
- Test plan (functional + UX trust tests): ./test_plan_v1.md

Added Determinism Docs (to prevent model drift)
- Visualization spec (honest 2D “waves”): ./visualization_spec_v1.md
- Scoring & confidence definitions (0–100 + rules): ./scoring_and_confidence_v1.md
- UI copy (required microcopy/tooltips/warnings): ./ui_copy_v1.md

Build Controls
- Implementation checklist (pre-merge gate): ./implementation_checklist_v1.md
- Dev tasks (ticket plan + acceptance criteria): ./dev_tasks_v1.md
- Prompt pack (constraints + per-ticket prompts): ./prompt_pack_v1.md

2) “Locked” Non-Negotiables (Enforcement Rules)
Codex/Cursor/Antigravity must implement v1 with these constraints exactly:

Scope & Mode
- Two-channel / Sweet Spot only (single seat).
- Room geometry: rectangular + one opening element only.
- Band: 20–120 Hz only.

Top Problems
- Exactly 3 Top Problems shown (audibility-weighted, 30–80 prioritized).
- Problems are small regions (not single Hz).
- Must include Deep Bass Watchlist override if 20–30 is extreme.

Subwoofer
- Exactly one sub.
- Must support sealed + ported.
- Ported must include driver + port split near Fb and direction controls.
- Must include clearance sanity warnings.

Mains
- Simplified bass contributors only.
- Control: mains lowest strong bass (Hz).
- 80–120 is integration-sensitive and must be labeled/softened.

Treatments
- Snapped placements only.
- Tiers: Light/Medium/Heavy.
- Caps enforced (4 corner / 1 rear absorber / 6 panels / 2 tuned).
- Zone-based diminishing returns + tuned-trap overlap ±X logic.
- DR UI components required (impact preview, saturation/overlap meters, Best/OK/Limited, doubling tooltip).

Recommendations
- Exactly 3 actions per selected problem.
- Null honesty enforced (treatments not primary fix for severe nulls).
- Confidence-aware phrasing ladder enforced.

A/B
- Exactly two snapshots: A/B, with Lock A, Revert, and full compare view.

3) Build Order (Suggested Implementation Sequence)
Follow phases in this README plus the ticket breakdown in ./dev_tasks_v1.md.
Use ./implementation_checklist_v1.md as the merge gate.
- Phase 1 — Data Model + UI Skeleton
- Phase 2 — Snap Zones + Treatments
- Phase 3 — Analysis Engine v1
- Phase 4 — Fix This + Ghost Suggestions
- Phase 5 — Visualization (Heatmap + Ripple overlay)
- Phase 6 — A/B Snapshots + Compare
- Phase 7 — Defaults + Copy + Trust Polish

4) Codex / Cursor / Antigravity Usage Rules
Source-of-truth rule
These planning docs override model assumptions. If unsure, do not guess—add a note to update docs.

Use task tickets
Implement one ticket from ./dev_tasks_v1.md at a time, and verify acceptance criteria plus relevant sections of ./implementation_checklist_v1.md.

No scope creep
Do not add:
- multi-sub
- multiple openings
- couch averaging
- detailed crossover/phase/time alignment
- more than 3 Top Problems
- removal of treatment caps or diminishing returns

5) Verification Checklist (Quick)
Before merging:
- Does it match the PRD locked constraints?
- Are Top Problems exactly 3 and region-based?
- Are recommendations exactly 3 actions?
- Are nulls treated as cancellations (messaging + behavior)?
- Are treatment caps/DR enforced with required UI?
- Are A/B snapshots exactly two with compare view?
