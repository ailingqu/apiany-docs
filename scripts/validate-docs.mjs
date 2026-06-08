import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const docsJsonPath = resolve(process.cwd(), 'docs.json');
const docsConfig = JSON.parse(await readFile(docsJsonPath, 'utf8'));

const errors = [];
const seenPages = new Map();
const openapiRefs = [];

function collectNavigation(node, trail = []) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node.pages)) {
    for (const page of node.pages) {
      if (typeof page !== 'string') continue;
      const existing = seenPages.get(page);
      const location = trail.join(' > ') || 'navigation';
      if (existing) {
        errors.push(`duplicate page path "${page}" in ${existing} and ${location}`);
      } else {
        seenPages.set(page, location);
      }
    }
  }

  if (typeof node.openapi === 'string') {
    openapiRefs.push(node.openapi);
  }

  for (const key of ['languages', 'tabs', 'groups', 'anchors', 'dropdowns', 'versions', 'products']) {
    if (!Array.isArray(node[key])) continue;
    for (const child of node[key]) {
      const label =
        child.language ||
        child.tab ||
        child.group ||
        child.anchor ||
        child.dropdown ||
        child.version ||
        child.product ||
        key;
      collectNavigation(child, [...trail, String(label)]);
    }
  }
}

collectNavigation(docsConfig.navigation);

async function assertFile(relativePath) {
  const candidates = relativePath.endsWith('.json')
    ? [relativePath]
    : [`${relativePath}.mdx`, `${relativePath}.md`];

  for (const candidate of candidates) {
    try {
      await access(resolve(process.cwd(), candidate));
      return;
    } catch {
      // Try next extension.
    }
  }

  errors.push(`missing navigation file "${relativePath}"`);
}

await Promise.all([...seenPages.keys()].map(assertFile));
await Promise.all(openapiRefs.map(assertFile));

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(
  `Docs navigation validation passed: ${seenPages.size} pages, ${openapiRefs.length} OpenAPI refs`
);

