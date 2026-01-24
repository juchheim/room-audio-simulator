Visualization Spec (v1) — Honest, Useful “Waves” in 2D

1) Purpose
The visualization must help users understand and fix bass issues from 20–120 Hz in a top-down room view, without implying false physics precision. v1 does not do high-frequency ray tracing. “Waves” are represented as pressure/energy patterns, not literal reflection paths.

2) Core Display Layers (Locked for v1)
v1 has three visualization layers. Users can toggle them, but defaults are locked.

Layer A — Pressure/Energy Heatmap (Primary)
Shows spatial distribution of relative bass energy/pressure for a selected frequency region.
This is the main “where is bass strong/weak” view.
Default: displayed for the currently selected problem region or “Most Audible” region.
Color meaning (no absolute dB claims):
- High = stronger predicted bass energy
- Low = weaker predicted bass energy (potential null zones)
Honesty note: This is a proxy map, not a measured SPL map.

Layer B — Ripple Overlay (Secondary, teaching layer)
Subtle animated expanding rings from sources to communicate “waves exist,” but not used for numeric interpretation.
Ripples do NOT attempt to show geometric reflections.
Ripple amplitude can be modulated by heatmap intensity to avoid contradiction.
Default: ON at low intensity for first-time users, then remembers user preference.

Layer C — Problem Region Highlighting (UI overlay)
When a Top Problem is selected, highlight:
- the problem region band (e.g., 60–65 Hz)
- and the seat readout for that region (e.g., “Severe null”)
When “Fix This” is active, show:
- ghost placements (sub and/or seat)
- highlighted snap zones for recommended treatments (Best/OK/Limited)

3) Frequency Control UI (Locked behavior)
Users interact with frequency as regions, not single Hz (locked).
Modes:
- Most Audible (default): automatically selects the most relevant region to display based on Top Problems and audibility weighting.
- Selected Problem: switches heatmap to that problem region.
- Manual Explore: user selects a region via a slider/stepper.
Region display
Always show both:
- label: ~63 Hz
- range: (60–65 Hz)

4) Source Contribution Visualization (Sub: Port vs Driver)
When sub mode is ported, and the current view region is near Fb:
show a small “Contribution” pill near the sub icon:
- “Near tuning: Port dominates”
- “Above tuning: Driver dominates”
If user rotates port direction, the contribution pill remains, but the spatial pattern changes.
Do not show separate full heatmaps for port vs driver in v1 (too complex).
Instead: use one combined heatmap plus the contribution pill.

5) Seat Readout (Locked)
At the seat position, show:
- current region severity (mild/moderate/severe)
- fixability badge (Seat Move/Sub Move/Add Treatment)
- integration-sensitive tag if in 80–120
Example:
“Null ~63 (60–65) — Severe • Seat Move”

6) Treatment Visualization (Locked)
When treatments are placed:
- show treatment icons snapped to zones
zones can glow when:
- hovering a treatment type
- in Fix This mode (Best/OK/Limited)
diminishing returns UI appears in the side panel, not on the map (map stays clean)

7) A/B Compare Visualization (Locked)
Compare view shows:
- Two curves (A and B) for 20–120 with shaded problem regions
Optional heatmap toggle:
- “View A heatmap / View B heatmap”
Defaults to curves + problems mapping (heatmaps are optional to avoid clutter)

8) “No False Precision” Rules
- Never label heatmap values in dB.
- Never draw reflection arrows that imply exact bounce paths.
- If confidence is Low, show a small banner:
  “Lower confidence due to opening/leakage or missing inputs — use as directional guidance.”
