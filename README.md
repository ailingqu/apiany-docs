# APIAny.AI Documentation

This repository contains the public APIAny.AI documentation site.

The recommended workflow is docs-as-code:

1. Edit MDX guides and `openapi.json` in this repository.
2. Run `pnpm validate` before committing.
3. Preview locally with `pnpm dev`.
4. Connect this repository to Mintlify and publish it to `docs.apiany.ai`.

## Local development

```bash
pnpm install
pnpm validate
pnpm dev
```

`pnpm dev` runs `mintlify dev` through `npx`, so the Mintlify CLI does not need to be committed as a dependency.

## Updating API references

The canonical API reference lives in `openapi.json`.

For now, update this file directly when public endpoints change. The `scripts/sync-from-platform.mjs` file is the reserved integration point for exporting route and model metadata from the APIAny.AI platform repository later.

## Repository boundary

Keep this repository focused on public documentation:

- Guides and concepts: MDX files.
- Interactive endpoint reference: `openapi.json`.
- AI-readable summary: `llms.txt`.
- Maintenance scripts: `scripts/`.

Do not import runtime code from the app repository. The app can export stable documentation data, and this docs repo can consume that exported data.

