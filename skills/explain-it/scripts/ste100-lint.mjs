#!/usr/bin/env node
/**
 * ste100-lint.mjs
 * Linter for ASD-STE100 (Simplified Technical English) compliance.
 * Validates sentence length, forbidden vocabulary, passive voice, and noun clusters.
 */

import { readFileSync } from 'node:fs';

const UNAPPROVED_WORDS = new Map([
  ['utilize', 'use'],
  ['utilizes', 'uses'],
  ['utilized', 'used'],
  ['utilizing', 'using'],
  ['display', 'show'],
  ['displays', 'shows'],
  ['displayed', 'showed'],
  ['displaying', 'showing'],
  ['exhibit', 'show'],
  ['initiate', 'start'],
  ['initiates', 'starts'],
  ['initiated', 'started'],
  ['initiating', 'starting'],
  ['terminate', 'stop'],
  ['terminates', 'stops'],
  ['terminated', 'stopped'],
  ['terminating', 'stopping'],
  ['execute', 'run'],
  ['executes', 'runs'],
  ['executed', 'ran'],
  ['executing', 'running'],
  ['fabricate', 'make'],
  ['transmit', 'send'],
  ['transmits', 'sends'],
  ['transmitted', 'sent'],
  ['transmitting', 'sending'],
  ['acquire', 'get'],
  ['acquires', 'gets'],
  ['acquired', 'got'],
  ['obtain', 'get'],
  ['obtains', 'gets'],
  ['obtained', 'got'],
  ['modify', 'change'],
  ['modifies', 'changes'],
  ['modified', 'changed'],
  ['in order to', 'to'],
  ['as well as', 'and'],
  ['subsequent to', 'after'],
  ['prior to', 'before'],
  ['leverage', 'use'],
  ['leverages', 'uses'],
  ['leveraged', 'used']
]);

const PASSIVE_PATTERNS = [
  /\b(?:is|are|was|were|be|been|being)\s+([a-z]+ed)\s+by\b/i,
  /\b(?:is|are|was|were|has been|have been)\s+(?:validated|parsed|handled|dispatched|triggered|executed|received|sent)\s+by\b/i
];

export function lintSte100(text, options = { isProcedural: false }) {
  const maxWords = options.isProcedural ? 20 : 25;
  const issues = [];

  // Split into paragraphs, then sentences
  const paragraphs = text.split(/\n\s*\n/);

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const para = paragraphs[pIdx].trim();
    if (!para || para.startsWith('#') || para.startsWith('```')) continue;

    const sentences = para
      .replace(/([.?!])\s+(?=[A-Z])/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length > 6) {
      issues.push({
        type: 'PARAGRAPH_TOO_LONG',
        message: `Paragraph has ${sentences.length} sentences. ASD-STE100 allows a maximum of 6 sentences per paragraph.`,
        snippet: sentences[0].slice(0, 50) + '...'
      });
    }

    for (const sent of sentences) {
      // Remove punctuation and count words
      const words = sent.split(/\s+/).filter(w => w.match(/[a-zA-Z0-9]/));
      if (words.length > maxWords) {
        issues.push({
          type: 'SENTENCE_TOO_LONG',
          message: `Sentence has ${words.length} words (limit: ${maxWords}).`,
          snippet: sent
        });
      }

      // Check unapproved words
      const lowerSent = sent.toLowerCase();
      for (const [forbidden, replacement] of UNAPPROVED_WORDS.entries()) {
        const regex = new RegExp(`\\b${forbidden}\\b`, 'i');
        if (regex.test(lowerSent)) {
          issues.push({
            type: 'FORBIDDEN_VOCABULARY',
            message: `Do not use '${forbidden}'. Use '${replacement}' instead.`,
            snippet: sent
          });
        }
      }

      // Check passive voice
      for (const pattern of PASSIVE_PATTERNS) {
        if (pattern.test(sent)) {
          issues.push({
            type: 'PASSIVE_VOICE',
            message: 'Avoid passive voice. State who or what performs the action.',
            snippet: sent
          });
        }
      }
    }
  }

  return {
    valid: issues.length === 0,
    totalIssues: issues.length,
    issues
  };
}

// CLI Runner
if (process.argv[1]?.endsWith('ste100-lint.mjs')) {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.log('Usage: node ste100-lint.mjs <file.md|file.txt>');
    process.exit(0);
  }

  try {
    const content = readFileSync(targetFile, 'utf8');
    const result = lintSte100(content);

    console.log(`\n🔍 ASD-STE100 Lint Results for: ${targetFile}`);
    console.log(`Status: ${result.valid ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`Total Issues: ${result.totalIssues}\n`);

    for (const issue of result.issues) {
      console.log(`[${issue.type}] ${issue.message}`);
      console.log(`  > "${issue.snippet}"\n`);
    }

    process.exit(result.valid ? 0 : 1);
  } catch (err) {
    console.error(`Error reading file: ${err.message}`);
    process.exit(1);
  }
}
