import type { ProjectState, Room, Opening } from "./schema";
import { ProjectStateSchema } from "./schema";
import { migrateProjectState } from "./migrations";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampOpeningCenter(opening: Opening, room: Room): Opening {
  const wallLength =
    opening.wall === "front" || opening.wall === "rear"
      ? room.width
      : room.length;

  if (!Number.isFinite(wallLength) || wallLength <= 0) {
    return opening;
  }

  const normalizedWidth = opening.width / wallLength;
  const halfSpan = Math.min(0.5, normalizedWidth / 2);
  const minCenter = halfSpan;
  const maxCenter = 1 - halfSpan;
  const clampedCenter = clamp(opening.positionAlongWallNorm, minCenter, maxCenter);

  if (clampedCenter === opening.positionAlongWallNorm) {
    return opening;
  }

  return {
    ...opening,
    positionAlongWallNorm: clampedCenter,
  };
}

function normalizeProjectState(state: ProjectState): ProjectState {
  const opening = state.room.opening;

  if (!opening) {
    return state;
  }

  const normalizedOpening = clampOpeningCenter(opening, state.room);
  if (normalizedOpening === opening) {
    return state;
  }

  return {
    ...state,
    room: {
      ...state.room,
      opening: normalizedOpening,
    },
  };
}

export function deserializeProjectState(input: string | unknown): ProjectState {
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  const migrated = migrateProjectState(raw);
  const parsed = ProjectStateSchema.parse(migrated);
  return normalizeProjectState(parsed);
}

export function serializeProjectState(state: ProjectState): string {
  const parsed = ProjectStateSchema.parse(state);
  return JSON.stringify(parsed);
}
