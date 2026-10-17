# Visual Schematic Specification

This document defines what `render-schematic.mjs` produces and the rules that keep its output readable.

---

## 1. Two artifacts, one diagram

Each render writes two files from the same SVG code:

| File | Purpose |
|---|---|
| `<name>.svg` | **System overview.** The whole connected system with title, concept, every node, every cable label, error branches, and a legend. Use it as an image in PRs, docs, or slides. |
| `<name>.html` | **Interactive walkthrough.** It embeds the same diagram and adds scenario paths, step navigation, and a per-stage inspector. |

Both files are fully pre-rendered and need no network access, fonts, or scripts from outside the file. The HTML uses a small script only to move between steps.

## 2. Layout rules

1. **Main path** nodes run left → right in array order.
2. **Row wrap:** with more than 5 main nodes, the path wraps into balanced rows (7 → 4 + 3, 12 → 4 + 4 + 4). A cable leaves the end of a row on the right, runs back through the gap above the next row, and enters the first card from the left.
3. **Error lane:** each `error` node sits directly below the node that rejects into it. If two errors share a column, the second one moves one column to the right.
4. **Cable labels never overlap cards:**
   - Horizontal cables have a 130px gap. Labels wrap at 18 characters per line, 2 lines maximum, and sit above the line.
   - Vertical (error) labels sit to the right of the line.
   - Every label has a halo in the background color, so a crossing line does not hide it.
5. **Skip or back edges** on the same row arc over the top of the cards.
6. Card text wraps or clips to fixed widths. The full label, subtitle, and code ref are in the card's `<title>` tooltip.

## 3. Visual language

| Element | Style |
|---|---|
| Card | White surface, 1.5px neutral border, header strip with `NN · TYPE` tag |
| Error card | Red border, red-tinted header, red tag |
| Main cable | 1.75px neutral line with arrowhead |
| Error cable | Dashed red line with red arrowhead |
| Active card / lit cable (HTML) | Dark 2.4px border / dark 2.6px line |
| Off-path nodes in current scenario (HTML) | 25% opacity |

- Typography uses the system UI font for prose and the system monospace font for tags, code refs, and labels.
- The HTML page supports light and dark mode through `prefers-color-scheme`. The SVG reads the same CSS variables and falls back to light colors when it is a standalone image.

## 4. Interaction (HTML)

- **Depth tier:** the page shows **one** tier, picked at render time with `--tier`. It has no tier switcher, and the other tiers are not in the file.
- **Scenarios:** each chip loads its `path`. Nodes and cables outside the path dim. Cables that the walkthrough already passed are lit.
- **Navigation:**
  - Click or press Enter on a card. If the card is not on the current path, the page switches to the first scenario that includes it.
  - Space / → goes to the next step, ← goes to the previous step. The page also has Previous, Next, Auto-play, and Reset buttons.
- **Pulse:** a dot travels along the cable into the new step. It is turned off when the user has `prefers-reduced-motion` set.
- **Inspector:** shows the stage label, code ref, plain-English story, tier text, validations, failure behavior, and payload. All panels are pre-rendered, and the script only toggles `hidden`.
