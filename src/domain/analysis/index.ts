import type {
  Opening,
  ProjectState,
  Room,
  Treatment,
  Units,
} from "../projectState";
import { generateSnapZones, type SnapZone } from "../snapZones";
import {
  getEligibleZones,
  getTreatmentLabel,
  isZoneEligibleForTreatment,
  isTreatmentCapReached,
  isTreatmentInvalid,
} from "../treatments";
import { getSubwooferClearanceWarnings } from "../clearanceWarnings";

export type ScoreBand = "Poor" | "Fair" | "Good" | "Excellent";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export type ProblemKind = "peak" | "null";
export type Severity = "mild" | "moderate" | "severe";
export type FixabilityPrimary = "seat_move" | "sub_move" | "add_treatment";
export type ProblemTag =
  | "integration_sensitive"
  | "seat_sensitive"
  | "placement_sensitive"
  | "treatment_responsive";
export type PortContributionBand = "near_tuning" | "above_tuning";
export type PortContributionDominance = "port" | "driver";
export type PortContribution = {
  dominance: PortContributionDominance;
  band: PortContributionBand;
};
export type HeatmapRegion = {
  low: number;
  high: number;
};
export type HeatmapGrid = {
  rows: number;
  cols: number;
  values: number[];
};
export type ResponseCurvePoint = {
  frequency: number;
  response: number;
};

export type PlacementSource =
  | "perimeter"
  | "corner"
  | "quarter"
  | "midpoint"
  | "nearfield";
export type PlacementWall = "front" | "rear" | "left" | "right" | "interior" | "nearfield";
export type GhostSubPlacement = {
  x: number;
  y: number;
  source: PlacementSource;
  wall: PlacementWall;
  rationale: string;
  deviationDelta: number;
  smoothnessDelta: number;
  meetsMeaningful: boolean;
  severityImproved: boolean;
};
export type SeatMoveDirection = "forward" | "back" | "left" | "right";
export type SeatMicroMove = {
  x: number;
  y: number;
  direction: SeatMoveDirection;
  stepMeters: number;
  distanceMeters: number;
  label: string;
  deviationDelta: number;
  smoothnessDelta: number;
  rankImproved: boolean;
  severityImproved: boolean;
  meetsMeaningful: boolean;
};
export type RecommendationImpact = "meaningful" | "low" | "informational";
export type RecommendationKind =
  | "move_sub"
  | "seat_move"
  | "add_treatment"
  | "change_preset"
  | "informational";
export type Recommendation = {
  id: string;
  kind: RecommendationKind;
  impact: RecommendationImpact;
  title: string;
  detail?: string;
  why?: string;
  placement?: GhostSubPlacement;
  seatMove?: SeatMicroMove;
  treatment?: Treatment;
};
export type RecommendationBanner = {
  title: string;
  body: string;
};
export type RecommendationSet = {
  banner?: RecommendationBanner;
  recommendations: Recommendation[];
};
export type ZoneGuidanceTier = "best" | "ok" | "limited";
export type ZoneGuidance = Record<string, ZoneGuidanceTier>;

export type ProblemRangeHz = {
  low: number;
  high: number;
};

export type TopProblem = {
  id: string;
  kind: ProblemKind;
  centerHz: number;
  rangeHz: ProblemRangeHz;
  severity: Severity;
  deviation: number;
  fixabilityPrimary: FixabilityPrimary;
  tags: ProblemTag[];
  portContribution?: PortContribution;
};

export type DeepBassWatchlist = {
  kind: ProblemKind;
  centerHz: number;
  rangeHz: ProblemRangeHz;
  severity: Severity;
  deviation: number;
};

export type AnalysisResult = {
  smoothnessScore: number;
  smoothnessBand: ScoreBand;
  tightnessScore: number;
  tightnessBand: ScoreBand;
  confidenceScore: number;
  confidenceLevel: ConfidenceLevel;
  topProblems: TopProblem[];
  deepBassWatchlist?: DeepBassWatchlist;
  noMajorIssues: boolean;
  analysisHistory: AnalysisHistory;
};

type SeverityTier = "none" | "mild" | "moderate" | "severe";

type Point = {
  x: number;
  y: number;
};

type PlacementCandidate = {
  position: Point;
  source: PlacementSource;
  wall: PlacementWall;
};

type SeatMoveCandidate = {
  position: Point;
  direction: SeatMoveDirection;
  stepMeters: number;
};

export type AnalysisHistory = {
  candidateSeverities: Record<string, Severity>;
  topProblemIds: string[];
};

export type AnalysisContext = {
  selectedBandHz?: { low: number; high: number };
  previousAnalysis?: AnalysisResult;
};

type ProblemCandidate = TopProblem & {
  priorityScore: number;
};

type ModeSeed = {
  axis: "length" | "width";
  order: number;
  frequency: number;
};

const SPEED_OF_SOUND = 343;
const MIN_FREQ = 20;
const MAX_FREQ = 120;
const DEVIATION_SCALE = 24;
const DEEP_BASS_CENTER = 25;
const DEEP_BASS_BOOM_SCALE = 10;
const DEEP_BASS_LOSS_SCALE = 12;
const SEVERITY_NONE_THRESHOLD = 3;
const SEVERITY_MODERATE_THRESHOLD = 6;
const SEVERITY_SEVERE_THRESHOLD = 10;
const SEVERITY_HYSTERESIS = 0.5;
const PRIORITY_EPSILON = 0.6;
const MEANINGFUL_DEVIATION_DELTA = 2;
const MEANINGFUL_SMOOTHNESS_DELTA = 3;
const GHOST_DEVIATION_DELTA = 2.5;
const GHOST_SMOOTHNESS_DELTA = 4;
const SEAT_MOVE_DELTAS = [0.152, 0.305, 0.457];
const PERIMETER_FRACTIONS = [1 / 6, 1 / 3, 1 / 2, 2 / 3, 5 / 6];
const NEARFIELD_MIN_DISTANCE = 0.3;
const NEARFIELD_MID_DISTANCE = 0.45;
const NEARFIELD_MAX_DISTANCE = 0.6;
const NEARFIELD_CORRIDOR_RADIUS = 0.6;
const NEARFIELD_RECT_DEPTH = 0.5;
const NEARFIELD_RECT_WIDTH = 1.2;
const DIVERSITY_DISTANCE_RATIO = 0.2;
const WALL_EPSILON = 1e-4;
const FALLBACK_BANNER_TITLE = "No meaningful improvements found";
const FALLBACK_BANNER_BODY =
  "Within current constraints, predicted gains are small. Try the options below.";
const IMPACT_LOW_WHY =
  "Below the meaningful-improvement threshold; worth testing.";
const FALLBACK_CLOSE_DOOR =
  "Close the door (test) to increase pressurization and raise confidence.";
const FALLBACK_UNLOCK_SEAT =
  "Unlock seat movement to allow micro-moves (often the only real fix for cancellations).";
const FALLBACK_ALLOW_NEARFIELD =
  "Allow nearfield sub suggestions to widen placement options.";
const FALLBACK_ALTERNATE_PRESET =
  "Try an alternate sub mode/preset (e.g., sealed → Tight / ported → Balanced) to trade extension vs control.";
const FALLBACK_VALIDATE =
  "Validate with a quick sub-crawl or a simple measurement sweep to confirm where the null/peak actually sits.";
const FALLBACK_FUTURE =
  "If you need larger gains than single-sub placement can deliver, consider a second sub or DSP/EQ (Future).";
const NEAR_FB_LOW = 0.8;
const NEAR_FB_HIGH = 1.2;
const PORT_CROSSFADE_LOW = 0.7;
const PORT_CROSSFADE_HIGH = 1.4;
const DRIVER_DIRECTION_EFFECT = 0.1;
const PORT_DIRECTION_EFFECT = 0.18;
const PORT_DIRECTION_DISTANCE = 0.45;
const HEATMAP_SOURCE_WEIGHT = 0.35;
const HEATMAP_DISTANCE_FALLOFF = 0.35;
const HEATMAP_MAINS_WEIGHT = 0.25;

const BASE_SMOOTHNESS = 72;
const BASE_TIGHTNESS = 68;

const IDEAL_SEAT_DEPTH_RATIO = 0.38;
const SEAT_DEPTH_TOLERANCE = 0.22;
const SEAT_SIDE_TOLERANCE = 0.35;

const IDEAL_SUB_WIDTH_RATIOS = [0.25, 0.75];
const SUB_WIDTH_TOLERANCE = 0.25;
const IDEAL_SUB_DEPTH_RATIO = 0.2;
const SUB_DEPTH_TOLERANCE = 0.2;
const SUB_BOUNDARY_DISTANCE = 0.6;
const SUB_CORNER_DISTANCE = 0.8;

const SEAT_DEPTH_SMOOTHNESS_WEIGHT = 12;
const SEAT_SIDE_SMOOTHNESS_WEIGHT = 6;
const SUB_WIDTH_SMOOTHNESS_WEIGHT = 6;
const SUB_DEPTH_SMOOTHNESS_WEIGHT = 5;
const SUB_BOUNDARY_SMOOTHNESS_WEIGHT = 8;
const SUB_CORNER_SMOOTHNESS_WEIGHT = 4;
const OPENING_SMOOTHNESS_WEIGHT = 8;
const SEALED_SMOOTHNESS_BONUS = 2;
const PORTED_SMOOTHNESS_PENALTY = 1;

const SEAT_DEPTH_TIGHTNESS_WEIGHT = 4;
const SUB_BOUNDARY_TIGHTNESS_WEIGHT = 10;
const SUB_CORNER_TIGHTNESS_WEIGHT = 6;
const OPENING_TIGHTNESS_WEIGHT = 12;
const SEALED_TIGHTNESS_BONUS = 3;
const PORTED_TIGHTNESS_PENALTY = 2;

const TREATMENT_STRENGTH_MULTIPLIER: Record<Treatment["strength"], number> = {
  light: 0.7,
  medium: 1,
  heavy: 1.25,
};

const TREATMENT_BASE_EFFECT: Record<
  Treatment["type"],
  { smoothness: number; tightness: number }
> = {
  corner_trap: { smoothness: 2, tightness: 5 },
  rear_wall_absorber: { smoothness: 1.5, tightness: 4 },
  thick_panel: { smoothness: 1.5, tightness: 2 },
  tuned_trap: { smoothness: 2.5, tightness: 2 },
};

const TREATMENT_PEAK_REDUCTION: Record<Treatment["type"], number> = {
  corner_trap: 1.4,
  rear_wall_absorber: 1.1,
  thick_panel: 0.9,
  tuned_trap: 1.6,
};

const FALLBACK_CENTERS = [28, 36, 52, 63, 74, 92, 108];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function getSeverityTier(deviation: number): SeverityTier {
  if (deviation < SEVERITY_NONE_THRESHOLD) {
    return "none";
  }
  if (deviation < SEVERITY_MODERATE_THRESHOLD) {
    return "mild";
  }
  if (deviation < SEVERITY_SEVERE_THRESHOLD) {
    return "moderate";
  }
  return "severe";
}

