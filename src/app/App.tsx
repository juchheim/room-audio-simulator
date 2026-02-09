import React from "react";
import { RoomCanvas, OPENING_COLORS } from "./RoomCanvas";
import { ControlDeck } from "./components/ControlDeck";
import { SetupPanel } from "./components/SetupPanel";
import { TreatmentsPanel } from "./components/TreatmentsPanel";
import { AnalysisPanel } from "./components/AnalysisPanel";
import { SnapshotsPanel } from "./components/SnapshotsPanel";
import type {
  Mains,
  Opening,
  Room,
  Seat,
  Subwoofer,
  Treatment,
  ProjectConstraints,
  Units,
} from "../domain/projectState";
import {
  createDefaultProjectState,
  MAX_OPENINGS,
  normalizeSubwooferForMode,
} from "../domain/projectState";
import { buildPlanMarkdown, buildProjectJson } from "../domain/export";
import type { Snapshot, SnapshotSlot } from "../domain/snapshots";
import {
  buildChangeLog,
  createSnapshot,
  matchTopProblems,
  restoreSnapshot,
} from "../domain/snapshots";
import { generateSnapZones } from "../domain/snapZones";
import {
  TREATMENT_CAPS,
  countTreatmentsByType,
  getEligibleZones,
  getTreatmentLabel,
  getTreatmentZone,
  isTreatmentCapReached,
  isTreatmentInvalid,
  type TreatmentStrength,
  type TreatmentType,
} from "../domain/treatments";
import { getSubwooferClearanceWarnings } from "../domain/clearanceWarnings";
import {
  analyzeProjectState,
  computeResponseCurve,
  type AnalysisResult,
  computeHeatmapGrid,
  type FixabilityPrimary,
  type GhostSubPlacement,
  generateGhostSubPlacements,
  generateRecommendations,
  generateSeatMicroMoves,
  type HeatmapRegion,
  getTreatmentZoneGuidance,
  getPortContributionForFrequency,
  type ResponseCurvePoint,
  type SeatMicroMove,
  type Severity,
  type TopProblem,
  type ZoneGuidance,
} from "../domain/analysis";

const TREATMENT_TYPES: TreatmentType[] = [
  "corner_trap",
  "rear_wall_absorber",
  "thick_panel",
  "tuned_trap",
];

const TREATMENT_STRENGTHS: TreatmentStrength[] = [
  "light",
  "medium",
  "heavy",
];

type SnapshotState = {
  A: Snapshot | null;
  B: Snapshot | null;
  lockA: boolean;
};

function formatSeverity(severity: Severity): string {
  return `${severity[0].toUpperCase()}${severity.slice(1)}`;
}

function formatFixabilityBadge(fixability: FixabilityPrimary): string {
  switch (fixability) {
    case "seat_move":
      return "Seat Move";
    case "sub_move":
      return "Sub Move";
    case "add_treatment":
      return "Add Treatment";
    default:
      return "Sub Move";
  }
}

function formatProblemLabel(problem: TopProblem): string {
  const kindLabel = problem.kind === "peak" ? "Peak" : "Null";
  const center = Math.round(problem.centerHz);
  const low = Math.round(problem.rangeHz.low);
  const high = Math.round(problem.rangeHz.high);
  return `${kindLabel} ~${center} (${low}-${high}) - ${formatSeverity(problem.severity)}`;
}

const RECOMMENDATION_HEADERS: Record<string, string[]> = {
  High: ["Best next move", "If that's impractical", "Also consider"],
  Medium: ["Most likely improvement", "Next best option", "Also worth trying"],
  Low: ["Directional guidance", "Worth testing", "If you hear X, try Y"],
};

function getRecommendationHeaders(confidenceLevel: string): string[] {
  return RECOMMENDATION_HEADERS[confidenceLevel] ?? RECOMMENDATION_HEADERS.Medium;
}

const CURVE_MIN_HZ = 20;
const CURVE_MAX_HZ = 120;
const CURVE_VIEWBOX_WIDTH = 240;
const CURVE_VIEWBOX_HEIGHT = 120;
const SCORE_BANDS = ["Poor", "Fair", "Good", "Excellent"] as const;
const DEFAULT_EXPORT_NAME = "room-audio-simulator";

