import { describe, expect, it } from "vitest";

import type { Subwoofer } from "./schema";
import { normalizeSubwooferForMode } from "./subwoofer";

describe("normalizeSubwooferForMode", () => {
  it("normalizes sealed mode fields and strips ported-only data", () => {
    const input: Subwoofer = {
      x: 1,
      y: 2,
      mode: "sealed",
      preset: "Big & Bold",
      driverDirection: "rear",
      portDirection: "front",
      fbHz: 26,
    };

    const normalized = normalizeSubwooferForMode(input);

    expect(normalized.mode).toBe("sealed");
    expect(normalized.preset).toBe("Balanced");
    expect(normalized.portDirection).toBe("none");
    expect(normalized.lowestStrongBassHz).toBe(30);
    expect(normalized.fbHz).toBeUndefined();
  });

  it("normalizes ported mode fields and strips sealed-only data", () => {
    const input: Subwoofer = {
      x: 1,
      y: 2,
      mode: "ported",
      preset: "Warm & Full",
      driverDirection: "rear",
      portDirection: "none",
      lowestStrongBassHz: 28,
    };

    const normalized = normalizeSubwooferForMode(input);

    expect(normalized.mode).toBe("ported");
    expect(normalized.preset).toBe("Balanced");
    expect(normalized.portDirection).toBe("rear");
    expect(normalized.fbHz).toBe(30);
    expect(normalized.lowestStrongBassHz).toBeUndefined();
  });
});