function getSeverityRank(tier: SeverityTier): number {
  switch (tier) {
    case "none":
      return 0;
    case "mild":
      return 1;
    case "moderate":
      return 2;
    case "severe":
      return 3;
    default:
      return 0;
  }
}

function isSeverityImproved(
  baselineDeviation: number,
  candidateDeviation: number,
): boolean {
  return (
    getSeverityRank(getSeverityTier(candidateDeviation)) <
    getSeverityRank(getSeverityTier(baselineDeviation))
  );
}

function getDirectionDistance(
  room: Room,
  position: Point,
  direction: "front" | "rear" | "left" | "right" | "down" | "none",
): number | null {
  switch (direction) {
    case "front":
      return position.y;
    case "rear":
      return room.length - position.y;
    case "left":
      return position.x;
    case "right":
      return room.width - position.x;
    case "down":
    case "none":
      return null;
    default:
      return null;
  }
}

function getBoundaryBoost(distance: number | null, maxDistance: number): number {
  if (distance === null) {
    return 0;
  }
  return clamp01((maxDistance - distance) / maxDistance);
}

function getPortDominanceWeight(ratio: number): number {
  if (ratio <= PORT_CROSSFADE_LOW || ratio >= PORT_CROSSFADE_HIGH) {
    return 0;
  }
  if (ratio <= 1) {
    return (ratio - PORT_CROSSFADE_LOW) / (1 - PORT_CROSSFADE_LOW);
  }
  return (PORT_CROSSFADE_HIGH - ratio) / (PORT_CROSSFADE_HIGH - 1);
}

export function getPortContributionForFrequency(
  state: ProjectState,
  frequencyHz: number,
): PortContribution | null {
  const fbHz = state.subwoofer.fbHz;
  if (state.subwoofer.mode !== "ported" || !isValidHz(fbHz)) {
    return null;
  }
  const ratio = frequencyHz / fbHz;
  if (ratio >= NEAR_FB_LOW && ratio <= NEAR_FB_HIGH) {
    return { dominance: "port", band: "near_tuning" };
  }
  if (ratio > NEAR_FB_HIGH && ratio <= PORT_CROSSFADE_HIGH) {
    return { dominance: "driver", band: "above_tuning" };
  }
  return null;
}

function applyDirectionalResponseAdjustment(
  state: ProjectState,
  frequencyHz: number,
  response: number,
): number {
  const driverDistance = getDirectionDistance(
    state.room,
    { x: state.subwoofer.x, y: state.subwoofer.y },
    state.subwoofer.driverDirection,
  );
  const driverBoost = getBoundaryBoost(driverDistance, SUB_BOUNDARY_DISTANCE);
  const driverFactor = 1 + driverBoost * DRIVER_DIRECTION_EFFECT;

  const fbHz = state.subwoofer.fbHz;
  if (state.subwoofer.mode !== "ported" || !isValidHz(fbHz)) {
    return clamp01(response * driverFactor);
  }

  const ratio = frequencyHz / fbHz;
  let portWeight = getPortDominanceWeight(ratio);
  if (state.subwoofer.portDirection === "none") {
    portWeight = 0;
  }
  const driverWeight = 1 - portWeight;

  const portDistance = getDirectionDistance(
    state.room,
    { x: state.subwoofer.x, y: state.subwoofer.y },
    state.subwoofer.portDirection,
  );
  const portBoost = getBoundaryBoost(portDistance, PORT_DIRECTION_DISTANCE);
  const portFactor = 1 + portBoost * PORT_DIRECTION_EFFECT;

  const combinedFactor = driverWeight * driverFactor + portWeight * portFactor;
  return clamp01(response * combinedFactor);
}

function computeAxisResponseAtPoint(
  seed: ModeSeed,
  state: ProjectState,
  position: Point,
): number {
  const axisLength = seed.axis === "length" ? state.room.length : state.room.width;
  const pointPos = seed.axis === "length" ? position.y : position.x;
  const subPos = seed.axis === "length" ? state.subwoofer.y : state.subwoofer.x;

  const pointPhase = Math.cos((seed.order * Math.PI * pointPos) / axisLength);
  const subPhase = Math.cos((seed.order * Math.PI * subPos) / axisLength);
  return Math.abs(pointPhase * subPhase);
}

function getFrequencySamples(region: HeatmapRegion): number[] {
  const low = clamp(region.low, MIN_FREQ, MAX_FREQ);
  const high = clamp(region.high, MIN_FREQ, MAX_FREQ);
  const center = (low + high) / 2;
  const samples = [low, center, high]
    .map((value) => Math.round(value * 10) / 10)
    .filter((value, index, arr) => arr.indexOf(value) === index);
  return samples;
}

function getDistanceInfluence(distance: number, roomDiagonal: number): number {
  if (roomDiagonal <= 0) {
    return 0.5;
  }
  const normalized = distance / (roomDiagonal * HEATMAP_DISTANCE_FALLOFF);
  return clamp01(1 / (1 + normalized));
}

function getSourceInfluence(state: ProjectState, position: Point): number {
  const roomDiagonal = Math.hypot(state.room.width, state.room.length);
  const subDistance = distanceBetweenPoints(position, {
    x: state.subwoofer.x,
    y: state.subwoofer.y,
  });
  let influence = getDistanceInfluence(subDistance, roomDiagonal);

  if (state.mains.enabled) {
    const mainsMidpoint = {
      x: (state.mains.left.x + state.mains.right.x) / 2,
      y: (state.mains.left.y + state.mains.right.y) / 2,
    };
    const mainsDistance = distanceBetweenPoints(position, mainsMidpoint);
    const mainsInfluence = getDistanceInfluence(mainsDistance, roomDiagonal);
    influence = clamp01(
      influence * (1 - HEATMAP_MAINS_WEIGHT) + mainsInfluence * HEATMAP_MAINS_WEIGHT,
    );
  }

  return influence;
}

export function computeHeatmapGrid(
  state: ProjectState,
  region: HeatmapRegion,
  options?: { rows?: number; cols?: number },
): HeatmapGrid {
  const rows = options?.rows ?? 18;
  const cols = options?.cols ?? 26;
  const leakage = getOpeningLeakage(state.room.opening ?? null);
  const seeds = buildModeSeeds(state.room);
  const frequencies = getFrequencySamples(region);

  const values: number[] = [];
  let minValue = Number.POSITIVE_INFINITY;
  let maxValue = Number.NEGATIVE_INFINITY;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const position = {
        x: state.room.width * ((col + 0.5) / cols),
        y: state.room.length * ((row + 0.5) / rows),
      };
      const sourceInfluence = getSourceInfluence(state, position);
      let total = 0;

      for (const frequency of frequencies) {
        const regionWidth = getRegionWidthHz(frequency);
        let weightedSum = 0;
        let weightTotal = 0;

        for (const seed of seeds) {
          const distanceHz = Math.abs(seed.frequency - frequency);
          const weight = clamp01(1 - distanceHz / (regionWidth * 2));
          if (weight <= 0) {
            continue;
          }
          const response = computeAxisResponseAtPoint(seed, state, position);
          weightedSum += response * weight;
          weightTotal += weight;
        }

        const baseResponse = weightTotal > 0 ? weightedSum / weightTotal : 0.5;
        const directional = applyDirectionalResponseAdjustment(
          state,
          frequency,
          baseResponse,
        );
        const adjusted = applyLeakageToResponse(directional, leakage);
        const combined =
          adjusted * (1 - HEATMAP_SOURCE_WEIGHT) +
          sourceInfluence * HEATMAP_SOURCE_WEIGHT;
        total += combined;
      }

      const value = clamp01(total / frequencies.length);
      values.push(value);
      minValue = Math.min(minValue, value);
      maxValue = Math.max(maxValue, value);
    }
  }

  const range = maxValue - minValue;
  const normalizedValues =
    range > 1e-4
      ? values.map((value) => clamp01((value - minValue) / range))
      : values.map(() => 0.5);

  return {
    rows,
    cols,
    values: normalizedValues,
  };
}

export function computeResponseCurve(
  state: ProjectState,
  options?: {
    minHz?: number;
    maxHz?: number;
    stepHz?: number;
    treatmentsOverride?: Treatment[];
  },
): ResponseCurvePoint[] {
  const minHz = options?.minHz ?? MIN_FREQ;
  const maxHz = options?.maxHz ?? MAX_FREQ;
  const stepHz = options?.stepHz ?? 2.5;
  const treatments = getValidTreatments(state, options?.treatmentsOverride);
  const leakage = getOpeningLeakage(state.room.opening ?? null);
  const seeds = buildModeSeeds(state.room);
  const points: ResponseCurvePoint[] = [];

  for (let freq = minHz; freq <= maxHz + 1e-4; freq += stepHz) {
    const frequency = Math.round(freq * 10) / 10;
    const regionWidth = getRegionWidthHz(frequency);
    let weightedSum = 0;
    let weightTotal = 0;

    for (const seed of seeds) {
      const distanceHz = Math.abs(seed.frequency - frequency);
      const weight = clamp01(1 - distanceHz / (regionWidth * 2));
      if (weight <= 0) {
        continue;
      }
      const response = computeAxisResponse(seed, state);
      weightedSum += response * weight;
      weightTotal += weight;
    }

    const baseResponse = weightTotal > 0 ? weightedSum / weightTotal : 0.5;
    const directional = applyDirectionalResponseAdjustment(
      state,
      frequency,
      baseResponse,
    );
    const adjusted = applyLeakageToResponse(directional, leakage);
    let response = adjusted;

    if (response >= 0.5) {
      const reduction = getTreatmentPeakReduction(treatments, frequency, regionWidth);
      response = clamp01(response - reduction / DEVIATION_SCALE);
    }

    points.push({ frequency, response });
  }

  return points;
}

function roundHz(value: number): number {
  return Math.round(value * 10) / 10;
}

export function getScoreBand(score: number): ScoreBand {
  if (score >= 80) {
    return "Excellent";
  }
  if (score >= 60) {
    return "Good";
  }
  if (score >= 40) {
    return "Fair";
  }
  return "Poor";
}

function getOpeningLeakage(opening?: Opening | null): number {
  if (!opening) {
    return 0;
  }

  switch (opening.type) {
    case "doorway": {
      const doorState = opening.doorState ?? "open";
      return doorState === "closed" ? 0.15 : 0.35;
    }
    case "hallway":
      return 0.55;
    case "open_plan":
      return 0.8;
    default:
      return 0;
  }
}

function normalizedDistance(value: number, target: number, tolerance: number): number {
  if (tolerance <= 0) {
    return 0;
  }
  return clamp01(Math.abs(value - target) / tolerance);
}

function normalizedDistanceToTargets(
  value: number,
  targets: number[],
  tolerance: number,
): number {
  if (targets.length === 0) {
    return 0;
  }
  const minDelta = Math.min(...targets.map((target) => Math.abs(value - target)));
  return clamp01(minDelta / tolerance);
}

