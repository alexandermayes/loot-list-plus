#!/usr/bin/env node

/**
 * Fetches actual item data from Wowhead for all items in item-types.ts
 * and generates corrected entries.
 *
 * Uses nether.wowhead.com tooltip endpoint (TBC-era Wowhead).
 */

const ARMOR_TYPES = ['Cloth', 'Leather', 'Mail', 'Plate'];
const WEAPON_TYPES = [
  'Dagger', 'Fist Weapon', 'One-Handed Axe', 'Two-Handed Axe',
  'One-Handed Sword', 'Two-Handed Sword', 'One-Handed Mace', 'Two-Handed Mace',
  'Polearm', 'Staff', 'Bow', 'Crossbow', 'Gun', 'Wand', 'Shield', 'Thrown',
];

// Read the item-types.ts to extract all IDs and their current assignments
import { readFileSync } from 'fs';

const fileContent = readFileSync(new URL('../data/item-types.ts', import.meta.url), 'utf8');

// Parse entries from the file
const entries = [];
const lineRegex = /^\s+(\d+):\s*\{\s*(armor_type|weapon_type):\s*'([^']+)'\s*\},?\s*\/\/\s*(.*)$/gm;
let match;
while ((match = lineRegex.exec(fileContent)) !== null) {
  entries.push({
    id: parseInt(match[1]),
    field: match[2],
    value: match[3],
    comment: match[4].trim(),
    lineText: match[0],
  });
}

console.log(`Found ${entries.length} entries in item-types.ts\n`);

async function fetchItemInfo(wowheadId) {
  const url = `https://nether.wowhead.com/tooltip/item/${wowheadId}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();

    const tooltip = data.tooltip || '';
    const name = data.name || '';

    let detectedArmor = null;
    let detectedWeapon = null;

    for (const type of ARMOR_TYPES) {
      if (tooltip.includes(`>${type}<`)) {
        detectedArmor = type;
        break;
      }
    }

    for (const type of WEAPON_TYPES) {
      if (tooltip.includes(`>${type}<`)) {
        detectedWeapon = type;
        break;
      }
    }

    if (tooltip.includes('>Shield<')) {
      detectedWeapon = 'Shield';
    }

    return { name, detectedArmor, detectedWeapon };
  } catch (e) {
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const corrections = [];
  let checked = 0;
  const BATCH_SIZE = 5;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (entry) => {
      const info = await fetchItemInfo(entry.id);
      return { entry, info };
    }));

    for (const { entry, info } of results) {
      checked++;
      if (!info) {
        console.log(`ERROR: Could not fetch ${entry.id} (${entry.comment})`);
        continue;
      }

      const nameMismatch = info.name.toLowerCase().trim() !== entry.comment.replace(/ \(.*\)$/, '').toLowerCase().trim();

      let needsFix = false;
      let correctField = entry.field;
      let correctValue = entry.value;

      if (entry.field === 'armor_type') {
        if (info.detectedArmor && info.detectedArmor !== entry.value) {
          correctValue = info.detectedArmor;
          needsFix = true;
        } else if (info.detectedWeapon && !info.detectedArmor) {
          correctField = 'weapon_type';
          correctValue = info.detectedWeapon;
          needsFix = true;
        }
      } else if (entry.field === 'weapon_type') {
        if (info.detectedWeapon && info.detectedWeapon !== entry.value) {
          correctValue = info.detectedWeapon;
          needsFix = true;
        } else if (info.detectedArmor && !info.detectedWeapon) {
          correctField = 'armor_type';
          correctValue = info.detectedArmor;
          needsFix = true;
        }
      }

      if (needsFix || nameMismatch) {
        corrections.push({
          id: entry.id,
          oldComment: entry.comment,
          newName: info.name,
          oldField: entry.field,
          oldValue: entry.value,
          newField: correctField,
          newValue: correctValue,
          nameMismatch,
          typeMismatch: needsFix,
        });
      }
    }

    process.stdout.write(`\rChecked ${checked}/${entries.length}...`);

    if (i + BATCH_SIZE < entries.length) {
      await sleep(300);
    }
  }

  console.log('\n');

  // Separate type mismatches from name-only mismatches
  const typeFixes = corrections.filter(c => c.typeMismatch);
  const nameFixes = corrections.filter(c => c.nameMismatch);

  console.log(`=== TYPE MISMATCHES (${typeFixes.length}) ===\n`);
  for (const c of typeFixes) {
    console.log(`  ${c.id}: ${c.oldField}: '${c.oldValue}' → ${c.newField}: '${c.newValue}'`);
    console.log(`    Comment: "${c.oldComment}" → Actual: "${c.newName}"`);
  }

  console.log(`\n=== NAME-ONLY MISMATCHES (${nameFixes.filter(c => !c.typeMismatch).length}) ===\n`);
  for (const c of nameFixes.filter(c => !c.typeMismatch)) {
    console.log(`  ${c.id}: Comment: "${c.oldComment}" → Actual: "${c.newName}"`);
  }

  // Now generate sed-like corrections
  console.log(`\n=== CORRECTIONS TO APPLY ===\n`);
  for (const c of corrections) {
    const commentFix = c.nameMismatch ? c.newName : c.oldComment;
    if (c.typeMismatch) {
      console.log(`REPLACE ${c.id}: { ${c.oldField}: '${c.oldValue}' } → { ${c.newField}: '${c.newValue}' } // ${commentFix}`);
    } else if (c.nameMismatch) {
      console.log(`COMMENT ${c.id}: "${c.oldComment}" → "${c.newName}"`);
    }
  }

  console.log(`\nTotal: ${corrections.length} corrections (${typeFixes.length} type fixes, ${nameFixes.filter(c => !c.typeMismatch).length} name-only fixes)`);
}

main().catch(console.error);
