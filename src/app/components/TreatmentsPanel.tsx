import React from "react";
import type {
    Mains,
    Subwoofer,
    Treatment,
} from "../../domain/projectState";
import {
    applyCatalogSubModelToSubwoofer,
    DEFAULT_CUSTOM_SUB_MANUFACTURER,
    DEFAULT_CUSTOM_SUB_MODEL,
    DEFAULT_SUB_FB_HZ,
    DEFAULT_SUB_LOWEST_STRONG_BASS_HZ,
    getDefaultCatalogIdForMode,
    PORTED_SUB_PRESETS,
    SEALED_SUB_PRESETS,
    SUB_MODEL_CATALOG,
    SUB_DRIVER_DIRECTIONS,
    SUB_PORT_DIRECTIONS,
} from "../../domain/projectState";
import type { SubWarning } from "../../domain/clearanceWarnings";
import {
    isTreatmentCapReached,
    type TreatmentStrength,
    type TreatmentType,
} from "../../domain/treatments";
import type { SnapZone } from "../../domain/snapZones";

type TreatmentsPanelProps = {
    treatments: Treatment[];
    snapZones: SnapZone[];
    subwoofer: Subwoofer;
    mains: Mains;
    subWarnings: SubWarning[];
    invalidTreatmentIds: Set<string>;
    onAddTreatment: (
        type: TreatmentType,
        strength: TreatmentStrength,
        zoneId: string,
        targetHz: number
    ) => void;
    onUpdateTreatment: (id: string, updates: Partial<Treatment>) => void;
    onRemoveTreatment: (id: string) => void;
    onUpdateSubwoofer: (subwoofer: Subwoofer) => void;
    onUpdateMains: (mains: Mains) => void;
};

const TREATMENT_TYPES: TreatmentType[] = [
    "corner_trap",
    "rear_wall_absorber",
    "thick_panel",
    "tuned_trap",
];

const TREATMENT_STRENGTHS: TreatmentStrength[] = [
    "light",
    "medium",
    "heavy",
];

const DIRECTION_LABELS: Record<
    Subwoofer["driverDirection"] | Subwoofer["portDirection"],
    string
> = {
    front: "Front",
    rear: "Rear",
    left: "Left",
    right: "Right",
    down: "Down",
    none: "None",
};

const CUSTOM_SUB_MODEL_ID = "__custom__";

function formatModelConfidence(confidence: "low" | "medium" | "high"): string {
    if (confidence === "high") {
        return "High Confidence";
    }
    if (confidence === "medium") {
        return "Medium Confidence";
    }
    return "Low Confidence";
}

function getMissingDataHeading(confidence: "low" | "medium" | "high"): string {
    if (confidence === "high") {
        return "Remaining data gaps (for tighter uncertainty)";
    }
    if (confidence === "medium") {
        return "Missing data for higher confidence";
    }
    return "Key missing data";
}

