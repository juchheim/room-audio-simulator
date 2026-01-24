import type { AnalysisResult, TopProblem } from "../analysis";
import { generateRecommendations } from "../analysis";
import type { Opening, ProjectState, Units } from "../projectState";
import { serializeProjectState } from "../projectState";
import type { AnalysisSummary } from "../snapshots";
import { getTreatmentLabel } from "../treatments";

const FEET_PER_METER = 3.28084;

type ExportCompareSummary = {
  a: AnalysisSummary;
  b: AnalysisSummary;
  changeLog: string[];
};

type PlanExportOptions = {
  now?: Date;
  compareSummary?: ExportCompareSummary;
};

function formatUnits(units: Units): string {
  return units === "imperial" ? "Imperial" : "Metric";
}

function formatLength(valueMeters: number, units: Units): string {
  if (units === "imperial") {
    return `${(valueMeters * FEET_PER_METER).toFixed(2)} ft`;
  }
  return `${valueMeters.toFixed(2)} m`;
}

function formatPosition(
  label: string,
  position: { x: number; y: number },
  units: Units,
): string {
  return `${label}: x ${formatLength(position.x, units)}, y ${formatLength(
    position.y,
    units,
  )}`;
}

function formatOpening(opening: Opening | null | undefined, units: Units): string {
  if (!opening) {
    return "Opening: None";
  }
  const doorState =
    opening.type === "doorway" && opening.doorState
      ? `, door ${opening.doorState}`
      : "";
  return `Opening: ${opening.type} (${opening.wall} wall, width ${formatLength(
    opening.width,
    units,
  )}, center ${opening.positionAlongWallNorm.toFixed(2)}${doorState})`;
}

function formatSeverity(severity: TopProblem["severity"]): string {
  return `${severity[0].toUpperCase()}${severity.slice(1)}`;
}

function formatProblem(problem: TopProblem): string {
  const kindLabel = problem.kind === "peak" ? "Peak" : "Null";
  const center = Math.round(problem.centerHz);
  const low = Math.round(problem.rangeHz.low);
  const high = Math.round(problem.rangeHz.high);
  return `${kindLabel} ~${center} (${low}-${high}) - ${formatSeverity(
    problem.severity,
  )}`;
}

function formatTreatmentLine(treatment: ProjectState["treatments"][number]): string {
  const label = getTreatmentLabel(treatment.type);
  if (treatment.type === "tuned_trap" && treatment.targetHz !== undefined) {
    return `${label} - ${treatment.strength} - ${treatment.snapZoneId} - ${Math.round(
      treatment.targetHz,
    )} Hz`;
  }
  return `${label} - ${treatment.strength} - ${treatment.snapZoneId}`;
}

function getConfidenceBannerText(level: AnalysisResult["confidenceLevel"]): string {
  switch (level) {
    case "High":
      return "Confidence: High - room and inputs are well defined.";
    case "Low":
      return "Confidence: Low - large opening/leakage or missing inputs. Use this as directional guidance and validate by ear/measurement.";
    case "Medium":
    default:
      return "Confidence: Medium - good directional guidance; results may vary with room openness and construction.";
  }
}

function buildRecommendationLines(
  state: ProjectState,
  problem: TopProblem,
): string[] {
  const lines: string[] = [];
  const recommendationSet = generateRecommendations(state, problem);

  if (recommendationSet.banner) {
    lines.push(`Note: ${recommendationSet.banner.title}`);
    lines.push(recommendationSet.banner.body);
  }

  recommendationSet.recommendations.forEach((rec, index) => {
    const impact = rec.impact === "low" ? " (Impact: Low)" : "";
    const detail = rec.detail ? ` - ${rec.detail}` : "";
    lines.push(`${index + 1}. ${rec.title}${impact}${detail}`);
    if (rec.impact === "low" && rec.why) {
      lines.push(`   Why: ${rec.why}`);
    }
  });

  return lines;
}

function buildFixPlan(
  state: ProjectState,
  problems: TopProblem[],
): string[] {
  if (problems.length === 0) {
    return ["No major issues detected."];
  }

  const lines: string[] = [];
  problems.forEach((problem, index) => {
    lines.push(`Problem ${index + 1}: ${formatProblem(problem)}`);
    lines.push(...buildRecommendationLines(state, problem));
  });
  return lines;
}

export function buildProjectJson(state: ProjectState): string {
  return serializeProjectState(state);
}

