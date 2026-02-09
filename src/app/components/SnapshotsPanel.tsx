import React from "react";
import type { Snapshot, SnapshotSlot } from "../../domain/snapshots";

type SnapshotsPanelProps = {
    snapshots: {
        A: Snapshot | null;
        B: Snapshot | null;
        lockA: boolean;
    };
    onSaveSnapshot: (slot: SnapshotSlot) => void;
    onLoadSnapshot: (slot: SnapshotSlot) => void;
    onToggleLockA: (locked: boolean) => void;
};

export function SnapshotsPanel({
    snapshots,
    onSaveSnapshot,
    onLoadSnapshot,
    onToggleLockA,
}: SnapshotsPanelProps): React.ReactElement {
    return (
        <div className="deck-column">
            <div className="deck-header">
                <h3 className="deck-title">Snapshots</h3>
            </div>

            <div className="deck-section">
                <div className="snapshot-card">
                    <div className="snapshot-header">
                        <span className="snapshot-label">Snapshot A</span>
                        <label className="snapshot-lock">
                            <input
                                type="checkbox"
                                checked={snapshots.lockA}
                                onChange={(e) => onToggleLockA(e.target.checked)}
                            />
                            Lock
                        </label>
                    </div>
                    <div className="snapshot-actions">
                        <button
                            type="button"
                            className="deck-button"
                            onClick={() => onSaveSnapshot("A")}
                            disabled={snapshots.lockA}
                        >
                            {snapshots.A ? "Update A" : "Save A"}
                        </button>
                        <button
                            type="button"
                            className="deck-button secondary"
                            onClick={() => onLoadSnapshot("A")}
                            disabled={!snapshots.A}
                        >
                            Load
                        </button>
                    </div>
                    {snapshots.A && (
                        <div className="snapshot-meta">
                            {new Date(snapshots.A.savedAt).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            </div>

            <div className="deck-section">
                <div className="snapshot-card">
                    <div className="snapshot-header">
                        <span className="snapshot-label">Snapshot B</span>
                    </div>
                    <div className="snapshot-actions">
                        <button
                            type="button"
                            className="deck-button"
                            onClick={() => onSaveSnapshot("B")}
                        >
                            {snapshots.B ? "Update B" : "Save B"}
                        </button>
                        <button
                            type="button"
                            className="deck-button secondary"
                            onClick={() => onLoadSnapshot("B")}
                            disabled={!snapshots.B}
                        >
                            Load
                        </button>
                    </div>
                    {snapshots.B && (
                        <div className="snapshot-meta">
                            {new Date(snapshots.B.savedAt).toLocaleTimeString()}
                        </div>
                    )}
                </div>
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
