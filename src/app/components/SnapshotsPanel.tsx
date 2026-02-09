import React from "react";
import type { Snapshot, SnapshotSlot } from "../../domain/snapshots";

type SnapshotsPanelProps = {
    layout?: "column" | "row";
    snapshots: {
        A: Snapshot | null;
        B: Snapshot | null;
        lockA: boolean;
    };
    onSaveSnapshot: (slot: SnapshotSlot) => void;
    onLoadSnapshot: (slot: SnapshotSlot) => void;
    onToggleLockA: (locked: boolean) => void;
};

function SnapshotCard({
    slot,
    snapshot,
    lockA,
    onSaveSnapshot,
    onLoadSnapshot,
    onToggleLockA,
}: {
    slot: SnapshotSlot;
    snapshot: Snapshot | null;
    lockA: boolean;
    onSaveSnapshot: (slot: SnapshotSlot) => void;
    onLoadSnapshot: (slot: SnapshotSlot) => void;
    onToggleLockA: (locked: boolean) => void;
}): React.ReactElement {
    const isA = slot === "A";

    return (
        <div className="snapshot-card">
            <div className="snapshot-header">
                <span className="snapshot-label">Snapshot {slot}</span>
                {isA && (
                    <label className="snapshot-lock">
                        <input
                            type="checkbox"
                            checked={lockA}
                            onChange={(e) => onToggleLockA(e.target.checked)}
                        />
                        Lock
                    </label>
                )}
            </div>
            <div className="snapshot-actions">
                <button
                    type="button"
                    className="deck-button"
                    onClick={() => onSaveSnapshot(slot)}
                    disabled={isA && lockA}
                    aria-label={`Save Snapshot ${slot}`}
                >
                    {snapshot ? `Update ${slot}` : `Save ${slot}`}
                </button>
                <button
                    type="button"
                    className="deck-button secondary"
                    onClick={() => onLoadSnapshot(slot)}
                    disabled={!snapshot}
                    aria-label={`Load Snapshot ${slot}`}
                >
                    Load
                </button>
            </div>
            {snapshot && (
                <>
                    <div className="snapshot-meta">
                        {new Date(snapshot.savedAt).toLocaleTimeString()}
                    </div>
                    {snapshot.changeLog && snapshot.changeLog.length > 0 && (
                        <ul className="snapshot-log">
                            {snapshot.changeLog.map((line, index) => (
                                <li key={`${slot.toLowerCase()}-log-${index}`}>{line}</li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}

export function SnapshotsPanel({
    layout = "column",
    snapshots,
    onSaveSnapshot,
    onLoadSnapshot,
    onToggleLockA,
}: SnapshotsPanelProps): React.ReactElement {
    if (layout === "row") {
        return (
            <div className="snapshots-row-shell">
                <div className="snapshots-row-header">
                    <h3 className="deck-title">Snapshots</h3>
                    <div className="deck-help-text snapshots-help-text">
                        Save a snapshot to compare changes. Lock 'A' to keep a baseline.
                    </div>
                </div>
                <div className="snapshots-row-grid">
                    <SnapshotCard
                        slot="A"
                        snapshot={snapshots.A}
                        lockA={snapshots.lockA}
                        onSaveSnapshot={onSaveSnapshot}
                        onLoadSnapshot={onLoadSnapshot}
                        onToggleLockA={onToggleLockA}
                    />
                    <SnapshotCard
                        slot="B"
                        snapshot={snapshots.B}
                        lockA={snapshots.lockA}
                        onSaveSnapshot={onSaveSnapshot}
                        onLoadSnapshot={onLoadSnapshot}
                        onToggleLockA={onToggleLockA}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="deck-column">
            <div className="deck-header">
                <h3 className="deck-title">Snapshots</h3>
            </div>

            <div className="deck-section">
                <SnapshotCard
                    slot="A"
                    snapshot={snapshots.A}
                    lockA={snapshots.lockA}
                    onSaveSnapshot={onSaveSnapshot}
                    onLoadSnapshot={onLoadSnapshot}
                    onToggleLockA={onToggleLockA}
                />
            </div>

            <div className="deck-section">
                <SnapshotCard
                    slot="B"
                    snapshot={snapshots.B}
                    lockA={snapshots.lockA}
                    onSaveSnapshot={onSaveSnapshot}
                    onLoadSnapshot={onLoadSnapshot}
                    onToggleLockA={onToggleLockA}
                />
            </div>

            <div className="deck-section flex-grow">
                <div className="deck-help-text">
                    Save a snapshot to compare changes.
                    Lock 'A' to keep a baseline while you iterate on 'B'.
                </div>
            </div>
        </div>
    );
}
