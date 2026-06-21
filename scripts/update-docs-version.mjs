// Updates snippets/docs-version.mdx with a public build marker:
//   **Docs version / 文档版本：** <YYYY-MM-DD> · <fingerprint>
//
// <fingerprint> is a 7-char sha256 over the tracked public docs source files
// (the same set validate-public-content.mjs guards), EXCLUDING the marker file
// itself. It is a content fingerprint, NOT a git commit short hash: a commit can
// never contain its own hash (the hash depends on the file, the file would
// depend on the hash), so a commit-hash marker is always off by one and breaks
// the "live string == latest" check. A self-excluding fingerprint is
// self-consistent and lets you verify deployment freshness exactly:
//   live docs.apiany.ai marker == repo snippets/docs-version.mdx  =>  deployed = latest.
//
//   node scripts/update-docs-version.mjs          # rewrite the marker
//   node scripts/update-docs-version.mjs --check   # exit 1 if the marker is stale

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const MARKER = 'snippets/docs-version.mdx';

// Same public surface as scripts/validate-public-content.mjs.
const publicGlobs = [
  '*.mdx',
  'reference/**/*.mdx',
  'models/**/*.mdx',
  'operations/**/*.mdx',
  'zh/**/*.mdx',
  'snippets/**/*.mdx',
  'zh/snippets/**/*.mdx',
  'openapi.json',
  'zh/openapi.json',
  'docs.json',
  'llms.txt',
];

function git(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function currentDate() {
  const timeZone = process.env.TZ || 'Asia/Shanghai';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const root = git(['rev-parse', '--show-toplevel']);

function fingerprint() {
  const stdout = execFileSync('git', ['ls-files', ...publicGlobs], {
    cwd: root,
    encoding: 'utf8',
  });
  const files = [
    ...new Set(
      stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((file) => file !== MARKER),
    ),
  ].sort();

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(resolve(root, file)));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 7);
}

const id = fingerprint();
const outputPath = resolve(root, MARKER);
const content = `**Docs version / 文档版本：** ${currentDate()} · ${id}\n`;

let current = '';
try {
  current = readFileSync(outputPath, 'utf8');
} catch {
  current = '';
}

if (process.argv.includes('--check')) {
  // Only the fingerprint matters in check mode (the date drifts daily by design).
  const idOf = (text) => (text.match(/·\s*([0-9a-f]{7})\s*$/m) || [])[1];
  if (idOf(current) !== id) {
    console.error(
      `Docs version marker is stale: expected fingerprint ${id}, found ${idOf(current) ?? '(none)'}.\n` +
        `Run "pnpm version:docs" (or just commit — the pre-commit hook updates it).`,
    );
    process.exit(1);
  }
  console.log(`Docs version marker is current: ${id}`);
} else {
  if (current !== content) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content);
  }
  console.log(`Updated docs version marker: ${currentDate()} · ${id}`);
}
