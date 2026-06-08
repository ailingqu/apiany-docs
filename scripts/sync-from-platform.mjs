import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const platformRoot = resolve(process.cwd(), '../shipany-apiany-next');
const marker = resolve(platformRoot, 'src/modules/api-platform/capabilities/index.ts');

try {
  await access(marker);
} catch {
  console.error(`Platform repository not found at ${platformRoot}`);
  process.exit(1);
}

const outputPath = resolve(process.cwd(), '.generated/platform-sync.md');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  [
    '# Platform sync placeholder',
    '',
    `Platform repository detected: ${platformRoot}`,
    '',
    'Next step: add a stable platform export command that writes public model metadata and endpoint schemas as JSON.',
    '',
  ].join('\n')
);

console.log(`Wrote ${outputPath}`);

