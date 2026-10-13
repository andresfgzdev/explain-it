#!/usr/bin/env node
/**
 * trace-flow.mjs
 * Static analyzer to discover multi-hop data pipelines, cross-system integrations,
 * and code paths across frontend, backend, third-party APIs (Salesforce, Stripe), and databases.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const RELEVANT_EXTS = new Set(['.js', '.mjs', '.ts', '.tsx', '.jsx', '.py', '.go', '.json']);

const PATTERNS = {
  // Ingress Triggers
  ingress: [
    /(?:router|app)\.(?:get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /@(?:app|router)\.(?:get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|PATCH|DELETE)\b/g,
    /(?:salesforce|webhook|event|trigger|listener)\b/i
  ],
  // Interlock Validations
  interlock: [
    /(?:z|zod)\.object\s*\(/g,
    /(?:yup|joi)\.object\s*\(/g,
    /\.safeParse\s*\(/g,
    /\.validate\s*\(/g,
    /(?:verifySignature|requireAuth|authenticate|verifyToken|authMiddleware)\b/g
  ],
  // Egress & Storage
  egress: [
    /prisma\.(\w+)\.(?:create|update|upsert|delete|find)/g,
    /(?:fetch|axios(?:\.post|\.get|\.put)?)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /(?:sfdc|salesforce|jsforce)\.sobject\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /(?:stripe|twilio|sendgrid|kafka|sqs|sns|redis)\b/i
  ]
};

export function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const detections = {
      filePath,
      hasIngress: false,
      hasInterlock: false,
      hasEgress: false,
      details: []
    };

    // Check ingress
    for (const pat of PATTERNS.ingress) {
      if (pat.test(content)) {
        detections.hasIngress = true;
        detections.details.push('Detected endpoint/webhook ingress handler');
        break;
      }
    }

    // Check interlocks
    for (const pat of PATTERNS.interlock) {
      if (pat.test(content)) {
        detections.hasInterlock = true;
        detections.details.push('Detected schema validation / authentication interlock');
        break;
      }
    }

    // Check egress
    for (const pat of PATTERNS.egress) {
      if (pat.test(content)) {
        detections.hasEgress = true;
        detections.details.push('Detected external API egress / DB query execution');
        break;
      }
    }

    return detections;
  } catch {
    return null;
  }
}

export function traceDirectory(dirPath, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth || !existsSync(dirPath)) return [];
  const results = [];

  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...traceDirectory(fullPath, maxDepth, currentDepth + 1));
    } else if (stat.isFile() && RELEVANT_EXTS.has(extname(fullPath))) {
      const scan = scanFile(fullPath);
      if (scan && (scan.hasIngress || scan.hasInterlock || scan.hasEgress)) {
        results.push(scan);
      }
    }
  }

  return results;
}

// CLI Runner
if (process.argv[1]?.endsWith('trace-flow.mjs')) {
  const targetDir = process.argv[2] || '.';
  console.log(`\n🔎 Scanning directory for pipeline hops: ${targetDir}`);

  const findings = traceDirectory(resolve(targetDir));
  console.log(`Found ${findings.length} relevant candidate files:`);

  findings.forEach(f => {
    console.log(`\n📁 ${f.filePath}`);
    f.details.forEach(d => console.log(`   └─ ${d}`));
  });
}
