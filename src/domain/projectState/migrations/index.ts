import type { Subwoofer } from "../schema";
import { LEGACY_SCHEMA_VERSION, SCHEMA_VERSION } from "../schema";
import {
  DEFAULT_CUSTOM_SUB_MANUFACTURER,
  DEFAULT_CUSTOM_SUB_MODEL,
  normalizeSubwoofer,
} from "../subwoofer";
import {
  getCatalogSubModelById,
  getDefaultCatalogSubModelForMode,
  toCatalogSubModel,
} from "../subModelCatalog";

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

type LegacySubModel = {
  source?: unknown;
  catalogId?: unknown;
  manufacturer?: unknown;
  model?: unknown;
  revision?: unknown;
};

type LegacySubwoofer = Partial<Subwoofer> & {
  subModel?: LegacySubModel;
};

const DEFAULT_ROOM_WIDTH_M = 3.6576;
const DEFAULT_ROOM_LENGTH_M = 4.8768;
const DEFAULT_ROOM_HEIGHT_M = 2.4384;

const OPENING_TYPES = new Set(["doorway", "hallway", "open_plan"]);
const OPENING_WALLS = new Set(["front", "rear", "left", "right"]);
const DOOR_STATES = new Set(["open", "closed"]);
const DRIVER_DIRECTIONS = new Set(["front", "rear", "left", "right", "down"]);
const PORT_DIRECTIONS = new Set([
  "front",
  "rear",
  "left",
  "right",
  "down",
  "none",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getSafeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function sanitizeRoomDimension(value: unknown, fallback: number): number {
  return isPositiveNumber(value) ? value : fallback;
}

function sanitizeOpening(input: unknown): LegacyOpening & { id: string } | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const opening = input as Record<string, unknown>;
  const type = OPENING_TYPES.has(String(opening.type))
    ? (opening.type as "doorway" | "hallway" | "open_plan")
    : "doorway";
  const wall = OPENING_WALLS.has(String(opening.wall))
    ? (opening.wall as "front" | "rear" | "left" | "right")
    : "rear";
  const width = isPositiveNumber(opening.width) ? opening.width : type === "doorway" ? 0.914 : type === "hallway" ? 1.219 : 2.438;
  const positionAlongWallNorm = clamp(
    typeof opening.positionAlongWallNorm === "number" &&
      Number.isFinite(opening.positionAlongWallNorm)
      ? opening.positionAlongWallNorm
      : 0.5,
    0,
    1,
  );
  const doorState =
    type === "doorway" && DOOR_STATES.has(String(opening.doorState))
      ? (opening.doorState as "open" | "closed")
      : type === "doorway"
        ? "open"
        : undefined;

  return {
    id: getSafeString(opening.id, generateOpeningId()),
    wall,
    positionAlongWallNorm,
    width,
    type,
    ...(doorState ? { doorState } : {}),
  };
}

function sanitizeSubModel(
  mode: Subwoofer["mode"],
  input: unknown,
): Subwoofer["subModel"] {
  const fallbackModel = getDefaultCatalogSubModelForMode(mode);
  if (input && typeof input === "object") {
    const model = input as Record<string, unknown>;
    if (model.source === "catalog") {
      const catalogId = getSafeString(model.catalogId, fallbackModel.catalogId);
      const knownModel = getCatalogSubModelById(catalogId);
      if (knownModel && knownModel.mode === mode) {
        return toCatalogSubModel(knownModel);
      }
      return {
        source: "catalog",
        catalogId,
        manufacturer: getSafeString(model.manufacturer, fallbackModel.manufacturer),
        model: getSafeString(model.model, fallbackModel.model),
        ...(typeof model.revision === "string" && model.revision.length > 0
          ? { revision: model.revision }
          : {}),
      };
    }
    if (model.source === "custom") {
      return {
        source: "custom",
        manufacturer: getSafeString(
          model.manufacturer,
          DEFAULT_CUSTOM_SUB_MANUFACTURER,
        ),
        model: getSafeString(model.model, DEFAULT_CUSTOM_SUB_MODEL),
        ...(typeof model.revision === "string" && model.revision.length > 0
          ? { revision: model.revision }
          : {}),
      };
    }
  }

  return toCatalogSubModel(fallbackModel);
}

function sanitizeSubwoofer(input: unknown): LegacySubwoofer | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const sub = input as Record<string, unknown>;
  const mode: Subwoofer["mode"] = sub.mode === "ported" ? "ported" : "sealed";

  const seed: Subwoofer = {
    x: typeof sub.x === "number" && Number.isFinite(sub.x) ? sub.x : 0,
    y: typeof sub.y === "number" && Number.isFinite(sub.y) ? sub.y : 0,
    mode,
    preset: getSafeString(sub.preset, "Balanced") as Subwoofer["preset"],
    driverDirection: DRIVER_DIRECTIONS.has(String(sub.driverDirection))
      ? (sub.driverDirection as Subwoofer["driverDirection"])
      : "rear",
    portDirection: PORT_DIRECTIONS.has(String(sub.portDirection))
      ? (sub.portDirection as Subwoofer["portDirection"])
      : mode === "ported"
        ? "rear"
        : "none",
    lowestStrongBassHz: isPositiveNumber(sub.lowestStrongBassHz)
      ? sub.lowestStrongBassHz
      : undefined,
    fbHz: isPositiveNumber(sub.fbHz) ? sub.fbHz : undefined,
  };

  const normalized = normalizeSubwoofer(seed);
  return {
    ...normalized,
    subModel: sanitizeSubModel(mode, (sub as LegacySubwoofer).subModel),
  };
}

function generateOpeningId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function migrateOpeningToOpenings(room: LegacyRoom): LegacyRoom {
  // Already migrated or new format
  if (room.openings !== undefined) {
    const openings = Array.isArray(room.openings)
      ? room.openings.map(sanitizeOpening).filter((opening): opening is NonNullable<typeof opening> => opening !== null)
      : [];
    return {
      ...room,
      openings: openings.slice(0, 5),
    };
  }

  // Has legacy opening field
  if (room.opening) {
    const migratedOpening = sanitizeOpening(room.opening);
    const { opening: _, ...roomWithoutOpening } = room;
    return {
      ...roomWithoutOpening,
      openings: migratedOpening ? [migratedOpening] : [],
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

  const candidate = raw as {
    schemaVersion?: unknown;
    room?: LegacyRoom;
    subwoofer?: unknown;
  };
  const version = candidate.schemaVersion;

  // Migrate room.opening to room.openings
  if (candidate.room) {
    candidate.room = migrateOpeningToOpenings({
      ...candidate.room,
      width: sanitizeRoomDimension(candidate.room.width, DEFAULT_ROOM_WIDTH_M),
      length: sanitizeRoomDimension(candidate.room.length, DEFAULT_ROOM_LENGTH_M),
      height: sanitizeRoomDimension(candidate.room.height, DEFAULT_ROOM_HEIGHT_M),
    });
  }

  const sanitizedSubwoofer = sanitizeSubwoofer(candidate.subwoofer);
  if (sanitizedSubwoofer) {
    candidate.subwoofer = sanitizedSubwoofer;
  }

  if (version === undefined || version === LEGACY_SCHEMA_VERSION) {
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
