import { describe, expect, it } from "vitest";

import {
  createDefaultProjectState,
  deserializeProjectState,
  serializeProjectState,
} from "./index";

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
});
