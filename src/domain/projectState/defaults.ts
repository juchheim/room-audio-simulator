import type { ProjectState } from "./schema";
import { SCHEMA_VERSION } from "./schema";
import { getDefaultCatalogSubModelForMode, toCatalogSubModel } from "./subModelCatalog";

const FEET_TO_METERS = 0.3048;

const DEFAULT_ROOM_WIDTH_FT = 12;
const DEFAULT_ROOM_LENGTH_FT = 16;
const DEFAULT_ROOM_HEIGHT_FT = 8;

const DEFAULT_SEAT_DEPTH_RATIO = 0.38;
const DEFAULT_MAINS_Y_RATIO = 0.2;
const DEFAULT_MAINS_X_OFFSET_RATIO = 0.2;

const DEFAULT_SUB_X_RATIO = 0.25;
const DEFAULT_SUB_Y = 0;

const DEFAULT_MAINS_LOWEST_STRONG_BASS_HZ = 60;
const DEFAULT_SUB_LOWEST_STRONG_BASS_HZ = 30;

const DEFAULT_PROJECT_NAME = "Untitled Project";

function ftToM(feet: number): number {
  return feet * FEET_TO_METERS;
}

function generateProjectId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2, 10);
  return `proj_${Date.now().toString(36)}_${random}`;
}

export function createDefaultProjectState(
  now: Date = new Date(),
): ProjectState {
  const width = ftToM(DEFAULT_ROOM_WIDTH_FT);
  const length = ftToM(DEFAULT_ROOM_LENGTH_FT);
  const height = ftToM(DEFAULT_ROOM_HEIGHT_FT);

  const seatX = width * 0.5;
  const seatY = length * DEFAULT_SEAT_DEPTH_RATIO;

  const mainsY = length * DEFAULT_MAINS_Y_RATIO;
  const mainsXOffset = width * DEFAULT_MAINS_X_OFFSET_RATIO;

  const timestamp = now.toISOString();

  return {
    schemaVersion: SCHEMA_VERSION,
    projectId: generateProjectId(),
    name: DEFAULT_PROJECT_NAME,
    units: "imperial",
    mode: "two_channel_sweet_spot",
    constraints: {
      seatLocked: false,
      allowNearfieldSuggestions: false,
    },
    room: {
      length,
      width,
      height,
      openings: [],
    },
    seat: {
      x: seatX,
      y: seatY,
    },
    mains: {
      enabled: true,
      left: {
        x: mainsXOffset,
        y: mainsY,
      },
      right: {
        x: width - mainsXOffset,
        y: mainsY,
      },
      mainsLowestStrongBassHz: DEFAULT_MAINS_LOWEST_STRONG_BASS_HZ,
    },
    subwoofer: {
      x: width * DEFAULT_SUB_X_RATIO,
      y: DEFAULT_SUB_Y,
      mode: "sealed",
      preset: "Balanced",
      driverDirection: "rear",
      portDirection: "none",
      lowestStrongBassHz: DEFAULT_SUB_LOWEST_STRONG_BASS_HZ,
      subModel: toCatalogSubModel(getDefaultCatalogSubModelForMode("sealed")),
    },
    treatments: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
