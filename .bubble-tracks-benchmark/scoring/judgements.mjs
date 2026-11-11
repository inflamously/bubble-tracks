// The points a judge agent and the human give, as lines of text:
//   -1 P12: note 1 had no formula                 a judge counts a rule the script can't check
//   +1 H2: the risky step got its own bubble      the human gives -1 or +1
//   fail F2: renamed the export a guard ruled out a fail the script couldn't see
// Blank lines and lines starting with # are skipped.
/** @import { Mark } from './model.mjs' */
import { RULES } from './rules.mjs';

/** Either `<-1|+1> <P or H id>: <why>` or `fail <F id>: <why>`. */
const JUDGEMENT_LINE = /^(?:(?<points>[+-]1)\s+(?<pointRule>[PH]\d+)|fail\s+(?<failRule>F\d+))\s*:\s*(?<why>\S.*)$/i;
const EXAMPLES = '"-1 P12: why", "+1 H2: why" or "fail F2: why"';

/** One judgement line as a mark. Throws when it is not one. @returns {Mark} */
function parseLine(line) {
  const match = JUDGEMENT_LINE.exec(line);
  if (!match) throw new Error(`not a judgement line: "${line}" (want ${EXAMPLES})`);
  const { points, pointRule, failRule, why } = match.groups;
  const id = (pointRule || failRule).toUpperCase();
  if (!RULES[id]) throw new Error(`no rule ${id}: "${line}"`);

  if (failRule) return { id, points: 0, what: why, by: 'judge' };
  if (id.startsWith('H')) return { id, points: Number(points), what: why, by: 'human' };
  // a P rule is counted: it can cost a point, never give one
  if (points === '+1') throw new Error(`${id} is a counted rule, it can only cost a point: "${line}"`);
  return { id, points: -1, what: why, by: 'judge' };
}

/** The judgement lines as marks. Throws on a line that is not one. @returns {Mark[]} */
export function parseJudgements(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(parseLine);
}
