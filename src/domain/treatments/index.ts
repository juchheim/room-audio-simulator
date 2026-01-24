import type { SnapZone } from "../snapZones";
import type { Treatment } from "../projectState";

export type TreatmentType = Treatment["type"];
export type TreatmentStrength = Treatment["strength"];

export const TREATMENT_CAPS: Record<TreatmentType, number> = {
  corner_trap: 4,
  rear_wall_absorber: 1,
  thick_panel: 6,
  tuned_trap: 2,
};

const WALL_ZONE_PREFIXES = [
  "wall.front.",
  "wall.rear.",
  "wall.left.",
  "wall.right.",
];

export function getTreatmentLabel(type: TreatmentType): string {
  switch (type) {
    case "corner_trap":
      return "Corner Trap";
    case "rear_wall_absorber":
      return "Rear Wall Absorber";
    case "thick_panel":
      return "Thick Panel";
    case "tuned_trap":
      return "Tuned Trap";
    default:
      return type;
  }
}

export function isZoneEligibleForTreatment(
  type: TreatmentType,
  zone: SnapZone,
): boolean {
  if (zone.disabled) {
    return false;
  }

  if (type === "corner_trap") {
    return zone.id.startsWith("corner.");
  }

  if (type === "rear_wall_absorber") {
    return zone.id === "wall.rear.full";
  }

  if (type === "thick_panel") {
    if (!WALL_ZONE_PREFIXES.some((prefix) => zone.id.startsWith(prefix))) {
      return false;
    }
    return zone.id !== "wall.rear.full";
  }

  if (type === "tuned_trap") {
    return zone.id.startsWith("corner.") || zone.id.startsWith("wall.");
  }

  return false;
}

export function getEligibleZones(
  type: TreatmentType,
  zones: SnapZone[],
): SnapZone[] {
  return zones.filter((zone) => isZoneEligibleForTreatment(type, zone));
}

export function countTreatmentsByType(
  treatments: Treatment[],
): Record<TreatmentType, number> {
  return treatments.reduce(
    (acc, treatment) => {
      acc[treatment.type] += 1;
      return acc;
    },
    {
      corner_trap: 0,
      rear_wall_absorber: 0,
      thick_panel: 0,
      tuned_trap: 0,
    },
  );
}

export function isTreatmentCapReached(
  type: TreatmentType,
  treatments: Treatment[],
): boolean {
  return countTreatmentsByType(treatments)[type] >= TREATMENT_CAPS[type];
}

export function getTreatmentZone(
  treatment: Treatment,
  zones: SnapZone[],
): SnapZone | undefined {
  return zones.find((zone) => zone.id === treatment.snapZoneId);
}

export function isTreatmentInvalid(
  treatment: Treatment,
  zones: SnapZone[],
): boolean {
  const zone = getTreatmentZone(treatment, zones);
  return !zone || zone.disabled;
}
