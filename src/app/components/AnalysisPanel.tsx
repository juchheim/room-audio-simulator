import React from "react";
import type {
    AnalysisResult,
    TopProblem,
} from "../../domain/analysis";

type AnalysisPanelProps = {
    analysis: AnalysisResult;
    selectedProblemId: string | null;
    onSelectProblem: (id: string | null) => void;
};

function formatSeverity(severity: string): string {
    return `${severity[0].toUpperCase()}${severity.slice(1)}`;
}

export function AnalysisPanel({
    analysis,
    selectedProblemId,
    onSelectProblem,
}: AnalysisPanelProps): React.ReactElement {
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
                        <div className="scorecard-value">{analysis.confidenceScore}</div>
                        <div className="scorecard-label">Confidence</div>
                    </div>
                </div>
            </div>

            <div className="deck-section flex-grow">
                <h4 className="deck-subtitle">Top Problems</h4>
                <div className="deck-list">
                    {analysis.topProblems.length === 0 && (
                        <div className="deck-empty">No severe problems detected.</div>
                    )}
                    {analysis.topProblems.map(problem => {
                        const isSelected = problem.id === selectedProblemId;
                        const kindLabel = problem.kind === "peak" ? "Peak" : "Null";
                        const center = Math.round(problem.centerHz);

                        return (
                            <button
                                key={problem.id}
                                type="button"
                                className={`problem-card ${isSelected ? 'is-selected' : ''}`}
                                onClick={() => onSelectProblem(isSelected ? null : problem.id)}
                            >
                                <div className="problem-card-header">
                                    <span className="problem-card-title">
                                        {kindLabel} ~{center}Hz
                                    </span>
                                    <span className={`problem-severity ${problem.severity}`}>
                                        {formatSeverity(problem.severity)}
                                    </span>
                                </div>
                                <div className="problem-card-range">
                                    {Math.round(problem.rangeHz.low)}-{Math.round(problem.rangeHz.high)} Hz
                                </div>
                                <div className="problem-card-tags">
                                    {problem.tags.map(tag => (
                                        <span key={tag} className="problem-tag">
                                            {tag.replace('_', ' ')}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
