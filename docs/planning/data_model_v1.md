Data Model (v1) — Entities, Fields, Enums

0. Coordinate System + Units (v1)
- Internal units: meters. All stored coordinates and distances are in meters.
- Project.units controls UI display only (imperial | metric).
- Origin (0,0) is the front-left corner of the room.
- x increases to the right; y increases toward the rear wall.
- Walls:
  - front wall: y = 0
  - rear wall: y = room length (depth)
  - left wall: x = 0
  - right wall: x = room width
- Direction mapping:
  - front = toward -y (toward front wall)
  - rear = toward +y (toward rear wall)
  - left = toward -x
  - right = toward +x
  - down = toward floor (affects clearance/UI only; no horizontal directivity in v1)
- Seat faces toward the front wall by default (toward -y). Mains are assumed to radiate toward the seat (simplified).

1. Project
- schemaVersion: "v1" (locked; used for migrations)
- projectId
- name
- units: imperial | metric (UI display only; values stored in meters)
- mode: two_channel_sweet_spot (v1 only)
- constraints:
  - seatLocked: boolean (default false)
  - allowNearfieldSuggestions: boolean (default false)
- createdAt, updatedAt

2. Room
- length
- width
- height
- opening: optional

Opening (one only; v1)
- wall: front | rear | left | right
- positionAlongWallNorm: normalized 0–1 (center position along wall)
- width (meters)
- type: doorway | hallway | open_plan
- doorState: open | closed (doorway only)
- clamp rule: center is clamped so span stays within wall bounds (no corner overlap)

3. Seat
- x, y (top-down coordinates, meters)
- (optional v1 hidden) earHeight defaulted

4. Speakers (Mains L/R) — Simplified
- enabled: boolean
- left: { x, y } (meters)
- right: { x, y } (meters)
- mainsLowestStrongBassHz: number
- notes: optional (for user)

5. Subwoofer (Single; v1)
- x, y (meters)
- mode: sealed | ported
- preset: enum (see presets doc)
- driverDirection: front | rear | left | right | down
- portDirection: front | rear | left | right | down | none
- lowestStrongBassHz: number (sealed only)
- fbHz: number (ported only)
- clearanceWarnings: derived list

6. Treatments
All treatments share:
- id
- type: corner_trap | rear_wall_absorber | thick_panel | tuned_trap
- strength: light | medium | heavy
- snapZoneId: references zone
- coveragePreset: standard (v1 only; reserved for future variants)

Tuned Trap extras
- targetHz: number
- bandOverlapState: derived using ±X rules vs other tuned traps in same zone

7. Snap Zones
Zones are derived from room geometry and opening:
- zoneId
- zoneType:
  - corner_front_left | corner_front_right | corner_rear_left | corner_rear_right
  - rear_wall_left | rear_wall_center | rear_wall_right | rear_wall_full
  - front_wall_left | front_wall_center | front_wall_right
  - left_wall_front | left_wall_rear
  - right_wall_front | right_wall_rear
- disabled: boolean (opening overlap)
- disabledReason: string (e.g., opening_overlap)
- suggestedForRegion: derived per selected problem region

Zone IDs (Locked)
- Wall thirds:
  - wall.front.left | wall.front.center | wall.front.right
  - wall.rear.left | wall.rear.center | wall.rear.right
  - wall.left.front | wall.left.rear
  - wall.right.front | wall.right.rear
- Full rear wall:
  - wall.rear.full
- Corners:
  - corner.front.left | corner.front.right | corner.rear.left | corner.rear.right
- Opening behavior: zones are disabled (not split) when overlapping the opening; IDs remain stable.

8. Geometry Constraints (Locked)
Nearfield keep-out geometry:
- Capsule corridor from midpoint(mains L/R) to seat with radius 0.60 m.
- Additional rectangle in front of mains midpoint:
  - depth: 0.50 m toward the seat
  - width: 1.20 m centered on the mains midpoint
Nearfield candidates are invalid if the sub center lies inside either region.

9. Analysis Outputs (Stored per state & snapshot)
Scores
- smoothnessScore: number (0–100)
- tightnessScore: number (0–100)
- confidenceLevel: high | medium | low
- confidenceScore: number (0–1, internal diagnostics)

Top Problems (3)
Each problem entry:
- kind: peak | null
- centerHz
- rangeHz: { low, high } (small region)
- severity: mild | moderate | severe
- fixabilityPrimary: seat_move | sub_move | add_treatment
- tags: array (can include integration_sensitive)
- deepBassWatchlist: boolean (or separate list)

10. Snapshots (A/B)
- slot: A | B
- locked: boolean (A only)
- state: serialized full model (room, seat, speakers, sub, treatments, constraints)
- analysisSummary: scores + confidenceLevel/confidenceScore + top problems + watchlist
- changeLog: derived (diff from previous save)
