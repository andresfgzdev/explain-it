#!/usr/bin/env node
/**
 * ste100-lint.mjs
 * Linter for ASD-STE100 (Simplified Technical English) compliance.
 * Checks sentence length, unapproved vocabulary, passive voice, paragraph length,
 * and (as warnings) noun clusters. Lints Markdown/text files or every ste100 field of a flow JSON.
 */

import { readFileSync } from 'node:fs';

// Unapproved word → approved replacement. Single verbs also match their inflections.
const UNAPPROVED = {
  utilize: 'use', utilise: 'use', leverage: 'use', display: 'show', exhibit: 'show', initiate: 'start',
  commence: 'start', terminate: 'stop', execute: 'run', fabricate: 'make', transmit: 'send', acquire: 'get',
  obtain: 'get', retrieve: 'get', modify: 'change', perform: 'run (or do)', ensure: 'make sure', facilitate: 'help',
  assist: 'help', numerous: 'many', approximately: 'about', sufficient: 'enough', additional: 'more', via: 'through',
  'in order to': 'to', 'as well as': 'and', 'subsequent to': 'after', 'prior to': 'before',
  'in the event that': 'if', 'is able to': 'can', 'are able to': 'can', 'a number of': 'some'
};
const UNAPPROVED_RULES = Object.entries(UNAPPROVED).map(([word, use]) => {
  const pattern = word.includes(' ')
    ? word.replace(/ /g, '\\s+')
    : `${word.replace(/e$/, '')}(?:e|es|ed|s|d|ing|ted|ting|ies|ied|ying)?`;
  return { word, use, re: new RegExp(`\\b${pattern}\\b`, 'i') };
});

const IRREGULAR_PARTICIPLES = 'sent|built|written|made|done|given|taken|shown|known|held|kept|set|found|thrown|bound|drawn|seen|chosen|begun|broken|hidden|split|stuck|sold|told|paid';
// "to be" + optional adverb + past participle. Catches passives with and without an agent ("by ...").
const PASSIVE = new RegExp(`\\b(?:is|are|was|were|be|been|being)\\s+(?:\\w+ly\\s+)?(?:\\w{2,}ed|${IRREGULAR_PARTICIPLES})\\b`, 'i');

// Words that break a noun cluster (function words, common verbs, modifiers).
const BREAKERS = new Set(('a an the this that these those and or but nor so if then than when while because after before ' +
  'to of in on at by for from with into onto over under through about between without within during ' +
  'is are was were be been being has have had do does did can could will would shall should may might must ' +
  'it its they them their he she his her we our you your i my no not all each every any some one two three ' +
  'gets get makes make uses use runs run sends send shows show starts start stops stop checks check returns return ' +
  'reads read writes write saves save puts put calls call provides provide creates create updates update ' +
  'includes include contains contain stores store keeps keep adds add needs need lets let gives give').split(' '));
const MAX_NOUNS = 3;

function sentencesOf(paragraph) {
  return paragraph.replace(/([.?!])\s+(?=[A-Z0-9"'`(])/g, '$1|').split('|').map(s => s.trim()).filter(Boolean);
}

function nounCluster(sentence) {
  let run = [];
  for (const raw of sentence.split(/\s+/)) {
    const word = raw.replace(/^[^\w]+|[^\w]+$/g, '');
    const isNounish = /^[A-Za-z][\w-]*$/.test(word) && word.length > 2 &&
      !BREAKERS.has(word.toLowerCase()) && !/(?:ly|ed|ing)$/i.test(word);
    if (isNounish) run.push(word);
    if (run.length > MAX_NOUNS) return run.join(' ');
    // Punctuation or a verb-like -s word ends the cluster (the -s word may itself be the head noun).
    if (!isNounish || /[,;:()]$/.test(raw) || /s$/i.test(word)) run = [];
  }
  return null;
}

export function lintSte100(text, { isProcedural = false, maxSentences = 6 } = {}) {
  const maxWords = isProcedural ? 20 : 25;
  const issues = [];
  const add = (type, message, snippet, severity = 'error') => issues.push({ type, severity, message, snippet });

  for (const block of String(text).split(/\n\s*\n/)) {
    const para = block.trim();
    if (!para || para.startsWith('#') || para.startsWith('```')) continue;
    const sentences = sentencesOf(para);
    if (sentences.length > maxSentences) {
      add('PARAGRAPH_TOO_LONG', `Paragraph has ${sentences.length} sentences (limit: ${maxSentences}).`, sentences[0].slice(0, 50) + '...');
    }
    for (const sent of sentences) {
      const words = sent.split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w)).length;
      if (words > maxWords) add('SENTENCE_TOO_LONG', `Sentence has ${words} words (limit: ${maxWords}).`, sent);
      for (const { word, use, re } of UNAPPROVED_RULES) {
        if (re.test(sent)) add('FORBIDDEN_VOCABULARY', `Do not use '${word}'. Use '${use}' instead.`, sent);
      }
      if (PASSIVE.test(sent)) add('PASSIVE_VOICE', 'Avoid passive voice. State who or what performs the action.', sent);
      const cluster = nounCluster(sent);
      if (cluster) add('NOUN_CLUSTER', `"${cluster}" has more than ${MAX_NOUNS} nouns in a row. Split it with a preposition.`, sent, 'warning');
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  return { valid: errors === 0, totalIssues: errors, warnings: issues.length - errors, issues };
}

// Per-tier rules for flow models: low = 1–2 short sentences, med = procedural, high = descriptive.
const TIER_RULES = { low: { maxSentences: 2 }, med: { isProcedural: true }, high: {} };

/** Lints every `ste100.<tier>` field of a flow model. Returns one entry per field that has issues. */
export function lintFlow(flow) {
  const results = [];
  for (const node of flow.nodes || []) {
    for (const [tier, opts] of Object.entries(TIER_RULES)) {
      const text = node.ste100?.[tier];
      if (!text) continue;
      const res = lintSte100(text, opts);
      if (res.issues.length) results.push({ nodeId: node.id, tier, ...res });
    }
  }
  return { valid: results.every(r => r.valid), results };
}

// CLI
if (process.argv[1]?.endsWith('ste100-lint.mjs')) {
  const target = process.argv[2];
  if (!target) {
    console.log('Usage: node ste100-lint.mjs <file.md|file.txt|flow.json>');
    process.exit(0);
  }
  try {
    const content = readFileSync(target, 'utf8');
    const groups = target.endsWith('.json')
      ? lintFlow(JSON.parse(content)).results.map(r => ({ title: `${r.nodeId} · ${r.tier}`, ...r }))
      : [{ title: target, ...lintSte100(content) }];
    const valid = groups.every(g => g.valid);
    console.log(`\n🔍 ASD-STE100 Lint Results for: ${target}\nStatus: ${valid ? 'PASSED ✅' : 'FAILED ❌'}\n`);
    for (const g of groups.filter(g => g.issues.length)) {
      console.log(`── ${g.title}`);
      for (const i of g.issues) console.log(`  [${i.severity === 'warning' ? 'WARN ' : ''}${i.type}] ${i.message}\n    > "${i.snippet}"`);
    }
    process.exit(valid ? 0 : 1);
  } catch (err) {
    console.error(`Error linting file: ${err.message}`);
    process.exit(1);
  }
}
