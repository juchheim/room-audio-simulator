UI Copy (v1) — Required Microcopy, Tooltips, and Warnings

This file defines the exact user-facing text fragments that must be used (or minimally paraphrased without changing meaning). This prevents AI-generated “creative” copy that violates truthfulness rules.

1) Core Definitions
“Lowest strong bass (Hz)” (Mains & Sealed Sub)
Label: Lowest strong bass (Hz)
Helper text:
“The lowest frequency that feels solid/authoritative, not just barely audible. If you’re not sure, pick a realistic value—this improves predictions.”
Quick picks: 20 / 25 / 30 / 35 / 40 / 50 / 60 (context-dependent list)
Not sure option text:
“Not sure (use a typical value)”

Ported “Fb (tuning frequency)”
Label: Fb (tuning frequency)
Helper text:
“Approximate port tuning. Near Fb, the port contributes strongly and placement/clearance matters more.”
Not sure option text:
“Not sure (use a typical value)”

2) Confidence Banner Copy (High/Medium/Low)
High:
“Confidence: High — room and inputs are well defined.”
Medium:
“Confidence: Medium — good directional guidance; results may vary with room openness and construction.”
Low:
“Confidence: Low — large opening/leakage or missing inputs. Use this as directional guidance and validate by ear/measurement.”

3) Problem Type Explanations
Null (Cancellation) Tooltip / Inline Note
“Nulls are cancellations. Small seat moves or sub placement changes can help. Treatments usually won’t fully ‘fill’ a severe null.”

Peak Tooltip / Inline Note
“Peaks are excess energy. They often respond well to sub placement changes and bass treatment, especially for reducing boom/ringing.”

Integration-sensitive Tag (80–120)
Tag text: Integration-sensitive
Tooltip:
“Upper bass (80–120 Hz) is sensitive to crossover/phase and speaker interaction. Treat results as directional guidance.”

4) Fixability Badges (Primary Lever)
Use exactly these badge labels:
- Seat Move
- Sub Move
- Add Treatment

5) Fix This — Recommendation Headers
Use these standardized headers (confidence-aware verbs are controlled by phrasing rules):

High confidence
“Best next move”
“If that’s impractical”
“Also consider”

Medium confidence
“Most likely improvement”
“Next best option”
“Also worth trying”

Low confidence
“Directional guidance”
“Worth testing”
“If you hear X, try Y”

6) Recommendation Fallback Copy
Banner title:
“No meaningful improvements found”

Banner body:
“Within current constraints, predicted gains are small. Try the options below.”

Low-impact pill:
“Impact: Low”

Low-impact why line:
“Below the meaningful-improvement threshold; worth testing.”

Fallback recommendation lines (exact):
“Close the door (test) to increase pressurization and raise confidence.”
“Unlock seat movement to allow micro-moves (often the only real fix for cancellations).”
“Allow nearfield sub suggestions to widen placement options.”
“Try an alternate sub mode/preset (e.g., sealed → Tight / ported → Balanced) to trade extension vs control.”
“Validate with a quick sub-crawl or a simple measurement sweep to confirm where the null/peak actually sits.”
“If you need larger gains than single-sub placement can deliver, consider a second sub or DSP/EQ (Future).”

7) Opening Copy
Opening label: Opening
Opening helper text:
“An opening reduces room pressurization and can change deep bass behavior.”
Open-plan warning (shown when selected):
“Open-plan openings often reduce deep bass pressurization and lower prediction confidence.”

8) Units Copy
Label: Units
Options:
“Imperial”
“Metric”

9) Constraints & Suggestions
Toggle label:
“Lock seat position”

Toggle label:
“Allow nearfield sub suggestions”

Seat locked note:
“Seat movement would help, but it’s locked.”

10) Clearance Warnings (Sub)
Port clearance warning
“Port clearance is tight. Near tuning (Fb), this can cause unpredictable boom or loss.”

Driver clearance warning
“Driver clearance is tight. Boundary loading may increase peaks and reduce tightness.”

Opening blockage warning
“This placement blocks the opening. Choose a different position.”

Invalid placement badge
“Needs attention”

Invalid placement CTA
“Fix placement”

11) Tuned Trap Diminishing Returns UI Copy (Locked)
Impact Preview card
Title: Expected benefit
Why line starter: “Why:”

Zone saturation meter
Label: “Zone saturation”
Values: Low / Medium / High

Frequency overlap meter
Label: “Frequency overlap”
Values: None / Some / Heavy

Doubling-up tooltip
“You’re doubling up in the same zone at a similar frequency. Expect strong diminishing returns.”

12) A/B Snapshot Copy
“Save A”
“Save B”
“Lock A”
“Revert to A”
Compare mapping labels:
“Resolved”
“New”

13) Export Copy
“Generate Plan (Export)”
“Download Project JSON”
“Download Plan (Markdown)”

14) “No False Precision” Copy Rule
Do not display:
- dB numbers on heatmaps
- “exact SPL” claims
- “this will fix it completely”
Use confidence-aware language and the null/peak honesty notes.
