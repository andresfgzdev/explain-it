# explain-it

An agent skill for **Claude Code** and modern AI coding assistants that explains software architectures, codebases, and multi-system integrations in strict **ASD-STE100 (Simplified Technical English)**, accompanied by an interactive **Software Machine schematic**.

Inspired by the tactile craft of [Anatomy](https://skills.wheresryan.sh/anatomy), `explain-it` renders your architecture as a connected system of cards and labelled signal cables. The main path runs left to right, error branches drop into a lane below, and a step-by-step walkthrough lets you trace each scenario.

---

## Key Features

1. **Strict ASD-STE100 Compliance:**
   - Limits sentence length (max 20 words for procedures, max 25 words for descriptions).
   - Enforces active voice (with or without "by") and approved vocabulary (*use*, *show*, *start*, *run*, *send*, *get*), and warns on noun clusters.
   - Lints whole flow models per tier: `ste100-lint.mjs flow.json`.

2. **One tier per explanation:**
   - **Low (Executive Overview):** 1–2 sentences per stage.
   - **Medium (Operational Breakdown):** one procedural step per hop. This is the default.
   - **High (Deep Technical Anatomy):** contracts, validations, failure paths, and `file:line` references.
   - The tier you pick is the only tier in the chat answer and in the HTML.

3. **Multi-Hop Pipeline Discovery:**
   - `trace-flow.mjs` finds routes, webhooks, queue consumers, validators, auth checks, DB queries, and third-party calls, with line numbers.

4. **Two artifacts per render, both offline and dependency-free:**
   - **System overview SVG:** the whole connected system with labelled cables, error branches, and a legend, ready for PRs and docs.
   - **Interactive HTML walkthrough:** scenario paths (for example `200 OK`, `401`, `422`, `504`), step navigation, an animated signal pulse, and a per-stage inspector with code refs, rules, failure behavior, and payloads. Supports light and dark mode.

5. **Validated flow model:** a documented JSON schema (`references/flow-schema.md`). The renderer reports every problem before it renders.

---

## Installation

### Claude Code (Plugin)
```bash
/plugin marketplace add andresfgzdev/explain-it
/plugin install explain-it@explain-it
```

### Universal Agent Skills CLI
```bash
npx skills add andresfgzdev/explain-it
```

### Manual Installation
Copy the `skills/explain-it/` folder into your agent skills directory (e.g., `~/.claude/skills/explain-it/` or `.claude/skills/explain-it/` in your repository).

---

## Usage

Ask in plain English:
* *"Explain how the Salesforce webhook connects to our PostgreSQL database."*
* *"Explain how PaymentForm talks to the backend, in ASD-STE100 High tier."*
* *"Show an interactive schematic of our authentication pipeline."*

Or invoke directly in Claude Code:
```text
/explain-it:explain-it "trace user registration from UI to DB"
```

---

## Verification & Testing

Run the automated test suite. It checks the ASD-STE100 linter, flow validation, layout geometry, both renderers for every fixture and tier, and the multi-hop scanner:

```bash
npm test
```

Generate the demo artifacts (HTML + SVG in `dist/`):
```bash
npm run demo            # Salesforce → PostgreSQL sample, with error branches
npm run demo:docs-site  # 7-stage static docs site pipeline, wraps into two rows
```

Render your own flow model:
```bash
node skills/explain-it/scripts/render-schematic.mjs --fixture flow.json --out dist/flow.html --tier med
```

---

## License

MIT © Andres Gallego
