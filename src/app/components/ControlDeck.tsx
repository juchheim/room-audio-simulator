import React from "react";

type ControlDeckProps = {
    children: React.ReactNode;
};

export function ControlDeck({ children }: ControlDeckProps): React.ReactElement {
    return (
        <div className="control-deck">
            <div className="deck-grid">
                {children}
            </div>
        </div>
    );
}
