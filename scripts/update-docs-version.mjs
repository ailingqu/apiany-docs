import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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
const shortRef = git(['rev-parse', '--short=7', 'HEAD']);
const outputPath = resolve(root, 'snippets/docs-version.mdx');
const content = `**Docs version / 文档版本：** ${currentDate()} · ${shortRef}\n`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, content);
