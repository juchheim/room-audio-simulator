import type {
  AnalysisResult,
  ConfidenceLevel,
  DeepBassWatchlist,
  ScoreBand,
  TopProblem,
} from "../analysis";
import type { ProjectState, Treatment } from "../projectState";
import { deserializeProjectState, serializeProjectState } from "../projectState";
import { generateSnapZones } from "../snapZones";
import { getTreatmentLabel, isTreatmentInvalid } from "../treatments";

export type SnapshotSlot = "A" | "B";

export type AnalysisSummary = {
  smoothnessScore: number;
  smoothnessBand: ScoreBand;
  tightnessScore: number;
  tightnessBand: ScoreBand;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  topProblems: TopProblem[];
  deepBassWatchlist?: DeepBassWatchlist;
};

export type Snapshot = {
  slot: SnapshotSlot;
  locked: boolean;
  state: string;
  analysis: AnalysisSummary;
  savedAt: string;
  changeLog?: string[];
};

const POSITION_EPSILON = 0.01;

export function buildAnalysisSummary(analysis: AnalysisResult): AnalysisSummary {
  return {
    smoothnessScore: analysis.smoothnessScore,
    smoothnessBand: analysis.smoothnessBand,
    tightnessScore: analysis.tightnessScore,
    tightnessBand: analysis.tightnessBand,
    confidenceScore: analysis.confidenceScore,
    confidenceLevel: analysis.confidenceLevel,
    topProblems: analysis.topProblems,
    deepBassWatchlist: analysis.deepBassWatchlist,
  };
}

export function createSnapshot(
  slot: SnapshotSlot,
  state: ProjectState,
  analysis: AnalysisResult,
  locked: boolean,
  changeLog?: string[],
): Snapshot {
  return {
    slot,
    locked,
    state: serializeProjectState(state),
    analysis: buildAnalysisSummary(analysis),
    savedAt: new Date().toISOString(),
    ...(changeLog && changeLog.length > 0 ? { changeLog } : {}),
  };
}

export function restoreSnapshot(snapshot: Snapshot): ProjectState {
  return deserializeProjectState(snapshot.state);
}

function formatMeters(value: number): string {
  return `${value.toFixed(2)} m`;
}

