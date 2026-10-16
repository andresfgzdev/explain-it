/**
 * run-tests.mjs
 * Verification test suite for explain-it.
 * Tests the ASD-STE100 linter, flow validation, layout, both renderers, and the flow scanner.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { lintSte100, lintFlow } from '../skills/explain-it/scripts/ste100-lint.mjs';
import { renderSchematicHtml, renderDiagramSvg, resolveTier, validateFlow, layoutFlow, GEOMETRY } from '../skills/explain-it/scripts/render-schematic.mjs';
import { scanFile, traceDirectory } from '../skills/explain-it/scripts/trace-flow.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

const throws = fn => { try { fn(); return false; } catch { return true; } };
const load = name => JSON.parse(readFileSync(`tests/fixtures/${name}`, 'utf8'));
const FIXTURES = readdirSync('tests/fixtures').filter(f => f.endsWith('-flow.json'));
const bundled = readFileSync('skills/explain-it/references/example-flow.json', 'utf8');
const TIER_NAMES = ['low', 'med', 'high'];

console.log('🧪 Starting explain-it Verification Suite...\n');

// 1. ASD-STE100 LINTER
console.log('--- 1. Testing ASD-STE100 Linter ---');
const badText = `
The incoming payload is validated by the system in order to utilize the database.
The system initiates a long complex multi-step process which contains way too many words in this descriptive statement because someone wrote a sentence with more than twenty-five words without stopping to think about readability or simplified technical english rules.
`;
const badResult = lintSte100(badText);
assert(!badResult.valid, 'Flags invalid text containing passive voice, forbidden words, and overly long sentences');
assert(badResult.issues.some(i => i.type === 'FORBIDDEN_VOCABULARY'), 'Detects unapproved vocabulary (utilize/initiate)');
assert(badResult.issues.some(i => i.type === 'PASSIVE_VOICE'), 'Detects passive voice with an agent ("is validated by")');
assert(badResult.issues.some(i => i.type === 'SENTENCE_TOO_LONG'), 'Detects descriptive sentence exceeding 25 words');
assert(!lintSte100('The token is validated.').valid, 'Detects passive voice without an agent ("is validated.")');
assert(!lintSte100('The message was sent to the queue.').valid, 'Detects passive voice with an irregular participle ("was sent")');
assert(!lintSte100('The worker performs a lookup via the cache.').valid, 'Detects newly added vocabulary (performs, via)');
assert(lintSte100('The worker writes the user account record cache entry.').issues.some(i => i.type === 'NOUN_CLUSTER' && i.severity === 'warning'),
  'Warns on noun clusters of more than 3 nouns');
assert(!lintSte100('The gateway checks the token. It sends the body. It writes a log.', { maxSentences: 2 }).valid, 'Enforces a sentence limit per text');

const goodText = `
The gateway validates the incoming payload.
The worker updates the customer record in the database.
The server returns a success response to the client.
`;
assert(lintSte100(goodText).valid, 'Passes clean ASD-STE100 active-voice text with short sentences');

// 2. FIXTURES: SCHEMA + STE100 COMPLIANCE
console.log('\n--- 2. Testing Fixtures (schema + ASD-STE100) ---');
for (const name of FIXTURES) {
  const flow = load(name);
  const schemaErrors = TIER_NAMES.flatMap(t => validateFlow(flow, t));
  assert(schemaErrors.length === 0, `${name} matches the flow schema for all tiers ${schemaErrors.length ? JSON.stringify(schemaErrors) : ''}`);
  const lint = lintFlow(flow);
  if (!lint.valid) console.error(JSON.stringify(lint.results.filter(r => !r.valid), null, 2));
  assert(lint.valid, `${name}: every ste100 field complies with ASD-STE100`);
}

assert(bundled === readFileSync('tests/fixtures/sample-flow.json', 'utf8'), 'Bundled references/example-flow.json matches tests/fixtures/sample-flow.json');

// 3. FLOW VALIDATION
console.log('\n--- 3. Testing Flow Validation ---');
const sample = load('sample-flow.json');
assert(validateFlow({}).some(e => e.includes('title')), 'Rejects a flow without a title');
assert(validateFlow({ ...sample, connections: [{ from: 'node-sf', to: 'ghost' }] }).some(e => e.includes('unknown node')), 'Rejects a connection to an unknown node');
assert(validateFlow({ ...sample, nodes: [...sample.nodes, sample.nodes[0]] }).some(e => e.includes('duplicate')), 'Rejects duplicate node ids');
assert(validateFlow({ ...sample, nodes: [{ ...sample.nodes[0], type: 'magic' }] }).some(e => e.includes('type')), 'Rejects an unknown node type');
assert(validateFlow({ ...sample, scenarios: [{ id: 'x', name: 'X', path: ['ghost'] }] }).some(e => e.includes('path')), 'Rejects a scenario path with an unknown node');
assert(validateFlow({ ...sample, nodes: [{ ...sample.nodes[0], ste100: { high: 'Only high.' } }] }, 'low').some(e => e.includes('ste100.low')),
  'Rejects a flow that lacks the requested tier');
assert(throws(() => renderSchematicHtml({ title: 'Broken', nodes: [] })), 'Renderer refuses an invalid flow');

// 4. LAYOUT GEOMETRY
console.log('\n--- 4. Testing Layout Geometry ---');
for (const name of FIXTURES) {
  const flow = load(name);
  const { pos, width } = layoutFlow(flow);
  const { W, H, GAP } = GEOMETRY;
  const boxes = Object.values(pos);
  const overlaps = boxes.some((a, i) => boxes.slice(i + 1).some(b => Math.abs(a.x - b.x) < W && Math.abs(a.y - b.y) < H));
  assert(!overlaps, `${name}: no two cards overlap`);
  assert(boxes.every(p => p.x + W <= width), `${name}: every card fits inside the canvas`);
  const longest = Math.max(0, ...(flow.connections || []).map(c => Math.min((c.label || '').length, 18)));
  assert(longest * 6.1 < GAP - 8, `${name}: cable labels (≤18 chars per line) fit in the ${GAP}px gap between cards`);
}
const wide = { title: 'Wide', nodes: Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, label: `Node ${i}`, type: 'processor', ste100: { high: 'The node runs.' } })) };
const wideRows = new Set(Object.values(layoutFlow(wide).pos).map(p => p.y));
assert(wideRows.size === 3, 'Wraps 12 main nodes into 3 rows instead of squeezing them');

// 5. RENDERERS: every fixture × every tier
console.log('\n--- 5. Testing Renderers (all fixtures × all tiers) ---');
mkdirSync('dist', { recursive: true });
for (const name of FIXTURES) {
  const flow = load(name);
  for (const tier of TIER_NAMES) {
    const html = renderSchematicHtml(flow, { tier });
    const others = TIER_NAMES.filter(t => t !== tier);
    const node = flow.nodes.find(n => others.every(t => n.ste100[t] && n.ste100[t] !== n.ste100[tier]));
    const ok = html.startsWith('<!DOCTYPE html>') &&
      flow.nodes.every(n => html.includes(`data-id="${n.id}"`)) &&
      html.includes(`data-tier="${tier}"`) &&
      others.every(t => !html.includes(`data-tier="${t}"`)) &&
      (!node || others.every(t => !html.includes(node.ste100[t].replace(/&/g, '&amp;').replace(/'/g, '&#39;'))));
    assert(ok, `${name} @ ${tier}: renders every node and only the ${tier} tier`);
  }
  const svg = renderDiagramSvg(flow);
  const wires = (svg.match(/class="wire/g) || []).length;
  assert(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') && wires === (flow.connections || []).length,
    `${name}: standalone SVG overview draws every connection (${wires})`);
  writeFileSync(`dist/${name.replace('.json', '')}.svg`, svg, 'utf8');
}
const sampleHtml = renderSchematicHtml(sample);
assert(sampleHtml.includes('High (Deep)') && !sampleHtml.includes('Low (Quick)'), 'Defaults to the high tier');
assert(!/fonts\.googleapis|<link|src="http/.test(sampleHtml), 'HTML has no external requests (works offline)');
assert(sampleHtml.includes('class="wire err"'), 'Draws error branches as error wires');
assert(sampleHtml.includes('"err_auth"') && sampleHtml.includes('"err-401"'), 'Embeds scenario paths for the walkthrough');
assert(resolveTier('medium') === 'med', 'Accepts "medium" as an alias for med');
assert(throws(() => resolveTier('ultra')), 'Rejects an unknown tier');
writeFileSync('dist/test-output.html', sampleHtml, 'utf8');

// 6. FLOW SCANNER
console.log('\n--- 6. Testing Multi-Hop Scanner ---');
const lead = scanFile('tests/fixtures/scan/lead-route.ts');
assert(lead.hasIngress && lead.hasInterlock && lead.hasEgress, 'Detects ingress, interlock, and egress in one route file');
assert(lead.hits.find(h => h.what === 'Prisma query')?.line === 5, 'Reports the line number of each hit');
const dir = traceDirectory('tests/fixtures/scan');
const files = dir.map(f => f.filePath.replace(/\\/g, '/').split('/').pop());
assert(files.includes('lead-route.ts') && files.includes('billing-route.ts'), 'Detects routes in consecutive files (no regex state leak)');
assert(!files.includes('event-utils.ts'), 'Ignores files that only mention words like "event" or "stripe"');
assert(scanFile('does/not/exist.ts') === null, 'Returns null for unreadable files');

// SUMMARY
console.log('\n========================================');
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
