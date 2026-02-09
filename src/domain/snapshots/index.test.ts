import { describe, expect, it } from "vitest";

import { createDefaultProjectState } from "../projectState";
import { buildChangeLog } from "./index";

describe("buildChangeLog", () => {
  it("handles opening add/update/remove with room.openings", () => {
    const base = createDefaultProjectState(new Date("2026-01-01T00:00:00.000Z"));
    const withOpening = {
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
        ],
      },
      updatedAt: "2026-01-01T00:01:00.000Z",
    };
    const updatedOpening = {
      ...withOpening,
      room: {
        ...withOpening.room,
        openings: [
          {
            ...withOpening.room.openings[0],
            wall: "left" as const,
            width: 1.219,
          },
        ],
      },
      updatedAt: "2026-01-01T00:02:00.000Z",
    };
    const removedOpening = {
      ...updatedOpening,
      room: {
        ...updatedOpening.room,
        openings: [],
      },
      updatedAt: "2026-01-01T00:03:00.000Z",
    };

    const addLog = buildChangeLog(base, withOpening);
    const updateLog = buildChangeLog(withOpening, updatedOpening);
    const removeLog = buildChangeLog(updatedOpening, removedOpening);

    expect(addLog.some((line) => line.startsWith("Openings added:"))).toBe(true);
    expect(updateLog.some((line) => line.startsWith("Opening updated"))).toBe(true);
    expect(removeLog.some((line) => line.startsWith("Openings removed:"))).toBe(true);
  });
});
