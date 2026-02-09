import type { CatalogSubModel, Subwoofer } from "./schema";

export type ResponseShapeAnchor = {
  frequencyHz: number;
  deltaDb: number;
};

export type ResponseShapeBoundBand = {
  lowHz: number;
  highHz: number;
  plusMinusDb: number;
};

export type ResponseShapeProfile = {
  sourceLabel: string;
  anchors: readonly ResponseShapeAnchor[];
  bounds: readonly ResponseShapeBoundBand[];
};

export type CatalogSubModelProfile = CatalogSubModel & {
  mode: Subwoofer["mode"];
  defaultPreset: Subwoofer["preset"];
  driverDirection: Subwoofer["driverDirection"];
  portDirection: Subwoofer["portDirection"];
  defaultLowestStrongBassHz?: number;
  defaultFbHz?: number;
  confidence: "low" | "medium" | "high";
  evidenceSummary?: string;
  missingData?: string[];
  responseShape?: ResponseShapeProfile;
};

export const DEFAULT_SEALED_CATALOG_ID = "generic-sealed-balanced";
export const DEFAULT_PORTED_CATALOG_ID = "generic-ported-balanced";

export const SUB_MODEL_CATALOG: readonly CatalogSubModelProfile[] = [
  {
    source: "catalog",
    catalogId: DEFAULT_SEALED_CATALOG_ID,
    manufacturer: "Generic",
    model: "Sealed (Balanced)",
    mode: "sealed",
    defaultPreset: "Balanced",
    driverDirection: "rear",
    portDirection: "none",
    defaultLowestStrongBassHz: 30,
    confidence: "low",
    evidenceSummary: "Generic placeholder profile.",
    missingData: [
      "Driver T/S data",
      "Port geometry",
      "Measured transfer function",
      "Compression and distortion limits",
    ],
  },
  {
    source: "catalog",
    catalogId: "generic-sealed-front-driver",
    manufacturer: "Generic",
    model: "Sealed (Front Driver)",
    mode: "sealed",
    defaultPreset: "Tight & Accurate",
    driverDirection: "front",
    portDirection: "none",
    defaultLowestStrongBassHz: 28,
    confidence: "low",
    evidenceSummary: "Generic placeholder profile.",
    missingData: [
      "Driver T/S data",
      "Port geometry",
      "Measured transfer function",
      "Compression and distortion limits",
    ],
  },
  {
    source: "catalog",
    catalogId: "vera-fi-vanguard-caldera-10",
    manufacturer: "Vera-Fi",
    model: "Vanguard Caldera 10",
    mode: "ported",
    defaultPreset: "Balanced",
    driverDirection: "front",
    portDirection: "rear",
    defaultFbHz: 52,
    confidence: "medium",
    evidenceSummary:
      "Near-field cone/port aligned-sum chart indicates box tuning around 52 Hz.",
    responseShape: {
      sourceLabel: "Near-field aligned-sum trace (Keele-style technique)",
      anchors: [
        { frequencyHz: 20, deltaDb: -2.5 },
        { frequencyHz: 30, deltaDb: 0.5 },
        { frequencyHz: 40, deltaDb: 2.0 },
        { frequencyHz: 52, deltaDb: 1.0 },
        { frequencyHz: 70, deltaDb: 0.2 },
        { frequencyHz: 85, deltaDb: 0.0 },
        { frequencyHz: 95, deltaDb: -2.0 },
        { frequencyHz: 110, deltaDb: -3.5 },
        { frequencyHz: 120, deltaDb: -4.5 },
      ],
      bounds: [
        { lowHz: 20, highHz: 29.9, plusMinusDb: 3.0 },
        { lowHz: 30, highHz: 90, plusMinusDb: 1.5 },
        { lowHz: 90.1, highHz: 120, plusMinusDb: 3.0 },
      ],
    },
    missingData: [
      "Driver T/S parameters",
      "Net enclosure volume and port dimensions",
      "Crossover transfer function vs knob position",
      "Compression and distortion vs SPL",
      "Absolute sensitivity calibration",
    ],
  },
  {
    source: "catalog",
    catalogId: "rsl-speedwoofer-10s-mkii",
    manufacturer: "RSL",
    model: "Speedwoofer 10S MKII",
    mode: "ported",
    defaultPreset: "Deep & Smooth",
    driverDirection: "front",
    portDirection: "rear",
    defaultFbHz: 24,
    confidence: "high",
    evidenceSummary:
      "Official specs confirm front-firing driver + rear-vented compression guide; Audioholics ground-plane and CEA-2010 data constrain extension-mode behavior.",
    responseShape: {
      sourceLabel: "Audioholics GP extension-mode trace + CEA-2010 table",
      anchors: [
        { frequencyHz: 18, deltaDb: -3.0 },
        { frequencyHz: 20, deltaDb: -2.0 },
        { frequencyHz: 25, deltaDb: 0.0 },
        { frequencyHz: 31.5, deltaDb: 0.8 },
        { frequencyHz: 40, deltaDb: 1.0 },
        { frequencyHz: 50, deltaDb: 0.8 },
        { frequencyHz: 63, deltaDb: 0.5 },
        { frequencyHz: 80, deltaDb: 0.2 },
        { frequencyHz: 100, deltaDb: -0.4 },
        { frequencyHz: 120, deltaDb: -1.5 },
      ],
      bounds: [
        { lowHz: 18, highHz: 24.9, plusMinusDb: 2.5 },
        { lowHz: 25, highHz: 100, plusMinusDb: 1.5 },
        { lowHz: 100.1, highHz: 125, plusMinusDb: 2.5 },
      ],
    },
    missingData: [
      "Raw phase response export (minimum-phase decomposition)",
      "Port near-field data to pin exact tuning frequency",
      "Compression sweeps at multiple distortion limits",
      "Unit-to-unit variance across production runs",
    ],
  },
  {
    source: "catalog",
    catalogId: DEFAULT_PORTED_CATALOG_ID,
    manufacturer: "Generic",
    model: "Ported (Balanced)",
    mode: "ported",
    defaultPreset: "Balanced",
    driverDirection: "rear",
    portDirection: "rear",
    defaultFbHz: 30,
    confidence: "low",
    evidenceSummary: "Generic placeholder profile.",
    missingData: [
      "Driver T/S data",
      "Port geometry",
      "Measured transfer function",
      "Compression and distortion limits",
    ],
  },
  {
    source: "catalog",
    catalogId: "generic-ported-front-driver-rear-port",
    manufacturer: "Generic",
    model: "Ported (Front Driver + Rear Port)",
    mode: "ported",
    defaultPreset: "Deep & Smooth",
    driverDirection: "front",
    portDirection: "rear",
    defaultFbHz: 26,
    confidence: "low",
    evidenceSummary: "Generic placeholder profile.",
    missingData: [
      "Driver T/S data",
      "Port geometry",
      "Measured transfer function",
      "Compression and distortion limits",
    ],
  },
] as const;

