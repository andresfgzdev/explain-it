---
name: explain-it
description: >
  Use when someone asks to explain how a component, service, feature, API, or multi-system integration works
  (e.g., frontend to backend, Salesforce to API, webhook to database, worker queues, event-driven flows);
  wants an explanation in ASD-STE100 (Simplified Technical English) at Low, Medium, or High depth;
  or requests an interactive visual schematic / software machine diagram showing data paths, validations,
  and failure cases. Not for generating new boilerplate code or running arbitrary refactors.
license: MIT
compatibility: Node.js 18+, any repository or software architecture.
---

# explain-it

Explain any software architecture, feature, or cross-system pipeline in strict **ASD-STE100 (Simplified Technical English)** and render it as an **interactive, tactile software machine schematic**.

Every explanation is mathematically clear, active-voice, and free of ambiguous jargon. In High tier, every point is simplified to the maximum limit without loss of technical direction or meaning.

Scripts live in `${CLAUDE_SKILL_DIR}/scripts/`.

---

## Interactive Requirements & Options

Do not assume a default visual output. Ask or confirm with the user:

### 1. Visual Presentation Mode:
1. **Interactive HTML Software Machine (Recommended):** Standalone, zero-dependency HTML file with animated signal cables, scenario injector (`200 OK`, `401 Unauthorized`, `422 Validation`, `504 Timeout`), live oscilloscope inspector, and four craft themes (Blueprint, Paper Ledger, Stealth Dark, Lab Sepia).
2. **SVG Blueprint Card:** Standalone vector graphic suitable for embedding into GitHub PR descriptions or architecture documents.
3. **Terminal ASCII / Unicode Wireframe:** Text-based schematic rendered directly in the console.
4. **Markdown Text Only:** ASD-STE100 formatted text report without graphic artifacts.

### 2. Explanation Depth Tier:
* **Low (Executive Overview):** 2–3 sentence high-level orientation.
* **Medium (Operational Breakdown):** Sequenced step-by-step procedural breakdown of inputs, actions, and outputs.
* **High (Deep Technical Anatomy):** Exhaustive technical breakdown. Every validation, payload contract, edge case, and code pointer simplified to the maximum without loss of technical precision.

---

## Step 1: Multi-Hop Discovery & Trace

Do not limit analysis to simple frontend-to-backend hops. Map the complete multi-system pipeline:

1. **Ingress (Signal Source):**
   - User action, UI component, Cron trigger, Salesforce Outbound Message, Webhook, or Message Queue topic.
2. **Interlocks (Gates & Checks):**
   - Signature checks (HMAC), authentication guards, schema validators (Zod/Yup/Pydantic), rate limiters.
3. **Processing (Core Logic):**
   - Service handlers, state machines, data transformers, business calculation rules.
4. **Egress (Storage & External Sinks):**
   - Database mutations (SQL/Prisma), third-party APIs (Salesforce REST, Stripe), external message dispatches.
5. **Error & Rejection Branches:**
   - Validation failures (422), unauthenticated requests (401), downstream timeouts (504), dead-letter queues.

You can use the helper script to assist in candidate discovery:
```bash
node ${CLAUDE_SKILL_DIR}/scripts/trace-flow.mjs <target-directory>
```

---

## Step 2: Formulate ASD-STE100 Content

Follow the strict rules in `references/ste100-rules.md`:

1. **Procedural sentences:** Maximum 20 words per sentence.
2. **Descriptive sentences:** Maximum 25 words per sentence.
3. **Active voice only:** Identify who or what performs the action ("The gateway validates the token", NOT "The token is validated by the gateway").
4. **No unapproved vocabulary:** Use *use* (not *utilize*), *show* (not *display*), *start* (not *initiate*), *stop* (not *terminate*), *run* (not *execute*), *make* (not *fabricate*), *send* (not *transmit*), *get* (not *acquire*).
5. **No noun clusters:** Maximum 3 consecutive nouns.

---

## Step 3: Render the Visual Artifact

When the user selects **Interactive HTML Machine**:
1. Assemble the flow model JSON in the session scratchpad (`<scratch>/flow-<id>.json`).
2. Run the visual schematic generator:
```bash
node ${CLAUDE_SKILL_DIR}/scripts/render-schematic.mjs --fixture <scratch>/flow-<id>.json --out <scratch>/schematic-<id>.html
```
3. Inform the user where the HTML artifact is saved so they can open it in any browser or preview window.

When the user selects **Terminal ASCII / Unicode Wireframe**:
Output a clean, box-drawing schematic directly in the conversation.

---

## Step 4: Verification

Before finalizing, verify ASD-STE100 compliance using the linter:
```bash
node ${CLAUDE_SKILL_DIR}/scripts/ste100-lint.mjs <scratch>/explanation.md
```
Fix any flagged passive voice, long sentences, or unapproved vocabulary.
