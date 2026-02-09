# UI/UX Redesign Proposal: "The Studio Console"

## Objective
The primary goal is to **reorganize the frontend interface so that all key elements are visible "above the fold"** (without scrolling) on standard desktop displays. 
Currently, the "stack" regarding the right sidebar grows vertically, pushing important content off-screen and requiring scrolling to access controls or see results.

## Design Philosophy
We will maintain the **"Audiophile Journal"** aesthetic (Warm backgrounds, Serif typography, precise interactions) but shift from a "Document" layout (top-down) to a **"Console" layout** (dashboard/application).

## Proposed Layout: The Horizontal Control Deck

Instead of a single vertical sidebar, we will split the screen vertically into two main regions:
1.  **The Stage (Top ~50-60%)**: Dedicated to the visual representation (Room Canvas).
2.  **The Deck (Bottom ~40-50%)**: A multi-column control panel containing all inputs and metrics.

### 1. The Stage (Top Region)
-   **Header**: Slim bar at the very top with Logo/Title and global actions (Like "Export").
-   **Canvas**: The `RoomCanvas` remains the central hero. It can span the full width of the container.
-   **Overlay feedback**: Ripples and hover states remain.
-   **Quick Toggles**: Essentials like "Show Ripples" or "Snapshots A/B" can be small floating toggles on the canvas corner or part of the header.

### 2. The Deck (Bottom Region)
The bottom area is divided into **4 logical columns** (or a CSS Grid) to distribute the vertical height horizontally.

#### Column 1: Foundation (Setup)
*Focus: Defining the physical space.*
-   **Dimensions**: Length, Width, Height (Compact inputs).
-   **Units**: Toggle (Imperial/Metric).
-   **Constraints**: "Lock seat", "Allow nearfield".
-   **Openings**: List of openings with "Add" button. (Use a compact list or scrollable area if many).

#### Column 2: Acoustic Treatment & Objects
*Focus: What we put in the room.*
-   **Active Treatments**: List of traps/panels.
-   **Add Treatment**: Dropdown/Button to add new ones.
-   **Subwoofer/Mains**: Toggles for enabling/disabling or specific attributes if any.

#### Column 3: Analysis & Diagnostics
*Focus: What the simulation tells us.*
-   **Scorecard**: Large visible numbers for **Smoothness**, **Tightness**, **Confidence**.
-   **Problem List**: The "Top Problems" list. This should be a **scrollable list within this column** so it never pushes other UI off-screen.
    -   *Interaction*: Clicking a problem highlights it on the Stage (as it does now).

#### Column 4: Comparison & Management
*Focus: Iteration and saving.*
-   **Snapshots**: A distinct card for "Snapshot A" vs "Snapshot B".
-   **Compare Mode**: When active, shows the delta metrics here.
-   **History/Undo**: (If implemented later, lives here).

---

## Visual Mockup Structure (ASCII)

```text
+---------------------------------------------------------------+
|  Room Audio Simulator v1                             [Export] |  <-- Header
+---------------------------------------------------------------+
|                                                               |
|                                                               |
|                       [ ROOM CANVAS ]                         |  <-- Stage
|                     (Heatmap Visuals)                         |
|                                                               |
|                                                               |
+---------------------------------------------------------------+
|  SETUP       |  TREATMENTS  |  ANALYSIS      |  SNAPSHOTS     |  <-- Deck
|              |              |                |                |
|  L: [ 16.0]  |  [+] Add     |  Smooth: 61    |  [ Save A ]    |
|  W: [ 12.0]  |              |  Tight : 84    |  [ Load A ]    |
|  H: [  8.0]  |  * Can. Trap |                |                |
|              |  * R. Absorb |  [Problem 1]   |  [ Save B ]    |
|  [Openings]  |              |  [Problem 2]   |  [ Load B ]    |
|  * Door L    |              |  [Problem 3]   |  [ Lock A ]    |
|              |              |                |                |
+---------------------------------------------------------------+
```

## CSS/Implementation Strategy
-   **Container**: `height: 100vh; display: flex; flex-direction: column; overflow: hidden;`
-   **Stage**: `flex: 1; min-height: 0;` (Allows it to shrink if needed, but ideally fixed or flexible).
-   **Deck**: `height: 380px; flex-shrink: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; overflow-y: auto;`
    -   This ensures the controls are always visible at the bottom.
    -   On smaller screens, the grid can wrap to 2x2.

## Key Benefits
1.  **No Page Scroll**: The "Application" feel is enforced.
2.  **Context Preservation**: You can change a setting in Col 1 and immediately see the Result in Col 3 without looking away or scrolling up/down.
3.  **Density**: Makes better use of horizontal screen real estate which is often wasted in the current specific sidebar layout.

## Next Steps
If this proposal is approved, we will:
1.  Refactor `App.tsx` layout structure.
2.  Create `DeckColumn` components for the 4 sections.
3.  Adjust CSS to enforce the fixed viewport height.