export function buildPlanMarkdown(
  state: ProjectState,
  analysis: AnalysisResult,
  options?: PlanExportOptions,
): string {
  const now = options?.now ?? new Date();
  const lines: string[] = [];

  lines.push(`# ${state.name} Plan`);
  lines.push(`Date: ${now.toISOString()}`);
  lines.push(`Units: ${formatUnits(state.units)}`);
  lines.push(getConfidenceBannerText(analysis.confidenceLevel));
  lines.push("");

  lines.push("## Room summary");
  lines.push(
    `Room: ${formatLength(state.room.width, state.units)} x ${formatLength(
      state.room.length,
      state.units,
    )} x ${formatLength(state.room.height, state.units)}`,
  );
  lines.push(formatOpening(state.room.opening, state.units));
  lines.push("");

  lines.push("## Seat + mains + sub");
  lines.push(formatPosition("Seat", state.seat, state.units));
  lines.push(formatPosition("Mains L", state.mains.left, state.units));
  lines.push(formatPosition("Mains R", state.mains.right, state.units));
  lines.push(
    `Mains lowest strong bass: ${Math.round(
      state.mains.mainsLowestStrongBassHz,
    )} Hz`,
  );
  lines.push(
    `Subwoofer: x ${formatLength(state.subwoofer.x, state.units)}, y ${formatLength(
      state.subwoofer.y,
      state.units,
    )} | mode ${state.subwoofer.mode} | preset ${state.subwoofer.preset} | driver ${state.subwoofer.driverDirection} | port ${state.subwoofer.portDirection}`,
  );
  if (state.subwoofer.mode === "sealed" && state.subwoofer.lowestStrongBassHz) {
    lines.push(
      `Sub lowest strong bass: ${Math.round(state.subwoofer.lowestStrongBassHz)} Hz`,
    );
  }
  if (state.subwoofer.mode === "ported" && state.subwoofer.fbHz) {
    lines.push(`Sub Fb: ${Math.round(state.subwoofer.fbHz)} Hz`);
  }
  lines.push("");

  lines.push("## Treatments");
  if (state.treatments.length === 0) {
    lines.push("None");
  } else {
    state.treatments.forEach((treatment) => {
      lines.push(`- ${formatTreatmentLine(treatment)}`);
    });
  }
  lines.push("");

  lines.push("## Results summary");
  lines.push(
    `Smoothness: ${analysis.smoothnessScore} (${analysis.smoothnessBand})`,
  );
  lines.push(
    `Tightness: ${analysis.tightnessScore} (${analysis.tightnessBand})`,
  );
  if (analysis.deepBassWatchlist) {
    const watchlist = analysis.deepBassWatchlist;
    lines.push(
      `Deep Bass Watchlist: ${formatProblem({
        id: "deep-bass",
        kind: watchlist.kind,
        centerHz: watchlist.centerHz,
        rangeHz: watchlist.rangeHz,
        severity: watchlist.severity,
        deviation: watchlist.deviation,
        fixabilityPrimary: "sub_move",
        tags: [],
      })}`,
    );
  }
  lines.push("");

  lines.push("## Top Problems");
  if (analysis.noMajorIssues || analysis.topProblems.length === 0) {
    lines.push("No major issues detected.");
  } else {
    analysis.topProblems.forEach((problem, index) => {
      lines.push(`${index + 1}. ${formatProblem(problem)}`);
    });
  }
  lines.push("");

  lines.push("## Fix Plan");
  lines.push(...buildFixPlan(state, analysis.topProblems));
  lines.push("");

  if (options?.compareSummary) {
    const compare = options.compareSummary;
    lines.push("## A/B summary");
    lines.push(
      `Smoothness: A ${compare.a.smoothnessScore} -> B ${compare.b.smoothnessScore} (Change ${(
        compare.b.smoothnessScore - compare.a.smoothnessScore
      ).toFixed(0)})`,
    );
    lines.push(
      `Tightness: A ${compare.a.tightnessScore} -> B ${compare.b.tightnessScore} (Change ${(
        compare.b.tightnessScore - compare.a.tightnessScore
      ).toFixed(0)})`,
    );
    lines.push(
      `Confidence: A ${compare.a.confidenceLevel} -> B ${compare.b.confidenceLevel} (Score ${(
        compare.b.confidenceScore - compare.a.confidenceScore
      ).toFixed(2)})`,
    );
    if (compare.changeLog.length > 0) {
      lines.push(`Change log: ${compare.changeLog.join(" | ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
