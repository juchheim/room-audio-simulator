import { SCHEMA_VERSION } from "../schema";

type LegacyOpening = {
  wall: string;
  positionAlongWallNorm: number;
  width: number;
  type: string;
  doorState?: string;
};

type LegacyRoom = {
  length: number;
  width: number;
  height: number;
  opening?: LegacyOpening | null;
  openings?: unknown[];
};

function generateOpeningId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function migrateOpeningToOpenings(room: LegacyRoom): LegacyRoom {
  // Already migrated or new format
  if (room.openings !== undefined) {
    return room;
  }

  // Has legacy opening field
  if (room.opening) {
    const legacyOpening = room.opening;
    const migratedOpening = {
      id: generateOpeningId(),
      ...legacyOpening,
    };
    const { opening: _, ...roomWithoutOpening } = room;
    return {
      ...roomWithoutOpening,
      openings: [migratedOpening],
    };
  }

  // No opening at all - set empty array
  const { opening: _, ...roomWithoutOpening } = room;
  return {
    ...roomWithoutOpening,
    openings: [],
  };
}

export function migrateProjectState(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const candidate = raw as { schemaVersion?: unknown; room?: LegacyRoom };
  const version = candidate.schemaVersion;

  // Migrate room.opening to room.openings
  if (candidate.room) {
    candidate.room = migrateOpeningToOpenings(candidate.room);
  }

  if (version === undefined) {
    return {
      ...candidate,
      schemaVersion: SCHEMA_VERSION,
    };
  }

  if (version === SCHEMA_VERSION) {
    return candidate;
  }

  throw new Error(`Unsupported schemaVersion: ${String(version)}`);
}

