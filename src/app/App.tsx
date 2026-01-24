import React from "react";
import { RoomCanvas } from "./RoomCanvas";
import type {
  Mains,
  Room,
  Seat,
  Subwoofer,
  Treatment,
  ProjectConstraints,
  Units,
} from "../domain/projectState";
import { createDefaultProjectState } from "../domain/projectState";
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
  const [showRipples, setShowRipples] = React.useState(true);
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
  const [newTreatmentType, setNewTreatmentType] =
    React.useState<TreatmentType>("corner_trap");
  const [newTreatmentStrength, setNewTreatmentStrength] =
    React.useState<TreatmentStrength>("medium");
  const [newTreatmentTargetHz, setNewTreatmentTargetHz] =
    React.useState<number>(63);
  const [newTreatmentZoneId, setNewTreatmentZoneId] = React.useState<string>("");

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
    // Clear analysis history when subwoofer position changes
    // to prevent hysteresis from keeping severity levels locked
    previousAnalysisRef.current = null;
    setState((prev) => ({
      ...prev,
      subwoofer,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateRoom = React.useCallback(
    (updates: Partial<Room>) => {
      previousAnalysisRef.current = null;
      setState((prev) => ({
        ...prev,
        room: { ...prev.room, ...updates },
        updatedAt: new Date().toISOString(),
      }));
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
      previousAnalysisRef.current = null;
      setState(restoreSnapshot(snapshot));
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
    () => generateSnapZones(state.room, state.room.opening ?? null),
    [state.room, state.room.opening],
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
        state.room.opening ?? null,
        state.subwoofer,
      ),
    [state.room, state.subwoofer],
  );

  const eligibleZones = React.useMemo(
    () => getEligibleZones(newTreatmentType, snapZones),
    [newTreatmentType, snapZones],
  );

  React.useEffect(() => {
    if (!eligibleZones.some((zone) => zone.id === newTreatmentZoneId)) {
      setNewTreatmentZoneId(eligibleZones[0]?.id ?? "");
    }
  }, [eligibleZones, newTreatmentZoneId]);

  React.useEffect(() => {
    if (!analysis.topProblems.some((problem) => problem.id === selectedProblemId)) {
      setSelectedProblemId(null);
    }
  }, [analysis.topProblems, selectedProblemId]);

  const addTreatment = React.useCallback(() => {
    if (!newTreatmentZoneId || isTreatmentCapReached(newTreatmentType, state.treatments)) {
      return;
    }

    const id = typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `tr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const base: Treatment = {
      id,
      type: newTreatmentType,
      strength: newTreatmentStrength,
      snapZoneId: newTreatmentZoneId,
      coveragePreset: "standard",
      ...(newTreatmentType === "tuned_trap"
        ? { targetHz: Math.max(20, newTreatmentTargetHz) }
        : {}),
    };

    setState((prev) => ({
      ...prev,
      treatments: [...prev.treatments, base],
      updatedAt: new Date().toISOString(),
    }));
  }, [
    newTreatmentStrength,
    newTreatmentTargetHz,
    newTreatmentType,
    newTreatmentZoneId,
    state.treatments,
  ]);

  const updateTreatment = React.useCallback(
    (id: string, updater: (treatment: Treatment) => Treatment) => {
      setState((prev) => ({
        ...prev,
        treatments: prev.treatments.map((treatment) =>
          treatment.id === id ? updater(treatment) : treatment,
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
    () => (selectedProblem ? generateGhostSubPlacements(state, selectedProblem) : []),
    [selectedProblem, state],
  );
  const ghostSeatMoves = React.useMemo(
    () => (selectedProblem ? generateSeatMicroMoves(state, selectedProblem) : []),
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
    const contents = buildProjectJson(state);
    downloadFile(contents, `${exportBaseName}-project.json`, "application/json");
    setExportMenu(null);
  }, [exportBaseName, state]);

  const handleExportPlanMarkdown = React.useCallback(() => {
    const contents = buildPlanMarkdown(state, analysis, {
      now: new Date(),
      compareSummary: exportCompareSummary,
    });
    downloadFile(contents, `${exportBaseName}-plan.md`, "text/markdown");
    setExportMenu(null);
  }, [analysis, exportBaseName, exportCompareSummary, state]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f4ef",
        color: "#1f1f1f",
        fontFamily: "" +
          "\"Source Serif 4\", \"Times New Roman\", serif",
        padding: "24px",
      }}
    >
      <header style={{ marginBottom: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "28px" }}>Room Audio Simulator</h1>
        <p style={{ margin: "6px 0 0", opacity: 0.7 }}>
          v1 — two-channel sweet spot bass simulator
        </p>
      </header>
      <div className="app-layout">
        <RoomCanvas
          room={state.room}
          opening={state.room.opening ?? null}
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
          showRipples={showRipples}
          onToggleRipples={setShowRipples}
          onSeatChange={updateSeat}
          onMainsChange={updateMains}
          onSubwooferChange={updateSubwoofer}
          onApplyGhostSubPlacement={applyGhostSubPlacement}
          onApplySeatMove={applySeatMove}
        />
        <aside className="panel-stack">
          <section className="panel-card">
            <div className="panel-header">
              <h3 className="panel-title">Results</h3>
              <button
                type="button"
                className="treatment-button secondary"
                onClick={() => toggleExportMenu("results")}
              >
                Generate Plan (Export)
              </button>
            </div>
            {exportMenu === "results" && (
              <div className="export-options">
                <button
                  type="button"
                  className="treatment-button"
                  onClick={handleExportProjectJson}
                >
                  Download Project JSON
                </button>
                <button
                  type="button"
                  className="treatment-button"
                  onClick={handleExportPlanMarkdown}
                >
                  Download Plan (Markdown)
                </button>
              </div>
            )}
            <div className="panel-row">
              <span>Smoothness</span>
              <span>
                {analysis.smoothnessScore} ({analysis.smoothnessBand})
              </span>
            </div>
            <div className="panel-row">
              <span>Tightness</span>
              <span>
                {analysis.tightnessScore} ({analysis.tightnessBand})
              </span>
            </div>
            <div className="panel-row">
              <span>Confidence</span>
              <span>{analysis.confidenceLevel}</span>
            </div>
          </section>
          <section className="panel-card">
            <h3 className="panel-title">Room Setup</h3>
            <label className="panel-row panel-toggle">
              <span>Units</span>
              <select
                value={state.units}
                onChange={(event) =>
                  updateUnits(event.target.value as Units)
                }
              >
                <option value="imperial">Imperial (ft)</option>
                <option value="metric">Metric (m)</option>
              </select>
            </label>
            <div className="panel-row">
              <label className="room-input-label">
                <span>Length ({state.units === "imperial" ? "ft" : "m"})</span>
                <input
                  type="number"
                  min={state.units === "imperial" ? 6 : 2}
                  max={state.units === "imperial" ? 100 : 30}
                  step={state.units === "imperial" ? 0.5 : 0.1}
                  value={displayValue(state.room.length, state.units)}
                  onChange={(event) => {
                    const meters = parseInputToMeters(event.target.value, state.units);
                    if (meters > 0) {
                      updateRoom({ length: meters });
                    }
                  }}
                  className="room-input"
                />
              </label>
            </div>
            <div className="panel-row">
              <label className="room-input-label">
                <span>Width ({state.units === "imperial" ? "ft" : "m"})</span>
                <input
                  type="number"
                  min={state.units === "imperial" ? 6 : 2}
                  max={state.units === "imperial" ? 100 : 30}
                  step={state.units === "imperial" ? 0.5 : 0.1}
                  value={displayValue(state.room.width, state.units)}
                  onChange={(event) => {
                    const meters = parseInputToMeters(event.target.value, state.units);
                    if (meters > 0) {
                      updateRoom({ width: meters });
                    }
                  }}
                  className="room-input"
                />
              </label>
            </div>
            <div className="panel-row">
              <label className="room-input-label">
                <span>Height ({state.units === "imperial" ? "ft" : "m"})</span>
                <input
                  type="number"
                  min={state.units === "imperial" ? 6 : 2}
                  max={state.units === "imperial" ? 20 : 6}
                  step={state.units === "imperial" ? 0.5 : 0.1}
                  value={displayValue(state.room.height, state.units)}
                  onChange={(event) => {
                    const meters = parseInputToMeters(event.target.value, state.units);
                    if (meters > 0) {
                      updateRoom({ height: meters });
                    }
                  }}
                  className="room-input"
                />
              </label>
            </div>
          </section>
          <section className="panel-card">
            <h3 className="panel-title">Constraints</h3>
            <label className="panel-row panel-toggle">
              <span>Lock seat position</span>
              <input
                type="checkbox"
                checked={state.constraints.seatLocked}
                onChange={(event) =>
                  updateConstraints({ seatLocked: event.target.checked })
                }
              />
            </label>
            <label className="panel-row panel-toggle">
              <span>Allow nearfield sub suggestions</span>
              <input
                type="checkbox"
                checked={state.constraints.allowNearfieldSuggestions}
                onChange={(event) =>
                  updateConstraints({
                    allowNearfieldSuggestions: event.target.checked,
                  })
                }
              />
            </label>
          </section>
          <section className="panel-card">
            <h3 className="panel-title">Snapshots</h3>
            <div className="snapshot-row">
              <button
                type="button"
                className="treatment-button"
                disabled={snapshots.lockA && Boolean(snapshots.A)}
                onClick={() => saveSnapshot("A")}
              >
                Save A
              </button>
              <button
                type="button"
                className="treatment-button secondary"
                disabled={!snapshots.A}
                onClick={() => loadSnapshot("A")}
              >
                Load A
              </button>
            </div>
            <label className="panel-row panel-toggle">
              <span>Lock A</span>
              <input
                type="checkbox"
                checked={snapshots.lockA}
                onChange={(event) => toggleLockA(event.target.checked)}
              />
            </label>
            {snapshots.A && (
              <div className="snapshot-meta">
                A saved: {snapshots.A.savedAt.replace("T", " ").slice(0, 19)}
              </div>
            )}
            <div className="snapshot-row">
              <button
                type="button"
                className="treatment-button"
                onClick={() => saveSnapshot("B")}
              >
                Save B
              </button>
              <button
                type="button"
                className="treatment-button secondary"
                disabled={!snapshots.B}
                onClick={() => loadSnapshot("B")}
              >
                Load B
              </button>
            </div>
            {snapshots.B && (
              <div className="snapshot-meta">
                B saved: {snapshots.B.savedAt.replace("T", " ").slice(0, 19)}
              </div>
            )}
          </section>
          {compareData && compareMetrics && (
            <section className="panel-card compare-panel">
              <h3 className="panel-title">Compare</h3>
              <div className="compare-actions">
                <button
                  type="button"
                  className="treatment-button secondary"
                  onClick={() => loadSnapshot("A")}
                >
                  Revert to A
                </button>
                <button
                  type="button"
                  className="treatment-button secondary"
                  onClick={() => toggleExportMenu("compare")}
                >
                  Generate Plan (Export)
                </button>
              </div>
              {exportMenu === "compare" && (
                <div className="export-options">
                  <button
                    type="button"
                    className="treatment-button"
                    onClick={handleExportProjectJson}
                  >
                    Download Project JSON
                  </button>
                  <button
                    type="button"
                    className="treatment-button"
                    onClick={handleExportPlanMarkdown}
                  >
                    Download Plan (Markdown)
                  </button>
                </div>
              )}
              <div className="compare-metrics">
                <div className="compare-metric">
                  <div className="compare-metric-label">Smoothness</div>
                  <div className="compare-metric-values">
                    <span>A {compareMetrics.a.smoothnessScore}</span>
                    <span>B {compareMetrics.b.smoothnessScore}</span>
                    <span
                      className={`compare-delta ${compareMetrics.smoothnessDelta >= 0 ? "positive" : "negative"
                        }`}
                    >
                      Change {formatSignedNumber(compareMetrics.smoothnessDelta)}
                    </span>
                  </div>
                </div>
                <div className="compare-metric">
                  <div className="compare-metric-label">Tightness</div>
                  <div className="compare-metric-values">
                    <span>A {compareMetrics.a.tightnessScore}</span>
                    <span>B {compareMetrics.b.tightnessScore}</span>
                    <span
                      className={`compare-delta ${compareMetrics.tightnessDelta >= 0 ? "positive" : "negative"
                        }`}
                    >
                      Change {formatSignedNumber(compareMetrics.tightnessDelta)}
                    </span>
                  </div>
                </div>
                <div className="compare-metric">
                  <div className="compare-metric-label">Confidence</div>
                  <div className="compare-metric-values">
                    <span>A {compareMetrics.a.confidenceLevel}</span>
                    <span>B {compareMetrics.b.confidenceLevel}</span>
                    <span
                      className={`compare-delta ${compareMetrics.confidenceDelta >= 0 ? "positive" : "negative"
                        }`}
                    >
                      Score {formatSignedNumber(compareMetrics.confidenceDelta, 2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="compare-section">
                <div className="compare-section-title">Top Problems</div>
                <div className="compare-problem-header">
                  <span>A</span>
                  <span>B</span>
                </div>
                <div className="compare-problem-table">
                  {compareData.matches.map((match, index) => (
                    <div
                      key={`${match.a?.id ?? "none"}-${match.b?.id ?? "none"}-${index}`}
                      className="compare-problem-row"
                    >
                      <div className="compare-problem-col">
                        {match.a ? (
                          <span>{formatProblemLabel(match.a)}</span>
                        ) : (
                          <span className="compare-empty">n/a</span>
                        )}
                        {match.status === "resolved" && (
                          <span className="compare-tag resolved">Resolved</span>
                        )}
                      </div>
                      <div className="compare-problem-col">
                        {match.b ? (
                          <span>{formatProblemLabel(match.b)}</span>
                        ) : (
                          <span className="compare-empty">n/a</span>
                        )}
                        {match.status === "new" && (
                          <span className="compare-tag new">New</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="compare-section">
                <div className="compare-section-title">Curve (20-120)</div>
                <svg
                  className="compare-curve"
                  viewBox={`0 0 ${CURVE_VIEWBOX_WIDTH} ${CURVE_VIEWBOX_HEIGHT}`}
                  role="img"
                  aria-label="Frequency response comparison"
                >
                  {compareMetrics.a.topProblems.map((problem, index) => {
                    const low = Math.max(CURVE_MIN_HZ, problem.rangeHz.low);
                    const high = Math.min(CURVE_MAX_HZ, problem.rangeHz.high);
                    const x =
                      ((low - CURVE_MIN_HZ) / (CURVE_MAX_HZ - CURVE_MIN_HZ)) *
                      CURVE_VIEWBOX_WIDTH;
                    const width =
                      ((high - low) / (CURVE_MAX_HZ - CURVE_MIN_HZ)) *
                      CURVE_VIEWBOX_WIDTH;
                    return (
                      <rect
                        key={`a-${problem.id}-${index}`}
                        className="compare-curve-region a"
                        x={x}
                        y={0}
                        width={Math.max(1, width)}
                        height={CURVE_VIEWBOX_HEIGHT}
                      />
                    );
                  })}
                  {compareMetrics.b.topProblems.map((problem, index) => {
                    const low = Math.max(CURVE_MIN_HZ, problem.rangeHz.low);
                    const high = Math.min(CURVE_MAX_HZ, problem.rangeHz.high);
                    const x =
                      ((low - CURVE_MIN_HZ) / (CURVE_MAX_HZ - CURVE_MIN_HZ)) *
                      CURVE_VIEWBOX_WIDTH;
                    const width =
                      ((high - low) / (CURVE_MAX_HZ - CURVE_MIN_HZ)) *
                      CURVE_VIEWBOX_WIDTH;
                    return (
                      <rect
                        key={`b-${problem.id}-${index}`}
                        className="compare-curve-region b"
                        x={x}
                        y={0}
                        width={Math.max(1, width)}
                        height={CURVE_VIEWBOX_HEIGHT}
                      />
                    );
                  })}
                  <path className="compare-curve-line a" d={curvePathA} />
                  <path className="compare-curve-line b" d={curvePathB} />
                </svg>
              </div>
              <div className="compare-section">
                <div className="compare-section-title">Tightness / Decay</div>
                <div className="compare-band">
                  <div className="compare-band-row">
                    <span className="compare-band-label">A</span>
                    <div className="compare-band-bar">
                      {SCORE_BANDS.map((band, index) => (
                        <span
                          key={`a-${band}`}
                          className={`compare-band-segment${index === getBandIndex(compareMetrics.a.tightnessBand)
                            ? " is-active"
                            : ""
                            }`}
                        >
                          {band}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="compare-band-row">
                    <span className="compare-band-label">B</span>
                    <div className="compare-band-bar">
                      {SCORE_BANDS.map((band, index) => (
                        <span
                          key={`b-${band}`}
                          className={`compare-band-segment${index === getBandIndex(compareMetrics.b.tightnessBand)
                            ? " is-active"
                            : ""
                            }`}
                        >
                          {band}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="compare-section">
                <div className="compare-section-title">Change log</div>
                {compareData.changeLog.length > 0 ? (
                  <ul className="compare-log">
                    {compareData.changeLog.map((line, index) => (
                      <li key={`${line}-${index}`}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="compare-empty">No changes logged.</div>
                )}
              </div>
            </section>
          )}
          <section className="panel-card">
            <h3 className="panel-title">Top Problems</h3>
            {analysis.noMajorIssues ? (
              <div className="problem-empty">No major issues detected</div>
            ) : (
              <ul className="problem-list">
                {analysis.topProblems.map((problem) => (
                  <li key={problem.id}>
                    <button
                      type="button"
                      className={`problem-button${problem.id === selectedProblemId ? " is-selected" : ""
                        }`}
                      onClick={() => setSelectedProblemId(problem.id)}
                    >
                      <div className="problem-label">
                        {formatProblemLabel(problem)}
                      </div>
                      <div className="problem-badges">
                        <span
                          className={`problem-badge fixability-${problem.fixabilityPrimary === "add_treatment" ? "treatment" : problem.fixabilityPrimary === "seat_move" ? "seat" : "sub"}`}
                        >
                          {formatFixabilityBadge(problem.fixabilityPrimary)}
                        </span>
                        {problem.tags.includes("integration_sensitive") && (
                          <span className="problem-tag">
                            Integration-sensitive
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {analysis.deepBassWatchlist && (
              <div className="watchlist">
                <div className="watchlist-title">Deep Bass Watchlist</div>
                <div className="watchlist-detail">
                  {formatProblemLabel({
                    id: "deep-bass",
                    kind: analysis.deepBassWatchlist.kind,
                    centerHz: analysis.deepBassWatchlist.centerHz,
                    rangeHz: analysis.deepBassWatchlist.rangeHz,
                    severity: analysis.deepBassWatchlist.severity,
                    deviation: analysis.deepBassWatchlist.deviation,
                    fixabilityPrimary: "sub_move",
                    tags: [],
                  })}
                </div>
              </div>
            )}
          </section>
          {selectedProblem && (
            <section className="panel-card">
              <h3 className="panel-title">Fix This</h3>
              <div className="panel-row">
                <span>Selected</span>
                <span>{formatProblemLabel(selectedProblem)}</span>
              </div>
              {recommendationSet?.banner && (
                <div className="recommendation-banner">
                  <div className="recommendation-banner-title">
                    {recommendationSet.banner.title}
                  </div>
                  <div className="recommendation-banner-body">
                    {recommendationSet.banner.body}
                  </div>
                </div>
              )}
              {selectedProblem.kind === "null" && (
                <div className="recommendation-note">
                  Nulls are cancellations. Small seat moves or sub placement
                  changes can help. Treatments usually won’t fully ‘fill’ a
                  severe null.
                </div>
              )}
              {selectedProblem.kind === "null" &&
                selectedProblem.tags.includes("seat_sensitive") && (
                  <div className="recommendation-note">
                    <strong>Modal Null:</strong> This is a room mode at your listening position.
                    Moving the subwoofer won't help—the waves cancel at the seat itself.
                    Moving the seat left/right or forward/back will resolve it.
                  </div>
                )}
              {selectedProblem.kind === "null" &&
                selectedProblem.severity === "severe" &&
                selectedProblem.fixabilityPrimary === "seat_move" &&
                !selectedProblem.tags.includes("seat_sensitive") && (
                  <div className="recommendation-note">
                    <strong>Modal Null:</strong> This appears to be a room mode at your listening position.
                    Moving the subwoofer likely won't help—try moving the seat left/right or forward/back.
                  </div>
                )}
              {selectedProblem.tags.includes("integration_sensitive") && (
                <div className="recommendation-note">
                  Upper bass (80–120 Hz) is sensitive to crossover/phase and
                  speaker interaction. Treat results as directional guidance.
                </div>
              )}
              {state.constraints.seatLocked &&
                selectedProblem.tags.includes("seat_sensitive") && (
                  <div className="recommendation-note">
                    Seat movement would help, but it’s locked.
                  </div>
                )}
              <ol className="recommendation-list">
                {recommendationSet?.recommendations.map((rec, index) => (
                  <li key={rec.id} className="recommendation-item">
                    <div className="recommendation-header">
                      <span className="recommendation-title">
                        {recommendationHeaders[index] ?? "Next step"}
                      </span>
                      {rec.impact === "low" && (
                        <span className="pill low-impact">Impact: Low</span>
                      )}
                    </div>
                    <div className="recommendation-body">{rec.title}</div>
                    {rec.detail && (
                      <div className="recommendation-detail">{rec.detail}</div>
                    )}
                    {rec.impact === "low" && (
                      <div className="recommendation-why">
                        {rec.why ?? "Below the meaningful-improvement threshold; worth testing."}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="panel-card">
            <h3 className="panel-title">Treatments</h3>
            <div className="dr-preview">
              <h4 className="panel-subtitle">Expected benefit</h4>
              <div className="dr-why">Why: Placement aligns with target zone.</div>
              <div className="dr-meters">
                <div className="dr-meter">
                  <span>Zone saturation</span>
                  <div className="dr-pill">Low</div>
                </div>
                <div className="dr-meter">
                  <span>Frequency overlap</span>
                  <div className="dr-pill">None</div>
                </div>
              </div>
              <div className="dr-zone-icons">
                <div className="dr-zone">
                  <span className="dr-zone-dot best" />
                  Best
                </div>
                <div className="dr-zone">
                  <span className="dr-zone-dot ok" />
                  OK
                </div>
                <div className="dr-zone">
                  <span className="dr-zone-dot limited" />
                  Limited
                </div>
              </div>
              <div className="dr-tooltip">
                You’re doubling up in the same zone at a similar frequency.
                Expect strong diminishing returns.
              </div>
            </div>
            <div className="treatment-list">
              {state.treatments.length === 0 && (
                <div className="treatment-empty">No treatments yet.</div>
              )}
              {state.treatments.map((treatment) => {
                const invalid = isTreatmentInvalid(treatment, snapZones);
                const zone = getTreatmentZone(treatment, snapZones);
                const isEditing = editingTreatmentId === treatment.id || invalid;
                const treatmentZones = getEligibleZones(treatment.type, snapZones);
                return (
                  <div key={treatment.id} className="treatment-item">
                    <div className="treatment-header">
                      <span>{getTreatmentLabel(treatment.type)}</span>
                      {invalid && (
                        <span className="pill warning">Needs attention</span>
                      )}
                    </div>
                    <div className="treatment-row">
                      <span>Strength</span>
                      <span>{treatment.strength}</span>
                    </div>
                    {treatment.type === "tuned_trap" && (
                      <div className="treatment-row">
                        <span>Target</span>
                        <span>{treatment.targetHz} Hz</span>
                      </div>
                    )}
                    <div className="treatment-row">
                      <span>Zone</span>
                      {isEditing ? (
                        <select
                          value={treatmentZones.some((z) => z.id === treatment.snapZoneId)
                            ? treatment.snapZoneId
                            : treatmentZones[0]?.id ?? ""}
                          onChange={(event) => {
                            updateTreatment(treatment.id, (prev) => ({
                              ...prev,
                              snapZoneId: event.target.value,
                            }));
                            setEditingTreatmentId(null);
                          }}
                          disabled={treatmentZones.length === 0}
                        >
                          {treatmentZones.length === 0 && (
                            <option value="">No valid zones</option>
                          )}
                          {treatmentZones.map((zoneOption) => (
                            <option key={zoneOption.id} value={zoneOption.id}>
                              {zoneOption.id}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span>{zone ? zone.id : "Unknown zone"}</span>
                      )}
                    </div>
                    <div className="treatment-actions">
                      <button
                        type="button"
                        className="treatment-button"
                        onClick={() =>
                          setEditingTreatmentId((prev) =>
                            prev === treatment.id ? null : treatment.id,
                          )
                        }
                      >
                        {invalid ? "Fix placement" : "Change zone"}
                      </button>
                      <button
                        type="button"
                        className="treatment-button secondary"
                        onClick={() => removeTreatment(treatment.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="treatment-add">
              <h4 className="panel-subtitle">Add Treatment</h4>
              <div className="treatment-row">
                <label>
                  Type
                  <select
                    value={newTreatmentType}
                    onChange={(event) =>
                      setNewTreatmentType(event.target.value as TreatmentType)
                    }
                  >
                    {TREATMENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {getTreatmentLabel(type)} ({treatmentCounts[type]}/
                        {TREATMENT_CAPS[type]})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="treatment-row">
                <label>
                  Strength
                  <select
                    value={newTreatmentStrength}
                    onChange={(event) =>
                      setNewTreatmentStrength(
                        event.target.value as TreatmentStrength,
                      )
                    }
                  >
                    {TREATMENT_STRENGTHS.map((strength) => (
                      <option key={strength} value={strength}>
                        {strength}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {newTreatmentType === "tuned_trap" && (
                <div className="treatment-row">
                  <label>
                    Target Hz
                    <input
                      type="number"
                      min={20}
                      max={120}
                      step={1}
                      value={newTreatmentTargetHz}
                      onChange={(event) =>
                        setNewTreatmentTargetHz(Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              )}
              <div className="treatment-row">
                <label>
                  Zone
                  <select
                    value={newTreatmentZoneId}
                    onChange={(event) => setNewTreatmentZoneId(event.target.value)}
                    disabled={eligibleZones.length === 0}
                  >
                    {eligibleZones.length === 0 && (
                      <option value="">No valid zones</option>
                    )}
                    {eligibleZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {isTreatmentCapReached(newTreatmentType, state.treatments) && (
                <div className="treatment-warning">
                  Cap reached for {getTreatmentLabel(newTreatmentType)} (
                  {TREATMENT_CAPS[newTreatmentType]} max).
                </div>
              )}
              <button
                type="button"
                className="treatment-button primary"
                disabled={
                  !newTreatmentZoneId ||
                  isTreatmentCapReached(newTreatmentType, state.treatments)
                }
                onClick={addTreatment}
              >
                Add Treatment
              </button>
            </div>
          </section>
          <section className="panel-card">
            <h3 className="panel-title">Seat</h3>
            <div className="panel-row">
              <span>Position</span>
              <span>
                x {state.seat.x.toFixed(2)} m, y {state.seat.y.toFixed(2)} m
              </span>
            </div>
          </section>
          <section className="panel-card">
            <h3 className="panel-title">Mains</h3>
            <label className="panel-row panel-toggle">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={state.mains.enabled}
                onChange={(event) => toggleMainsEnabled(event.target.checked)}
              />
            </label>
            <div className="panel-row">
              <span>Left</span>
              <span>
                x {state.mains.left.x.toFixed(2)} m, y{" "}
                {state.mains.left.y.toFixed(2)} m
              </span>
            </div>
            <div className="panel-row">
              <span>Right</span>
              <span>
                x {state.mains.right.x.toFixed(2)} m, y{" "}
                {state.mains.right.y.toFixed(2)} m
              </span>
            </div>
            <div className="panel-row">
              <span>Lowest strong bass</span>
              <span>{state.mains.mainsLowestStrongBassHz} Hz</span>
            </div>
          </section>
          <section className="panel-card">
            <h3 className="panel-title">Subwoofer</h3>
            <div className="panel-row">
              <span>Mode</span>
              <span>{state.subwoofer.mode}</span>
            </div>
            <div className="panel-row">
              <span>Preset</span>
              <span>{state.subwoofer.preset}</span>
            </div>
            <div className="panel-row">
              <span>Position</span>
              <span>
                x {state.subwoofer.x.toFixed(2)} m, y{" "}
                {state.subwoofer.y.toFixed(2)} m
              </span>
            </div>
            {subWarnings.length > 0 && (
              <div className="warning-list">
                {subWarnings.map((warning) => (
                  <div key={warning.id} className="warning-item">
                    {warning.message}
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