const FEET_TO_METERS = 0.3048;
const METERS_TO_FEET = 1 / FEET_TO_METERS;

function metersToFeet(meters: number): number {
  return meters * METERS_TO_FEET;
}

function feetToMeters(feet: number): number {
  return feet * FEET_TO_METERS;
}

function displayValue(meters: number, units: Units): string {
  if (units === "imperial") {
    return metersToFeet(meters).toFixed(1);
  }
  return meters.toFixed(2);
}

function parseInputToMeters(value: string, units: Units): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  if (units === "imperial") {
    return feetToMeters(parsed);
  }
  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizePositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function clampToRoom(position: { x: number; y: number }, room: Room): {
  x: number;
  y: number;
} {
  return {
    x: clamp(position.x, 0, room.width),
    y: clamp(position.y, 0, room.length),
  };
}

function normalizeOpening(opening: Opening): Opening {
  const normalized = {
    ...opening,
    positionAlongWallNorm: clamp(opening.positionAlongWallNorm, 0, 1),
    width: sanitizePositive(opening.width, 0.01),
  };
  if (normalized.type === "doorway") {
    return {
      ...normalized,
      doorState: normalized.doorState ?? "open",
    };
  }
  return {
    ...normalized,
    doorState: undefined,
  };
}

const OPENING_PRESET_WIDTHS: Record<Opening["type"], number> = {
  doorway: 0.914, // 3 ft
  hallway: 1.219, // 4 ft
  open_plan: 2.438, // 8 ft
};

const OPENING_TYPE_LABELS: Record<Opening["type"], string> = {
  doorway: "Doorway",
  hallway: "Hallway",
  open_plan: "Open-plan",
};

const WALL_LABELS: Record<Opening["wall"], string> = {
  front: "Front",
  rear: "Rear",
  left: "Left",
  right: "Right",
};

function formatSignedNumber(value: number, decimals = 0): string {
  const rounded = Number(value.toFixed(decimals));
  const sign = rounded >= 0 ? "+" : "";
  return `${sign}${rounded.toFixed(decimals)}`;
}

