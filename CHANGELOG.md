# Changelog

## 0.2.0

- `render-schematic.mjs` writes two artifacts per run: an interactive HTML walkthrough and a standalone SVG overview of the whole system.
- One explanation tier per artifact (`--tier low|med|high`). The other tiers are not embedded.
- New layout: long paths wrap into rows, cable labels get their own space so cards never hide them, and error nodes sit in a lane below their source with dashed branches.
- Scenarios carry a node `path`. The walkthrough dims off-path stages and lights the cables it has passed.
- The flow model is validated before rendering (`references/flow-schema.md`). The output works offline and supports dark mode.
- `ste100-lint.mjs` catches passives with and without an agent, more unapproved vocabulary with inflections, and noun clusters (as warnings). It lints whole flow models with per-tier limits.
- `trace-flow.mjs` no longer misses hops in later files (regex state leaked between files). It reports line numbers, has fewer false positives, and adds `--json`.
- Fix the plugin manifest, which failed `claude plugin validate`.

## 0.1.0

First public release.
