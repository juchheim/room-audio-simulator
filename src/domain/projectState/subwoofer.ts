import type { Subwoofer } from "./schema";
import { PortedSubPresetSchema, SealedSubPresetSchema } from "./schema";
import {
  getCatalogSubModelById,
  getDefaultCatalogSubModelForMode,
  toCatalogSubModel,
} from "./subModelCatalog";

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
export const DEFAULT_CUSTOM_SUB_MANUFACTURER = "Custom";
export const DEFAULT_CUSTOM_SUB_MODEL = "Custom Subwoofer";

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

function getNonEmptyString(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
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

export function applyCatalogSubModelToSubwoofer(
  subwoofer: Subwoofer,
  catalogId: string,
): Subwoofer {
  const catalogProfile =
    getCatalogSubModelById(catalogId) ??
    getDefaultCatalogSubModelForMode(subwoofer.mode);

  const next: Subwoofer = {
    ...subwoofer,
    mode: catalogProfile.mode,
    preset: catalogProfile.defaultPreset,
    driverDirection: catalogProfile.driverDirection,
    portDirection: catalogProfile.portDirection,
    lowestStrongBassHz:
      catalogProfile.mode === "sealed"
        ? normalizePositiveNumber(
            subwoofer.lowestStrongBassHz,
            catalogProfile.defaultLowestStrongBassHz ?? DEFAULT_SUB_LOWEST_STRONG_BASS_HZ,
          )
        : undefined,
    fbHz:
      catalogProfile.mode === "ported"
        ? normalizePositiveNumber(
            subwoofer.fbHz,
            catalogProfile.defaultFbHz ?? DEFAULT_SUB_FB_HZ,
          )
        : undefined,
    subModel: toCatalogSubModel(catalogProfile),
  };

  return normalizeSubwooferForMode(next);
}

function normalizeSubModelForSubwoofer(
  subwoofer: Subwoofer,
): NonNullable<Subwoofer["subModel"]> {
  const current = subwoofer.subModel;
  if (!current) {
    return toCatalogSubModel(getDefaultCatalogSubModelForMode(subwoofer.mode));
  }

  if (current.source === "catalog") {
    const profile = getCatalogSubModelById(current.catalogId);
    if (!profile || profile.mode !== subwoofer.mode) {
      return toCatalogSubModel(getDefaultCatalogSubModelForMode(subwoofer.mode));
    }
    return toCatalogSubModel(profile);
  }

  return {
    source: "custom",
    manufacturer: getNonEmptyString(
      current.manufacturer,
      DEFAULT_CUSTOM_SUB_MANUFACTURER,
    ),
    model: getNonEmptyString(current.model, DEFAULT_CUSTOM_SUB_MODEL),
    ...(current.revision && current.revision.trim().length > 0
      ? { revision: current.revision.trim() }
      : {}),
  };
}

export function normalizeSubwoofer(subwoofer: Subwoofer): Subwoofer {
  const normalized = normalizeSubwooferForMode(subwoofer);
  return {
    ...normalized,
    subModel: normalizeSubModelForSubwoofer(normalized),
  };
}
