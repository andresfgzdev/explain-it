---
name: explain-it
description: >
  Use when someone asks to explain how a component, service, feature, API, or multi-system integration works
  (e.g., frontend to backend, Salesforce to API, webhook to database, worker queues, event-driven flows);
  wants an explanation in ASD-STE100 (Simplified Technical English) at Low, Medium, or High depth;
  or requests an interactive visual schematic or system diagram showing data paths, validations,
  and failure cases. Not for generating new boilerplate code or running arbitrary refactors.
license: MIT
compatibility: Node.js 18+, any repository or software architecture.
---

# explain-it

Explain a software architecture, feature, or cross-system pipeline in strict **ASD-STE100 (Simplified Technical English)**. Then render it as a **system overview SVG** and an **interactive HTML walkthrough**.

Scripts live in `${CLAUDE_SKILL_DIR}/scripts/`. References live in `${CLAUDE_SKILL_DIR}/references/`.

---

## Defaults: do not interrogate the user

Use these defaults unless the request says otherwise. Ask **one** question only when the target system itself is ambiguous.

| Option | Default | Other values |
|---|---|---|
| Output | **HTML walkthrough + SVG overview** | `svg` only · `ascii` (box-drawing schematic in chat) · `text` (Markdown only) |
| Tier | **Medium** | Low · High. Map "quick/summary" → low, "steps/how" → med, "deep/everything/all details" → high |

Use **one tier** for everything: the chat explanation and the HTML. The HTML has no tier switcher.

### What each tier contains

| Tier | Chat explanation | Per-node `ste100` text |
|---|---|---|
| **Low** (executive) | 2–3 sentences for the whole system | 1–2 sentences: what the stage does |
| **Medium** (steps) | Numbered steps, one per hop: actor → action → output | One procedural sentence (≤ 20 words) |
| **High** (deep) | Steps plus contracts, validations, failure paths, and `file:line` refs | ≤ 6 descriptive sentences (≤ 25 words each): mechanism, contract, failure |

---

## Step 1: Trace the pipeline

Map the complete flow, not only the first frontend-to-backend hop:

1. **Ingress:** the user action, route, webhook, cron job, or queue consumer that starts the flow.
2. **Interlocks:** signature/auth checks, schema validators (Zod/Yup/Pydantic), rate limiters.
3. **Processing:** services, state machines, transformers, business rules.
4. **Egress:** database writes, third-party APIs, outbound messages.
5. **Rejections:** every place the flow can stop (401, 422, 504, dead-letter queue). Each one becomes an `error` node.

Start with the scanner. It lists candidate files with the line number of each hop:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/trace-flow.mjs <target-directory>     # add --json for machine output
```

The scanner only finds candidates. **Read the files** to confirm each hop and to get exact `file:line` references.

## Step 2: Write the flow model

Write `<scratch>/flow-<id>.json`. It must follow **`references/flow-schema.md`**. Copy the structure of `references/example-flow.json`.

Checklist:
- One node per real hop. Use `type: "error"` nodes for rejections, connected from the stage that rejects.
- `codeRef` uses `path/file.ts:LINE` for every node in the codebase.
- Fill `ste100.<tier>` for the chosen tier on every node. The other tiers are optional.
- Add `story` (plain-English analogy) when the audience is not technical.
- Give each connection a short `label` (≤ 18 characters per line) that names what travels on it.
- Add one `scenario` per meaningful path, with an ordered `path`. Always include the happy path.

Write all STE100 text with the rules in `references/ste100-rules.md`:
- Active voice only.
- Approved words only (*use*, *show*, *start*, *stop*, *run*, *send*, *get*, *do*, *make sure*).
- No more than 3 nouns in a row.

## Step 3: Lint

```bash
node ${CLAUDE_SKILL_DIR}/scripts/ste100-lint.mjs <scratch>/flow-<id>.json   # every ste100 field, per-tier limits
node ${CLAUDE_SKILL_DIR}/scripts/ste100-lint.mjs <scratch>/explanation.md   # the chat explanation, if long
```

Fix every error. Fix warnings (noun clusters) when the fix keeps the meaning.

## Step 4: Render

```bash
node ${CLAUDE_SKILL_DIR}/scripts/render-schematic.mjs --fixture <scratch>/flow-<id>.json --out <scratch>/explain-<id>.html --tier <low|med|high>
```

This writes `explain-<id>.html` (interactive walkthrough) and `explain-<id>.svg` (whole-system overview). Use `--svg <path>` to choose another SVG path. The renderer validates the model first. If it lists problems, fix the JSON and run it again.

- **`svg` mode:** render as above and give only the SVG.
- **`ascii` mode:** draw a box-drawing schematic directly in chat. Keep error branches below the main path.
- **`text` mode:** skip rendering.

## Step 5: Deliver

1. Open the result for the user:
   - Windows: `start "" <file>`
   - macOS: `open <file>`
   - Linux: `xdg-open <file>`
2. Give the tier explanation in chat, in the same tier as the HTML.
3. Give the absolute paths of the HTML and SVG files.
