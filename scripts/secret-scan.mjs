#!/usr/bin/env node
/**
 * NAFAS — Pre-Commit Secret Scanner & Push Protection
 * Scans all staged files for accidental credential and secret exposure.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const SECRET_PATTERNS = [
  { name: 'Supabase Service Role Key (Legacy)', regex: /eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*service_role[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/ },
  { name: 'Supabase Secret Key (Modern)', regex: /sb_secret_[a-zA-Z0-9_-]{20,}/ },
  { name: 'Resend API Key', regex: /re_[a-zA-Z0-9_]{20,}/ },
  { name: 'Private Key Block', regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Generic Hardcoded Secret Assignment', regex: /(api_key|service_role_key|secret_key|database_password|db_password)\s*[:=]\s*['"][^'"]{8,}['"]/i }
];

const ALLOWED_FILES = [
  'scripts/secret-scan.mjs',
  '.env.example',
  '.gitleaks.toml'
];

try {
  let targetFiles = execSync('git diff --cached --name-only', { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  // If no staged files, scan tracked source files (CI or manual test run)
  if (targetFiles.length === 0) {
    targetFiles = execSync('git ls-files', { cwd: REPO_ROOT, encoding: 'utf8' })
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0 && !f.startsWith('node_modules') && !f.startsWith('.git'));
  }

  let violations = [];

  for (const relFile of targetFiles) {
    if (ALLOWED_FILES.some(allowed => relFile.endsWith(allowed))) continue;
    const fullPath = path.resolve(REPO_ROOT, relFile);
    if (!fs.existsSync(fullPath)) continue;

    const stat = fs.statSync(fullPath);
    if (stat.size > 2 * 1024 * 1024) continue; // Skip large binary files

    const content = fs.readFileSync(fullPath, 'utf8');

    for (const { name, regex } of SECRET_PATTERNS) {
      if (regex.test(content)) {
        violations.push({ file: relFile, rule: name });
      }
    }
  }

  if (violations.length > 0) {
    console.error('\n🚨 [SECRET SCAN BLOCKED] Potential secrets detected:');
    violations.forEach(v => console.error(`  - ${v.file}: ${v.rule}`));
    console.error('\nPlease remove hardcoded credentials, use environment variables, and ensure .env* is gitignored.\n');
    process.exit(1);
  }

  console.log(`✅ Secret scanning passed: ${targetFiles.length} files scanned, no hardcoded credentials detected.`);
  process.exit(0);
} catch (e) {
  if (e.status === 1) process.exit(1);
  console.warn('Secret scanner check notice:', e.message);
  process.exit(0);
}
