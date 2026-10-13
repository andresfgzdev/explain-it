# explain-it

An agent skill for **Claude Code** and modern AI coding assistants that explains software architectures, codebases, and multi-system integrations in strict **ASD-STE100 (Simplified Technical English)**, accompanied by an interactive **Software Machine schematic**.

Inspired by the tactile craft of [Anatomy](https://skills.wheresryan.sh/anatomy), `explain-it` avoids generic flowchart boxes and arrows. It renders your architecture as a physical test bench with interactive signal cables, validation gates, scenario injectors, and live payload oscilloscopes.

---

## Key Features

1. **Strict ASD-STE100 Compliance:**
   - Limits sentence length (max 20 words for instructions, max 25 words for descriptions).
   - Enforces active voice and eliminates ambiguous technical vocabulary (uses *use*, *show*, *start*, *run*, *send*, *get*).
   - Guarantees zero cognitive bloat without losing any technical precision.

2. **Three Explanation Tiers:**
   - **Low (Executive Overview):** 2–3 sentence high-level orientation.
   - **Medium (Operational Breakdown):** Sequenced step-by-step procedural breakdown of inputs, actions, and outputs.
   - **High (Deep Technical Anatomy):** Exhaustive technical breakdown. Every validation, payload contract, edge case, and code pointer simplified to the maximum without loss of technical precision.

3. **Multi-Hop Signal Pipeline Discovery:**
   - Traces entire cross-system flows: UI components → API Gateways → Schema Validations (Zod/Yup) → Async Workers → Databases → Third-party integrations (Salesforce, Stripe, AWS).

4. **Standalone "Software Machine" Schematic:**
   - 100% zero-dependency, self-contained single HTML/SVG file.
   - Four craft themes: **Industrial Blueprint**, **Paper Ledger**, **Stealth Dark**, and **Laboratory Sepia**.
   - Interactive State Injector: test `200 Success`, `401 Unauthorized`, `422 Validation Error`, or `504 Timeout`.
   - Real-time Oscilloscope Inspector showing live payloads, code lines, and active validations.

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

Run the automated test suite to verify the ASD-STE100 linter, schematic generator, and multi-hop scanner:

```bash
npm test
```

Generate the demo schematic:
```bash
npm run demo
```

---

## License

MIT © Andres Gallego
