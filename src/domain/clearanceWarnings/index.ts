import type { Opening, Room, Subwoofer } from "../projectState";

export type SubWarningId =
  | "port_clearance"
  | "driver_clearance"
  | "opening_blocked";

export type SubWarning = {
  id: SubWarningId;
  message: string;
};

const PORT_CLEARANCE_MIN = 0.305;
const DRIVER_CLEARANCE_MIN = 0.152;
const OPENING_EPSILON = 1e-4;

const WARNING_COPY: Record<SubWarningId, string> = {
  port_clearance:
    "Port clearance is tight. Near tuning (Fb), this can cause unpredictable boom or loss.",
  driver_clearance:
    "Driver clearance is tight. Boundary loading may increase peaks and reduce tightness.",
  opening_blocked:
    "This placement blocks the opening. Choose a different position.",
};

type OpeningSpan = {
  wall: Opening["wall"];
  start: number;
  end: number;
  wallLength: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getOpeningSpan(opening: Opening, room: Room): OpeningSpan {
  const wallLength =
    opening.wall === "front" || opening.wall === "rear"
      ? room.width
      : room.length;

  const clampedWidth = Math.min(opening.width, wallLength);
  const halfSpan = clampedWidth / 2;
  const normalizedHalf = clampedWidth / wallLength / 2;
  const center = clamp(opening.positionAlongWallNorm, normalizedHalf, 1 - normalizedHalf);
  const centerMeters = center * wallLength;

  return {
    wall: opening.wall,
    start: centerMeters - halfSpan,
    end: centerMeters + halfSpan,
    wallLength,
  };
}

function distanceToWall(
  room: Room,
  sub: Subwoofer,
  direction: Subwoofer["driverDirection"],
): number | null {
  switch (direction) {
    case "front":
      return sub.y;
    case "rear":
      return room.length - sub.y;
    case "left":
      return sub.x;
    case "right":
      return room.width - sub.x;
    case "down":
      return null;
    default:
      return null;
  }
}

function distanceToPortWall(room: Room, sub: Subwoofer): number | null {
  switch (sub.portDirection) {
    case "front":
      return sub.y;
    case "rear":
      return room.length - sub.y;
    case "left":
      return sub.x;
    case "right":
      return room.width - sub.x;
    case "down":
    case "none":
      return null;
    default:
      return null;
  }
}

function isOpeningBlocked(room: Room, opening: Opening, sub: Subwoofer): boolean {
  const span = getOpeningSpan(opening, room);

  if (opening.wall === "front") {
    if (Math.abs(sub.y - 0) > OPENING_EPSILON) {
      return false;
    }
    return sub.x >= span.start && sub.x <= span.end;
  }

  if (opening.wall === "rear") {
    if (Math.abs(sub.y - room.length) > OPENING_EPSILON) {
      return false;
    }
    return sub.x >= span.start && sub.x <= span.end;
  }

  if (opening.wall === "left") {
    if (Math.abs(sub.x - 0) > OPENING_EPSILON) {
      return false;
    }
    return sub.y >= span.start && sub.y <= span.end;
  }

  if (opening.wall === "right") {
    if (Math.abs(sub.x - room.width) > OPENING_EPSILON) {
      return false;
    }
    return sub.y >= span.start && sub.y <= span.end;
  }

  return false;
}

export function getSubwooferClearanceWarnings(
  room: Room,
  opening: Opening | null,
  subwoofer: Subwoofer,
): SubWarning[] {
  const warnings: SubWarning[] = [];

  if (subwoofer.mode === "ported") {
    const portDistance = distanceToPortWall(room, subwoofer);
    if (portDistance !== null && portDistance < PORT_CLEARANCE_MIN) {
      warnings.push({ id: "port_clearance", message: WARNING_COPY.port_clearance });
    }
  }

  const driverDistance = distanceToWall(room, subwoofer, subwoofer.driverDirection);
  if (driverDistance !== null && driverDistance < DRIVER_CLEARANCE_MIN) {
    warnings.push({ id: "driver_clearance", message: WARNING_COPY.driver_clearance });
  }

  if (opening && isOpeningBlocked(room, opening, subwoofer)) {
    warnings.push({ id: "opening_blocked", message: WARNING_COPY.opening_blocked });
  }

  return warnings;
}
