#!/usr/bin/env node
/**
 * trace-flow.mjs
 * Static scanner that finds candidate pipeline hops (ingress, interlocks, egress) across
 * frontend, backend, queue, and third-party integration code. Reports each hit with its line number.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const RELEVANT_EXTS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.rb', '.java', '.cs', '.php']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', '__pycache__', 'target', 'bin', 'obj']);
const MAX_HITS_PER_RULE = 5;

// Each rule: [regex, description]. `matchAll` copies the regex, so the /g flag carries no state between files.
const RULES = {
  ingress: [
    [/\b(?:app|router|server|fastify|api)\.(?:get|post|put|patch|delete|all)\s*\(\s*['"`][^'"`]+/g, 'HTTP route'],
    [/@(?:app|router|api)\.(?:get|post|put|patch|delete)\s*\(/g, 'Python route'],
    [/@(?:Get|Post|Put|Patch|Delete)\s*\(/g, 'NestJS / Spring route'],
    [/export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/g, 'Next.js route handler'],
    [/\bhttp\.HandleFunc\s*\(/g, 'Go HTTP handler'],
    [/['"`]\/[^'"`\s]*webhook[^'"`\s]*['"`]/gi, 'Webhook path'],
    [/\bnew\s+Worker\s*\(|\.consume\s*\(|\.process\s*\(\s*['"`]/g, 'Queue consumer'],
    [/\bcron\.schedule\s*\(|@Cron\s*\(/g, 'Scheduled job']
  ],
  interlock: [
    [/\bz\.object\s*\(/g, 'Zod schema'],
    [/\b(?:yup|Joi)\.object\s*\(/g, 'Yup / Joi schema'],
    [/\.safeParse\s*\(/g, 'Schema safeParse'],
    [/class\s+\w+\s*\(\s*BaseModel\s*\)/g, 'Pydantic model'],
    [/\b(?:verifySignature|requireAuth|authenticate|verifyToken|authMiddleware|timingSafeEqual)\b|\bjwt\.verify\s*\(/g, 'Auth / signature check'],
    [/\brate[Ll]imit(?:er)?\s*\(/g, 'Rate limiter']
  ],
  egress: [
    [/\bprisma\.\w+\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany|find\w*)\s*\(/g, 'Prisma query'],
    [/\b(?:fetch|axios(?:\.(?:get|post|put|patch|delete))?)\s*\(\s*['"`][^'"`]+/g, 'HTTP call'],
    [/\.sobject\s*\(\s*['"`][^'"`]+/g, 'Salesforce sObject'],
    [/\bstripe\.\w+\.(?:create|update|retrieve|list|del)\s*\(/g, 'Stripe API'],
    [/\.(?:query|execute|raw)\s*\(\s*['"`]\s*(?:SELECT|INSERT|UPDATE|DELETE)\b/gi, 'SQL query'],
    [/\b(?:sqs|sns)\.\w+\s*\(|\bproducer\.send\s*\(|\.sendMessage\s*\(/g, 'Message dispatch'],
    [/\bredis\.(?:set|get|del|hset|hget|lpush|xadd|publish)\s*\(/g, 'Redis']
  ]
};

export function scanFile(filePath) {
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { return null; }
  const lineAt = index => content.slice(0, index).split('\n').length;
  const hits = [];
  for (const [stage, rules] of Object.entries(RULES)) {
    for (const [re, what] of rules) {
      for (const m of [...content.matchAll(re)].slice(0, MAX_HITS_PER_RULE)) {
        hits.push({ stage, what, line: lineAt(m.index), match: m[0].trim().slice(0, 80) });
      }
    }
  }
  const has = stage => hits.some(h => h.stage === stage);
  return { filePath, hits, hasIngress: has('ingress'), hasInterlock: has('interlock'), hasEgress: has('egress') };
}

export function traceDirectory(dirPath, maxDepth = 6, depth = 0) {
  if (depth > maxDepth || !existsSync(dirPath)) return [];
  const results = [];
  for (const entry of readdirSync(dirPath)) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const full = join(dirPath, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) results.push(...traceDirectory(full, maxDepth, depth + 1));
    else if (stat.isFile() && RELEVANT_EXTS.has(extname(full))) {
      const scan = scanFile(full);
      if (scan?.hits.length) results.push(scan);
    }
  }
  return results;
}

// CLI
if (process.argv[1]?.endsWith('trace-flow.mjs')) {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const findings = traceDirectory(resolve(args.find(a => !a.startsWith('--')) || '.'));
  if (asJson) {
    console.log(JSON.stringify(findings, null, 2));
  } else {
    console.log(`\n🔎 Found ${findings.length} candidate files:`);
    for (const f of findings) {
      console.log(`\n📁 ${f.filePath}`);
      for (const h of f.hits) console.log(`   ${h.stage.padEnd(9)} L${String(h.line).padEnd(5)} ${h.what}: ${h.match}`);
    }
  }
}
