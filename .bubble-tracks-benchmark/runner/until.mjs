// When a run is over: the scenario's `until`, checked against the track the run is on.

/** A fog is classified once the human gave it a type or their own words. */
function isClassified(bubble) {
  return bubble.state !== 'fog' || Boolean(bubble.type) || Boolean(bubble.answer);
}

/** `planned`: a track the agent made exists, has bubbles, and no fog is left unclassified. */
function isPlanned(current, tracksBefore) {
  const isNewTrack = !tracksBefore.includes(current.name);
  const bubbles = current.track.bubbles || [];
  return isNewTrack && bubbles.length > 0 && bubbles.every(isClassified);
}

/**
 * @param {'planned' | 'closed'} until
 * @param {{ name: string, track: object } | null} current the track the run is on, if any
 * @param {string[]} tracksBefore the tracks the scenario's setup made
 */
export function isFinished(until, current, tracksBefore) {
  if (!current) return false;
  if (until === 'planned') return isPlanned(current, tracksBefore);
  return Boolean(current.track.closed);
}
