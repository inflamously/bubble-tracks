// The view of the hero's track card: draws what logic.mts describes and lets the visitor walk the track.
// Its first render is the same markup index.html ships in #track-card (test/landing.test.js compares the two),
// so the card looks the same before and after the script loads.
import {useState} from 'react';
import {describe, plan, step} from './state.mjs';
import {Bubble, Move, START, TrackState, TrackView} from './model.mjs';

/** A move's button, and what it does to the track. */
interface MoveButton {
    readonly label: string;
    readonly look: string;
    readonly run: (state: TrackState) => TrackState;
}

const MOVES: Record<Move, MoveButton> = {
    step: {label: 'Step: let the agent work', look: 'button-sky', run: step},
    plan: {label: 'Plan the fog yourself', look: 'button-pink', run: plan},
};

function BubbleRow({bubble}: { bubble: Bubble }) {
    return (
        <li className={`is-${bubble.kind}`}>
      <span className="track-mark" aria-hidden="true">
        {bubble.mark}
      </span>
            <span className="track-label">{bubble.label}</span>
            <span className="track-state">{bubble.kind}</span>
        </li>
    );
}

function TrackList(props: {
    track: TrackView
}) {
    const {track} = props;
    return <ol className="track-list">
        {track.bubbles.map((bubble, i) => (
            <BubbleRow key={i} bubble={bubble}/>
        ))}
    </ol>
}

export function TrackCard() {
    const [state, setState] = useState(START);
    const track = describe(state);
    const move = track.next && MOVES[track.next];

    return (
        <>
            <p className="track-meta">
                <span>track: add-csv-export</span>
                <span>try it: press Step</span>
            </p>
            <p className="track-line" role="img" aria-label="Track progress from Start to Finish">
                {track.line}
            </p>
            <TrackList track={track}/>
            <p className={track.stopped ? 'track-message is-stopped' : 'track-message'} aria-live="polite">
                {track.message}
            </p>
            <p className="track-actions">
                {/* One button for both moves: it stays the same element, so it keeps the keyboard focus when Step turns into Plan. */}
                {move && (
                    <button type="button" className={`button ${move.look}`} onClick={() => setState(move.run)}>
                        {move.label}
                    </button>
                )}
                <button type="button" className="button button-ghost" onClick={() => setState(START)}>
                    Restart
                </button>
            </p>
        </>
    );
}
