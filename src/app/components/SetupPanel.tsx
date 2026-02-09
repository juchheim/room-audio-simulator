import React from "react";
import type {
    Opening,
    ProjectConstraints,
    Room,
    Units,
} from "../../domain/projectState";
import { MAX_OPENINGS } from "../../domain/projectState";

type SetupPanelProps = {
    room: Room;
    units: Units;
    constraints: ProjectConstraints;
    onUpdateRoom: (updates: Partial<Room>) => void;
    onUpdateUnits: (units: Units) => void;
    onUpdateConstraints: (updates: Partial<ProjectConstraints>) => void;
    onAddOpening: () => void;
    onUpdateOpening: (id: string, updates: Partial<Opening>) => void;
    onRemoveOpening: (id: string) => void;
};

const FEET_TO_METERS = 0.3048;
const METERS_TO_FEET = 1 / FEET_TO_METERS;

function metersToFeet(meters: number): number {
    return meters * METERS_TO_FEET;
}

function feetToMeters(feet: number): number {
    return feet * FEET_TO_METERS;
}

function displayValue(meters: number, units: Units): string {
    if (units === "imperial") {
        return metersToFeet(meters).toFixed(1);
    }
    return meters.toFixed(2);
}

function parseInputToMeters(value: string, units: Units): number {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 0;
    }
    if (units === "imperial") {
        return feetToMeters(parsed);
    }
    return parsed;
}

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

const OPENING_TYPE_LABELS: Record<Opening["type"], string> = {
    doorway: "Doorway",
    hallway: "Hallway",
    open_plan: "Open-plan",
};

const WALL_LABELS: Record<Opening["wall"], string> = {
    front: "Front",
    rear: "Rear",
    left: "Left",
    right: "Right",
};

export function SetupPanel({
    room,
    units,
    constraints,
    onUpdateRoom,
    onUpdateUnits,
    onUpdateConstraints,
    onAddOpening,
    onUpdateOpening,
    onRemoveOpening,
}: SetupPanelProps): React.ReactElement {
    return (
        <div className="deck-column">
            <div className="deck-header">
                <h3 className="deck-title">Room Setup</h3>
                <select
                    value={units}
                    onChange={(e) => onUpdateUnits(e.target.value as Units)}
                    className="deck-select-small"
                >
                    <option value="metric">Metric (m)</option>
                    <option value="imperial">Imperial (ft)</option>
                </select>
            </div>

            <div className="deck-section">
                <div className="deck-input-group">
                    <label className="deck-label">
                        Length
                        <input
                            type="number"
                            step={0.1}
                            value={displayValue(room.length, units)}
                            onChange={(e) => {
                                const next = parseInputToMeters(e.target.value, units);
                                if (next <= 0) {
                                    return;
                                }
                                onUpdateRoom({ length: next });
                            }}
                            className="deck-input"
                        />
                    </label>
                    <label className="deck-label">
                        Width
                        <input
                            type="number"
                            step={0.1}
                            value={displayValue(room.width, units)}
                            onChange={(e) => {
                                const next = parseInputToMeters(e.target.value, units);
                                if (next <= 0) {
                                    return;
                                }
                                onUpdateRoom({ width: next });
                            }}
                            className="deck-input"
                        />
                    </label>
                    <label className="deck-label">
                        Height
                        <input
                            type="number"
                            step={0.1}
                            value={displayValue(room.height, units)}
                            onChange={(e) => {
                                const next = parseInputToMeters(e.target.value, units);
                                if (next <= 0) {
                                    return;
                                }
                                onUpdateRoom({ height: next });
                            }}
                            className="deck-input"
                        />
                    </label>
                </div>
            </div>

            <div className="deck-section">
                <div className="deck-row-check">
                    <label className="deck-check-label">
                        <input
                            type="checkbox"
                            checked={constraints.seatLocked}
                            onChange={(e) =>
                                onUpdateConstraints({ seatLocked: e.target.checked })
                            }
                        />
                        Lock seat position
                    </label>
                </div>
                <div className="deck-row-check">
                    <label className="deck-check-label">
                        <input
                            type="checkbox"
                            checked={constraints.allowNearfieldSuggestions}
                            onChange={(e) =>
                                onUpdateConstraints({ allowNearfieldSuggestions: e.target.checked })
                            }
                        />
                        Allow nearfield suggestions
                    </label>
                </div>
            </div>

            <div className="deck-section flex-grow">
                <div className="deck-header-sub">
                    <span>Openings ({room.openings.length}/{MAX_OPENINGS})</span>
                    {room.openings.length < MAX_OPENINGS && (
                        <button
                            type="button"
                            className="deck-button-small"
                            onClick={onAddOpening}
                            aria-label="Add Opening"
                        >
                            Add
                        </button>
                    )}
                </div>
                <div className="deck-list">
                    {room.openings.map((opening, index) => (
                        <div key={opening.id} className="deck-item">
                            <div className="deck-item-row">
                                <select
                                    value={opening.wall}
                                    onChange={(e) =>
                                        onUpdateOpening(opening.id, {
                                            wall: e.target.value as Opening["wall"],
                                        })
                                    }
                                    aria-label={`Opening ${index + 1} Wall`}
                                    className="deck-select-tiny"
                                >
                                    {Object.entries(WALL_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={opening.type}
                                    onChange={(e) => {
                                        const newType = e.target.value as Opening["type"];
                                        const presetWidths: Record<string, number> = {
                                            doorway: 0.914,
                                            hallway: 1.219,
                                            open_plan: 2.438,
                                        };
                                        onUpdateOpening(opening.id, {
                                            type: newType,
                                            width: presetWidths[newType],
                                            ...(newType === "doorway"
                                                ? { doorState: opening.doorState ?? "open" }
                                                : { doorState: undefined }),
                                        });
                                    }}
                                    aria-label={`Opening ${index + 1} Type`}
                                    className="deck-select-tiny"
                                >
                                    {Object.entries(OPENING_TYPE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => onRemoveOpening(opening.id)}
                                    className="deck-button-icon"
                                    aria-label={`Remove Opening ${index + 1}`}
                                    title="Remove opening"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="deck-item-row">
                                <div className="deck-input-group" style={{ gridTemplateColumns: "1fr 2fr", gap: "8px", width: "100%" }}>
                                    <label className="deck-label" style={{ marginBottom: 0 }}>
                                        Width
                                        <input
                                            type="number"
                                            step={0.1}
                                            value={displayValue(opening.width, units)}
                                            onChange={(e) => {
                                                const next = parseInputToMeters(e.target.value, units);
                                                if (next <= 0) {
                                                    return;
                                                }
                                                onUpdateOpening(opening.id, { width: next });
                                            }}
                                            aria-label={`Opening ${index + 1} Width`}
                                            className="deck-input-tiny"
                                        />
                                    </label>
                                    <label className="deck-label" style={{ marginBottom: 0, flexGrow: 1 }}>
                                        Position
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={opening.positionAlongWallNorm}
                                            onChange={(e) =>
                                                onUpdateOpening(opening.id, {
                                                    positionAlongWallNorm: clamp01(parseFloat(e.target.value)),
                                                })
                                            }
                                            aria-label={`Opening ${index + 1} Position`}
                                            className="deck-slider"
                                            title="Position along wall"
                                            style={{ width: "100%", marginTop: "6px" }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
