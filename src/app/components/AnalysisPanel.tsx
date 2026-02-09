import React from "react";
import type {
    AnalysisResult,
} from "../../domain/analysis";
import type { Subwoofer } from "../../domain/projectState";
import { getCatalogSubModelById } from "../../domain/projectState";

type AnalysisPanelProps = {
    analysis: AnalysisResult;
    subwoofer: Subwoofer;
};

function formatModelConfidence(confidence: "low" | "medium" | "high"): string {
    if (confidence === "high") {
        return "High Confidence";
    }
    if (confidence === "medium") {
        return "Medium Confidence";
    }
    return "Low Confidence";
}

export function AnalysisPanel({
    analysis,
    subwoofer,
}: AnalysisPanelProps): React.ReactElement {
    const modelProfile = React.useMemo(() => {
        if (subwoofer.subModel?.source !== "catalog") {
            return null;
        }
        return getCatalogSubModelById(subwoofer.subModel.catalogId) ?? null;
    }, [subwoofer.subModel]);

    return (
        <div className="deck-column">
            <div className="deck-header">
                <h3 className="deck-title">Analysis</h3>
            </div>

            <div className="deck-section">
                <div className="scorecard-grid">
                    <div className="scorecard-item">
                        <div className="scorecard-value">{Math.round(analysis.smoothnessScore)}</div>
                        <div className="scorecard-label">Smoothness</div>
                    </div>
                    <div className="scorecard-item">
                        <div className="scorecard-value">{Math.round(analysis.tightnessScore)}</div>
                        <div className="scorecard-label">Tightness</div>
                    </div>
                    <div className="scorecard-item">
                        <div className="scorecard-value">
                            {Math.round(analysis.confidenceScore * 100)}%
                        </div>
                        <div className="scorecard-meta">{analysis.confidenceLevel}</div>
                        <div className="scorecard-label">Confidence</div>
                    </div>
                </div>
            </div>

            {modelProfile?.responseShape && (
                <div className="deck-section">
                    <h4 className="deck-subtitle">Model Confidence Bounds</h4>
                    <div className="model-evidence-card">
                        <div className="model-evidence-header">
                            <span
                                className={`model-confidence-chip ${modelProfile.confidence}`}
                            >
                                {formatModelConfidence(modelProfile.confidence)}
                            </span>
                            <span className="model-evidence-title">
                                {modelProfile.manufacturer} {modelProfile.model}
                            </span>
                        </div>
                        <p className="model-evidence-text">
                            {modelProfile.responseShape.sourceLabel}
                        </p>
                        <div className="model-bounds-grid">
                            {modelProfile.responseShape.bounds.map((band, index) => (
                                <div key={`analysis-bound-${index}`} className="model-bounds-row">
                                    <span className="model-bounds-range">
                                        {band.lowHz}-{band.highHz} Hz
                                    </span>
                                    <span className="model-bounds-delta">
                                        ±{band.plusMinusDb.toFixed(1)} dB
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
