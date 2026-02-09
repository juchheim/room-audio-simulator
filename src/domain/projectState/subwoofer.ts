import type { Subwoofer } from "./schema";
import { PortedSubPresetSchema, SealedSubPresetSchema } from "./schema";

export const SEALED_SUB_PRESETS: Subwoofer["preset"][] = [
  "Tight & Accurate",
  "Balanced",
  "Warm & Full",
  "Room-Filling",
];

export const PORTED_SUB_PRESETS: Subwoofer["preset"][] = [
  "Tight & Controlled",
  "Balanced",
  "Deep & Smooth",
  "Big & Bold",
];

export const SUB_DRIVER_DIRECTIONS: Subwoofer["driverDirection"][] = [
  "front",
  "rear",
  "left",
  "right",
  "down",
];

export const SUB_PORT_DIRECTIONS: Exclude<Subwoofer["portDirection"], "none">[] = [
  "front",
  "rear",
  "left",
  "right",
  "down",
];

export const DEFAULT_SUB_LOWEST_STRONG_BASS_HZ = 30;
export const DEFAULT_SUB_FB_HZ = 30;
export const DEFAULT_PORT_DIRECTION: Exclude<Subwoofer["portDirection"], "none"> = "rear";

function isPositiveNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  return isPositiveNumber(value) ? value : fallback;
}

function isSealedPreset(preset: Subwoofer["preset"]): boolean {
  return SealedSubPresetSchema.safeParse(preset).success;
}

function isPortedPreset(preset: Subwoofer["preset"]): boolean {
  return PortedSubPresetSchema.safeParse(preset).success;
}

export function normalizeSubwooferForMode(subwoofer: Subwoofer): Subwoofer {
  if (subwoofer.mode === "sealed") {
    return {
      ...subwoofer,
      preset: isSealedPreset(subwoofer.preset) ? subwoofer.preset : "Balanced",
      portDirection: "none",
      lowestStrongBassHz: normalizePositiveNumber(
        subwoofer.lowestStrongBassHz,
        DEFAULT_SUB_LOWEST_STRONG_BASS_HZ,
      ),
      fbHz: undefined,
    };
  }

  return {
    ...subwoofer,
    preset: isPortedPreset(subwoofer.preset) ? subwoofer.preset : "Balanced",
    portDirection:
      subwoofer.portDirection === "none"
        ? DEFAULT_PORT_DIRECTION
        : subwoofer.portDirection,
    fbHz: normalizePositiveNumber(subwoofer.fbHz, DEFAULT_SUB_FB_HZ),
    lowestStrongBassHz: undefined,
  };
}
