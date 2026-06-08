import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const specPath = resolve(process.cwd(), 'openapi.json');
const raw = await readFile(specPath, 'utf8');
const spec = JSON.parse(raw);

const errors = [];

if (!spec.openapi || !String(spec.openapi).startsWith('3.')) {
  errors.push('openapi must be a 3.x version string');
}

if (!spec.info?.title) {
  errors.push('info.title is required');
}

if (!spec.info?.version) {
  errors.push('info.version is required');
}

if (!spec.paths || Object.keys(spec.paths).length === 0) {
  errors.push('paths must not be empty');
}

for (const [path, methods] of Object.entries(spec.paths ?? {})) {
  if (!path.startsWith('/')) {
    errors.push(`path must start with /: ${path}`);
  }
  for (const [method, operation] of Object.entries(methods ?? {})) {
    if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) {
      continue;
    }
    if (!operation.operationId) {
      errors.push(`${method.toUpperCase()} ${path} is missing operationId`);
    }
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      errors.push(`${method.toUpperCase()} ${path} is missing responses`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join('\n'));
  process.exit(1);
}

console.log(`OpenAPI validation passed: ${Object.keys(spec.paths).length} paths`);

