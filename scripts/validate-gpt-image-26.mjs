import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const locales = ['', 'zh/', 'ja/', 'ko/', 'de/', 'fr/', 'es/'];
const model = 'gpt-image-2.6';
const base = { model, prompt: 'A small orange robot waving' };

// Focused JSON Schema checks for this request contract, without extra dependencies.
function matches(value, schema, spec) {
  if (typeof schema === 'boolean') return schema;
  if (schema.$ref) return matches(value, schema.$ref.slice(2).split('/').reduce((node, key) => node[key], spec), spec);
  if (schema.allOf && !schema.allOf.every((item) => matches(value, item, spec))) return false;
  if (schema.anyOf && !schema.anyOf.some((item) => matches(value, item, spec))) return false;
  if (schema.oneOf && schema.oneOf.filter((item) => matches(value, item, spec)).length !== 1) return false;
  if (schema.not && matches(value, schema.not, spec)) return false;
  if (Object.hasOwn(schema, 'const') && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.required && value && typeof value === 'object' && schema.required.some((key) => !Object.hasOwn(value, key))) return false;
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(schema.properties ?? {}, key)) {
        if (!matches(child, schema.properties[key], spec)) return false;
      } else if (schema.additionalProperties === false) return false;
    }
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return false;
    if (schema.minItems != null && value.length < schema.minItems) return false;
    if (schema.maxItems != null && value.length > schema.maxItems) return false;
    if (schema.items && !value.every((item) => matches(item, schema.items, spec))) return false;
  }
  if (schema.type === 'string' && (typeof value !== 'string' || value.length < (schema.minLength ?? 0))) return false;
  if (schema.type === 'integer' && !Number.isInteger(value)) return false;
  if (schema.minimum != null && value < schema.minimum) return false;
  if (schema.maximum != null && value > schema.maximum) return false;
  return true;
}

