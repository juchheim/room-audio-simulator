Simulation Assumptions (v1) — Truthfulness and Constraints

1. Philosophy (v1)
v1 is a directional, decision-support simulation, not a lab instrument. It must:
- get relative ranking and trend direction correct,
- be honest about what’s uncertain,
- avoid false precision.

2. Frequency Scope
- Primary simulation scope: 20–120 Hz
- Default emphasis: 30–80 Hz (most audible for two-channel music bass)
- 80–120: marked Integration-sensitive
- 20–30: de-emphasized unless Deep Bass Watchlist triggers

3. Room Geometry Scope
- Rectangular room with height.
- One opening element is modeled as a lossy/leaky wall segment, primarily affecting:
  - pressurization (reduced room gain),
  - modal Q (softened peaks, shorter ringing),
  - confidence reduction when large/open-plan.
- Opening leakage factor (L) by type/state (locked):
  - doorway closed: L = 0.15
  - doorway open: L = 0.35
  - hallway: L = 0.55
  - open_plan: L = 0.80
- No adjacent-room geometry is modeled in v1.

4. Modal Behavior Representation (Conceptual)
v1 uses a hybrid heuristic model (modal intuition + boundary loading + leakage factor + treatment damping). It is directional, not FEM-grade.
v1 should represent bass behavior primarily via:
- standing-wave/modal-like patterns,
- pressure/energy distributions in top-down view.
v1 is not a high-frequency ray tracer. “Waves bouncing” in the UI should be expressed as:
- pressure/energy heatmaps,
- subtle animated “ripples” as a teaching/intuition layer,
not literal geometric reflections.

5. Sources
5.1 Subwoofer (Sealed)
Defined by:
- position
- orientation (driver direction)
- “lowest strong bass (Hz)” that controls available low-end energy and rolloff shape
- preset shaping (Tight/Balanced/Warm/Room-Filling)

5.2 Subwoofer (Ported)
Defined by:
- position
- driver direction
- port direction
- Fb (tuning frequency)
- preset shaping
Locked richer model: near tuning, model driver and port as separate outputs with different dominance across frequency.
Must include port/driver clearance sanity warnings.
Near-Fb definition (locked):
- Near Fb band: 0.8×Fb to 1.2×Fb
- Dominance crossfade span: 0.7×Fb to 1.4×Fb

5.3 Mains (Simplified)
Two sources (L and R) with:
- position
- “lowest strong bass (Hz)” rolloff
No explicit crossover alignment in v1.
Any results in 80–120 should be treated as more uncertain.

6. Treatments (Interactive) — What They Can and Cannot Do
6.1 What treatments change (v1)
Treatments primarily:
- reduce peak severity,
- reduce ringing/decay (“tightness”),
- slightly smooth response.

6.2 What treatments do not do (v1 honesty rule)
Treatments do not reliably fill deep nulls (cancellation).
v1 must avoid “treatments fix severe null” outputs.

6.3 Treatment effectiveness tiers
Light/Medium/Heavy tiers represent realistic classes of build without specifying exact thickness.
They must be:
- frequency-dependent (heavy reaches lower than light),
- subject to diminishing returns,
- more effective at reducing ringing than raising nulls.

7. Diminishing Returns (Locked)
Zone-based diminishing returns are the default model.
For tuned traps:
- Strong DR: same zone + overlapping target ±X Hz band
- Small DR: same zone + different target band
- Minimal DR: different zones
Overlap detection is simple (±5 heavy / ±10 some / >10 none).

8. Outputs Must Reflect Uncertainty
Every state yields:
- Smoothness score
- Tightness score
- Confidence level
Confidence is lowered by:
- large/open-plan opening,
- missing/unknown device inputs,
- analysis focus in 80–120 region.

9. “Small Regions” (Locked)
Problems and scoring operate on bands, not single Hz:
- 20–40: ~3–5 Hz regions
- 40–80: ~5–8 Hz regions
- 80–120: ~8–12 Hz regions
All fix scoring (seat moves, sub moves, treatments) uses region improvement, not single frequency bins.

10. Meaningful Improvement Gates (Locked)
Use deterministic thresholds to avoid noisy suggestions:
- Primary: region severity improves by >= 1 tier.
- Fallback: RegionDeviationDelta >= 2.0 AND SmoothnessDelta >= +3.0.
- Seat micro-moves require the primary or fallback plus 2 of 3 improvements:
  - RegionDeviationDelta >= 2.0
  - SmoothnessDelta >= +3.0
  - Top Problems rank improves (moves up or drops out)
- Ghost sub placements are eligible only if:
  - severity tier improves, or
  - RegionDeviationDelta >= 2.5 AND SmoothnessDelta >= +4.0.
