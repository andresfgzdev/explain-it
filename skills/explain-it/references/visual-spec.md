# Visual Schematic Specification

This document defines the visual design system, aesthetic standards, and interactive mechanics for the `explain-it` software machine generator.

---

## 1. Aesthetic Philosophy: The Software Machine

Inspired by the tactile craft of the *Anatomy* project, `explain-it` avoids sterile white boxes and generic flowchart arrows. Instead, it renders software architectures as a **living electronic test bench / digital machine**.

Key visual invariants:
1. **Solids and Plates:** Every component or module is rendered as a distinct physical enclosure with header plates, status LEDs, and mounting rivets.
2. **Signal Busses & Routed Cables:** Connections are routed cleanly using orthogonal or high-radius curved SVG paths. Signal pulses travel along the cables to show data in motion.
3. **Logic Gates (Interlocks):** Validation rules are drawn as mechanical or electrical interlocks with two distinct outputs:
   - **Forward Pass (Green/Cyan):** Signal continues down the pipeline.
   - **Trip/Halt (Red/Amber):** Signal diverts into the error bus or rejection handler.
4. **The Live Oscilloscope (Inspector):** A dedicated inspection panel updates in real time to show the exact ASD-STE100 description, code file, line numbers, and JSON payload for the currently selected stage.
5. **No Text Clutter in Wires:** Labels stay neatly anchored to ports or inside node plates. Complex explanations live exclusively in the Inspector sidebar.

---

## 2. Four Master Themes

All styles use CSS custom properties (`var(--bg)`, `var(--panel)`, `var(--accent)`, etc.) to support seamless instant switching:

### Theme 1: Industrial Blueprint (Default)
* Background: `#08131e` with subtle `#0f2b42` millimeter grid
* Panel Base: `#0e2233` with `#1d4260` borders
* Active Accent: `#00f0ff` (Cyan LED glow)
* Success Wire: `#00e5a3` (Mint Emerald)
* Error / Reject: `#ff3b5c` (Signal Crimson)
* Typography: Space Mono, JetBrains Mono, or clean monospace headers with Inter/system sans for body.

### Theme 2: Technical Ledger / Paper
* Background: `#f7f4ed` with subtle warm ledger grid
* Panel Base: `#ffffff` with `#d3cbbe` solid mechanical borders
* Active Accent: `#d9531e` (Draftsman Orange)
* Success Wire: `#1e7e58` (Forest Ink)
* Error / Reject: `#b82424` (Stamp Red)
* Typography: Classic IBM Plex Sans or serif accents with crisp monospace code.

### Theme 3: Stealth Dark
* Background: `#0d0f12` matte obsidian
* Panel Base: `#16191f` with `#272c37` borders
* Active Accent: `#6366f1` (Indigo glow)
* Success Wire: `#10b981` (Emerald)
* Error / Reject: `#f43f5e` (Rose)
* Typography: Inter & Fira Code.

### Theme 4: Laboratory Sepia
* Background: `#1f1a14` deep sepia
* Panel Base: `#2c251e` with `#453c30` brass borders
* Active Accent: `#e5a93c` (Amber vacuum tube glow)
* Success Wire: `#6eb071`
* Error / Reject: `#cc4936`
* Typography: Courier Prime / monospace vintage lab manual.

---

## 3. Node Classifications

Every node in the system diagram belongs to one of five physical roles:

| Node Role | Visual Metaphor | Attributes |
|---|---|---|
| `ingress` | Power Inlet / Signal Transmitter | Shows external origin (e.g. Salesforce Webhook, Client UI, Cron Timer). |
| `interlock` | Circuit Breaker / Logic Gate | Enforces schema validation, auth token check, or boundary rules. Has PASS and TRIP outputs. |
| `processor` | Computation Unit / Engine Core | Transforms payloads, calculates business rules, or dispatches jobs. |
| `egress` | Output Terminal / Storage Vault | Writes to database, triggers third-party REST API, or enqueues message. |
| `error_sink` | Shunt / Rejection Bin | Handles 4xx/5xx responses, dead-letter queues, or error alerts. |

---

## 4. Interactive Simulation & Controls

The visual machine must be fully controllable by the reader:

* **State Injector:** Quick-select scenarios to test different execution paths:
  - *Scenario A: Happy Path (200 OK)*
  - *Scenario B: Authentication Failure (401)*
  - *Scenario C: Schema Validation Rejection (422)*
  - *Scenario D: Network/DB Timeout (504)*
* **Step-by-Step Playback:**
  - `[◀ Prev Step]` and `[Next Step ▶]` to step forward one hop at a time.
  - `[Play Auto-Trace]` to let the data packet travel autonomously.
* **Explanation Level Switcher:** Toggle between `Low`, `Medium`, and `High` in real time without reloading the page.
* **Inspect on Hover / Click:** Clicking any node, gate, or wire immediately freezes simulation and populates the Oscilloscope Inspector.
