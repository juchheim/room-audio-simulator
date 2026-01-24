Prompt Pack Notes (v1) — How to Run Codex/Antigravity/Cursor Without Drift

This document explains the workflow for using /docs/planning/prompt_pack_v1.md effectively while enforcing all locked decisions.

1) The “One Ticket” Rule
Run one task at a time from /docs/planning/dev_tasks_v1.md.
Why: When you bundle tasks, models:
- invent missing decisions,
- introduce scope creep,
- “optimize” away invariants (Top Problems = 3, caps, etc.).
Practice:
- Pick the next task ID (e.g., TASK 2.2).
- Paste the corresponding prompt from prompt_pack_v1.md.
- Include the Hard Constraints block.
- Review output against acceptance criteria for that task.

2) Always Anchor to the Canon Docs
Before each run, include a short “Doc Anchor” line in your prompt:
Add this line:
“Doc anchor: follow /docs/planning/PRD.md, data_model_v1.md, ux_flows_v1.md, and any doc referenced by this task.”
This prevents the model from treating older files or assumptions as primary.

3) Prevent Silent Spec Changes
Do not allow AI to “adjust the spec” in code.
If AI says:
- “I tweaked the number of Top Problems…”
- “I added a second opening…”
- “I added multi-seat averaging…”
- “I removed caps because…”
…that’s a hard reject.
Rule: Spec changes must be made in planning docs first, intentionally.

4) How to Use Snapshots A/B During Development
Even before Phase 6, you can adopt an internal discipline:
- Keep a “baseline scenario” room saved as a JSON fixture.
- Each task should not break the ability to load the baseline state.
When Phase 6 is built, use A/B for dogfooding:
- Save A: baseline
- Try change
- Save B
- Compare deltas
This reinforces the product’s intent while building.

5) What to Do When a Decision Is Missing
If the model asks:
- “What should X be?”
- “Should we use Y or Z?”
…and the planning docs don’t specify:
Do not answer ad-hoc in code.
Instead:
- Add a TODO in code where needed (temporary),
- Update the relevant planning doc, then
- rerun the task prompt.
This keeps Codex/Antigravity from “choosing for you.”

6) Enforcing Invariants (Repeat These Often)
After each task, explicitly verify these invariants:
Hard invariants
- Exactly 3 Top Problems (or “No major issues” state)
- Exactly 3 recommendations in Fix This
- Exactly one sub
- Exactly one opening
- 20–120 Hz only
- Treatments snapped + caps + diminishing returns
- seatLocked suppresses seat moves; allowNearfieldSuggestions gates nearfield candidate
Truthfulness invariants
- Null honesty always (no “treatment fills a null”)
- 80–120 labeled integration-sensitive
- Heatmap relative only (no dB)
- Ripples are teaching-only (no reflection arrows)
- Meaningful improvement thresholds are enforced (see scoring_and_confidence_v1.md)
Use /docs/planning/implementation_checklist_v1.md as the full gate.

7) Review Pattern for AI Output
When a task completes, review in this order:
- File list: Are changes localized to what the task requires?
- Acceptance criteria: Check each box for the task.
- Invariants: Verify no violations.
- Copy enforcement: Ensure text comes from ui_copy_v1.md.
- Diff scan: Look for “bonus features” (reject them).

8) How to Prompt for Fixes (If AI Drifted)
If AI partially implemented correctly but drifted, do not re-run the whole prompt unchanged. Use a correction prompt:
Template:
“Fix only the following issues. Do not change anything else. Confirm invariants after the change.”
Then list 3–7 bullet issues.

9) When to Update Planning Docs
Update planning docs only when:
- you intentionally expand scope,
- you refine UI copy,
- you clarify ambiguous behavior discovered during implementation.
Never update planning docs as a side effect of a code run.

10) Model-Specific Tips
Cursor AI
- Best for incremental edits and refactors.
- Use it to implement tasks directly in the repo with tight constraints.
Codex
- Best for implementing a whole task with cohesive file changes.
- Always paste Hard Constraints + Doc Anchor.
Google Antigravity
- Treat like Codex: strict constraint block, one task at a time.
- If it’s verbose, force it to return only:
  - file list
  - notes
  - TODO list

11) “Stop Conditions” (When to Pause and Re-Spec)
Pause and update planning docs if you see:
- unstable Top Problems (thrashing)
- confusing heatmap interpretation
- recommendations that feel untrue or too confident
- treatment benefits that seem exaggerated
These are trust-critical. Fix spec clarity before continuing.

12) Recommended Development Rhythm
- Build 2–4 tasks
- Run minimum smoke test (from test_plan_v1.md)
- Quick dogfood pass
- Continue
Do not wait until the end to test “trust feel.”

End of notes.