const SUB_MODEL_CATALOG_MAP = new Map(
  SUB_MODEL_CATALOG.map((profile) => [profile.catalogId, profile]),
);

function assertExists(
  profile: CatalogSubModelProfile | undefined,
  mode: Subwoofer["mode"],
): CatalogSubModelProfile {
  if (!profile) {
    throw new Error(`Missing default sub model catalog profile for mode: ${mode}`);
  }
  return profile;
}

export function toCatalogSubModel(profile: CatalogSubModelProfile): CatalogSubModel {
  return {
    source: "catalog",
    catalogId: profile.catalogId,
    manufacturer: profile.manufacturer,
    model: profile.model,
    ...(profile.revision ? { revision: profile.revision } : {}),
  };
}

export function getCatalogSubModelById(
  catalogId: string,
): CatalogSubModelProfile | undefined {
  return SUB_MODEL_CATALOG_MAP.get(catalogId);
}

export function getDefaultCatalogIdForMode(mode: Subwoofer["mode"]): string {
  return mode === "sealed" ? DEFAULT_SEALED_CATALOG_ID : DEFAULT_PORTED_CATALOG_ID;
}

export function getDefaultCatalogSubModelForMode(
  mode: Subwoofer["mode"],
): CatalogSubModelProfile {
  const catalogId = getDefaultCatalogIdForMode(mode);
  return assertExists(getCatalogSubModelById(catalogId), mode);
}
