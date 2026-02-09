import type { Opening, Room } from "../projectState";

export type SnapZoneId =
  | "wall.front.left"
  | "wall.front.center"
  | "wall.front.right"
  | "wall.rear.left"
  | "wall.rear.center"
  | "wall.rear.right"
  | "wall.left.front"
  | "wall.left.rear"
  | "wall.right.front"
  | "wall.right.rear"
  | "wall.rear.full"
  | "corner.front.left"
  | "corner.front.right"
  | "corner.rear.left"
  | "corner.rear.right";

export type SnapZoneType =
  | "corner_front_left"
  | "corner_front_right"
  | "corner_rear_left"
  | "corner_rear_right"
  | "rear_wall_left"
  | "rear_wall_center"
  | "rear_wall_right"
  | "rear_wall_full"
  | "front_wall_left"
  | "front_wall_center"
  | "front_wall_right"
  | "left_wall_front"
  | "left_wall_rear"
  | "right_wall_front"
  | "right_wall_rear";

export type Point = {
  x: number;
  y: number;
};

export type SnapZoneGeometry =
  | { kind: "segment"; start: Point; end: Point }
  | { kind: "point"; at: Point };

export type SnapZone = {
  id: SnapZoneId;
  type: SnapZoneType;
  geometry: SnapZoneGeometry;
  disabled: boolean;
  disabledReason?: "opening_overlap";
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
  const center = clamp(
    opening.positionAlongWallNorm,
    clampedWidth / wallLength / 2,
    1 - clampedWidth / wallLength / 2,
  );
  const centerMeters = center * wallLength;

  return {
    wall: opening.wall,
    start: centerMeters - halfSpan,
    end: centerMeters + halfSpan,
    wallLength,
  };
}

function spansOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return start <= end;
}

function getWallThirds(length: number): [number, number, number] {
  return [length / 3, (2 * length) / 3, length];
}

function makeSegment(start: Point, end: Point): SnapZoneGeometry {
  return { kind: "segment", start, end };
}

function makePoint(at: Point): SnapZoneGeometry {
  return { kind: "point", at };
}

function zoneDisabledByOpening(
  zone: SnapZone,
  room: Room,
  opening: Opening | null,
  span: OpeningSpan | null,
): SnapZone {
  if (!opening || !span) {
    return zone;
  }

  if (zone.type === "rear_wall_full" && opening.wall === "rear") {
    return {
      ...zone,
      disabled: true,
      disabledReason: "opening_overlap",
    };
  }

  const geometry = zone.geometry;
  if (geometry.kind === "segment") {
    const { start, end } = geometry;

    if (opening.wall === "front" || opening.wall === "rear") {
      if (start.y !== (opening.wall === "front" ? 0 : room.length)) {
        return zone;
      }

      const segmentStart = Math.min(start.x, end.x);
      const segmentEnd = Math.max(start.x, end.x);
      if (spansOverlap(segmentStart, segmentEnd, span.start, span.end)) {
        return {
          ...zone,
          disabled: true,
          disabledReason: "opening_overlap",
        };
      }

      return zone;
    }

    if (opening.wall === "left" || opening.wall === "right") {
      if (start.x !== (opening.wall === "left" ? 0 : room.width)) {
        return zone;
      }

      const segmentStart = Math.min(start.y, end.y);
      const segmentEnd = Math.max(start.y, end.y);
      if (spansOverlap(segmentStart, segmentEnd, span.start, span.end)) {
        return {
          ...zone,
          disabled: true,
          disabledReason: "opening_overlap",
        };
      }

      return zone;
    }
  }

  if (geometry.kind === "point") {
    if (opening.wall === "front" && geometry.at.y === 0) {
      if (spansOverlap(geometry.at.x, geometry.at.x, span.start, span.end)) {
        return { ...zone, disabled: true, disabledReason: "opening_overlap" };
      }
    }

    if (opening.wall === "rear" && geometry.at.y === room.length) {
      if (spansOverlap(geometry.at.x, geometry.at.x, span.start, span.end)) {
        return { ...zone, disabled: true, disabledReason: "opening_overlap" };
      }
    }

    if (opening.wall === "left" && geometry.at.x === 0) {
      if (spansOverlap(geometry.at.y, geometry.at.y, span.start, span.end)) {
        return { ...zone, disabled: true, disabledReason: "opening_overlap" };
      }
    }

    if (opening.wall === "right" && geometry.at.x === room.width) {
      if (spansOverlap(geometry.at.y, geometry.at.y, span.start, span.end)) {
        return { ...zone, disabled: true, disabledReason: "opening_overlap" };
      }
    }
  }

  return zone;
}

