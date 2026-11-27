// bubble-tracks CLI — agent-neutral. Speaks the bubble domain language:
//   node bubble.js move 2 to 5   ·   node bubble.js "fog 4:8"   ·   node bubble.js bubble insert at 3 ?
// The CLI itself is lib/cli/main (shared with the demo site); parsing lives in lib/cli/args, track
// commands in lib/cli/tracks, bubble commands in lib/cli/bubbles, abilities (abilities, bubble:<name>)
// in lib/cli/abilities, research in lib/cli/research, verify in lib/cli/verify.

import { run } from '../lib/cli/main.js';

run();