function getMinWallDistance(room: Room, x: number, y: number): number {
  return Math.min(x, y, room.width - x, room.length - y);
}

function getMinCornerDistance(room: Room, x: number, y: number): number {
  const distances = [
    Math.hypot(x, y),
    Math.hypot(room.width - x, y),
    Math.hypot(x, room.length - y),
    Math.hypot(room.width - x, room.length - y),
  ];
  return Math.min(...distances);
}

function distanceBetweenPoints(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isPointInsideRoom(room: Room, point: Point): boolean {
  return (
    point.x >= 0 &&
    point.x <= room.width &&
    point.y >= 0 &&
    point.y <= room.length
  );
}

function getWallKey(room: Room, point: Point): PlacementWall {
  if (Math.abs(point.y) <= WALL_EPSILON) {
    return "front";
  }
  if (Math.abs(point.y - room.length) <= WALL_EPSILON) {
    return "rear";
  }
  if (Math.abs(point.x) <= WALL_EPSILON) {
    return "left";
  }
  if (Math.abs(point.x - room.width) <= WALL_EPSILON) {
    return "right";
  }
  return "interior";
}

function formatSeatMoveDistanceLabel(stepMeters: number, units: Units): string {
  if (units === "metric") {
    if (stepMeters <= 0.2) {
      return "15 cm";
    }
    if (stepMeters <= 0.33) {
      return "30 cm";
    }
    return "45 cm";
  }
  if (stepMeters <= 0.2) {
    return "6 in";
  }
  if (stepMeters <= 0.33) {
    return "12 in";
  }
  return "18 in";
}

function formatSeatMoveDirectionLabel(direction: SeatMoveDirection): string {
  switch (direction) {
    case "forward":
      return "forward";
    case "back":
      return "back";
    case "left":
      return "left";
    case "right":
      return "right";
    default:
      return direction;
  }
}

function formatSeatMoveTitle(move: SeatMicroMove, units: Units): string {
  const distanceLabel = formatSeatMoveDistanceLabel(move.stepMeters, units);
  const directionLabel = formatSeatMoveDirectionLabel(move.direction);
  return `Move seat ${distanceLabel} ${directionLabel} (${move.label})`;
}

function getWallLabel(wall: PlacementWall): string | null {
  switch (wall) {
    case "front":
      return "front wall";
    case "rear":
      return "rear wall";
    case "left":
      return "left wall";
    case "right":
      return "right wall";
    default:
      return null;
  }
}

function getCornerLabel(room: Room, point: Point): string | null {
  const isLeft = Math.abs(point.x) <= WALL_EPSILON;
  const isRight = Math.abs(point.x - room.width) <= WALL_EPSILON;
  const isFront = Math.abs(point.y) <= WALL_EPSILON;
  const isRear = Math.abs(point.y - room.length) <= WALL_EPSILON;

  if (isFront && isLeft) {
    return "front-left corner";
  }
  if (isFront && isRight) {
    return "front-right corner";
  }
  if (isRear && isLeft) {
    return "rear-left corner";
  }
  if (isRear && isRight) {
    return "rear-right corner";
  }

  return null;
}

function formatSubPlacementTitle(room: Room, placement: GhostSubPlacement): string {
  if (placement.source === "nearfield") {
    return "Move sub nearfield (1-2 ft from seat)";
  }

  if (placement.source === "corner") {
    const corner = getCornerLabel(room, { x: placement.x, y: placement.y });
    return corner ? `Move sub to ${corner}` : "Move sub to a corner position";
  }

  if (placement.source === "quarter") {
    return "Move sub to a quarter-point position";
  }

  const wallLabel = getWallLabel(placement.wall);
  if (placement.source === "midpoint") {
    return wallLabel
      ? `Move sub to ${wallLabel} midpoint`
      : "Move sub to a mid-wall position";
  }

  return wallLabel
    ? `Move sub to an off-center spot on the ${wallLabel}`
    : "Move sub to an off-center wall position";
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= 1e-8) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const t =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
  const clamped = clamp(t, 0, 1);
  const proj = { x: start.x + clamped * dx, y: start.y + clamped * dy };
  return Math.hypot(point.x - proj.x, point.y - proj.y);
}

function isPointInCapsule(
  point: Point,
  start: Point,
  end: Point,
  radius: number,
): boolean {
  return distanceToSegment(point, start, end) < radius;
}

function isPointInMainsFrontRect(
  point: Point,
  mainsMidpoint: Point,
  seat: Point,
): boolean {
  const dx = seat.x - mainsMidpoint.x;
  const dy = seat.y - mainsMidpoint.y;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-6) {
    return false;
  }

  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;

  const vx = point.x - mainsMidpoint.x;
  const vy = point.y - mainsMidpoint.y;
  const forward = vx * ux + vy * uy;
  const side = vx * px + vy * py;

  return (
    forward >= 0 &&
    forward <= NEARFIELD_RECT_DEPTH &&
    Math.abs(side) <= NEARFIELD_RECT_WIDTH / 2
  );
}

function isPointInDirectPathKeepOut(
  point: Point,
  mainsMidpoint: Point,
  seat: Point,
): boolean {
  if (isPointInCapsule(point, mainsMidpoint, seat, NEARFIELD_CORRIDOR_RADIUS)) {
    return true;
  }
  return isPointInMainsFrontRect(point, mainsMidpoint, seat);
}

function isOpeningKeepOut(state: ProjectState, point: Point): boolean {
  if (!state.room.opening) {
    return false;
  }
  const candidateSub = {
    ...state.subwoofer,
    x: point.x,
    y: point.y,
  };
  const warnings = getSubwooferClearanceWarnings(
    state.room,
    state.room.opening,
    candidateSub,
  );
  return warnings.some((warning) => warning.id === "opening_blocked");
}

