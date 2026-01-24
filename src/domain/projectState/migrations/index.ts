import { SCHEMA_VERSION } from "../schema";

export function migrateProjectState(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const candidate = raw as { schemaVersion?: unknown };
  const version = candidate.schemaVersion;

  if (version === undefined) {
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
