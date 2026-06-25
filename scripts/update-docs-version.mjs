// Keeps an inline "last updated" timestamp current at the bottom of the intro
// pages (introduction.mdx + zh/introduction.mdx):
//   最后更新 / Last updated: <YYYY-MM-DD HH:MM> (UTC+8)
//
// The marker is inlined as plain text (NOT a <Snippet>): a snippet placed as the
// last element of a page is silently dropped by the Mintlify build, while inline
// text renders reliably. The script rewrites the marker line in place, and
// self-heals (re-appends it) if a Mintlify web-editor rewrite removed it.
//
// Two timestamp sources keep it accurate without commit spam:
//   - default (the pre-commit hook): wall-clock now ≈ the commit being made.
//   - --head  (the GitHub Action):   the HEAD commit's committer date, so pushes
//     that bypass the hook (e.g. the web editor) still get an accurate time while
//     normal local pushes already match and need no follow-up commit.
//
//   node scripts/update-docs-version.mjs          # stamp wall-clock now
//   node scripts/update-docs-version.mjs --head    # stamp HEAD committer date
//   node scripts/update-docs-version.mjs --check    # exit 1 if marker != HEAD time

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGETS = [
  'introduction.mdx',
  'fr/introduction.mdx',
  'de/introduction.mdx',
  'zh/introduction.mdx',
  'ja/introduction.mdx',
  'ko/introduction.mdx',
  'es/introduction.mdx',
];
const TZ = process.env.TZ || 'Asia/Shanghai';
const LINE_RE = /^.*Last updated: .*\(UTC\+8\)$/m;
const STAMP_RE = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/;

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    ...opts,
  }).trim();
}

function nowStamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${v.year}-${v.month}-${v.day} ${v.hour}:${v.minute}`;
}

function headStamp() {
  return git(['show', '-s', '--format=%cd', '--date=format-local:%Y-%m-%d %H:%M', 'HEAD'], {
    env: { ...process.env, TZ },
  });
}

const root = git(['rev-parse', '--show-toplevel']);

const mode = process.argv.includes('--check')
  ? 'check'
  : process.argv.includes('--head')
    ? 'head'
    : 'now';

if (mode === 'check') {
  const txt = readFileSync(resolve(root, TARGETS[0]), 'utf8');
  const found = (txt.match(LINE_RE)?.[0]?.match(STAMP_RE) || [])[0];
  const expected = headStamp();
  if (found !== expected) {
    console.error(
      `Docs timestamp is stale: HEAD is ${expected}, marker shows ${found ?? '(none)'}.\n` +
        `Run "pnpm version:docs" (or just commit — the pre-commit hook updates it).`,
    );
    process.exit(1);
  }
  console.log(`Docs timestamp is current: ${expected}`);
} else {
  const stamp = mode === 'head' ? headStamp() : nowStamp();
  const newLine = `Last updated: ${stamp} (UTC+8)`;
  for (const rel of TARGETS) {
    const path = resolve(root, rel);
    const original = readFileSync(path, 'utf8');
    let updated;
    if (LINE_RE.test(original)) {
      updated = original.replace(LINE_RE, newLine);
    } else {
      // Self-heal: marker was removed (e.g. a web-editor rewrite). Re-append it.
      const base = original.endsWith('\n') ? original : `${original}\n`;
      updated = `${base}\n{/* docs-updated */}\n\n${newLine}\n`;
    }
    if (updated !== original) writeFileSync(path, updated);
  }
  console.log(`Updated docs timestamp: ${stamp}`);
}
