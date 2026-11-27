// A draft is a track the human hasn't approved yet: the proposal, stored. approve turns it into a normal track.
/** Turn the draft into a normal track. Only the human's go leads here; an empty draft is no plan yet. */
export function approve(track) {
    if (!track.draft)
        throw new Error('the current track is no draft — nothing to approve');
    if (!track.bubbles.length)
        throw new Error('the draft has no bubbles — add one before the human approves it');
    delete track.draft;
    return 'approved — the draft is a track now: keep to its guards, and start at the active bubble';
}
