# Flow Model Schema

`render-schematic.mjs` and `ste100-lint.mjs` read one JSON file: the **flow model**. The renderer validates it first and stops with a list of every problem it finds.

Complete example: `references/example-flow.json` (webhook → DB with error branches and scenario paths).

## Top level

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | ✅ | Shown in the page header and the SVG overview. |
| `concept` | string | | One-line summary shown under the title. |
| `tier` | `low` \| `med` \| `high` | | Default tier. The `--tier` CLI flag overrides it. Falls back to `high`. |
| `nodes` | Node[] | ✅ | In flow order. Main-path order = array order of non-`error` nodes. |
| `connections` | Connection[] | | The cables. Each one gets an arrow and an optional label. |
| `scenarios` | Scenario[] | | Walkthrough paths. Without them, the page uses the main path. |

## Node

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | Unique. Use kebab-case, for example `node-auth` or `err-401`. |
| `label` | string | ✅ | Card title. Wraps to 2 lines of about 24 characters. |
| `type` | enum | ✅ | `ingress` · `interlock` · `processor` · `egress` · `error`. |
| `sub` | string | | One short subtitle (about 30 characters show on the card). |
| `codeRef` | string | | `path/to/file.ts:LINE`. Always add the line number when you know it. |
| `ste100` | `{ low, med, high }` | ✅ | ASD-STE100 text per tier. The **requested tier is mandatory**. |
| `story` | string | | Plain-English analogy for non-engineers. Not linted as STE100. |
| `validations` | string[] | | Rules the stage enforces. |
| `edgeCases` | string | | What happens when this stage fails. |
| `payload` | object | | Example data at this point of the flow. |

**Tier text rules** (checked by `ste100-lint.mjs flow.json`):

| Tier | Shape | Limit |
|---|---|---|
| `low` | 1–2 sentences, what the stage does | ≤ 2 sentences, ≤ 25 words each |
| `med` | One procedural step: actor + action + object | ≤ 20 words per sentence |
| `high` | Mechanism, contract, and failure detail | ≤ 25 words per sentence, ≤ 6 sentences |

## Error nodes and branches

Give a rejection outcome its own node with `type: "error"`, and connect it from the stage that rejects:

```json
{ "from": "node-auth", "to": "err-401", "label": "Bad signature" }
```

The layout puts each error node in a lane directly under its source. It draws the cable as a dashed red line with its own arrowhead.

## Connection

| Field | Type | Required | Notes |
|---|---|---|---|
| `from` | node id | ✅ | |
| `to` | node id | ✅ | A connection into an `error` node is drawn as an error branch. |
| `label` | string | | What travels on the cable. Keep it ≤ 18 characters per line (2 lines max). |

## Scenario

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | ✅ | |
| `name` | string | ✅ | Chip text, for example `401 Signature Error`. |
| `description` | string | | Tooltip text. |
| `path` | node id[] | | Ordered node ids the walkthrough visits. Defaults to the main path. |

Example error scenario: `{ "id": "err_auth", "name": "401 Signature Error", "path": ["node-sf", "node-auth", "err-401"] }`.
