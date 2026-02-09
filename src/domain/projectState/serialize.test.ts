import { describe, expect, it } from "vitest";

import {
  createDefaultProjectState,
  deserializeProjectState,
  serializeProjectState,
} from "./index";
import { LEGACY_SCHEMA_VERSION, SCHEMA_VERSION } from "./schema";

describe("project state serialization", () => {
  it("round-trips state with multiple openings", () => {
    const base = createDefaultProjectState(new Date("2026-01-01T00:00:00.000Z"));
    const state = {
      ...base,
      room: {
        ...base.room,
        openings: [
          {
            id: "op-1",
            wall: "rear" as const,
            positionAlongWallNorm: 0.5,
            width: 0.914,
            type: "doorway" as const,
            doorState: "open" as const,
          },
          {
            id: "op-2",
            wall: "left" as const,
            positionAlongWallNorm: 0.3,
            width: 1.219,
            type: "hallway" as const,
          },
        ],
      },
    };

    const serialized = serializeProjectState(state);
    const hydrated = deserializeProjectState(serialized);

    expect(hydrated.room.openings).toHaveLength(2);
    expect(hydrated.room.openings[0].id).toBe("op-1");
    expect(hydrated.room.openings[1].id).toBe("op-2");
  });

  it("migrates legacy room.opening into room.openings", () => {
    const base = createDefaultProjectState(new Date("2026-01-01T00:00:00.000Z"));
    const raw = {
      ...base,
      room: {
        ...base.room,
        opening: {
          wall: "rear",
          positionAlongWallNorm: 0.5,
          width: 0.914,
          type: "doorway",
          doorState: "open",
        },
      },
    } as unknown as Record<string, unknown>;

    delete (raw.room as Record<string, unknown>).openings;

    const migrated = deserializeProjectState(raw);

    expect(migrated.room.openings).toHaveLength(1);
    expect(migrated.room.openings[0].wall).toBe("rear");
    expect(migrated.room.openings[0].id).toBeTypeOf("string");
    expect(migrated.room.openings[0].id.length).toBeGreaterThan(0);
  });

  it("sanitizes malformed legacy room dimensions/openings and upgrades schema", () => {
    const base = createDefaultProjectState(new Date("2026-01-01T00:00:00.000Z"));
    const raw = {
      ...base,
      schemaVersion: LEGACY_SCHEMA_VERSION,
      room: {
        ...base.room,
        length: -1,
        width: 0,
        height: Number.NaN,
        openings: [
          {
            id: "",
            wall: "ceiling",
            positionAlongWallNorm: 9,
            width: -10,
            type: "not-a-real-type",
            doorState: "ajar",
          },
          {
            id: "op-2",
            wall: "left",
            positionAlongWallNorm: -3,
            width: 1,
            type: "hallway",
            doorState: "open",
          },
          null,
          "bad",
          {},
          {
            id: "op-3",
            wall: "rear",
            positionAlongWallNorm: 0.25,
            width: 1.2,
            type: "doorway",
            doorState: "closed",
          },
          {
            id: "op-4",
            wall: "rear",
            positionAlongWallNorm: 0.5,
            width: 1.2,
            type: "doorway",
            doorState: "open",
          },
          {
            id: "op-5",
            wall: "rear",
            positionAlongWallNorm: 0.75,
            width: 1.2,
            type: "doorway",
            doorState: "open",
          },
          {
            id: "op-6",
            wall: "rear",
            positionAlongWallNorm: 0.9,
            width: 1.2,
            type: "doorway",
            doorState: "open",
          },
        ],
      },
    };

    const migrated = deserializeProjectState(raw);

    expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.room.length).toBeCloseTo(4.8768, 4);
    expect(migrated.room.width).toBeCloseTo(3.6576, 4);
    expect(migrated.room.height).toBeCloseTo(2.4384, 4);
    expect(migrated.room.openings).toHaveLength(5);

    const firstOpening = migrated.room.openings[0];
    expect(firstOpening.wall).toBe("rear");
    expect(firstOpening.type).toBe("doorway");
    expect(firstOpening.width).toBeCloseTo(0.914, 3);
    expect(firstOpening.doorState).toBe("open");
    expect(firstOpening.id.length).toBeGreaterThan(0);
    expect(firstOpening.positionAlongWallNorm).toBeGreaterThan(0);
    expect(firstOpening.positionAlongWallNorm).toBeLessThan(1);

    const secondOpening = migrated.room.openings[1];
    expect(secondOpening.type).toBe("hallway");
    expect(secondOpening.doorState).toBeUndefined();
    expect(secondOpening.positionAlongWallNorm).toBeGreaterThan(0);
    expect(secondOpening.positionAlongWallNorm).toBeLessThan(1);
  });

  it("sanitizes malformed subwoofer fields and fallback model details", () => {
    const base = createDefaultProjectState(new Date("2026-01-01T00:00:00.000Z"));
    const raw = {
      ...base,
      schemaVersion: SCHEMA_VERSION,
      subwoofer: {
        x: Number.NaN,
        y: "invalid",
        mode: "ported",
        preset: "Warm & Full",
        driverDirection: "up",
        portDirection: "none",
        fbHz: -20,
        lowestStrongBassHz: 24,
        subModel: {
          source: "catalog",
          catalogId: "",
          manufacturer: "",
          model: "",
          revision: 1,
        },
      },
    };

    const migrated = deserializeProjectState(raw);

    expect(migrated.subwoofer.mode).toBe("ported");
    expect(migrated.subwoofer.x).toBe(0);
    expect(migrated.subwoofer.y).toBe(0);
    expect(migrated.subwoofer.preset).toBe("Balanced");
    expect(migrated.subwoofer.driverDirection).toBe("rear");
    expect(migrated.subwoofer.portDirection).toBe("rear");
    expect(migrated.subwoofer.fbHz).toBe(30);
    expect(migrated.subwoofer.lowestStrongBassHz).toBeUndefined();
    expect(migrated.subwoofer.subModel).toEqual({
      source: "catalog",
      catalogId: "generic-ported-balanced",
      manufacturer: "Generic",
      model: "Ported (Balanced)",
    });
  });
});