export function TreatmentsPanel({
    treatments,
    snapZones,
    subwoofer,
    mains,
    subWarnings,
    invalidTreatmentIds,
    onAddTreatment,
    onUpdateTreatment,
    onRemoveTreatment,
    onUpdateSubwoofer,
    onUpdateMains,
}: TreatmentsPanelProps): React.ReactElement {
    const [newType, setNewType] = React.useState<TreatmentType>("corner_trap");
    const [newStrength, setNewStrength] = React.useState<TreatmentStrength>("medium");
    const [newTargetHz, setNewTargetHz] = React.useState<number>(63);
    const [newZoneId, setNewZoneId] = React.useState<string>("");

    const eligibleZones = React.useMemo(() => {
        return snapZones.filter(z =>
            !z.disabled &&
            (newType === 'corner_trap' ? z.id.startsWith('corner') : z.id.startsWith('wall'))
        );
    }, [newType, snapZones]);

    React.useEffect(() => {
        if (!eligibleZones.some((zone) => zone.id === newZoneId)) {
            setNewZoneId(eligibleZones[0]?.id ?? "");
        }
    }, [eligibleZones, newZoneId]);

    const capsReached = isTreatmentCapReached(newType, treatments);
    const subPresets =
        subwoofer.mode === "sealed" ? SEALED_SUB_PRESETS : PORTED_SUB_PRESETS;
    const subFrequencyValue =
        subwoofer.mode === "sealed"
            ? subwoofer.lowestStrongBassHz ?? DEFAULT_SUB_LOWEST_STRONG_BASS_HZ
            : subwoofer.fbHz ?? DEFAULT_SUB_FB_HZ;
    const selectedSubModelId =
        subwoofer.subModel?.source === "catalog"
            ? subwoofer.subModel.catalogId
            : CUSTOM_SUB_MODEL_ID;
    const selectedCatalogProfile = React.useMemo(() => {
        if (selectedSubModelId === CUSTOM_SUB_MODEL_ID) {
            return null;
        }
        return (
            SUB_MODEL_CATALOG.find(
                (profile) => profile.catalogId === selectedSubModelId,
            ) ?? null
        );
    }, [selectedSubModelId]);
    const customSubModel =
        subwoofer.subModel?.source === "custom"
            ? subwoofer.subModel
            : {
                  source: "custom" as const,
                  manufacturer: DEFAULT_CUSTOM_SUB_MANUFACTURER,
                  model: DEFAULT_CUSTOM_SUB_MODEL,
              };

    return (
        <div className="deck-column">
            <div className="deck-header">
                <h3 className="deck-title">Objects & Treatments</h3>
            </div>

            <div className="deck-section">
                <label className="deck-row-check">
                    <input
                        type="checkbox"
                        checked={mains.enabled}
                        onChange={(e) =>
                            onUpdateMains({ ...mains, enabled: e.target.checked })
                        }
                    />
                    Mains Enabled
                </label>
                <div className="deck-input-group-vertical">
                    <label className="deck-label">
                        Subwoofer Model
                        <select
                            value={selectedSubModelId}
                            onChange={(e) => {
                                const nextId = e.target.value;
                                if (nextId === CUSTOM_SUB_MODEL_ID) {
                                    onUpdateSubwoofer({
                                        ...subwoofer,
                                        subModel: customSubModel,
                                    });
                                    return;
                                }
                                onUpdateSubwoofer(
                                    applyCatalogSubModelToSubwoofer(subwoofer, nextId),
                                );
                            }}
                            aria-label="Subwoofer Model"
                            className="deck-select"
                        >
                            {SUB_MODEL_CATALOG.map((profile) => (
                                <option key={profile.catalogId} value={profile.catalogId}>
                                    {profile.manufacturer} — {profile.model}
                                </option>
                            ))}
                            <option value={CUSTOM_SUB_MODEL_ID}>Custom Model</option>
                        </select>
                    </label>
                    {selectedSubModelId === CUSTOM_SUB_MODEL_ID && (
                        <div
                            className="deck-input-group"
                            style={{ gridTemplateColumns: "1fr 1fr" }}
                        >
                            <label className="deck-label">
                                Manufacturer
                                <input
                                    type="text"
                                    value={customSubModel.manufacturer}
                                    onChange={(e) =>
                                        onUpdateSubwoofer({
                                            ...subwoofer,
                                            subModel: {
                                                ...customSubModel,
                                                manufacturer:
                                                    e.target.value ||
                                                    DEFAULT_CUSTOM_SUB_MANUFACTURER,
                                            },
                                        })
                                    }
                                    aria-label="Custom Subwoofer Manufacturer"
                                    className="deck-input"
                                />
                            </label>
                            <label className="deck-label">
                                Model
                                <input
                                    type="text"
                                    value={customSubModel.model}
                                    onChange={(e) =>
                                        onUpdateSubwoofer({
                                            ...subwoofer,
                                            subModel: {
                                                ...customSubModel,
                                                model: e.target.value || DEFAULT_CUSTOM_SUB_MODEL,
                                            },
                                        })
                                    }
                                    aria-label="Custom Subwoofer Model"
                                    className="deck-input"
                                />
                            </label>
                        </div>
                    )}
                    {selectedCatalogProfile && (
                        <div className="model-evidence-card">
                            <div className="model-evidence-header">
                                <span
                                    className={`model-confidence-chip ${selectedCatalogProfile.confidence}`}
                                >
                                    {formatModelConfidence(selectedCatalogProfile.confidence)}
                                </span>
                                <span className="model-evidence-title">
                                    Catalog profile
                                </span>
                            </div>
                            {selectedCatalogProfile.evidenceSummary && (
                                <p className="model-evidence-text">
                                    {selectedCatalogProfile.evidenceSummary}
                                </p>
                            )}
                            {selectedCatalogProfile.responseShape && (
                                <>
                                    <p className="model-evidence-text">
                                        Response shape:{" "}
                                        {selectedCatalogProfile.responseShape.sourceLabel}
                                    </p>
                                    <div className="model-bounds-grid">
                                        {selectedCatalogProfile.responseShape.bounds.map(
                                            (band, index) => (
                                                <div
                                                    key={`setup-bound-${index}`}
                                                    className="model-bounds-row"
                                                >
                                                    <span className="model-bounds-range">
                                                        {band.lowHz}-{band.highHz} Hz
                                                    </span>
                                                    <span className="model-bounds-delta">
                                                        ±{band.plusMinusDb.toFixed(1)} dB
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </>
                            )}
                            {selectedCatalogProfile.missingData &&
                                selectedCatalogProfile.missingData.length > 0 && (
                                    <div>
                                        <div className="model-missing-title">
                                            {getMissingDataHeading(selectedCatalogProfile.confidence)}
                                        </div>
                                        <div className="model-missing-list">
                                            {selectedCatalogProfile.missingData.map((item) => (
                                                <span
                                                    key={item}
                                                    className="model-missing-item"
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}
                </div>
                <div className="deck-row-spaced">
                    <span className="deck-label-text">Subwoofer Mode</span>
                    <select
                        value={subwoofer.mode}
                        onChange={(e) => {
                            const nextMode = e.target.value as "sealed" | "ported";
                            if (subwoofer.subModel?.source === "catalog") {
                                onUpdateSubwoofer(
                                    applyCatalogSubModelToSubwoofer(
                                        { ...subwoofer, mode: nextMode },
                                        getDefaultCatalogIdForMode(nextMode),
                                    ),
                                );
                                return;
                            }
                            onUpdateSubwoofer({
                                ...subwoofer,
                                mode: nextMode,
                            });
                        }}
                        aria-label="Subwoofer Mode"
                        className="deck-select-tiny"
                    >
                        <option value="sealed">Sealed</option>
                        <option value="ported">Ported</option>
                    </select>
                </div>
                <div className="deck-input-group-vertical">
                    <label className="deck-label">
                        Preset
                        <select
                            value={subwoofer.preset}
                            onChange={(e) =>
                                onUpdateSubwoofer({
                                    ...subwoofer,
                                    preset: e.target.value as Subwoofer["preset"],
                                })
                            }
                            aria-label="Subwoofer Preset"
                            className="deck-select"
                        >
                            {subPresets.map((preset) => (
                                <option key={preset} value={preset}>
                                    {preset}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div
                        className="deck-input-group"
                        style={{ gridTemplateColumns: "1fr 1fr" }}
                    >
                        <label className="deck-label">
                            Driver Direction
                            <select
                                value={subwoofer.driverDirection}
                                onChange={(e) =>
                                    onUpdateSubwoofer({
                                        ...subwoofer,
                                        driverDirection: e.target.value as Subwoofer["driverDirection"],
                                    })
                                }
                                aria-label="Driver Direction"
                                className="deck-select"
                            >
                                {SUB_DRIVER_DIRECTIONS.map((direction) => (
                                    <option key={direction} value={direction}>
                                        {DIRECTION_LABELS[direction]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {subwoofer.mode === "ported" && (
                            <label className="deck-label">
                                Port Direction
                                <select
                                    value={subwoofer.portDirection}
                                    onChange={(e) =>
                                        onUpdateSubwoofer({
                                            ...subwoofer,
                                            portDirection: e.target.value as Subwoofer["portDirection"],
                                        })
                                    }
                                    aria-label="Port Direction"
                                    className="deck-select"
                                >
                                    {SUB_PORT_DIRECTIONS.map((direction) => (
                                        <option key={direction} value={direction}>
                                            {DIRECTION_LABELS[direction]}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                    </div>
                    <label className="deck-label">
                        {subwoofer.mode === "sealed"
                            ? "Lowest Strong Bass (Hz)"
                            : "Fb (Hz)"}
                        <input
                            type="number"
                            min={15}
                            max={120}
                            step={1}
                            value={subFrequencyValue}
                            aria-label="Subwoofer Frequency (Hz)"
                            onChange={(e) => {
                                const value = Number.parseFloat(e.target.value);
                                if (!Number.isFinite(value) || value <= 0) {
                                    return;
                                }
                                if (subwoofer.mode === "sealed") {
                                    onUpdateSubwoofer({
                                        ...subwoofer,
                                        lowestStrongBassHz: value,
                                    });
                                    return;
                                }
                                onUpdateSubwoofer({
                                    ...subwoofer,
                                    fbHz: value,
                                });
                            }}
                            className="deck-input"
                        />
                    </label>
                </div>
                {subWarnings.length > 0 && (
                    <div className="warning-list">
                        {subWarnings.map((warning) => (
                            <div key={warning.id} className="warning-item">
                                {warning.message}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="deck-section">
                <div className="deck-header-sub">Add Treatment</div>
                <div className="deck-input-group-vertical">
                    <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as TreatmentType)}
                        className="deck-select"
                    >
                        <option value="corner_trap">Corner Trap</option>
                        <option value="rear_wall_absorber">Rear Wall Absorber</option>
                        <option value="thick_panel">Thick Panel (4")</option>
                        <option value="tuned_trap">Tuned Trap</option>
                    </select>

                    <div className="deck-row-spaced">
                        <select
                            value={newStrength}
                            onChange={(e) => setNewStrength(e.target.value as TreatmentStrength)}
                            className="deck-select"
                            disabled={newType === "tuned_trap"}
                        >
                            {TREATMENT_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {newType === "tuned_trap" && (
                            <input
                                type="number"
                                value={newTargetHz}
                                onChange={(e) => setNewTargetHz(Number(e.target.value))}
                                className="deck-input-tiny"
                                placeholder="Hz"
                            />
                        )}
                    </div>

                    <select
                        value={newZoneId}
                        onChange={(e) => setNewZoneId(e.target.value)}
                        className="deck-select"
                        disabled={eligibleZones.length === 0}
                    >
                        {eligibleZones.length === 0 ? (
                            <option>No available zones</option>
                        ) : (
                            eligibleZones.map(z => (
                                <option key={z.id} value={z.id}>{z.id}</option>
                            ))
                        )}
                    </select>

                    <button
                        type="button"
                        className="deck-button-primary"
                        disabled={!newZoneId || capsReached}
                        onClick={() => onAddTreatment(newType, newStrength, newZoneId, newTargetHz)}
                    >
                        {capsReached ? "Max Allowed Reached" : "Add Treatment"}
                    </button>
                </div>
            </div>

            <div className="deck-section flex-grow deck-list">
                {treatments.map(t => (
                    <div key={t.id} className={`deck-item ${invalidTreatmentIds.has(t.id) ? 'is-invalid' : ''}`}>
                        <div className="deck-item-row">
                            <span className="deck-item-title">
                                {t.type === 'corner_trap' && 'Corner Trap'}
                                {t.type === 'rear_wall_absorber' && 'Rear Absorber'}
                                {t.type === 'thick_panel' && 'Thick Panel'}
                                {t.type === 'tuned_trap' && `Tuned @ ${t.targetHz}Hz`}
                            </span>
                            <button className="deck-button-icon" onClick={() => onRemoveTreatment(t.id)}>×</button>
                        </div>
                        <div className="deck-item-meta">
                            {t.snapZoneId} • {t.strength}
                        </div>
                    </div>
                ))}
                {treatments.length === 0 && <div className="deck-empty">No treatments added</div>}
            </div>
        </div>
    );
}
