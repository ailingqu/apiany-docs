import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const publicGlobs = [
  '*.mdx',
  'reference/**/*.mdx',
  'models/**/*.mdx',
  'operations/**/*.mdx',
  'zh/**/*.mdx',
  'openapi.json',
  'zh/openapi.json',
  'docs.json',
  'llms.txt',
];

const forbiddenPatterns = [
  /真实上游/i,
  /上游/i,
  /通道/i,
  /fallback/i,
  /upstream/i,
  /\bchannel\b/i,
  /\binternal(?:ly)?\b/i,
  /文档更新流程/i,
  /update workflow/i,
  /sync-from-platform/i,
  /repository sync/i,
  /route plan/i,
  /weighted selection/i,
  /\/api\/v1\/video\/generations\b/i,
  /\/v1\/video\/generations\b/i,
];

const { stdout } = await execFileAsync('git', ['ls-files', ...publicGlobs], {
  cwd: process.cwd(),
});

const files = stdout
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const errors = [];

for (const file of files) {
  try {
    await access(resolve(process.cwd(), file));
  } catch {
    continue;
  }
  const content = await readFile(resolve(process.cwd(), file), 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      errors.push(`${file}: contains forbidden public-docs term ${pattern}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Public content validation passed: ${files.length} files`);
