import type { ProjectState } from "../../domain/projectState";
import {
  createDefaultProjectState,
  deserializeProjectState,
  serializeProjectState,
} from "../../domain/projectState";

export type ProjectStateLoadResult = {
  state: ProjectState;
  error?: string;
};

export function initializeProjectState(
  serialized?: string | null,
): ProjectStateLoadResult {
  if (!serialized) {
    return { state: createDefaultProjectState() };
  }

  try {
    return { state: deserializeProjectState(serialized) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      state: createDefaultProjectState(),
      error: message,
    };
  }
}

export function importProjectState(serialized: string): ProjectState {
  return deserializeProjectState(serialized);
}

export function exportProjectState(state: ProjectState): string {
  return serializeProjectState(state);
}
