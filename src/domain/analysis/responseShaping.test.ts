import { describe, expect, it } from "vitest";

import { analyzeProjectState, computeResponseCurve } from "./index";
import {
  applyCatalogSubModelToSubwoofer,
  createDefaultProjectState,
  normalizeSubwoofer,
} from "../projectState";

function getPointAtFrequency(
  points: ReturnType<typeof computeResponseCurve>,
  frequency: number,
) {
  const point = points.find((candidate) => candidate.frequency === frequency);
  if (!point) {
    throw new Error(`Missing response point at ${frequency} Hz`);
  }
  return point;
}

describe("measurement-backed subwoofer response shaping", () => {
  it("applies Caldera-specific shaping and publishes confidence bounds", () => {
    const base = createDefaultProjectState(new Date("2026-01-01T00:00:00.000Z"));

    const calderaState = {
      ...base,
      subwoofer: applyCatalogSubModelToSubwoofer(
        base.subwoofer,
        "vera-fi-vanguard-caldera-10",
      ),
    };

    const genericState = {
      ...base,
      subwoofer: normalizeSubwoofer({
        ...applyCatalogSubModelToSubwoofer(
          base.subwoofer,
          "generic-ported-balanced",
        ),
        driverDirection: "front",
        portDirection: "rear",
        fbHz: 52,
      }),
    };

    const calderaCurve = computeResponseCurve(calderaState, {
      minHz: 20,
      maxHz: 120,
      stepHz: 5,
    });
    const genericCurve = computeResponseCurve(genericState, {
      minHz: 20,
      maxHz: 120,
      stepHz: 5,
    });

    const caldera40 = getPointAtFrequency(calderaCurve, 40);
    const generic40 = getPointAtFrequency(genericCurve, 40);
    expect(caldera40.response).toBeGreaterThan(generic40.response);

    const caldera110 = getPointAtFrequency(calderaCurve, 110);
    const generic110 = getPointAtFrequency(genericCurve, 110);
    expect(caldera110.response).toBeLessThan(generic110.response);

    const caldera25 = getPointAtFrequency(calderaCurve, 25);
    expect(caldera40.confidenceBounds?.plusMinusDb).toBe(1.5);
    expect(caldera25.confidenceBounds?.plusMinusDb).toBe(3);
    expect(caldera40.shapeSourceLabel).toContain("Near-field aligned-sum trace");
    expect(generic40.confidenceBounds).toBeUndefined();
  });

  it("applies Speedwoofer-specific shaping and tighter bounds in mid-band", () => {
    const base = createDefaultProjectState(new Date("2026-01-01T00:00:00.000Z"));

    const speedwooferState = {
      ...base,
      subwoofer: applyCatalogSubModelToSubwoofer(
        base.subwoofer,
        "rsl-speedwoofer-10s-mkii",
      ),
    };
    const genericState = {
      ...base,
      subwoofer: normalizeSubwoofer({
        ...applyCatalogSubModelToSubwoofer(
          base.subwoofer,
          "generic-ported-balanced",
        ),
        driverDirection: "front",
        portDirection: "rear",
        fbHz: 24,
      }),
    };

    const speedwooferCurve = computeResponseCurve(speedwooferState, {
      minHz: 20,
      maxHz: 125,
      stepHz: 5,
    });
    const genericCurve = computeResponseCurve(genericState, {
      minHz: 20,
      maxHz: 125,
      stepHz: 5,
    });

    const speedwoofer40 = getPointAtFrequency(speedwooferCurve, 40);
    const generic40 = getPointAtFrequency(genericCurve, 40);
    expect(speedwoofer40.response).toBeGreaterThan(generic40.response);
    expect(speedwoofer40.confidenceBounds?.plusMinusDb).toBe(1.5);

    const speedwoofer20 = getPointAtFrequency(speedwooferCurve, 20);
    expect(speedwoofer20.confidenceBounds?.plusMinusDb).toBe(2.5);
    expect(speedwoofer40.shapeSourceLabel).toContain("Audioholics");
  });

  it("incorporates model-data confidence into analysis confidence score", () => {
    const base = createDefaultProjectState(new Date("2026-01-01T00:00:00.000Z"));

    const speedwooferState = {
      ...base,
      subwoofer: applyCatalogSubModelToSubwoofer(
        base.subwoofer,
        "rsl-speedwoofer-10s-mkii",
      ),
    };
    const calderaState = {
      ...base,
      subwoofer: applyCatalogSubModelToSubwoofer(
        base.subwoofer,
        "vera-fi-vanguard-caldera-10",
      ),
    };
    const genericPortedState = {
      ...base,
      subwoofer: applyCatalogSubModelToSubwoofer(
        base.subwoofer,
        "generic-ported-balanced",
      ),
    };

    const speedwooferAnalysis = analyzeProjectState(speedwooferState);
    const calderaAnalysis = analyzeProjectState(calderaState);
    const genericAnalysis = analyzeProjectState(genericPortedState);

    expect(speedwooferAnalysis.confidenceScore).toBeGreaterThan(
      calderaAnalysis.confidenceScore,
    );
    expect(calderaAnalysis.confidenceScore).toBeGreaterThan(genericAnalysis.confidenceScore);
    expect(calderaAnalysis.confidenceLevel).toBe("Medium");
    expect(speedwooferAnalysis.confidenceLevel).not.toBe("Low");
  });
});