function formatDelta(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} m`;
}

function formatNormalized(value: number): string {
  return value.toFixed(2);
}

function formatDirectionChange(
  label: string,
  fromValue: string,
  toValue: string,
): string | null {
  if (fromValue === toValue) {
    return null;
  }
  return `${label} ${fromValue} -> ${toValue}`;
}

function buildSeatChangeLog(prev: ProjectState, next: ProjectState): string | null {
  const dx = next.seat.x - prev.seat.x;
  const dy = next.seat.y - prev.seat.y;
  if (Math.abs(dx) < POSITION_EPSILON && Math.abs(dy) < POSITION_EPSILON) {
    return null;
  }
  return `Seat moved: dx ${formatDelta(dx)}, dy ${formatDelta(dy)}`;
}

function buildSubChangeLog(prev: ProjectState, next: ProjectState): string | null {
  const dx = next.subwoofer.x - prev.subwoofer.x;
  const dy = next.subwoofer.y - prev.subwoofer.y;
  const moved =
    Math.abs(dx) >= POSITION_EPSILON || Math.abs(dy) >= POSITION_EPSILON;

  const parts: string[] = [];
  if (moved) {
    parts.push(`dx ${formatDelta(dx)}, dy ${formatDelta(dy)}`);
  }

  const modeChange = formatDirectionChange(
    "mode",
    prev.subwoofer.mode,
    next.subwoofer.mode,
  );
  if (modeChange) {
    parts.push(modeChange);
  }

  const presetChange = formatDirectionChange(
    "preset",
    prev.subwoofer.preset,
    next.subwoofer.preset,
  );
  if (presetChange) {
    parts.push(presetChange);
  }

  const driverChange = formatDirectionChange(
    "driver",
    prev.subwoofer.driverDirection,
    next.subwoofer.driverDirection,
  );
  if (driverChange) {
    parts.push(driverChange);
  }

  const portChange = formatDirectionChange(
    "port",
    prev.subwoofer.portDirection,
    next.subwoofer.portDirection,
  );
  if (portChange) {
    parts.push(portChange);
  }

  if (parts.length === 0) {
    return null;
  }

  const prefix = moved ? "Sub moved" : "Sub updated";
  return `${prefix}: ${parts.join("; ")}`;
}

function formatOpeningSummary(opening: ProjectState["room"]["opening"]): string {
  if (!opening) {
    return "";
  }
  const doorState =
    opening.type === "doorway" && opening.doorState
      ? `, door ${opening.doorState}`
      : "";
  return `${opening.type} (${opening.wall} wall, ${formatMeters(opening.width)}, center ${formatNormalized(
    opening.positionAlongWallNorm,
  )}${doorState})`;
}

function buildOpeningChangeLog(
  prev: ProjectState,
  next: ProjectState,
): string | null {
  const prevOpening = prev.room.opening ?? null;
  const nextOpening = next.room.opening ?? null;

  if (!prevOpening && !nextOpening) {
    return null;
  }
  if (!prevOpening && nextOpening) {
    return `Opening added: ${formatOpeningSummary(nextOpening)}`;
  }
  if (prevOpening && !nextOpening) {
    return "Opening removed.";
  }

  // At this point, both prevOpening and nextOpening must be non-null
  // Add explicit guard to satisfy TypeScript's null safety
  if (!prevOpening || !nextOpening) {
    return null;
  }

  const parts: string[] = [];
  if (prevOpening.wall !== nextOpening.wall) {
    parts.push(`wall ${prevOpening.wall} -> ${nextOpening.wall}`);
  }
  if (prevOpening.type !== nextOpening.type) {
    parts.push(`type ${prevOpening.type} -> ${nextOpening.type}`);
  }
  if (Math.abs(prevOpening.width - nextOpening.width) >= POSITION_EPSILON) {
    parts.push(
      `width ${formatMeters(prevOpening.width)} -> ${formatMeters(nextOpening.width)}`,
    );
  }
  if (
    Math.abs(prevOpening.positionAlongWallNorm - nextOpening.positionAlongWallNorm) >=
    0.01
  ) {
    parts.push(
      `center ${formatNormalized(prevOpening.positionAlongWallNorm)} -> ${formatNormalized(
        nextOpening.positionAlongWallNorm,
      )}`,
    );
  }

  const prevDoor = prevOpening.doorState ?? "";
  const nextDoor = nextOpening.doorState ?? "";
  if (prevDoor !== nextDoor) {
    const doorLabel = `door ${prevDoor || "n/a"} -> ${nextDoor || "n/a"}`;
    parts.push(doorLabel);
  }

  if (parts.length === 0) {
    return null;
  }

  return `Opening updated: ${parts.join("; ")}`;
}

function formatTreatmentLabel(treatment: Treatment): string {
  const label = getTreatmentLabel(treatment.type);
  if (treatment.type === "tuned_trap" && treatment.targetHz !== undefined) {
    return `${label} ${Math.round(treatment.targetHz)} Hz (${treatment.snapZoneId})`;
  }
  return `${label} (${treatment.snapZoneId})`;
}

function formatTreatmentWithoutTarget(treatment: Treatment): string {
  const label = getTreatmentLabel(treatment.type);
  return `${label} (${treatment.snapZoneId})`;
}

function buildTreatmentChangeLog(
  prev: ProjectState,
  next: ProjectState,
): string[] {
  const prevZones = generateSnapZones(prev.room, prev.room.opening ?? null);
  const nextZones = generateSnapZones(next.room, next.room.opening ?? null);
  const prevMap = new Map(prev.treatments.map((treatment) => [treatment.id, treatment]));
  const nextMap = new Map(next.treatments.map((treatment) => [treatment.id, treatment]));

  const added: Treatment[] = [];
  const removed: Treatment[] = [];
  const invalidated: Treatment[] = [];
  const fixed: Treatment[] = [];
  const retuned: Array<{ before: Treatment; after: Treatment }> = [];

  for (const [id, treatment] of nextMap.entries()) {
    if (!prevMap.has(id)) {
      added.push(treatment);
    }
  }

  for (const [id, treatment] of prevMap.entries()) {
    const nextTreatment = nextMap.get(id);
    if (!nextTreatment) {
      removed.push(treatment);
      continue;
    }

    const prevInvalid = isTreatmentInvalid(treatment, prevZones);
    const nextInvalid = isTreatmentInvalid(nextTreatment, nextZones);
    if (!prevInvalid && nextInvalid) {
      invalidated.push(nextTreatment);
    } else if (prevInvalid && !nextInvalid) {
      fixed.push(nextTreatment);
    }

    if (
      treatment.type === "tuned_trap" &&
      nextTreatment.type === "tuned_trap" &&
      treatment.targetHz !== nextTreatment.targetHz
    ) {
      retuned.push({ before: treatment, after: nextTreatment });
    }
  }

  const lines: string[] = [];
  if (added.length > 0) {
    lines.push(`Treatments added: ${added.map(formatTreatmentLabel).join(", ")}`);
  }
  if (removed.length > 0) {
    lines.push(
      `Treatments removed: ${removed.map(formatTreatmentLabel).join(", ")}`,
    );
  }
  if (invalidated.length > 0) {
    lines.push(
      `Treatments invalid: ${invalidated
        .map(formatTreatmentWithoutTarget)
        .join(", ")}`,
    );
  }
  if (fixed.length > 0) {
    lines.push(
      `Treatments fixed: ${fixed
        .map(formatTreatmentWithoutTarget)
        .join(", ")}`,
    );
  }
  if (retuned.length > 0) {
    lines.push(
      `Tuned traps retuned: ${retuned
        .map(
          ({ before, after }) =>
            `${getTreatmentLabel(after.type)} ${Math.round(before.targetHz ?? 0)} -> ${Math.round(
              after.targetHz ?? 0,
            )} Hz (${after.snapZoneId})`,
        )
        .join(", ")}`,
    );
  }

  return lines;
}

export function buildChangeLog(
  prev: ProjectState,
  next: ProjectState,
): string[] {
  const entries: string[] = [];

  const seatLine = buildSeatChangeLog(prev, next);
  if (seatLine) {
    entries.push(seatLine);
  }

  const subLine = buildSubChangeLog(prev, next);
  if (subLine) {
    entries.push(subLine);
  }

  const openingLine = buildOpeningChangeLog(prev, next);
  if (openingLine) {
    entries.push(openingLine);
  }

  entries.push(...buildTreatmentChangeLog(prev, next));

  return entries;
}

export type ProblemMatch = {
  a?: TopProblem;
  b?: TopProblem;
  status: "matched" | "resolved" | "new";
};

function getProblemBandwidth(problem: TopProblem): number {
  return Math.max(0, problem.rangeHz.high - problem.rangeHz.low);
}

function getOverlapRatio(a: TopProblem, b: TopProblem): number {
  const overlap = Math.max(
    0,
    Math.min(a.rangeHz.high, b.rangeHz.high) -
    Math.max(a.rangeHz.low, b.rangeHz.low),
  );
  const denominator = Math.max(getProblemBandwidth(a), getProblemBandwidth(b));
  return denominator > 0 ? overlap / denominator : 0;
}

export function matchTopProblems(
  aProblems: TopProblem[],
  bProblems: TopProblem[],
): ProblemMatch[] {
  const matches: ProblemMatch[] = [];
  const unmatchedB = new Set(bProblems.map((_, index) => index));

  for (const aProblem of aProblems) {
    let bestIndex: number | null = null;
    let bestOverlap = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestPreferred = false;

    for (const index of unmatchedB) {
      const bProblem = bProblems[index];
      if (aProblem.kind !== bProblem.kind) {
        continue;
      }

      const maxBandwidth = Math.max(
        getProblemBandwidth(aProblem),
        getProblemBandwidth(bProblem),
      );
      const centerDistance = Math.abs(aProblem.centerHz - bProblem.centerHz);
      if (centerDistance > 0.5 * maxBandwidth) {
        continue;
      }

      const overlap = getOverlapRatio(aProblem, bProblem);
      const preferred = overlap >= 0.5;

      if (
        bestIndex === null ||
        (preferred && !bestPreferred) ||
        (preferred === bestPreferred &&
          (overlap > bestOverlap ||
            (Math.abs(overlap - bestOverlap) < 1e-4 &&
              centerDistance < bestDistance)))
      ) {
        bestIndex = index;
        bestOverlap = overlap;
        bestDistance = centerDistance;
        bestPreferred = preferred;
      }
    }

    if (bestIndex !== null) {
      matches.push({
        a: aProblem,
        b: bProblems[bestIndex],
        status: "matched",
      });
      unmatchedB.delete(bestIndex);
    } else {
      matches.push({ a: aProblem, status: "resolved" });
    }
  }

  for (const index of unmatchedB) {
    matches.push({ b: bProblems[index], status: "new" });
  }

  return matches;
}