let assertions = 0;
for (const prefix of locales) {
  const label = prefix || 'en/';
  const spec = JSON.parse(await readFile(`${prefix}openapi.json`, 'utf8'));
  const schema = spec.components.schemas.GPTImage26GenerationRequest;
  assert.ok(schema, `${label}: dedicated GPTImage26GenerationRequest is missing`);
  assert.ok(spec.components.schemas.ImageGenerationRequest.oneOf.some((item) => item.$ref === '#/components/schemas/GPTImage26GenerationRequest'), `${label}: generation union must include the dedicated schema`);
  assert.ok(spec.components.schemas.GenericImageGenerationRequest.properties.model.not.enum.includes(model), `${label}: generic schema must exclude GPT Image 2.6`);

  const valid = [
    base,
    ...['png', 'gif'].map((output_format) => ({ ...base, output_format, quality: 'auto', resolution: '1K', n: 1 })),
    ...['auto', '1:1', '3:2', '2:3', '1024x1024', '1536x1024', '1024x1536'].map((size) => ({ ...base, size })),
    { ...base, image_urls: ['https://example.com/reference.png'], output_format: 'gif' },
    { ...base, model_params: { output_format: 'gif', quality: 'auto', resolution: '1K', n: 1 } },
  ];
  const invalid = [
    ...['svg', 'jpeg', 'webp'].map((output_format) => ({ ...base, output_format })),
    ...['2K', '4K'].map((resolution) => ({ ...base, resolution })),
    { ...base, quality: 'high' }, { ...base, n: 2 }, { ...base, size: '16:9' },
    { ...base, image_urls: ['https://example.com/a.png', 'https://example.com/b.png'] },
    ...['frame_count', 'frame_duration_ms', 'mask', 'mask_url', 'output_compression'].map((key) => ({ ...base, [key]: 1 })),
    { ...base, background: 'transparent' },
    { ...base, format: 'svg' }, { ...base, outputFormat: 'webp' },
    { ...base, aspect_ratio: '16:9' }, { ...base, imageSize: '4K' },
    { ...base, count: 2 }, { ...base, frameCount: 8 }, { ...base, frameDurationMs: 100 },
    ...['images', 'input_urls'].map((key) => ({ ...base, [key]: ['https://example.com/a.png', 'https://example.com/b.png'] })),
  ];
  for (const request of valid) {
    assert.ok(matches(request, schema, spec), `${label}: valid request rejected: ${JSON.stringify(request)}`);
    assert.ok(matches(request, spec.components.schemas.ImageGenerationRequest, spec), `${label}: valid request must match exactly one generation branch`);
    assertions += 2;
  }
  for (const request of invalid) {
    assert.equal(matches(request, spec.components.schemas.ImageGenerationRequest, spec), false, `${label}: invalid request accepted: ${JSON.stringify(request)}`);
    const { model: ignoredModel, prompt: ignoredPrompt, ...parameters } = request;
    assert.equal(matches({ ...base, model_params: parameters }, schema, spec), false, `${label}: invalid model_params accepted: ${JSON.stringify(parameters)}`);
    assertions += 2;
  }

  for (const path of ['/v1/images/generations', '/v1/images/generations/sync', '/v1/images/edits']) {
    const operation = spec.paths[path].post;
    assert.ok(operation.responses['202'], `${label}: ${path} must document pending tasks`);
    const json = operation.requestBody.content['application/json'];
    assert.ok(json, `${label}: ${path} must document JSON requests`);
    const examples = Object.values(json.examples ?? {}).map((example) => example.value).filter((value) => value?.model === model);
    assert.ok(examples.some((example) => example.output_format === 'png'), `${label}: ${path} is missing a PNG example`);
    assert.ok(examples.some((example) => example.output_format === 'gif'), `${label}: ${path} is missing a GIF example`);
    for (const example of examples) {
      assert.ok(matches(example, json.schema, spec), `${label}: invalid ${path} example`);
      assertions++;
    }
  }
  const multipartSchema = spec.paths['/v1/images/edits'].post.requestBody.content['multipart/form-data'].schema;
  assert.ok(matches({ ...base, image: 'reference.png', output_format: 'gif' }, multipartSchema, spec), `${label}: valid GIF multipart edit rejected`);
  assert.equal(matches({ ...base, image: 'reference.png', output_format: 'svg' }, multipartSchema, spec), false, `${label}: multipart edit must reject SVG`);
  assertions += 2;

  for (const page of ['models/image-models.mdx', 'reference/image-generation.mdx']) {
    const content = await readFile(`${prefix}${page}`, 'utf8');
    const section = content.split('## GPT Image 2.6')[1]?.split(/\n## (?!#)/)[0];
    assert.ok(section, `${label}${page}: GPT Image 2.6 section is missing`);
    for (const token of ['30', 'SVG', 'frame_count', 'frame_duration_ms', 'model_params', 'result.data[0].url', '/v1/images/generations/sync', '/v1/images/edits']) {
      assert.ok(section.includes(token), `${label}${page}: missing ${token}`);
      assertions++;
    }
    const requests = [...section.matchAll(/-d '([^']+)'/g)].map((match) => JSON.parse(match[1]));
    assert.ok(requests.some((request) => request.output_format === 'png'), `${label}${page}: PNG curl example is missing`);
    assert.ok(requests.some((request) => request.output_format === 'gif'), `${label}${page}: GIF curl example is missing`);
    for (const request of requests) {
      assert.equal(request.model, model, `${label}${page}: example uses the wrong model`);
      assert.ok(matches(request, schema, spec), `${label}${page}: curl request does not match the schema`);
      assert.equal(Object.hasOwn(request, 'background'), false, `${label}${page}: examples should omit advanced background controls`);
      assertions++;
    }
  }
  console.log(`GPT Image 2.6 docs passed: ${label} (${assertions} cumulative checks)`);
}
console.log(`GPT Image 2.6 contract validation passed: ${locales.length} locales, ${assertions} checks`);