export function generateSnapZones(room: Room, openings: Opening[]): SnapZone[] {
  const [w1, w2] = getWallThirds(room.width);
  const midLength = room.length / 2;

  const zones: SnapZone[] = [
    {
      id: "wall.front.left",
      type: "front_wall_left",
      geometry: makeSegment({ x: 0, y: 0 }, { x: w1, y: 0 }),
      disabled: false,
    },
    {
      id: "wall.front.center",
      type: "front_wall_center",
      geometry: makeSegment({ x: w1, y: 0 }, { x: w2, y: 0 }),
      disabled: false,
    },
    {
      id: "wall.front.right",
      type: "front_wall_right",
      geometry: makeSegment({ x: w2, y: 0 }, { x: room.width, y: 0 }),
      disabled: false,
    },
    {
      id: "wall.rear.left",
      type: "rear_wall_left",
      geometry: makeSegment({ x: 0, y: room.length }, { x: w1, y: room.length }),
      disabled: false,
    },
    {
      id: "wall.rear.center",
      type: "rear_wall_center",
      geometry: makeSegment({ x: w1, y: room.length }, { x: w2, y: room.length }),
      disabled: false,
    },
    {
      id: "wall.rear.right",
      type: "rear_wall_right",
      geometry: makeSegment(
        { x: w2, y: room.length },
        { x: room.width, y: room.length },
      ),
      disabled: false,
    },
    {
      id: "wall.rear.full",
      type: "rear_wall_full",
      geometry: makeSegment({ x: 0, y: room.length }, { x: room.width, y: room.length }),
      disabled: false,
    },
    {
      id: "wall.left.front",
      type: "left_wall_front",
      geometry: makeSegment({ x: 0, y: 0 }, { x: 0, y: midLength }),
      disabled: false,
    },
    {
      id: "wall.left.rear",
      type: "left_wall_rear",
      geometry: makeSegment({ x: 0, y: midLength }, { x: 0, y: room.length }),
      disabled: false,
    },
    {
      id: "wall.right.front",
      type: "right_wall_front",
      geometry: makeSegment({ x: room.width, y: 0 }, { x: room.width, y: midLength }),
      disabled: false,
    },
    {
      id: "wall.right.rear",
      type: "right_wall_rear",
      geometry: makeSegment(
        { x: room.width, y: midLength },
        { x: room.width, y: room.length },
      ),
      disabled: false,
    },
    {
      id: "corner.front.left",
      type: "corner_front_left",
      geometry: makePoint({ x: 0, y: 0 }),
      disabled: false,
    },
    {
      id: "corner.front.right",
      type: "corner_front_right",
      geometry: makePoint({ x: room.width, y: 0 }),
      disabled: false,
    },
    {
      id: "corner.rear.left",
      type: "corner_rear_left",
      geometry: makePoint({ x: 0, y: room.length }),
      disabled: false,
    },
    {
      id: "corner.rear.right",
      type: "corner_rear_right",
      geometry: makePoint({ x: room.width, y: room.length }),
      disabled: false,
    },
  ];

  // Apply opening disabling for each opening - a zone is disabled if ANY opening overlaps it
  let result = zones;
  for (const opening of openings) {
    const span = getOpeningSpan(opening, room);
    result = result.map((zone) => zoneDisabledByOpening(zone, room, opening, span));
  }
  return result;
}
