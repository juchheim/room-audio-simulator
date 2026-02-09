import React from "react";
import type { AnalysisResult } from "../../domain/analysis";

type TopProblemsPanelProps = {
    analysis: AnalysisResult;
    selectedProblemId: string | null;
    onSelectProblem: (id: string | null) => void;
};

function formatSeverity(severity: string): string {
    return `${severity[0].toUpperCase()}${severity.slice(1)}`;
}

export function TopProblemsPanel({
    analysis,
    selectedProblemId,
    onSelectProblem,
}: TopProblemsPanelProps): React.ReactElement {
    return (
        <div className="deck-column">
            <div className="deck-header">
                <h3 className="deck-title">Top Problems</h3>
            </div>

            <div className="deck-section flex-grow">
                <div className="deck-list">
                    {analysis.topProblems.length === 0 && (
                        <div className="deck-empty">No severe problems detected.</div>
                    )}
                    {analysis.topProblems.map((problem) => {
                        const isSelected = problem.id === selectedProblemId;
                        const kindLabel = problem.kind === "peak" ? "Peak" : "Null";
                        const center = Math.round(problem.centerHz);

                        return (
                            <button
                                key={problem.id}
                                type="button"
                                className={`problem-card ${isSelected ? "is-selected" : ""}`}
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
                                    {problem.tags.map((tag) => (
                                        <span key={tag} className="problem-tag">
                                            {tag.replace("_", " ")}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
