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

### Always speak from APIAny.AI's own first-party voice

The docs present APIAny.AI as the platform that directly provides the models. Never
frame anything as us relaying to a separate vendor/upstream. Compatibility with the
OpenAI / Anthropic / Gemini API *standards* is fine to mention by name (it's about
the request/response format), but never imply a third party fulfilled the request.

### Banned terms (do not appear anywhere in public MDX / OpenAPI / nav)

`上游` · `通道` · `供应商` · `vendor` · `upstream` · `channel` ·
`部署 ID` / `deployment ID` · `routing` / `fallback` / `回退` / `路由` ·
`provider`/`厂商` *when it means "who fulfilled the request"* (naming the
OpenAI/Anthropic/Gemini API standard is allowed).

Self-check before every commit (must return no public-MDX/OpenAPI hits):

```bash
grep -rinE "上游|通道|供应商|vendor|upstream|channel|部署 ?ID|deployment id|路由|routing|回退|fallback" \
  --include="*.mdx" --include="*.json" . | grep -vE "node_modules|README"
```

Before committing documentation changes, also run:

```bash
pnpm validate
```

