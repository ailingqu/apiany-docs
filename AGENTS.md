# APIAny.AI Docs — Global Agent Rules

This repository powers the public APIAny.AI documentation site.

## Public Information Rule

All docs content must be written for external API users only.

Strictly do not expose or describe platform-internal implementation details in public pages, OpenAPI descriptions, navigation labels, examples, or AI-readable docs. This includes, but is not limited to:

- Real provider channel names or channel selection details.
- Internal routing, route plans, fallback groups, weighted selection, or retry strategies.
- Internal cost, margin, settlement, audit, raw request, raw response, or trace implementation details.
- Documentation maintenance, repository sync, deployment workflow, or platform export workflow pages.
- Any wording that tells users which real provider, channel, or internal adapter handled a request.

Use public-facing language instead:

- "APIAny.AI model execution"
- "model service"
- "task history"
- "usage records"
- "standardized response"
- "public model ID"

If a detail is useful only to APIAny operators, keep it out of Mintlify navigation and public MDX/OpenAPI files. Internal maintenance notes may live in `README.md`, scripts, or private operational docs, but not in public documentation pages.

Before committing documentation changes, run:

```bash
pnpm validate
```