function buildNearfieldCandidate(state: ProjectState): Point | null {
  if (!state.constraints.allowNearfieldSuggestions) {
    return null;
  }

  const mainsMidpoint: Point = {
    x: (state.mains.left.x + state.mains.right.x) / 2,
    y: (state.mains.left.y + state.mains.right.y) / 2,
  };
  const seat = state.seat;
  const dx = seat.x - mainsMidpoint.x;
  const dy = seat.y - mainsMidpoint.y;
  const length = Math.hypot(dx, dy);
  const perp =
    length > 1e-6 ? { x: -dy / length, y: dx / length } : { x: 1, y: 0 };

  const distances = [
    NEARFIELD_MAX_DISTANCE,
    NEARFIELD_MID_DISTANCE,
    NEARFIELD_MIN_DISTANCE,
  ];
  const candidates: { point: Point; clearance: number }[] = [];

  for (const distance of distances) {
    for (const sign of [1, -1]) {
      const point = {
        x: seat.x + perp.x * distance * sign,
        y: seat.y + perp.y * distance * sign,
      };
      if (!isPointInsideRoom(state.room, point)) {
        continue;
      }

      const actualDistance = distanceBetweenPoints(point, seat);
      if (
        actualDistance < NEARFIELD_MIN_DISTANCE ||
        actualDistance > NEARFIELD_MAX_DISTANCE
      ) {
        continue;
      }
      if (isOpeningKeepOut(state, point)) {
        continue;
      }
      if (isPointInDirectPathKeepOut(point, mainsMidpoint, seat)) {
        continue;
      }

      candidates.push({
        point,
        clearance: getMinWallDistance(state.room, point.x, point.y),
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.clearance - a.clearance);
  return candidates[0].point;
}

function getValidTreatments(
  state: ProjectState,
  treatmentsOverride?: Treatment[],
): Treatment[] {
  const snapZones = generateSnapZones(state.room, state.room.opening ?? null);
  const treatments = treatmentsOverride ?? state.treatments;
  return treatments.filter(
    (treatment) => !isTreatmentInvalid(treatment, snapZones),
  );
}

function getTreatmentDiminishing(treatments: Treatment[]): number {
  return 1 - Math.min(0.35, treatments.length * 0.04);
}

function computeTreatmentBoost(
  treatments: Treatment[],
): { smoothness: number; tightness: number } {
  let smoothness = 0;
  let tightness = 0;

  for (const treatment of treatments) {
    const base = TREATMENT_BASE_EFFECT[treatment.type];
    const strength = TREATMENT_STRENGTH_MULTIPLIER[treatment.strength];
    smoothness += base.smoothness * strength;
    tightness += base.tightness * strength;

    if (
      treatment.type === "tuned_trap" &&
      treatment.targetHz !== undefined &&
      treatment.targetHz >= 30 &&
      treatment.targetHz <= 80
    ) {
      smoothness += 0.5 * strength;
    }
  }

  const diminishing = getTreatmentDiminishing(treatments);
  return {
    smoothness: smoothness * diminishing,
    tightness: tightness * diminishing,
  };
}

function getTreatmentPeakReduction(
  treatments: Treatment[],
  centerHz: number,
  widthHz: number,
): number {
  let reduction = 0;

  for (const treatment of treatments) {
    const base = TREATMENT_PEAK_REDUCTION[treatment.type];
    const strength = TREATMENT_STRENGTH_MULTIPLIER[treatment.strength];
    let multiplier = 1;

    if (treatment.type === "tuned_trap" && treatment.targetHz !== undefined) {
      const delta = Math.abs(treatment.targetHz - centerHz);
      multiplier = delta <= widthHz ? 1.4 : 1;
    }

    reduction += base * strength * multiplier;
  }

  const diminishing = getTreatmentDiminishing(treatments);
  return reduction * diminishing;
}

function computeSmoothnessScore(
  state: ProjectState,
  treatments: Treatment[],
): number {
  const seatDepthRatio = state.seat.y / state.room.length;
  const seatSideRatio = state.seat.x / state.room.width;
  const subWidthRatio = state.subwoofer.x / state.room.width;
  const subDepthRatio = state.subwoofer.y / state.room.length;

  const seatDepthPenalty = normalizedDistance(
    seatDepthRatio,
    IDEAL_SEAT_DEPTH_RATIO,
    SEAT_DEPTH_TOLERANCE,
  );
  const seatSidePenalty = normalizedDistance(seatSideRatio, 0.5, SEAT_SIDE_TOLERANCE);
  const subWidthPenalty = normalizedDistanceToTargets(
    subWidthRatio,
    IDEAL_SUB_WIDTH_RATIOS,
    SUB_WIDTH_TOLERANCE,
  );
  const subDepthPenalty = normalizedDistance(
    subDepthRatio,
    IDEAL_SUB_DEPTH_RATIO,
    SUB_DEPTH_TOLERANCE,
  );

  const minWallDistance = getMinWallDistance(
    state.room,
    state.subwoofer.x,
    state.subwoofer.y,
  );
  const minCornerDistance = getMinCornerDistance(
    state.room,
    state.subwoofer.x,
    state.subwoofer.y,
  );

  const boundaryPenalty = clamp01(
    (SUB_BOUNDARY_DISTANCE - minWallDistance) / SUB_BOUNDARY_DISTANCE,
  );
  const cornerPenalty = clamp01(
    (SUB_CORNER_DISTANCE - minCornerDistance) / SUB_CORNER_DISTANCE,
  );

  const leakage = getOpeningLeakage(state.room.opening ?? null);
  const treatmentBoost = computeTreatmentBoost(treatments);

  let score =
    BASE_SMOOTHNESS -
    seatDepthPenalty * SEAT_DEPTH_SMOOTHNESS_WEIGHT -
    seatSidePenalty * SEAT_SIDE_SMOOTHNESS_WEIGHT -
    subWidthPenalty * SUB_WIDTH_SMOOTHNESS_WEIGHT -
    subDepthPenalty * SUB_DEPTH_SMOOTHNESS_WEIGHT -
    boundaryPenalty * SUB_BOUNDARY_SMOOTHNESS_WEIGHT -
    cornerPenalty * SUB_CORNER_SMOOTHNESS_WEIGHT -
    leakage * OPENING_SMOOTHNESS_WEIGHT +
    treatmentBoost.smoothness;

  if (state.subwoofer.mode === "sealed") {
    score += SEALED_SMOOTHNESS_BONUS;
  } else {
    score -= PORTED_SMOOTHNESS_PENALTY;
  }

  return Math.round(clamp(score, 0, 100));
}

function computeTightnessScore(
  state: ProjectState,
  treatments: Treatment[],
): number {
  const seatDepthRatio = state.seat.y / state.room.length;
  const seatDepthPenalty = normalizedDistance(
    seatDepthRatio,
    IDEAL_SEAT_DEPTH_RATIO,
    SEAT_DEPTH_TOLERANCE,
  );

  const minWallDistance = getMinWallDistance(
    state.room,
    state.subwoofer.x,
    state.subwoofer.y,
  );
  const minCornerDistance = getMinCornerDistance(
    state.room,
    state.subwoofer.x,
    state.subwoofer.y,
  );

  const boundaryPenalty = clamp01(
    (SUB_BOUNDARY_DISTANCE - minWallDistance) / SUB_BOUNDARY_DISTANCE,
  );
  const cornerPenalty = clamp01(
    (SUB_CORNER_DISTANCE - minCornerDistance) / SUB_CORNER_DISTANCE,
  );

  const leakage = getOpeningLeakage(state.room.opening ?? null);
  const treatmentBoost = computeTreatmentBoost(treatments);

  let score =
    BASE_TIGHTNESS -
    seatDepthPenalty * SEAT_DEPTH_TIGHTNESS_WEIGHT -
    boundaryPenalty * SUB_BOUNDARY_TIGHTNESS_WEIGHT -
    cornerPenalty * SUB_CORNER_TIGHTNESS_WEIGHT -
    leakage * OPENING_TIGHTNESS_WEIGHT +
    treatmentBoost.tightness;

  if (state.subwoofer.mode === "sealed") {
    score += SEALED_TIGHTNESS_BONUS;
  } else {
    score -= PORTED_TIGHTNESS_PENALTY;
  }

  return Math.round(clamp(score, 0, 100));
}

function isValidHz(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function computeConfidenceScore(
  state: ProjectState,
  context?: AnalysisContext,
): number {
  let score = 0.55;
  const opening = state.room.opening ?? null;

  if (opening) {
    if (opening.type === "hallway") {
      score -= 0.15;
    }

    if (opening.type === "doorway") {
      const doorState = opening.doorState ?? "open";
      score -= doorState === "open" ? 0.1 : 0.05;
    }
  }

  let notSureCount = 0;
  if (state.subwoofer.mode === "sealed") {
    if (!isValidHz(state.subwoofer.lowestStrongBassHz)) {
      notSureCount += 1;
    }
  } else {
    if (!isValidHz(state.subwoofer.fbHz)) {
      notSureCount += 1;
    }
  }

  if (!isValidHz(state.mains.mainsLowestStrongBassHz)) {
    notSureCount += 1;
  }

  score -= notSureCount * 0.07;

  if (context?.selectedBandHz) {
    if (context.selectedBandHz.low >= 80) {
      score -= 0.05;
    }
  }

  if (opening?.type === "open_plan") {
    score = Math.min(score, 0.4);
  }

  return clamp(score, 0, 1);
}

function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.67) {
    return "High";
  }
  if (score >= 0.34) {
    return "Medium";
  }
  return "Low";
}

function getRegionWidthHz(centerHz: number): number {
  if (centerHz < 40) {
    const t = clamp01((centerHz - 20) / 20);
    return 3 + t * 2;
  }
  if (centerHz < 80) {
    const t = clamp01((centerHz - 40) / 40);
    return 5 + t * 3;
  }
  const t = clamp01((centerHz - 80) / 40);
  return 8 + t * 4;
}

function getAudibilityWeight(centerHz: number): number {
  if (centerHz < 30) {
    return 0.7;
  }
  if (centerHz <= 80) {
    return 1;
  }
  return 0.85;
}

function classifySeverity(deviation: number, previousSeverity?: Severity): Severity {
  if (!previousSeverity) {
    if (deviation >= SEVERITY_SEVERE_THRESHOLD) {
      return "severe";
    }
    if (deviation >= SEVERITY_MODERATE_THRESHOLD) {
      return "moderate";
    }
    return "mild";
  }

  switch (previousSeverity) {
    case "mild":
      return deviation >= SEVERITY_MODERATE_THRESHOLD + SEVERITY_HYSTERESIS
        ? "moderate"
        : "mild";
    case "moderate":
      if (deviation >= SEVERITY_SEVERE_THRESHOLD + SEVERITY_HYSTERESIS) {
        return "severe";
      }
      if (deviation <= SEVERITY_MODERATE_THRESHOLD - SEVERITY_HYSTERESIS) {
        return "mild";
      }
      return "moderate";
    case "severe":
      return deviation <= SEVERITY_SEVERE_THRESHOLD - SEVERITY_HYSTERESIS
        ? "moderate"
        : "severe";
    default:
      return "mild";
  }
}

function applyLeakageToResponse(response: number, leakage: number): number {
  const blend = clamp01(leakage * 0.6);
  return response * (1 - blend) + 0.5 * blend;
}

function buildModeSeeds(room: Room): ModeSeed[] {
  const seeds: ModeSeed[] = [];

  for (const axis of ["length", "width"] as const) {
    const axisLength = axis === "length" ? room.length : room.width;
    const maxOrder = Math.min(
      6,
      Math.floor((2 * axisLength * MAX_FREQ) / SPEED_OF_SOUND),
    );

    for (let order = 1; order <= maxOrder; order += 1) {
      const frequency = (order * SPEED_OF_SOUND) / (2 * axisLength);
      if (frequency < MIN_FREQ || frequency > MAX_FREQ) {
        continue;
      }
      seeds.push({ axis, order, frequency });
    }
  }

  return seeds;
}

function computeAxisResponse(
  seed: ModeSeed,
  state: ProjectState,
): number {
  const axisLength = seed.axis === "length" ? state.room.length : state.room.width;
  const seatPos = seed.axis === "length" ? state.seat.y : state.seat.x;
  const subPos = seed.axis === "length" ? state.subwoofer.y : state.subwoofer.x;

  const seatPhase = Math.cos((seed.order * Math.PI * seatPos) / axisLength);
  const subPhase = Math.cos((seed.order * Math.PI * subPos) / axisLength);
  return Math.abs(seatPhase * subPhase);
}

function buildRange(centerHz: number): ProblemRangeHz {
  const width = getRegionWidthHz(centerHz);
  const half = width / 2;
  return {
    low: roundHz(clamp(centerHz - half, MIN_FREQ, MAX_FREQ)),
    high: roundHz(clamp(centerHz + half, MIN_FREQ, MAX_FREQ)),
  };
}

function addCandidate(
  candidates: ProblemCandidate[],
  candidate: ProblemCandidate,
  toleranceHz = 1,
): void {
  const existingIndex = candidates.findIndex(
    (item) => Math.abs(item.centerHz - candidate.centerHz) <= toleranceHz,
  );

  if (existingIndex >= 0) {
    if (candidate.priorityScore > candidates[existingIndex].priorityScore) {
      candidates[existingIndex] = candidate;
    }
    return;
  }

  candidates.push(candidate);
}

function buildCandidateFromResponse(
  id: string,
  centerHz: number,
  response: number,
  treatments: Treatment[],
  leakage: number,
  state: ProjectState,
  previousSeverity?: Severity,
): ProblemCandidate {
  const directionalResponse = applyDirectionalResponseAdjustment(
    state,
    centerHz,
    response,
  );
  const adjustedResponse = applyLeakageToResponse(directionalResponse, leakage);
  const deviation = computeDeviationFromResponse(
    centerHz,
    response,
    treatments,
    leakage,
    state,
  );
  const kind: ProblemKind = adjustedResponse >= 0.5 ? "peak" : "null";
  const severity = classifySeverity(deviation, previousSeverity);
  const tags: ProblemTag[] = centerHz >= 80 ? ["integration_sensitive"] : [];
  const fixabilityPrimary: FixabilityPrimary =
    kind === "null" ? "seat_move" : "sub_move";
  const portContribution = getPortContributionForFrequency(state, centerHz);

  return {
    id,
    kind,
    centerHz: roundHz(centerHz),
    rangeHz: buildRange(centerHz),
    severity,
    deviation,
    fixabilityPrimary,
    tags,
    portContribution: portContribution ?? undefined,
    priorityScore: deviation * getAudibilityWeight(centerHz),
  };
}

function buildModeCandidate(
  seed: ModeSeed,
  state: ProjectState,
  treatments: Treatment[],
  leakage: number,
  previousSeverities: Record<string, Severity>,
): ProblemCandidate {
  const response = computeAxisResponse(seed, state);
  const centerHz = roundHz(seed.frequency);
  const id = `mode-${seed.axis}-${seed.order}-${Math.round(centerHz)}`;
  return buildCandidateFromResponse(
    id,
    centerHz,
    response,
    treatments,
    leakage,
    state,
    previousSeverities[id],
  );
}

function buildSyntheticCandidate(
  centerHz: number,
  state: ProjectState,
  treatments: Treatment[],
  leakage: number,
  previousSeverities: Record<string, Severity>,
): ProblemCandidate {
  const distance = Math.hypot(
    state.seat.x - state.subwoofer.x,
    state.seat.y - state.subwoofer.y,
  );
  const wavelength = SPEED_OF_SOUND / centerHz;
  const response = Math.abs(Math.cos((2 * Math.PI * distance) / wavelength));
  const id = `synthetic-${Math.round(centerHz)}`;
  return buildCandidateFromResponse(
    id,
    centerHz,
    response,
    treatments,
    leakage,
    state,
    previousSeverities[id],
  );
}

function buildDeepBassCandidate(
  state: ProjectState,
  treatments: Treatment[],
  leakage: number,
  previousSeverities: Record<string, Severity>,
): ProblemCandidate {
  const previousSeverity = previousSeverities["deep-bass"];
  const minWallDistance = getMinWallDistance(
    state.room,
    state.subwoofer.x,
    state.subwoofer.y,
  );
  const minCornerDistance = getMinCornerDistance(
    state.room,
    state.subwoofer.x,
    state.subwoofer.y,
  );

  const boundaryBoost = clamp01(
    (SUB_BOUNDARY_DISTANCE - minWallDistance) / SUB_BOUNDARY_DISTANCE,
  );
  const cornerBoost = clamp01(
    (SUB_CORNER_DISTANCE - minCornerDistance) / SUB_CORNER_DISTANCE,
  );

  let extensionLoss = leakage * DEEP_BASS_LOSS_SCALE;
  if (state.subwoofer.mode === "sealed") {
    const lowest = state.subwoofer.lowestStrongBassHz ?? 30;
    extensionLoss += clamp01((lowest - 25) / 20) * 5;
  } else {
    const fb = state.subwoofer.fbHz ?? 30;
    extensionLoss += clamp01((fb - 25) / 20) * 4;
  }

  const boomRisk =
    (boundaryBoost * 0.6 + cornerBoost * 0.4) *
    (1 - leakage) *
    DEEP_BASS_BOOM_SCALE;

  const isLoss = extensionLoss >= boomRisk;
  const response = isLoss ? 0.25 : 0.85;
  const baseCandidate = buildCandidateFromResponse(
    "deep-bass",
    DEEP_BASS_CENTER,
    response,
    treatments,
    leakage,
    state,
    previousSeverity,
  );

  const rawDeviation = isLoss ? extensionLoss : boomRisk;
  const kind: ProblemKind = isLoss ? "null" : "peak";
  const width = getRegionWidthHz(DEEP_BASS_CENTER);
  const reduction =
    kind === "peak" ? getTreatmentPeakReduction(treatments, DEEP_BASS_CENTER, width) : 0;
  const deviation = Math.max(0, rawDeviation - reduction);
  const severity = classifySeverity(deviation, previousSeverity);

  return {
    ...baseCandidate,
    kind,
    deviation,
    severity,
    priorityScore: deviation * getAudibilityWeight(DEEP_BASS_CENTER),
  };
}

function getDeepBassWatchlist(
  candidates: ProblemCandidate[],
): DeepBassWatchlist | undefined {
  const deepCandidates = candidates.filter(
    (candidate) => candidate.centerHz >= 20 && candidate.centerHz <= 30,
  );
  const severeCandidate = deepCandidates
    .filter((candidate) => candidate.severity === "severe")
    .sort((a, b) => b.deviation - a.deviation)[0];

  if (!severeCandidate) {
    return undefined;
  }

  return {
    kind: severeCandidate.kind,
    centerHz: severeCandidate.centerHz,
    rangeHz: severeCandidate.rangeHz,
    severity: severeCandidate.severity,
    deviation: severeCandidate.deviation,
  };
}

function selectTopProblems(
  candidates: ProblemCandidate[],
  previousOrder: string[],
): TopProblem[] {
  const previousRank = new Map(
    previousOrder.map((id, index) => [id, index]),
  );
  const sorted = [...candidates].sort((a, b) => {
    const scoreDelta = b.priorityScore - a.priorityScore;
    if (Math.abs(scoreDelta) > PRIORITY_EPSILON) {
      return scoreDelta;
    }

    const previousA = previousRank.get(a.id);
    const previousB = previousRank.get(b.id);
    if (previousA !== undefined || previousB !== undefined) {
      if (previousA === undefined) {
        return 1;
      }
      if (previousB === undefined) {
        return -1;
      }
      if (previousA !== previousB) {
        return previousA - previousB;
      }
    }
    if (b.deviation !== a.deviation) {
      return b.deviation - a.deviation;
    }
    if (a.centerHz !== b.centerHz) {
      return a.centerHz - b.centerHz;
    }
    return a.id.localeCompare(b.id);
  });

  return sorted.slice(0, 3).map(({ priorityScore, ...problem }) => problem);
}

function computeTopProblems(
  state: ProjectState,
  treatments: Treatment[],
  smoothnessScore: number,
  previousHistory?: AnalysisHistory,
): {
  topProblems: TopProblem[];
  deepBassWatchlist?: DeepBassWatchlist;
  noMajorIssues: boolean;
  analysisHistory: AnalysisHistory;
} {
  const leakage = getOpeningLeakage(state.room.opening ?? null);
  const candidates: ProblemCandidate[] = [];
  const previousSeverities = previousHistory?.candidateSeverities ?? {};
  const previousOrder = previousHistory?.topProblemIds ?? [];

  for (const seed of buildModeSeeds(state.room)) {
    addCandidate(
      candidates,
      buildModeCandidate(seed, state, treatments, leakage, previousSeverities),
    );
  }

  addCandidate(
    candidates,
    buildDeepBassCandidate(state, treatments, leakage, previousSeverities),
  );

  for (const center of FALLBACK_CENTERS) {
    if (candidates.length >= 6) {
      break;
    }
    addCandidate(
      candidates,
      buildSyntheticCandidate(center, state, treatments, leakage, previousSeverities),
    );
  }

  let fillIndex = 0;
  while (candidates.length < 3 && fillIndex < FALLBACK_CENTERS.length * 2) {
    const baseCenter =
      FALLBACK_CENTERS[fillIndex % FALLBACK_CENTERS.length];
    const center = baseCenter + fillIndex * 0.3;
    addCandidate(
      candidates,
      buildSyntheticCandidate(center, state, treatments, leakage, previousSeverities),
      0.05,
    );
    fillIndex += 1;
  }

  const deepBassWatchlist = getDeepBassWatchlist(candidates);
  const hasModerateOrSevere = candidates.some(
    (candidate) => candidate.severity !== "mild",
  );
  const noMajorIssues =
    !hasModerateOrSevere && smoothnessScore >= 80 && !deepBassWatchlist;

  const selectedProblems = noMajorIssues
    ? []
    : selectTopProblems(candidates, previousOrder);

  const analysisHistory: AnalysisHistory = {
    candidateSeverities: Object.fromEntries(
      candidates.map((candidate) => [candidate.id, candidate.severity]),
    ),
    topProblemIds: selectedProblems.map((problem) => problem.id),
  };

  return {
    topProblems: selectedProblems,
    deepBassWatchlist,
    noMajorIssues,
    analysisHistory,
  };
}

function buildSeatMoveCandidates(state: ProjectState): SeatMoveCandidate[] {
  const candidates: SeatMoveCandidate[] = [];
  const seen = new Set<string>();
  const seat = state.seat;

  for (const stepMeters of SEAT_MOVE_DELTAS) {
    const options: SeatMoveCandidate[] = [
      {
        direction: "right",
        stepMeters,
        position: {
          x: clamp(seat.x + stepMeters, 0, state.room.width),
          y: seat.y,
        },
      },
      {
        direction: "left",
        stepMeters,
        position: {
          x: clamp(seat.x - stepMeters, 0, state.room.width),
          y: seat.y,
        },
      },
      {
        direction: "back",
        stepMeters,
        position: {
          x: seat.x,
          y: clamp(seat.y + stepMeters, 0, state.room.length),
        },
      },
      {
        direction: "forward",
        stepMeters,
        position: {
          x: seat.x,
          y: clamp(seat.y - stepMeters, 0, state.room.length),
        },
      },
    ];

    for (const option of options) {
      if (
        Math.abs(option.position.x - seat.x) < 1e-4 &&
        Math.abs(option.position.y - seat.y) < 1e-4
      ) {
        continue;
      }
      const key = `${option.position.x.toFixed(3)}:${option.position.y.toFixed(3)}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      candidates.push(option);
    }
  }

  return candidates;
}

function buildSeatCandidates(state: ProjectState): Point[] {
  return buildSeatMoveCandidates(state).map((candidate) => candidate.position);
}

function getPlacementRationale(candidate: PlacementCandidate): string {
  switch (candidate.source) {
    case "corner":
      return "Corner placement boosts boundary support and can shift modal balance.";
    case "midpoint":
      return "Mid-wall placement shifts length/width mode balance away from corners.";
    case "quarter":
      return "Quarter-point placement often reduces modal overlap versus center.";
    case "nearfield":
      return "Nearfield placement can reduce seat cancellations.";
    case "perimeter":
    default:
      return "Off-center wall placement avoids symmetry and can reduce cancellations.";
  }
}

function buildSubPlacementCandidates(state: ProjectState): PlacementCandidate[] {
  const room = state.room;
  const candidates = new Map<string, PlacementCandidate>();

  const addCandidate = (
    position: Point,
    source: PlacementSource,
    wallOverride?: PlacementWall,
  ) => {
    const key = `${position.x.toFixed(3)}:${position.y.toFixed(3)}`;
    if (candidates.has(key)) {
      return;
    }
    candidates.set(key, {
      position,
      source,
      wall: wallOverride ?? getWallKey(room, position),
    });
  };

  addCandidate({ x: 0, y: 0 }, "corner");
  addCandidate({ x: room.width, y: 0 }, "corner");
  addCandidate({ x: 0, y: room.length }, "corner");
  addCandidate({ x: room.width, y: room.length }, "corner");

  addCandidate({ x: room.width * 0.5, y: 0 }, "midpoint");
  addCandidate({ x: room.width * 0.5, y: room.length }, "midpoint");
  addCandidate({ x: 0, y: room.length * 0.5 }, "midpoint");
  addCandidate({ x: room.width, y: room.length * 0.5 }, "midpoint");

  addCandidate(
    { x: room.width * 0.25, y: room.length * 0.25 },
    "quarter",
    "interior",
  );
  addCandidate(
    { x: room.width * 0.75, y: room.length * 0.25 },
    "quarter",
    "interior",
  );
  addCandidate(
    { x: room.width * 0.25, y: room.length * 0.75 },
    "quarter",
    "interior",
  );
  addCandidate(
    { x: room.width * 0.75, y: room.length * 0.75 },
    "quarter",
    "interior",
  );

  for (const fraction of PERIMETER_FRACTIONS) {
    addCandidate({ x: room.width * fraction, y: 0 }, "perimeter");
    addCandidate({ x: room.width * fraction, y: room.length }, "perimeter");
    addCandidate({ x: 0, y: room.length * fraction }, "perimeter");
    addCandidate({ x: room.width, y: room.length * fraction }, "perimeter");
  }

  const nearfield = buildNearfieldCandidate(state);
  if (nearfield) {
    addCandidate(nearfield, "nearfield", "nearfield");
  }

  return Array.from(candidates.values());
}

function isSubPlacementAllowed(
  state: ProjectState,
  position: Point,
): boolean {
  const candidateSub = {
    ...state.subwoofer,
    x: position.x,
    y: position.y,
  };
  const warnings = getSubwooferClearanceWarnings(
    state.room,
    state.room.opening ?? null,
    candidateSub,
  );
  return warnings.length === 0;
}

function computeDeviationFromResponse(
  centerHz: number,
  response: number,
  treatments: Treatment[],
  leakage: number,
  state: ProjectState,
): number {
  const directionalResponse = applyDirectionalResponseAdjustment(
    state,
    centerHz,
    response,
  );
  const adjustedResponse = applyLeakageToResponse(directionalResponse, leakage);
  const rawDeviation = Math.abs(adjustedResponse - 0.5) * DEVIATION_SCALE;
  const kind: ProblemKind = adjustedResponse >= 0.5 ? "peak" : "null";
  const width = getRegionWidthHz(centerHz);
  const reduction =
    kind === "peak" ? getTreatmentPeakReduction(treatments, centerHz, width) : 0;
  return Math.max(0, rawDeviation - reduction);
}

function estimateProblemDeviation(
  problem: TopProblem,
  state: ProjectState,
  treatments: Treatment[],
): number {
  const leakage = getOpeningLeakage(state.room.opening ?? null);

  if (problem.id === "deep-bass") {
    return buildDeepBassCandidate(state, treatments, leakage, {}).deviation;
  }

  if (problem.id.startsWith("mode-")) {
    const parts = problem.id.split("-");
    const axis = parts[1] === "length" || parts[1] === "width" ? parts[1] : null;
    const order = Number(parts[2]);
    if (axis && Number.isFinite(order) && order > 0) {
      const axisLength = axis === "length" ? state.room.length : state.room.width;
      const frequency = (order * SPEED_OF_SOUND) / (2 * axisLength);
      const response = computeAxisResponse({ axis, order, frequency }, state);
      return computeDeviationFromResponse(
        frequency,
        response,
        treatments,
        leakage,
        state,
      );
    }
  }

  const centerHz = Math.max(MIN_FREQ, problem.centerHz);
  const distance = Math.hypot(
    state.seat.x - state.subwoofer.x,
    state.seat.y - state.subwoofer.y,
  );
  const wavelength = SPEED_OF_SOUND / centerHz;
  const response = Math.abs(Math.cos((2 * Math.PI * distance) / wavelength));
  return computeDeviationFromResponse(
    centerHz,
    response,
    treatments,
    leakage,
    state,
  );
}

function isMeaningfulImprovement(
  baselineDeviation: number,
  candidateDeviation: number,
  smoothnessDelta: number,
): boolean {
  if (isSeverityImproved(baselineDeviation, candidateDeviation)) {
    return true;
  }
  return (
    baselineDeviation - candidateDeviation >= MEANINGFUL_DEVIATION_DELTA &&
    smoothnessDelta >= MEANINGFUL_SMOOTHNESS_DELTA
  );
}

function isGhostPlacementMeaningful(
  baselineDeviation: number,
  candidateDeviation: number,
  smoothnessDelta: number,
): boolean {
  if (isSeverityImproved(baselineDeviation, candidateDeviation)) {
    return true;
  }
  return (
    baselineDeviation - candidateDeviation >= GHOST_DEVIATION_DELTA &&
    smoothnessDelta >= GHOST_SMOOTHNESS_DELTA
  );
}

function getProblemRankForState(
  problemId: string,
  state: ProjectState,
  treatments: Treatment[],
  smoothnessScore: number,
): number {
  const candidateTop = computeTopProblems(
    state,
    treatments,
    smoothnessScore,
  );
  return candidateTop.topProblems.findIndex(
    (problem) => problem.id === problemId,
  );
}

function isSeatMoveMeaningful(
  baselineDeviation: number,
  candidateDeviation: number,
  smoothnessDelta: number,
  rankImproved: boolean,
): boolean {
  const severityImproved = isSeverityImproved(baselineDeviation, candidateDeviation);
  const deviationImproved = baselineDeviation - candidateDeviation >= MEANINGFUL_DEVIATION_DELTA;
  const smoothnessImproved = smoothnessDelta >= MEANINGFUL_SMOOTHNESS_DELTA;
  const passesPrimaryOrFallback =
    severityImproved || (deviationImproved && smoothnessImproved);

  if (!passesPrimaryOrFallback) {
    return false;
  }

  let improvements = 0;
  if (deviationImproved) {
    improvements += 1;
  }
  if (smoothnessImproved) {
    improvements += 1;
  }
  if (rankImproved) {
    improvements += 1;
  }

  return improvements >= 2;
}

function hasSeatSensitiveImprovement(
  problem: TopProblem,
  baselineTopProblems: TopProblem[],
  state: ProjectState,
  treatments: Treatment[],
  baselineSmoothness: number,
): boolean {
  const baselineDeviation = problem.deviation;
  const baselineRank = baselineTopProblems.findIndex(
    (item) => item.id === problem.id,
  );

  for (const point of buildSeatCandidates(state)) {
    const candidateState: ProjectState = {
      ...state,
      seat: { x: point.x, y: point.y },
    };
    const candidateSmoothness = computeSmoothnessScore(
      candidateState,
      treatments,
    );
    const candidateDeviation = estimateProblemDeviation(
      problem,
      candidateState,
      treatments,
    );
    const smoothnessDelta = candidateSmoothness - baselineSmoothness;
    const rank = getProblemRankForState(
      problem.id,
      candidateState,
      treatments,
      candidateSmoothness,
    );
    const rankImproved = baselineRank >= 0 && (rank < 0 || rank < baselineRank);

    if (
      isSeatMoveMeaningful(
        baselineDeviation,
        candidateDeviation,
        smoothnessDelta,
        rankImproved,
      )
    ) {
      return true;
    }
  }

  return false;
}

function hasPlacementSensitiveImprovement(
  problem: TopProblem,
  state: ProjectState,
  treatments: Treatment[],
  baselineSmoothness: number,
): boolean {
  const baselineDeviation = problem.deviation;
  for (const candidate of buildSubPlacementCandidates(state)) {
    const point = candidate.position;
    if (
      Math.abs(point.x - state.subwoofer.x) < 1e-4 &&
      Math.abs(point.y - state.subwoofer.y) < 1e-4
    ) {
      continue;
    }
    if (!isSubPlacementAllowed(state, point)) {
      continue;
    }

    const candidateState: ProjectState = {
      ...state,
      subwoofer: { ...state.subwoofer, x: point.x, y: point.y },
    };
    const candidateSmoothness = computeSmoothnessScore(
      candidateState,
      treatments,
    );
    const candidateDeviation = estimateProblemDeviation(
      problem,
      candidateState,
      treatments,
    );
    const smoothnessDelta = candidateSmoothness - baselineSmoothness;
    if (
      isGhostPlacementMeaningful(
        baselineDeviation,
        candidateDeviation,
        smoothnessDelta,
      )
    ) {
      return true;
    }
  }

  return false;
}

function hasTreatmentResponsiveImprovement(
  problem: TopProblem,
  state: ProjectState,
  baselineSmoothness: number,
  snapZones: ReturnType<typeof generateSnapZones>,
): boolean {
  if (problem.kind !== "peak") {
    return false;
  }

  const baselineDeviation = problem.deviation;
  const treatmentTypes: Treatment["type"][] = [
    "corner_trap",
    "rear_wall_absorber",
    "thick_panel",
    "tuned_trap",
  ];

  for (const type of treatmentTypes) {
    if (isTreatmentCapReached(type, state.treatments)) {
      continue;
    }
    const eligibleZones = getEligibleZones(type, snapZones);
    if (eligibleZones.length === 0) {
      continue;
    }

    const candidateTreatment: Treatment = {
      id: `cand_${type}_${Math.round(problem.centerHz)}`,
      type,
      strength: "heavy",
      snapZoneId: eligibleZones[0].id,
      coveragePreset: "standard",
      ...(type === "tuned_trap"
        ? { targetHz: Math.max(MIN_FREQ, Math.round(problem.centerHz)) }
        : {}),
    };
    const candidateTreatments = [
      ...state.treatments,
      candidateTreatment,
    ];
    const validTreatments = getValidTreatments(state, candidateTreatments);
    const candidateSmoothness = computeSmoothnessScore(
      state,
      validTreatments,
    );
    const candidateDeviation = estimateProblemDeviation(
      problem,
      state,
      validTreatments,
    );
    const smoothnessDelta = candidateSmoothness - baselineSmoothness;

    if (
      isMeaningfulImprovement(
        baselineDeviation,
        candidateDeviation,
        smoothnessDelta,
      )
    ) {
      return true;
    }
  }

  return false;
}

type PlacementEvaluation = PlacementCandidate & {
  deviationDelta: number;
  smoothnessDelta: number;
  severityDelta: number;
  severityImproved: boolean;
  meetsMeaningful: boolean;
  rationale: string;
};

type SeatMoveEvaluation = SeatMoveCandidate & {
  deviationDelta: number;
  smoothnessDelta: number;
  severityDelta: number;
  rankImproved: boolean;
  severityImproved: boolean;
  meetsMeaningful: boolean;
  distanceMeters: number;
};

type RecommendationCandidate = {
  kind: RecommendationKind;
  title: string;
  detail?: string;
  deviationDelta: number;
  smoothnessDelta: number;
  severityImproved: boolean;
  meetsMeaningful: boolean;
  placement?: GhostSubPlacement;
  seatMove?: SeatMicroMove;
  treatment?: Treatment;
};

function getWallGroup(wall: PlacementWall): PlacementWall | null {
  if (wall === "front" || wall === "rear" || wall === "left" || wall === "right") {
    return wall;
  }
  return null;
}

function isDiverseFromBest(
  best: PlacementEvaluation,
  candidate: PlacementEvaluation,
  minDistance: number,
): boolean {
  const bestWall = getWallGroup(best.wall);
  const candidateWall = getWallGroup(candidate.wall);
  if (bestWall && candidateWall && bestWall !== candidateWall) {
    return true;
  }
  return (
    distanceBetweenPoints(best.position, candidate.position) >= minDistance
  );
}

function comparePlacementBenefit(
  a: PlacementEvaluation,
  b: PlacementEvaluation,
): number {
  if (a.meetsMeaningful !== b.meetsMeaningful) {
    return a.meetsMeaningful ? -1 : 1;
  }
  if (a.severityDelta !== b.severityDelta) {
    return b.severityDelta - a.severityDelta;
  }
  if (a.deviationDelta !== b.deviationDelta) {
    return b.deviationDelta - a.deviationDelta;
  }
  if (a.smoothnessDelta !== b.smoothnessDelta) {
    return b.smoothnessDelta - a.smoothnessDelta;
  }
  return 0;
}

function selectDiversePlacements(
  placements: PlacementEvaluation[],
  room: Room,
): PlacementEvaluation[] {
  if (placements.length <= 3) {
    return placements.slice(0, 3);
  }

  const best = placements[0];
  const selected: PlacementEvaluation[] = [best];
  const minDistance = Math.max(room.width, room.length) * DIVERSITY_DISTANCE_RATIO;

  let diverseCandidate: PlacementEvaluation | null = null;
  for (let index = 1; index < placements.length; index += 1) {
    const candidate = placements[index];
    if (isDiverseFromBest(best, candidate, minDistance)) {
      diverseCandidate = candidate;
      break;
    }
  }

  if (diverseCandidate) {
    selected.push(diverseCandidate);
  }

  for (let index = 1; index < placements.length && selected.length < 3; index += 1) {
    const candidate = placements[index];
    if (candidate === diverseCandidate) {
      continue;
    }
    selected.push(candidate);
  }

  return selected;
}

export function generateGhostSubPlacements(
  state: ProjectState,
  problem: TopProblem,
): GhostSubPlacement[] {
  const validTreatments = getValidTreatments(state);
  const baselineSmoothness = computeSmoothnessScore(state, validTreatments);
  const baselineDeviation = problem.deviation;
  const baselineSeverityRank = getSeverityRank(
    getSeverityTier(baselineDeviation),
  );
  const evaluations: PlacementEvaluation[] = [];

  for (const candidate of buildSubPlacementCandidates(state)) {
    const point = candidate.position;
    if (
      Math.abs(point.x - state.subwoofer.x) < 1e-4 &&
      Math.abs(point.y - state.subwoofer.y) < 1e-4
    ) {
      continue;
    }
    if (!isSubPlacementAllowed(state, point)) {
      continue;
    }

    // TODO: Apply furniture keep-out constraints if/when furniture is modeled.
    const candidateState: ProjectState = {
      ...state,
      subwoofer: { ...state.subwoofer, x: point.x, y: point.y },
    };
    const candidateSmoothness = computeSmoothnessScore(
      candidateState,
      validTreatments,
    );
    const candidateDeviation = estimateProblemDeviation(
      problem,
      candidateState,
      validTreatments,
    );
    const smoothnessDelta = candidateSmoothness - baselineSmoothness;
    const deviationDelta = baselineDeviation - candidateDeviation;
    const candidateSeverityRank = getSeverityRank(
      getSeverityTier(candidateDeviation),
    );
    const severityDelta = baselineSeverityRank - candidateSeverityRank;
    const severityImproved = severityDelta > 0;
    const meetsMeaningful = isGhostPlacementMeaningful(
      baselineDeviation,
      candidateDeviation,
      smoothnessDelta,
    );

    evaluations.push({
      ...candidate,
      deviationDelta,
      smoothnessDelta,
      severityDelta,
      severityImproved,
      meetsMeaningful,
      rationale: getPlacementRationale(candidate),
    });
  }

  if (evaluations.length === 0) {
    return [];
  }

  const sorted = [...evaluations].sort(comparePlacementBenefit);
  const selected = selectDiversePlacements(sorted, state.room);

  return selected.map((placement) => ({
    x: placement.position.x,
    y: placement.position.y,
    source: placement.source,
    wall: placement.wall,
    rationale: placement.rationale,
    deviationDelta: placement.deviationDelta,
    smoothnessDelta: placement.smoothnessDelta,
    meetsMeaningful: placement.meetsMeaningful,
    severityImproved: placement.severityImproved,
  }));
}

function compareSeatMoveBenefit(a: SeatMoveEvaluation, b: SeatMoveEvaluation): number {
  if (a.severityDelta !== b.severityDelta) {
    return b.severityDelta - a.severityDelta;
  }
  if (a.deviationDelta !== b.deviationDelta) {
    return b.deviationDelta - a.deviationDelta;
  }
  if (a.smoothnessDelta !== b.smoothnessDelta) {
    return b.smoothnessDelta - a.smoothnessDelta;
  }
  if (a.rankImproved !== b.rankImproved) {
    return a.rankImproved ? -1 : 1;
  }
  if (a.distanceMeters !== b.distanceMeters) {
    return a.distanceMeters - b.distanceMeters;
  }
  if (a.stepMeters !== b.stepMeters) {
    return a.stepMeters - b.stepMeters;
  }
  const directionOrder: SeatMoveDirection[] = [
    "right",
    "left",
    "back",
    "forward",
  ];
  return (
    directionOrder.indexOf(a.direction) - directionOrder.indexOf(b.direction)
  );
}

export function generateSeatMicroMoves(
  state: ProjectState,
  problem: TopProblem,
): SeatMicroMove[] {
  if (state.constraints.seatLocked) {
    return [];
  }
  if (problem.kind !== "null" || !problem.tags.includes("seat_sensitive")) {
    return [];
  }

  const validTreatments = getValidTreatments(state);
  const baselineSmoothness = computeSmoothnessScore(state, validTreatments);
  const baselineDeviation = problem.deviation;
  const baselineSeverityRank = getSeverityRank(
    getSeverityTier(baselineDeviation),
  );
  const baselineTop = computeTopProblems(
    state,
    validTreatments,
    baselineSmoothness,
  );
  const baselineRank = baselineTop.topProblems.findIndex(
    (item) => item.id === problem.id,
  );

  const smallestPerDirection = new Map<SeatMoveDirection, SeatMoveEvaluation>();

  for (const candidate of buildSeatMoveCandidates(state)) {
    if (smallestPerDirection.has(candidate.direction)) {
      continue;
    }

    const candidateState: ProjectState = {
      ...state,
      seat: { x: candidate.position.x, y: candidate.position.y },
    };
    const candidateSmoothness = computeSmoothnessScore(
      candidateState,
      validTreatments,
    );
    const candidateDeviation = estimateProblemDeviation(
      problem,
      candidateState,
      validTreatments,
    );
    const smoothnessDelta = candidateSmoothness - baselineSmoothness;
    const deviationDelta = baselineDeviation - candidateDeviation;
    const candidateSeverityRank = getSeverityRank(
      getSeverityTier(candidateDeviation),
    );
    const severityDelta = baselineSeverityRank - candidateSeverityRank;
    const rank = getProblemRankForState(
      problem.id,
      candidateState,
      validTreatments,
      candidateSmoothness,
    );
    const rankImproved = baselineRank >= 0 && (rank < 0 || rank < baselineRank);
    const meetsMeaningful = isSeatMoveMeaningful(
      baselineDeviation,
      candidateDeviation,
      smoothnessDelta,
      rankImproved,
    );

    if (!meetsMeaningful) {
      continue;
    }

    const distanceMeters = distanceBetweenPoints(state.seat, candidate.position);
    smallestPerDirection.set(candidate.direction, {
      ...candidate,
      deviationDelta,
      smoothnessDelta,
      severityDelta,
      rankImproved,
      severityImproved: severityDelta > 0,
      meetsMeaningful,
      distanceMeters,
    });
  }

  const selections = Array.from(smallestPerDirection.values());
  if (selections.length === 0) {
    return [];
  }

  const ranked = selections.sort(compareSeatMoveBenefit).slice(0, 2);
  return ranked.map((move, index) => ({
    x: move.position.x,
    y: move.position.y,
    direction: move.direction,
    stepMeters: move.stepMeters,
    distanceMeters: move.distanceMeters,
    label: `Try ${index + 1}`,
    deviationDelta: move.deviationDelta,
    smoothnessDelta: move.smoothnessDelta,
    rankImproved: move.rankImproved,
    severityImproved: move.severityImproved,
    meetsMeaningful: move.meetsMeaningful,
  }));
}

const RECOMMENDATION_KIND_ORDER: RecommendationKind[] = [
  "move_sub",
  "seat_move",
  "add_treatment",
  "change_preset",
  "informational",
];

type TreatmentRecommendationCandidate = {
  treatment: Treatment;
  deviationDelta: number;
  smoothnessDelta: number;
  severityImproved: boolean;
  meetsMeaningful: boolean;
};

function compareRecommendationCandidates(
  a: RecommendationCandidate,
  b: RecommendationCandidate,
): number {
  if (a.severityImproved !== b.severityImproved) {
    return a.severityImproved ? -1 : 1;
  }
  if (a.deviationDelta !== b.deviationDelta) {
    return b.deviationDelta - a.deviationDelta;
  }
  if (a.smoothnessDelta !== b.smoothnessDelta) {
    return b.smoothnessDelta - a.smoothnessDelta;
  }
  return (
    RECOMMENDATION_KIND_ORDER.indexOf(a.kind) -
    RECOMMENDATION_KIND_ORDER.indexOf(b.kind)
  );
}

function buildTreatmentRecommendationCandidate(
  state: ProjectState,
  problem: TopProblem,
  validTreatments: Treatment[],
  baselineSmoothness: number,
  snapZones: ReturnType<typeof generateSnapZones>,
): TreatmentRecommendationCandidate | null {
  const baselineDeviation = problem.deviation;
  const candidates: Array<
    TreatmentRecommendationCandidate & { type: Treatment["type"] }
  > = [];

  const treatmentTypes: Treatment["type"][] = [
    "corner_trap",
    "rear_wall_absorber",
    "thick_panel",
    "tuned_trap",
  ];

  for (const type of treatmentTypes) {
    if (isTreatmentCapReached(type, state.treatments)) {
      continue;
    }
    const eligibleZones = getEligibleZones(type, snapZones);
    if (eligibleZones.length === 0) {
      continue;
    }

    const candidateTreatment: Treatment = {
      id: `rec_${type}_${Math.round(problem.centerHz)}`,
      type,
      strength: "heavy",
      snapZoneId: eligibleZones[0].id,
      coveragePreset: "standard",
      ...(type === "tuned_trap"
        ? { targetHz: Math.max(MIN_FREQ, Math.round(problem.centerHz)) }
        : {}),
    };
    const candidateTreatments = getValidTreatments(state, [
      ...validTreatments,
      candidateTreatment,
    ]);
    const candidateSmoothness = computeSmoothnessScore(
      state,
      candidateTreatments,
    );
    const candidateDeviation = estimateProblemDeviation(
      problem,
      state,
      candidateTreatments,
    );
    const smoothnessDelta = candidateSmoothness - baselineSmoothness;
    const deviationDelta = baselineDeviation - candidateDeviation;
    const severityImproved = isSeverityImproved(
      baselineDeviation,
      candidateDeviation,
    );
    const meetsMeaningful = isMeaningfulImprovement(
      baselineDeviation,
      candidateDeviation,
      smoothnessDelta,
    );

    candidates.push({
      type,
      treatment: candidateTreatment,
      deviationDelta,
      smoothnessDelta,
      severityImproved,
      meetsMeaningful,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  const treatmentOrder: Treatment["type"][] = [
    "corner_trap",
    "rear_wall_absorber",
    "thick_panel",
    "tuned_trap",
  ];

  candidates.sort((a, b) => {
    if (a.severityImproved !== b.severityImproved) {
      return a.severityImproved ? -1 : 1;
    }
    if (a.deviationDelta !== b.deviationDelta) {
      return b.deviationDelta - a.deviationDelta;
    }
    if (a.smoothnessDelta !== b.smoothnessDelta) {
      return b.smoothnessDelta - a.smoothnessDelta;
    }
    return treatmentOrder.indexOf(a.type) - treatmentOrder.indexOf(b.type);
  });

  return candidates[0];
}

function getFallbackPrimaryLine(state: ProjectState): string {
  const opening = state.room.opening ?? null;
  if (
    opening?.type === "doorway" &&
    (opening.doorState ?? "open") === "open"
  ) {
    return FALLBACK_CLOSE_DOOR;
  }
  if (state.constraints.seatLocked) {
    return FALLBACK_UNLOCK_SEAT;
  }
  if (!state.constraints.allowNearfieldSuggestions) {
    return FALLBACK_ALLOW_NEARFIELD;
  }
  return FALLBACK_ALTERNATE_PRESET;
}

function buildFallbackLines(state: ProjectState): string[] {
  return [getFallbackPrimaryLine(state), FALLBACK_VALIDATE, FALLBACK_FUTURE];
}

function buildFallbackRecommendations(
  state: ProjectState,
  impact: RecommendationImpact,
): Recommendation[] {
  const lines = buildFallbackLines(state);
  return lines.map((title, index) => ({
    id: `fallback_${index + 1}`,
    kind: "informational",
    impact,
    title,
    ...(impact === "low" ? { why: IMPACT_LOW_WHY } : {}),
  }));
}

function getTreatmentZoneTier(
  problem: TopProblem,
  treatmentType: Treatment["type"],
  zone: SnapZone,
): ZoneGuidanceTier | null {
  // Placeholder tiering to keep guidance deterministic in v1.
  const zoneId = zone.id;

  if (treatmentType === "corner_trap") {
    return zoneId.startsWith("corner.") ? "best" : null;
  }

  if (treatmentType === "rear_wall_absorber") {
    return zoneId === "wall.rear.full" ? "best" : null;
  }

  if (treatmentType === "thick_panel") {
    if (zoneId.startsWith("wall.rear.")) {
      return "best";
    }
    if (zoneId.startsWith("wall.left.") || zoneId.startsWith("wall.right.")) {
      return "ok";
    }
    if (zoneId.startsWith("wall.front.")) {
      return "limited";
    }
    return null;
  }

  if (treatmentType === "tuned_trap") {
    const lowBand = problem.centerHz <= 60;
    const bestPrefixes = lowBand
      ? ["corner.", "wall.rear."]
      : ["wall.left.", "wall.right."];
    const okPrefixes = lowBand
      ? ["wall.left.", "wall.right."]
      : ["corner.", "wall.rear."];

    if (bestPrefixes.some((prefix) => zoneId.startsWith(prefix))) {
      return "best";
    }
    if (okPrefixes.some((prefix) => zoneId.startsWith(prefix))) {
      return "ok";
    }
    if (zoneId.startsWith("wall.front.")) {
      return "limited";
    }
    return null;
  }

  return null;
}

export function getTreatmentZoneGuidance(
  problem: TopProblem,
  treatmentType: Treatment["type"],
  zones: SnapZone[],
): ZoneGuidance {
  const guidance: ZoneGuidance = {};

  for (const zone of zones) {
    if (zone.disabled) {
      continue;
    }
    if (!isZoneEligibleForTreatment(treatmentType, zone)) {
      continue;
    }
    const tier = getTreatmentZoneTier(problem, treatmentType, zone);
    if (tier) {
      guidance[zone.id] = tier;
    }
  }

  return guidance;
}

export function generateRecommendations(
  state: ProjectState,
  problem: TopProblem,
): RecommendationSet {
  const validTreatments = getValidTreatments(state);
  const baselineSmoothness = computeSmoothnessScore(state, validTreatments);
  const snapZones = generateSnapZones(state.room, state.room.opening ?? null);
  const candidates: RecommendationCandidate[] = [];

  const placements = generateGhostSubPlacements(state, problem);
  for (const placement of placements) {
    candidates.push({
      kind: "move_sub",
      title: formatSubPlacementTitle(state.room, placement),
      detail: placement.rationale,
      deviationDelta: placement.deviationDelta,
      smoothnessDelta: placement.smoothnessDelta,
      severityImproved: placement.severityImproved,
      meetsMeaningful: placement.meetsMeaningful,
      placement,
    });
  }

  const seatMoves = generateSeatMicroMoves(state, problem);
  for (const move of seatMoves) {
    candidates.push({
      kind: "seat_move",
      title: formatSeatMoveTitle(move, state.units),
      detail: "Moves off cancellation line.",
      deviationDelta: move.deviationDelta,
      smoothnessDelta: move.smoothnessDelta,
      severityImproved: move.severityImproved,
      meetsMeaningful: move.meetsMeaningful,
      seatMove: move,
    });
  }

  const treatmentCandidate = buildTreatmentRecommendationCandidate(
    state,
    problem,
    validTreatments,
    baselineSmoothness,
    snapZones,
  );
  if (treatmentCandidate) {
    const treatment = treatmentCandidate.treatment;
    const detailParts = [`Zone: ${treatment.snapZoneId}`];
    if (treatment.type === "tuned_trap" && treatment.targetHz) {
      detailParts.push(`Target: ${Math.round(treatment.targetHz)} Hz`);
    }
    candidates.push({
      kind: "add_treatment",
      title: `Add ${getTreatmentLabel(treatment.type)}`,
      detail: detailParts.join(" | "),
      deviationDelta: treatmentCandidate.deviationDelta,
      smoothnessDelta: treatmentCandidate.smoothnessDelta,
      severityImproved: treatmentCandidate.severityImproved,
      meetsMeaningful: treatmentCandidate.meetsMeaningful,
      treatment,
    });
  }

  candidates.push({
    kind: "change_preset",
    title: FALLBACK_ALTERNATE_PRESET,
    deviationDelta: 0,
    smoothnessDelta: 0,
    severityImproved: false,
    meetsMeaningful: false,
  });

  const meaningfulCandidates = candidates.filter((candidate) => candidate.meetsMeaningful);
  if (meaningfulCandidates.length === 0) {
    return {
      banner: { title: FALLBACK_BANNER_TITLE, body: FALLBACK_BANNER_BODY },
      recommendations: buildFallbackRecommendations(state, "informational"),
    };
  }

  const selected: Recommendation[] = meaningfulCandidates
    .sort(compareRecommendationCandidates)
    .slice(0, 3)
    .map((candidate, index) => ({
      id: `${candidate.kind}_${index}`,
      kind: candidate.kind,
      impact: "meaningful",
      title: candidate.title,
      detail: candidate.detail,
      placement: candidate.placement,
      seatMove: candidate.seatMove,
      treatment: candidate.treatment,
    }));

  const usedTitles = new Set(selected.map((item) => item.title));
  if (selected.length < 3) {
    const belowThreshold = candidates
      .filter((candidate) => !candidate.meetsMeaningful)
      .sort(compareRecommendationCandidates);

    for (const candidate of belowThreshold) {
      if (selected.length >= 3) {
        break;
      }
      if (usedTitles.has(candidate.title)) {
        continue;
      }
      usedTitles.add(candidate.title);
      selected.push({
        id: `${candidate.kind}_low_${selected.length}`,
        kind: candidate.kind,
        impact: "low",
        title: candidate.title,
        detail: candidate.detail,
        why: IMPACT_LOW_WHY,
        placement: candidate.placement,
        seatMove: candidate.seatMove,
        treatment: candidate.treatment,
      });
    }

    if (selected.length < 3) {
      for (const fallback of buildFallbackRecommendations(state, "low")) {
        if (selected.length >= 3) {
          break;
        }
        if (usedTitles.has(fallback.title)) {
          continue;
        }
        usedTitles.add(fallback.title);
        selected.push({
          ...fallback,
          id: `fallback_low_${selected.length + 1}`,
        });
      }
    }
  }

  return { recommendations: selected };
}

function getFixabilityPrimary(
  problem: TopProblem,
  tags: ProblemTag[],
): FixabilityPrimary {
  if (problem.kind === "null") {
    if (tags.includes("seat_sensitive")) {
      return "seat_move";
    }
    if (tags.includes("placement_sensitive")) {
      return "sub_move";
    }
    return "seat_move";
  }

  if (tags.includes("placement_sensitive")) {
    return "sub_move";
  }
  if (tags.includes("treatment_responsive")) {
    return "add_treatment";
  }
  return "sub_move";
}

function applyFixabilityTags(
  problem: TopProblem,
  state: ProjectState,
  validTreatments: Treatment[],
  snapZones: ReturnType<typeof generateSnapZones>,
  baselineTopProblems: TopProblem[],
  baselineSmoothness: number,
): TopProblem {
  const tags: ProblemTag[] = [];

  if (problem.centerHz >= 80) {
    tags.push("integration_sensitive");
  }

  if (
    hasSeatSensitiveImprovement(
      problem,
      baselineTopProblems,
      state,
      validTreatments,
      baselineSmoothness,
    )
  ) {
    tags.push("seat_sensitive");
  }

  if (
    hasPlacementSensitiveImprovement(
      problem,
      state,
      validTreatments,
      baselineSmoothness,
    )
  ) {
    tags.push("placement_sensitive");
  }

  if (
    hasTreatmentResponsiveImprovement(
      problem,
      state,
      baselineSmoothness,
      snapZones,
    )
  ) {
    tags.push("treatment_responsive");
  }

  return {
    ...problem,
    tags,
    fixabilityPrimary: getFixabilityPrimary(problem, tags),
  };
}

export function analyzeProjectState(
  state: ProjectState,
  context?: AnalysisContext,
): AnalysisResult {
  const validTreatments = getValidTreatments(state);
  const smoothnessScore = computeSmoothnessScore(state, validTreatments);
  const tightnessScore = computeTightnessScore(state, validTreatments);
  const confidenceScore = computeConfidenceScore(state, context);
  const confidenceLevel = getConfidenceLevel(confidenceScore);
  const topProblems = computeTopProblems(
    state,
    validTreatments,
    smoothnessScore,
    context?.previousAnalysis?.analysisHistory,
  );
  const snapZones = generateSnapZones(state.room, state.room.opening ?? null);
  const topProblemsWithTags = topProblems.noMajorIssues
    ? []
    : topProblems.topProblems.map((problem) =>
        applyFixabilityTags(
          problem,
          state,
          validTreatments,
          snapZones,
          topProblems.topProblems,
          smoothnessScore,
        ),
      );

  return {
    smoothnessScore,
    smoothnessBand: getScoreBand(smoothnessScore),
    tightnessScore,
    tightnessBand: getScoreBand(tightnessScore),
    confidenceScore,
    confidenceLevel,
    topProblems: topProblemsWithTags,
    deepBassWatchlist: topProblems.deepBassWatchlist,
    noMajorIssues: topProblems.noMajorIssues,
    analysisHistory: topProblems.analysisHistory,
  };
}
