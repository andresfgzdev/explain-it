/**
 * run-tests.mjs
 * Verification test suite for explain-it.
 * Tests ASD-STE100 linter, Schematic Renderer, and Flow Analyzer.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { lintSte100 } from '../skills/explain-it/scripts/ste100-lint.mjs';
import { renderSchematicHtml } from '../skills/explain-it/scripts/render-schematic.mjs';
import { scanFile } from '../skills/explain-it/scripts/trace-flow.mjs';

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

console.log('🧪 Starting explain-it Verification Suite...\n');

// 1. TEST ASD-STE100 LINTER
console.log('--- 1. Testing ASD-STE100 Linter ---');
const badText = `
The incoming payload is validated by the system in order to utilize the database. 
The system initiates a long complex multi-step process which contains way too many words in this descriptive statement because someone wrote a sentence with more than twenty-five words without stopping to think about readability or simplified technical english rules.
`;
const badResult = lintSte100(badText);
assert(!badResult.valid, 'Flags invalid text containing passive voice, forbidden words, and overly long sentences');
assert(badResult.issues.some(i => i.type === 'FORBIDDEN_VOCABULARY'), 'Detects unapproved vocabulary (utilize/initiate)');
assert(badResult.issues.some(i => i.type === 'PASSIVE_VOICE'), 'Detects passive voice ("is validated by")');
assert(badResult.issues.some(i => i.type === 'SENTENCE_TOO_LONG'), 'Detects descriptive sentence exceeding 25 words');

const goodText = `
The gateway validates the incoming payload.
The worker updates the customer record in the database.
The server returns a success response to the client.
`;
const goodResult = lintSte100(goodText);
assert(goodResult.valid, 'Passes clean ASD-STE100 active-voice text with short sentences');

// 2. TEST SAMPLE FIXTURE ASD-STE100 COMPLIANCE
console.log('\n--- 2. Testing Sample Fixture ASD-STE100 Compliance ---');
const fixtureRaw = readFileSync('tests/fixtures/sample-flow.json', 'utf8');
const fixture = JSON.parse(fixtureRaw);

let fixtureIssues = 0;
for (const node of fixture.nodes) {
  for (const tier of ['low', 'med', 'high']) {
    const text = node.ste100[tier];
    const res = lintSte100(text, { isProcedural: tier === 'med' });
    if (!res.valid) {
      console.error(`Node ${node.id} (${tier}) failed STE100:`, res.issues);
      fixtureIssues += res.issues.length;
    }
  }
}
assert(fixtureIssues === 0, `All explanations in sample fixture strictly comply with ASD-STE100 (0 issues found)`);

// 3. TEST SCHEMATIC RENDERER
console.log('\n--- 3. Testing Visual Schematic Generator ---');
const generatedHtml = renderSchematicHtml(fixture);
assert(generatedHtml.includes('<!DOCTYPE html>'), 'Emits standard HTML5 doctype');
assert(generatedHtml.includes('class="schematic-svg"'), 'Renders SVG schematic container');
assert(generatedHtml.includes('data-theme="blueprint"'), 'Configures default theme');
assert(generatedHtml.includes('Salesforce CRM'), 'Renders node labels');
assert(generatedHtml.includes('Auth Interlock'), 'Renders interlock gates');
assert(generatedHtml.includes('id="wiresGroup"'), 'Renders SVG signal wire group');
assert(generatedHtml.includes('id="signalPulse"'), 'Includes animated signal pulse particle');

if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}
writeFileSync('dist/test-output.html', generatedHtml, 'utf8');
assert(existsSync('dist/test-output.html'), 'Successfully outputs self-contained HTML artifact to disk');

// 4. TEST FLOW SCANNER
console.log('\n--- 4. Testing Multi-Hop Scanner ---');
const scan = scanFile('skills/explain-it/scripts/trace-flow.mjs');
assert(scan !== null, 'Scans files without errors');

// SUMMARY
console.log('\n========================================');
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
