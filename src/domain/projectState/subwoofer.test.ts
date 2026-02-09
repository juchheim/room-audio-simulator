import { describe, expect, it } from "vitest";

import type { Subwoofer } from "./schema";
import {
  applyCatalogSubModelToSubwoofer,
  normalizeSubwoofer,
  normalizeSubwooferForMode,
} from "./subwoofer";

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

describe("subwoofer model plumbing", () => {
  it("applies selected catalog profile defaults to subwoofer state", () => {
    const base: Subwoofer = {
      x: 1,
      y: 2,
      mode: "sealed",
      preset: "Balanced",
      driverDirection: "rear",
      portDirection: "none",
      lowestStrongBassHz: 30,
    };

    const updated = applyCatalogSubModelToSubwoofer(
      base,
      "vera-fi-vanguard-caldera-10",
    );

    expect(updated.mode).toBe("ported");
    expect(updated.driverDirection).toBe("front");
    expect(updated.portDirection).toBe("rear");
    expect(updated.preset).toBe("Balanced");
    expect(updated.fbHz).toBe(52);
    expect(updated.subModel).toEqual({
      source: "catalog",
      catalogId: "vera-fi-vanguard-caldera-10",
      manufacturer: "Vera-Fi",
      model: "Vanguard Caldera 10",
    });
  });

  it("applies Speedwoofer model defaults including orientation and tuning", () => {
    const base: Subwoofer = {
      x: 1,
      y: 2,
      mode: "sealed",
      preset: "Balanced",
      driverDirection: "rear",
      portDirection: "none",
      lowestStrongBassHz: 30,
    };

    const updated = applyCatalogSubModelToSubwoofer(
      base,
      "rsl-speedwoofer-10s-mkii",
    );

    expect(updated.mode).toBe("ported");
    expect(updated.driverDirection).toBe("front");
    expect(updated.portDirection).toBe("rear");
    expect(updated.preset).toBe("Deep & Smooth");
    expect(updated.fbHz).toBe(24);
    expect(updated.subModel).toEqual({
      source: "catalog",
      catalogId: "rsl-speedwoofer-10s-mkii",
      manufacturer: "RSL",
      model: "Speedwoofer 10S MKII",
    });
  });

  it("normalizes missing or invalid subModel metadata", () => {
    const noModel: Subwoofer = {
      x: 1,
      y: 2,
      mode: "sealed",
      preset: "Balanced",
      driverDirection: "rear",
      portDirection: "none",
      lowestStrongBassHz: 30,
    };

    const normalizedDefault = normalizeSubwoofer(noModel);
    expect(normalizedDefault.subModel).toEqual({
      source: "catalog",
      catalogId: "generic-sealed-balanced",
      manufacturer: "Generic",
      model: "Sealed (Balanced)",
    });

    const withInvalidCustom: Subwoofer = {
      ...noModel,
      subModel: {
        source: "custom",
        manufacturer: " ",
        model: "",
      },
    };

    const normalizedCustom = normalizeSubwoofer(withInvalidCustom);
    expect(normalizedCustom.subModel).toEqual({
      source: "custom",
      manufacturer: "Custom",
      model: "Custom Subwoofer",
    });
  });
});
