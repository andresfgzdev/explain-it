# ASD-STE100 Technical Writing Reference

This document defines the rules for ASD-STE100 (Simplified Technical English) used by `explain-it`.
The goal of ASD-STE100 is to eliminate ambiguity and decrease reading effort without loss of technical precision.

---

## 1. Core Grammar Rules

### Rule 1: Sentence Length Limits
* **Procedural sentences (actions, steps, instructions):** Maximum **20 words** per sentence.
* **Descriptive sentences (explanations, architecture states):** Maximum **25 words** per sentence.
* **Paragraph limit:** Maximum **6 sentences** per paragraph.

### Rule 2: Active Voice Only
Always state who or what performs the action. Do not use passive voice.
* **Incorrect:** "The incoming payload is validated by the gateway." (Passive)
* **Correct:** "The gateway validates the incoming payload." (Active)
* **Incorrect:** "A database connection is opened when the request arrives." (Passive)
* **Correct:** "The worker opens a database connection when the request arrives." (Active)

### Rule 3: One Meaning Per Word
Each approved word has only one grammatical category and one meaning. Avoid synonyms and ambiguous phrasing.

| Do Not Use | Use Instead | Rule / Rationale |
|---|---|---|
| utilize, leverage | **use** | Always use the simplest direct verb. |
| display, exhibit | **show** | Keep visual terminology consistent. |
| initiate, trigger, spawn | **start** | "Start" is the approved verb for operations. |
| terminate, kill, abort | **stop** | "Stop" is unambiguous. |
| execute, perform | **run** | "Run" describes process execution. |
| fabricate, generate, construct | **make** or **create** | Single meaning for asset creation. |
| transmit, emit | **send** | Standard communication verb. |
| obtain, acquire, fetch | **get** | Standard data retrieval verb. |
| modify, alter | **change** | Direct state change verb. |
| in order to | **to** | Eliminate filler words. |
| as well as | **and** | Use simple conjunctions. |
| subsequent to | **after** | Avoid formal multi-word prepositions. |
| prior to | **before** | Clear time sequence. |

### Rule 4: Noun Clusters
Limit noun sequences to a maximum of **three consecutive nouns**. Break longer sequences with prepositions.
* **Incorrect:** "user payment authentication token validation system" (6 nouns)
* **Correct:** "the system that validates user authentication tokens for payments"

### Rule 5: One Topic Per Sentence
Do not combine independent thoughts using semicolons or long compound sentences. Break complex thoughts into separate, clear statements.

---

## 2. The Three Explanation Tiers

### Tier 1: Low (Executive Overview)
* **Purpose:** Quick architectural orientation for someone skimming or needing a bird's-eye view.
* **Format:** 2 to 3 concise STE100 sentences.
* **Content:**
  1. What this flow or component does.
  2. The primary upstream source and downstream destination.
  3. The core business outcome.

### Tier 2: Medium (Operational Breakdown)
* **Purpose:** Understand how data travels through the system during normal operation.
* **Format:** Ordered numbered list of sequential operations.
* **Content:**
  1. Input event and incoming data format.
  2. Primary validation checks.
  3. Transformation and processing steps.
  4. Outbound dispatch and response contract.

### Tier 3: High (Deep Technical Anatomy)
* **Purpose:** Exhaustive, production-grade technical understanding. Leaves zero questions unanswered.
* **Constraint:** **Every single point must be simplified to the maximum, with zero loss of technical direction, technical terms, or code fidelity.**
* **Content:**
  1. **Full Hop-by-Hop Trace:** Exact files, line numbers, function signatures, and modules involved.
  2. **Data Contracts:** Exact payload fields sent, expected headers, and response structure.
  3. **Validation Interlocks:** Every schema check, authentication guard, regex pattern, or constraint present in the code.
  4. **Why It Works:** Architectural rationale (caching strategy, idempotency keys, ACID guarantees, transaction boundaries).
  5. **Edge Cases & Failure Branches:**
     - Network timeouts and retry policies.
     - Malformed inputs (400 / 422).
     - Missing authentication or expired tokens (401 / 403).
     - Third-party rate limits (429) or upstream outages (502 / 503 / 504).
  6. **Concrete Code Examples:** Direct code snippets illustrating the critical branches.
