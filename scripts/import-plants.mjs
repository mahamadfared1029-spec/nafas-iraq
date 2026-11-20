#!/usr/bin/env node

/**
 * NAFAS Plant Clinic — Strict Data Importer & Validator
 *
 * Usage:
 *   node scripts/import-plants.mjs [--file <path>] [--dry-run] [--out <path>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Parse CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const fileArgIndex = args.indexOf('--file');
const outArgIndex = args.indexOf('--out');

const inputFilePath = fileArgIndex !== -1 && args[fileArgIndex + 1]
  ? path.resolve(args[fileArgIndex + 1])
  : path.resolve(rootDir, 'public/data/nafas-plants.json');

const outputFilePath = outArgIndex !== -1 && args[outArgIndex + 1]
  ? path.resolve(args[outArgIndex + 1])
  : path.resolve(rootDir, 'src/data/nafas-plants.json');

console.log(`\n🌱 [NAFAS Plant Clinic Importer]`);
console.log(`--------------------------------------------------`);
console.log(`📁 Source File: ${inputFilePath}`);
console.log(`🎯 Output File: ${outputFilePath}`);
console.log(`⚙️ Mode: ${isDryRun ? 'DRY-RUN (Validation only)' : 'LIVE IMPORT'}`);

// 1. Verify file exists
if (!fs.existsSync(inputFilePath)) {
  console.error(`\n❌ [FATAL] Input file not found: ${inputFilePath}`);
  process.exit(1);
}

// 2. Read file as UTF-8
let rawContent;
try {
  rawContent = fs.readFileSync(inputFilePath, 'utf8');
} catch (err) {
  console.error(`\n❌ [FATAL] Failed to read file with UTF-8 encoding:`, err.message);
  process.exit(1);
}

// 3. Parse JSON
let data;
try {
  data = JSON.parse(rawContent);
} catch (err) {
  console.error(`\n❌ [FATAL] Invalid JSON syntax:`, err.message);
  process.exit(1);
}

// 4. Validate Schema Version
if (data.schema_version !== '1.0.0') {
  console.error(`\n❌ [FATAL] Unsupported schema_version: "${data.schema_version}". Only "1.0.0" is accepted.`);
  process.exit(1);
}

// Validation buckets
const errors = [];
const warnings = [];

// Helper URL validator
function validateUrl(url, context) {
  if (!url) return;
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    errors.push(`[Security] Insecure or non-HTTPS URL in ${context}: "${url}"`);
  }
}

// 5. Validate Sources First
const sourceIds = new Set();
if (!Array.isArray(data.sources)) {
  errors.push(`"sources" must be an array.`);
} else {
  data.sources.forEach((s, idx) => {
    if (!s.id) {
      errors.push(`Source at index ${idx} is missing "id".`);
    } else if (sourceIds.has(s.id)) {
      errors.push(`Duplicate source ID: "${s.id}".`);
    } else {
      sourceIds.add(s.id);
    }

    validateUrl(s.url, `source "${s.id || idx}"`);
  });
}

// Helper for checking source references
function checkEvidenceSources(refArray, itemDesc) {
  if (!refArray) return;
  if (!Array.isArray(refArray)) {
    errors.push(`${itemDesc}: evidence_sources must be an array.`);
    return;
  }
  refArray.forEach(srcId => {
    if (!sourceIds.has(srcId)) {
      errors.push(`Missing source reference: "${srcId}" in ${itemDesc}.`);
    }
  });
}

// 6. Validate Plants
const plantIds = new Set();
const scientificNames = new Map();

if (!Array.isArray(data.plants)) {
  errors.push(`"plants" must be an array.`);
} else {
  data.plants.forEach((p, idx) => {
    const pId = p.id;
    if (!pId) {
      errors.push(`Plant at index ${idx} is missing "id".`);
      return;
    }
    if (plantIds.has(pId)) {
      errors.push(`Duplicate plant ID: "${pId}".`);
    } else {
      plantIds.add(pId);
    }

    if (!p.taxon?.scientific_name) {
      errors.push(`Plant "${pId}" is missing taxon.scientific_name.`);
    } else {
      if (scientificNames.has(p.taxon.scientific_name)) {
        warnings.push(`Duplicate scientific name "${p.taxon.scientific_name}" found on plant "${pId}".`);
      } else {
        scientificNames.set(p.taxon.scientific_name, pId);
      }
    }

    // Check distributions
    if (Array.isArray(p.distributions)) {
      p.distributions.forEach((d, dIdx) => {
        checkEvidenceSources(d.evidence_sources, `plant "${pId}" distribution[${dIdx}]`);
      });
    }

    // Check locale common names evidence
    if (Array.isArray(p.locale?.common_names)) {
      p.locale.common_names.forEach((cn, cIdx) => {
        checkEvidenceSources(cn.evidence_sources, `plant "${pId}" common_name[${cIdx}]`);
      });
    }
  });
}

// 7. Validate Hazards
const hazardIds = new Set();
if (!Array.isArray(data.hazards)) {
  errors.push(`"hazards" must be an array.`);
} else {
  data.hazards.forEach((h, idx) => {
    if (!h.id) {
      errors.push(`Hazard at index ${idx} is missing "id".`);
      return;
    }
    if (hazardIds.has(h.id)) {
      errors.push(`Duplicate hazard ID: "${h.id}".`);
    } else {
      hazardIds.add(h.id);
    }

    if (!h.plant_id) {
      errors.push(`Hazard "${h.id}" is missing "plant_id".`);
    } else if (!plantIds.has(h.plant_id)) {
      errors.push(`Hazard "${h.id}" references non-existent plant_id: "${h.plant_id}".`);
    }

    checkEvidenceSources(h.evidence_sources, `hazard "${h.id}"`);
  });
}

// 8. Validate Problems
const problemIds = new Set();
if (!Array.isArray(data.problems)) {
  errors.push(`"problems" must be an array.`);
} else {
  data.problems.forEach((pr, idx) => {
    if (!pr.id) {
      errors.push(`Problem at index ${idx} is missing "id".`);
      return;
    }
    if (problemIds.has(pr.id)) {
      errors.push(`Duplicate problem ID: "${pr.id}".`);
    } else {
      problemIds.add(pr.id);
    }

    checkEvidenceSources(pr.evidence_sources, `problem "${pr.id}"`);
  });
}

// 9. Validate Seasonal Care
const seasonalIds = new Set();
if (!Array.isArray(data.seasonal_care)) {
  errors.push(`"seasonal_care" must be an array.`);
} else {
  data.seasonal_care.forEach((sc, idx) => {
    if (!sc.id) {
      errors.push(`Seasonal care at index ${idx} is missing "id".`);
      return;
    }
    if (seasonalIds.has(sc.id)) {
      errors.push(`Duplicate seasonal care ID: "${sc.id}".`);
    } else {
      seasonalIds.add(sc.id);
    }

    checkEvidenceSources(sc.evidence_sources, `seasonal_care "${sc.id}"`);
  });
}

// 10. Validate Safety Policies
const policyIds = new Set();
if (!Array.isArray(data.safety_policies)) {
  errors.push(`"safety_policies" must be an array.`);
} else {
  data.safety_policies.forEach((sp, idx) => {
    if (!sp.id) {
      errors.push(`Safety policy at index ${idx} is missing "id".`);
      return;
    }
    if (policyIds.has(sp.id)) {
      errors.push(`Duplicate safety policy ID: "${sp.id}".`);
    } else {
      policyIds.add(sp.id);
    }
  });
}

// Evaluate validation outcome
console.log(`\n📋 Validation Results:`);
console.log(`--------------------------------------------------`);
console.log(`🌿 Plants:         ${plantIds.size}`);
console.log(`⚠️ Hazards:        ${hazardIds.size}`);
console.log(`🔍 Problems:       ${problemIds.size}`);
console.log(`📅 Seasonal Care:  ${seasonalIds.size}`);
console.log(`📚 Sources:        ${sourceIds.size}`);
console.log(`🛡️ Safety Rules:   ${policyIds.size}`);

if (warnings.length > 0) {
  console.warn(`\n⚠️ ${warnings.length} Warnings:`);
  warnings.slice(0, 10).forEach(w => console.warn(`  - ${w}`));
  if (warnings.length > 10) console.warn(`  ... and ${warnings.length - 10} more warnings.`);
}

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} Critical Validation Errors Encountered:`);
  errors.slice(0, 15).forEach(e => console.error(`  - ${e}`));
  if (errors.length > 15) console.error(`  ... and ${errors.length - 15} more errors.`);
  console.error(`\n🚫 Import aborted due to validation failure. No files written.`);
  process.exit(1);
}

console.log(`\n✅ All validations passed cleanly! Zero critical errors.`);

// 11. Compare with existing dataset for idempotency & version diff
let existingData = null;
if (fs.existsSync(outputFilePath)) {
  try {
    existingData = JSON.parse(fs.readFileSync(outputFilePath, 'utf8'));
  } catch {
    // Ignore error reading old file
  }
}

let addedCount = 0;
let updatedCount = 0;
let unchangedCount = 0;

if (existingData && Array.isArray(existingData.plants)) {
  const existingMap = new Map(existingData.plants.map(p => [p.id, p]));
  data.plants.forEach(p => {
    if (!existingMap.has(p.id)) {
      addedCount++;
    } else {
      const prev = existingMap.get(p.id);
      if (JSON.stringify(prev) !== JSON.stringify(p)) {
        updatedCount++;
        // Preserve previous accepted name if changed
        if (prev.taxon?.scientific_name && prev.taxon.scientific_name !== p.taxon?.scientific_name) {
          p.previous_accepted_names = p.previous_accepted_names || [];
          if (!p.previous_accepted_names.includes(prev.taxon.scientific_name)) {
            p.previous_accepted_names.push(prev.taxon.scientific_name);
          }
        }
      } else {
        unchangedCount++;
      }
    }
  });
} else {
  addedCount = plantIds.size;
}

console.log(`\n📊 Batch Diff Report:`);
console.log(`--------------------------------------------------`);
console.log(`➕ Added:     ${addedCount}`);
console.log(`🔄 Updated:   ${updatedCount}`);
console.log(`⏸️ Unchanged: ${unchangedCount}`);
console.log(`🚫 Rejected:  0`);

// If dry-run, stop here with success
if (isDryRun) {
  console.log(`\n✨ Dry-run completed successfully. No changes applied.`);
  process.exit(0);
}

// 12. Transactional Write with Backup Rollback
const versionsDir = path.resolve(rootDir, 'data-versions');
if (!fs.existsSync(versionsDir)) {
  fs.mkdirSync(versionsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.resolve(versionsDir, `nafas-plants-${data.dataset_version || 'v'}-${timestamp}.json`);

try {
  // Save rollback snapshot
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`💾 Rollback snapshot created at: ${backupPath}`);

  // Write live destination
  const outDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`🎯 Written to destination: ${outputFilePath}`);

  console.log(`\n🎉 NAFAS Plant Clinic dataset imported successfully!`);
  process.exit(0);
} catch (err) {
  console.error(`\n❌ [FATAL] Transactional write failed:`, err.message);
  process.exit(1);
}
