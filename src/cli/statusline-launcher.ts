// Status line launcher — Claude Code SessionStart hook, registered by the plugin.
// The plugin's own folder has its version in the path, so a statusLine entry can't point at it for long.
// This hook writes one small file, statusline.js, into the plugin's data folder (${CLAUDE_PLUGIN_DATA}:
// same path for every version). That file runs the status line of the plugin version that wrote it:
// settings.json: { "statusLine": { "type": "command", "command": "node ~/.claude/plugins/data/<plugin id>/statusline.js" } }
// Never writes stdout (Claude Code adds a SessionStart hook's stdout to the context). Fails open.

import * as fs from 'node:fs';
import * as path from 'node:path';

/** The launcher's file name inside the data folder. */
const LAUNCHER = 'statusline.js';

/** The status line of this plugin version, next to this hook, as the file: URL the launcher imports. */
const STATUSLINE = new URL('./statusline.js', import.meta.url).href;

/** import() loads it whether Node reads the launcher as CommonJS or as a module. A blank line when that version is gone. */
const SOURCE =
  `// Written by the bubble-tracks plugin at every session start. Don't edit: it is overwritten.\n` +
  `// Runs the status line of the installed plugin version.\n` +
  `import(${JSON.stringify(STATUSLINE)}).catch(() => process.stdout.write('\\n'));\n`;

function main(): void {
  const dataDir = process.env.CLAUDE_PLUGIN_DATA;
  if (!dataDir) return;
  const file = path.join(dataDir, LAUNCHER);
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === SOURCE) return;
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(file, SOURCE);
}

try {
  main();
} catch {
  // a status line that stays blank is better than a session that starts with an error
}