function buildCurvePath(
  points: ResponseCurvePoint[],
  minResponse: number,
  maxResponse: number,
): string {
  if (points.length === 0) {
    return "";
  }
  const range = maxResponse - minResponse || 1;
  return points
    .map((point, index) => {
      const x =
        ((point.frequency - CURVE_MIN_HZ) / (CURVE_MAX_HZ - CURVE_MIN_HZ)) *
        CURVE_VIEWBOX_WIDTH;
      const y =
        CURVE_VIEWBOX_HEIGHT -
        ((point.response - minResponse) / range) * CURVE_VIEWBOX_HEIGHT;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function getBandIndex(band: string): number {
  const index = SCORE_BANDS.indexOf(band as (typeof SCORE_BANDS)[number]);
  return index >= 0 ? index : 0;
}

function sanitizeFileBaseName(name: string): string {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || DEFAULT_EXPORT_NAME;
}

function downloadFile(contents: string, filename: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function App(): React.ReactElement {
  const [state, setState] = React.useState(() => createDefaultProjectState());
  const [selectedProblemId, setSelectedProblemId] = React.useState<string | null>(
    null,
  );
  const previousAnalysisRef = React.useRef<AnalysisResult | null>(null);
  const [snapshots, setSnapshots] = React.useState<SnapshotState>({
    A: null,
    B: null,
    lockA: false,
  });
  const [exportMenu, setExportMenu] = React.useState<"results" | "compare" | null>(
    null,
  );
  const [editingTreatmentId, setEditingTreatmentId] = React.useState<string | null>(
    null,
  );

  const addTreatment = React.useCallback(
    (
      type: TreatmentType,
      strength: TreatmentStrength,
      zoneId: string,
      targetHz: number,
    ) => {
      if (!zoneId || isTreatmentCapReached(type, state.treatments)) {
        return;
      }

      const id =
        typeof globalThis.crypto?.randomUUID === "function"
          ? globalThis.crypto.randomUUID()
          : `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

      const base: Treatment = {
        id,
        type,
        strength,
        snapZoneId: zoneId,
        coveragePreset: "standard",
        ...(type === "tuned_trap" ? { targetHz: Math.max(20, targetHz) } : {}),
      };

      setState((prev) => ({
        ...prev,
        treatments: [...prev.treatments, base],
        updatedAt: new Date().toISOString(),
      }));
    },
    [state.treatments],
  );

  const updateTreatment = React.useCallback(
    (id: string, updates: Partial<Treatment>) => {
      setState((prev) => ({
        ...prev,
        treatments: prev.treatments.map((treatment) =>
          treatment.id === id ? { ...treatment, ...updates } : treatment,
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  const removeTreatment = React.useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      treatments: prev.treatments.filter((treatment) => treatment.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateSeat = React.useCallback((seat: Seat) => {
    setState((prev) => ({
      ...prev,
      seat,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateMains = React.useCallback((mains: Mains) => {
    setState((prev) => ({
      ...prev,
      mains,
      updatedAt: new Date().toISOString(),
    }));
  }, []);


  const updateSubwoofer = React.useCallback((subwoofer: Subwoofer) => {
    // Clear analysis history whenever sub changes to avoid stale hysteresis artifacts.
    previousAnalysisRef.current = null;
    const normalized = normalizeSubwooferForMode(subwoofer);
    setState((prev) => ({
      ...prev,
      subwoofer: normalized,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateRoom = React.useCallback(
    (updates: Partial<Room>) => {
      previousAnalysisRef.current = null;
      setState((prev) => {
        const mergedRoom = { ...prev.room, ...updates };
        const normalizedRoom: Room = {
          ...mergedRoom,
          width: sanitizePositive(mergedRoom.width, prev.room.width),
          length: sanitizePositive(mergedRoom.length, prev.room.length),
          height: sanitizePositive(mergedRoom.height, prev.room.height),
          openings: mergedRoom.openings.map(normalizeOpening),
        };

        return {
          ...prev,
          room: normalizedRoom,
          seat: clampToRoom(prev.seat, normalizedRoom),
          mains: {
            ...prev.mains,
            left: clampToRoom(prev.mains.left, normalizedRoom),
            right: clampToRoom(prev.mains.right, normalizedRoom),
          },
          subwoofer: {
            ...prev.subwoofer,
            ...clampToRoom(prev.subwoofer, normalizedRoom),
          },
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [],
  );

  const updateUnits = React.useCallback((units: Units) => {
    setState((prev) => ({
      ...prev,
      units,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const generateOpeningId = React.useCallback((): string => {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const addOpening = React.useCallback(() => {
    previousAnalysisRef.current = null;
    setState((prev) => {
      if (prev.room.openings.length >= MAX_OPENINGS) {
        return prev;
      }
      const newOpening: Opening = {
        id: generateOpeningId(),
        wall: "rear",
        positionAlongWallNorm: 0.5,
        width: OPENING_PRESET_WIDTHS.doorway,
        type: "doorway",
        doorState: "open",
      };
      return {
        ...prev,
        room: {
          ...prev.room,
          openings: [...prev.room.openings, newOpening],
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [generateOpeningId]);

  const updateOpening = React.useCallback(
    (id: string, updates: Partial<Opening>) => {
      previousAnalysisRef.current = null;
      setState((prev) => {
        const openings = prev.room.openings.map((opening) => {
          if (opening.id !== id) {
            return opening;
          }
          return normalizeOpening({ ...opening, ...updates });
        });
        return {
          ...prev,
          room: {
            ...prev.room,
            openings,
          },
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [],
  );

  const removeOpening = React.useCallback((id: string) => {
    previousAnalysisRef.current = null;
    setState((prev) => ({
      ...prev,
      room: {
        ...prev.room,
        openings: prev.room.openings.filter((opening) => opening.id !== id),
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateConstraints = React.useCallback(
    (updates: Partial<ProjectConstraints>) => {
      setState((prev) => ({
        ...prev,
        constraints: { ...prev.constraints, ...updates },
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  const toggleLockA = React.useCallback((locked: boolean) => {
    setSnapshots((prev) => ({
      ...prev,
      lockA: locked,
      A: prev.A ? { ...prev.A, locked } : prev.A,
    }));
  }, []);

  const analysis = React.useMemo(() => {
    const previousAnalysis = previousAnalysisRef.current ?? undefined;
    const base = analyzeProjectState(state, { previousAnalysis });
    if (!selectedProblemId) {
      return base;
    }
    const selected = base.topProblems.find(
      (problem) => problem.id === selectedProblemId,
    );
    if (!selected || !selected.tags.includes("integration_sensitive")) {
      return base;
    }
    return analyzeProjectState(state, {
      previousAnalysis,
      selectedBandHz: selected.rangeHz,
    });
  }, [state, selectedProblemId]);

  React.useEffect(() => {
    previousAnalysisRef.current = analysis;
  }, [analysis]);

  const saveSnapshot = React.useCallback(
    (slot: SnapshotSlot) => {
      setSnapshots((prev) => {
        if (slot === "A" && prev.lockA && prev.A) {
          return prev;
        }
        const baseline =
          slot === "B" && prev.A
            ? restoreSnapshot(prev.A)
            : slot === "A" && prev.A
              ? restoreSnapshot(prev.A)
              : slot === "B" && prev.B
                ? restoreSnapshot(prev.B)
                : null;
        const changeLog = baseline ? buildChangeLog(baseline, state) : undefined;
        const snapshot = createSnapshot(
          slot,
          state,
          analysis,
          slot === "A" ? prev.lockA : false,
          changeLog,
        );
        return {
          ...prev,
          [slot]: snapshot,
        };
      });
    },
    [analysis, state],
  );

  const loadSnapshot = React.useCallback(
    (slot: SnapshotSlot) => {
      const snapshot = slot === "A" ? snapshots.A : snapshots.B;
      if (!snapshot) {
        return;
      }
      try {
        const restored = restoreSnapshot(snapshot);
        previousAnalysisRef.current = null;
        setState(restored);
      } catch (error) {
        console.error("Failed to restore snapshot:", error);
      }
    },
    [snapshots],
  );

  const applyGhostSubPlacement = React.useCallback(
    (placement: GhostSubPlacement) => {
      setState((prev) => ({
        ...prev,
        subwoofer: { ...prev.subwoofer, x: placement.x, y: placement.y },
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  const applySeatMove = React.useCallback((move: SeatMicroMove) => {
    setState((prev) => ({
      ...prev,
      seat: { x: move.x, y: move.y },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const toggleMainsEnabled = React.useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      mains: {
        ...prev.mains,
        enabled,
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const snapZones = React.useMemo(
    () => generateSnapZones(state.room, state.room.openings),
    [state.room, state.room.openings],
  );

  const treatmentCounts = React.useMemo(
    () => countTreatmentsByType(state.treatments),
    [state.treatments],
  );

  const invalidTreatmentIds = React.useMemo(() => {
    const invalid = state.treatments
      .filter((treatment) => isTreatmentInvalid(treatment, snapZones))
      .map((treatment) => treatment.id);
    return new Set(invalid);
  }, [snapZones, state.treatments]);

  const subWarnings = React.useMemo(
    () =>
      getSubwooferClearanceWarnings(
        state.room,
        state.room.openings,
        state.subwoofer,
      ),
    [state.room, state.subwoofer],
  );

  React.useEffect(() => {
    if (!analysis.topProblems.some((problem) => problem.id === selectedProblemId)) {
      setSelectedProblemId(null);
    }
  }, [analysis.topProblems, selectedProblemId]);

  const selectedProblem = analysis.topProblems.find(
    (problem) => problem.id === selectedProblemId,
  );
  const recommendationSet = React.useMemo(() => {
    if (!selectedProblem) {
      return null;
    }
    return generateRecommendations(state, selectedProblem);
  }, [selectedProblem, state]);
  const recommendationHeaders = React.useMemo(
    () => getRecommendationHeaders(analysis.confidenceLevel),
    [analysis.confidenceLevel],
  );
  const ghostSubPlacements = React.useMemo(
    () =>
      selectedProblem ? generateGhostSubPlacements(state, selectedProblem) : [],
    [selectedProblem, state],
  );
  const ghostSeatMoves = React.useMemo(
    () =>
      selectedProblem ? generateSeatMicroMoves(state, selectedProblem) : [],
    [selectedProblem, state],
  );
  const treatmentZoneGuidance = React.useMemo<ZoneGuidance | null>(() => {
    if (!selectedProblem || !recommendationSet) {
      return null;
    }
    const treatmentRec = recommendationSet.recommendations.find(
      (rec) => rec.kind === "add_treatment" && rec.treatment,
    );
    if (!treatmentRec?.treatment) {
      return null;
    }
    return getTreatmentZoneGuidance(
      selectedProblem,
      treatmentRec.treatment.type,
      snapZones,
    );
  }, [recommendationSet, selectedProblem, snapZones]);
  const visualizationProblem = selectedProblem ?? analysis.topProblems[0];
  const heatmapRegion = React.useMemo<HeatmapRegion>(() => {
    if (visualizationProblem) {
      return visualizationProblem.rangeHz;
    }
    return { low: 60, high: 65 };
  }, [visualizationProblem]);
  const heatmap = React.useMemo(
    () => computeHeatmapGrid(state, heatmapRegion),
    [heatmapRegion, state],
  );
  const heatmapCenterHz = (heatmapRegion.low + heatmapRegion.high) / 2;
  const portContributionLabel = React.useMemo(() => {
    const contribution =
      visualizationProblem?.portContribution ??
      getPortContributionForFrequency(state, heatmapCenterHz);
    if (!contribution || state.subwoofer.mode !== "ported") {
      return null;
    }
    return contribution.dominance === "port"
      ? "Near tuning: Port dominates"
      : "Above tuning: Driver dominates";
  }, [heatmapCenterHz, state, visualizationProblem]);

  const compareData = React.useMemo(() => {
    if (!snapshots.A || !snapshots.B) {
      return null;
    }
    const stateA = restoreSnapshot(snapshots.A);
    const stateB = restoreSnapshot(snapshots.B);
    const matches = matchTopProblems(
      snapshots.A.analysis.topProblems,
      snapshots.B.analysis.topProblems,
    );
    const changeLog = buildChangeLog(stateA, stateB);
    const curveA = computeResponseCurve(stateA);
    const curveB = computeResponseCurve(stateB);
    return {
      stateA,
      stateB,
      matches,
      changeLog,
      curveA,
      curveB,
    };
  }, [snapshots]);

  const compareCurveScale = React.useMemo(() => {
    if (!compareData) {
      return null;
    }
    const values = [...compareData.curveA, ...compareData.curveB].map(
      (point) => point.response,
    );
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 1;
    }
    if (max - min < 0.1) {
      const mid = (min + max) / 2;
      min = Math.max(0, mid - 0.1);
      max = Math.min(1, mid + 0.1);
    }
    return { min, max };
  }, [compareData]);

  const compareMetrics = React.useMemo(() => {
    if (!snapshots.A || !snapshots.B) {
      return null;
    }
    const a = snapshots.A.analysis;
    const b = snapshots.B.analysis;
    return {
      a,
      b,
      smoothnessDelta: b.smoothnessScore - a.smoothnessScore,
      tightnessDelta: b.tightnessScore - a.tightnessScore,
      confidenceDelta: b.confidenceScore - a.confidenceScore,
    };
  }, [snapshots]);

  const curvePathA = React.useMemo(() => {
    if (!compareData || !compareCurveScale) {
      return "";
    }
    return buildCurvePath(
      compareData.curveA,
      compareCurveScale.min,
      compareCurveScale.max,
    );
  }, [compareCurveScale, compareData]);

  const curvePathB = React.useMemo(() => {
    if (!compareData || !compareCurveScale) {
      return "";
    }
    return buildCurvePath(
      compareData.curveB,
      compareCurveScale.min,
      compareCurveScale.max,
    );
  }, [compareCurveScale, compareData]);

  const exportBaseName = React.useMemo(
    () => sanitizeFileBaseName(state.name),
    [state.name],
  );

  const exportCompareSummary = React.useMemo(() => {
    if (!compareMetrics || !compareData) {
      return undefined;
    }
    return {
      a: compareMetrics.a,
      b: compareMetrics.b,
      changeLog: compareData.changeLog,
    };
  }, [compareData, compareMetrics]);

  const toggleExportMenu = React.useCallback(
    (location: "results" | "compare") => {
      setExportMenu((prev) => (prev === location ? null : location));
    },
    [],
  );

  const handleExportProjectJson = React.useCallback(() => {
    try {
      const contents = buildProjectJson(state);
      downloadFile(contents, `${exportBaseName}-project.json`, "application/json");
      setExportMenu(null);
    } catch (error) {
      console.error("Failed to export project JSON:", error);
    }
  }, [exportBaseName, state]);

  const handleExportPlanMarkdown = React.useCallback(() => {
    try {
      const contents = buildPlanMarkdown(state, analysis, {
        now: new Date(),
        compareSummary: exportCompareSummary,
      });
      downloadFile(contents, `${exportBaseName}-plan.md`, "text/markdown");
      setExportMenu(null);
    } catch (error) {
      console.error("Failed to export plan markdown:", error);
    }
  }, [analysis, exportBaseName, exportCompareSummary, state]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div>
          <h1>Room Audio Simulator</h1>
          <p>v1 — two-channel sweet spot bass simulator</p>
        </div>
        <div>
          <button
            type="button"
            className="deck-button secondary"
            onClick={() => handleExportPlanMarkdown()}
          >
            Export Plan
          </button>
        </div>
      </header>

      <div className="stage-area">
        <RoomCanvas
          room={state.room}
          openings={state.room.openings}
          snapZones={snapZones}
          seat={state.seat}
          mains={state.mains}
          subwoofer={state.subwoofer}
          treatments={state.treatments}
          invalidTreatmentIds={invalidTreatmentIds}
          heatmap={heatmap}
          heatmapRegion={heatmapRegion}
          portContributionLabel={portContributionLabel ?? undefined}
          ghostSubPlacements={ghostSubPlacements}
          ghostSeatMoves={ghostSeatMoves}
          zoneGuidance={treatmentZoneGuidance ?? undefined}
          onSeatChange={updateSeat}
          onMainsChange={updateMains}
          onSubwooferChange={updateSubwoofer}
          onApplyGhostSubPlacement={applyGhostSubPlacement}
          onApplySeatMove={applySeatMove}
        />
      </div>

      <ControlDeck>
        <SetupPanel
          room={state.room}
          units={state.units}
          constraints={state.constraints}
          onUpdateRoom={updateRoom}
          onUpdateUnits={updateUnits}
          onUpdateConstraints={updateConstraints}
          onAddOpening={addOpening}
          onUpdateOpening={updateOpening}
          onRemoveOpening={removeOpening}
        />
        <TreatmentsPanel
          treatments={state.treatments}
          snapZones={snapZones}
          subwoofer={state.subwoofer}
          mains={state.mains}
          subWarnings={subWarnings}
          invalidTreatmentIds={invalidTreatmentIds}
          onAddTreatment={addTreatment}
          onUpdateTreatment={updateTreatment}
          onRemoveTreatment={removeTreatment}
          onUpdateSubwoofer={updateSubwoofer}
          onUpdateMains={updateMains}
        />
        <AnalysisPanel
          analysis={analysis}
          selectedProblemId={selectedProblemId}
          onSelectProblem={setSelectedProblemId}
        />
        <SnapshotsPanel
          snapshots={snapshots}
          onSaveSnapshot={saveSnapshot}
          onLoadSnapshot={loadSnapshot}
          onToggleLockA={toggleLockA}
        />
      </ControlDeck>
    </div>
  );
}
