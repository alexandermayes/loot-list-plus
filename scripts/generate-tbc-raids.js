const { Items } = require('wow-classic-items');
const fs = require('fs');
const path = require('path');

console.log('=== Generating Complete TBC Raid Loot Tables ===\n');

const items = new Items();

// TBC Raid Zone IDs (from exploration)
const tbcRaidZones = {
  3457: { name: 'Karazhan', tier: 'Tier 4' },
  3923: { name: 'Gruul\'s Lair', tier: 'Tier 4' },
  3836: { name: 'Magtheridon\'s Lair', tier: 'Tier 4' },
  3607: { name: 'Serpentshrine Cavern', tier: 'Tier 5' },
  3845: { name: 'Tempest Keep', tier: 'Tier 5' },
  4131: { name: 'Tempest Keep', tier: 'Tier 5' }, // Kael'thas Magisters' Terrace
  3606: { name: 'Mount Hyjal', tier: 'Tier 6' },
  3959: { name: 'Black Temple', tier: 'Tier 6' },
  3805: { name: 'Zul\'Aman', tier: 'Tier 6' },
  4075: { name: 'Sunwell Plateau', tier: 'Tier 6' }
};

// Filter for TBC raid boss drops (epic quality, equippable items)
const tbcRaidItems = items.filter(item => {
  if (!item.source || item.source.category !== 'Boss Drop') return false;
  if (!item.source.zone || !tbcRaidZones[item.source.zone]) return false;
  if (item.quality !== 'Epic') return false;

  // Only equippable items (no quest items, consumables, etc.)
  const equipSlots = [
    'Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Wrist', 'Hands',
    'Waist', 'Legs', 'Feet', 'Finger', 'Trinket', 'One-Hand',
    'Two-Hand', 'Main Hand', 'Off Hand', 'Held In Off-hand',
    'Ranged', 'Relic', 'Weapon'
  ];

  return equipSlots.includes(item.slot);
});

console.log(`Found ${tbcRaidItems.length} TBC raid items\n`);

// Organize by raid and boss
const raidData = {};

for (const item of tbcRaidItems) {
  const zoneId = item.source.zone;
  const raidName = tbcRaidZones[zoneId].name;
  const bossName = item.source.name;

  if (!raidData[raidName]) {
    raidData[raidName] = {
      tier: tbcRaidZones[zoneId].tier,
      bosses: {}
    };
  }

  if (!raidData[raidName].bosses[bossName]) {
    raidData[raidName].bosses[bossName] = [];
  }

  raidData[raidName].bosses[bossName].push({
    name: item.name,
    slot: item.slot,
    wowhead_id: item.itemId
  });
}

// Print summary
console.log('=== Extraction Summary ===');
for (const [raidName, data] of Object.entries(raidData)) {
  const bossCount = Object.keys(data.bosses).length;
  const itemCount = Object.values(data.bosses).reduce((sum, items) => sum + items.length, 0);
  console.log(`${raidName} (${data.tier}): ${bossCount} bosses, ${itemCount} items`);
}

// Generate TypeScript file
function generateTypeScript() {
  let output = `/**
 * TBC (The Burning Crusade) Raid Loot Tables
 * Auto-generated from wow-classic-items package
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * This file contains epic quality items from TBC raids.
 * Source: wow-classic-items npm package
 */

export interface LootItem {
  name: string
  slot: string
  wowhead_id: number
}

export interface RaidBoss {
  name: string
  items: LootItem[]
}

export interface Raid {
  name: string
  tier: string
  bosses: RaidBoss[]
}

`;

  // Define raid order
  const raidOrder = [
    'Karazhan',
    'Gruul\'s Lair',
    'Magtheridon\'s Lair',
    'Serpentshrine Cavern',
    'Tempest Keep',
    'Mount Hyjal',
    'Black Temple',
    'Zul\'Aman',
    'Sunwell Plateau'
  ];

  const exportNames = [];

  for (const raidName of raidOrder) {
    if (!raidData[raidName]) continue;

    const data = raidData[raidName];
    const varName = raidName
      .toLowerCase()
      .replace(/'/g, '')
      .replace(/\s+/g, '');

    exportNames.push(varName);

    output += `// ============================================================================\n`;
    output += `// ${raidName.toUpperCase()} - ${data.tier}\n`;
    output += `// ============================================================================\n\n`;
    output += `export const ${varName}: Raid = {\n`;
    output += `  name: ${JSON.stringify(raidName)},\n`;
    output += `  tier: ${JSON.stringify(data.tier)},\n`;
    output += `  bosses: [\n`;

    const bosses = Object.entries(data.bosses);
    for (let i = 0; i < bosses.length; i++) {
      const [bossName, items] = bosses[i];
      output += `    {\n`;
      output += `      name: ${JSON.stringify(bossName)},\n`;
      output += `      items: [\n`;

      for (const item of items) {
        output += `        { name: ${JSON.stringify(item.name)}, slot: ${JSON.stringify(item.slot)}, wowhead_id: ${item.wowhead_id} },\n`;
      }

      output += `      ],\n`;
      output += `    }${i < bosses.length - 1 ? ',' : ''}\n`;
    }

    output += `  ],\n`;
    output += `}\n\n`;
  }

  // Add export array
  output += `// ============================================================================\n`;
  output += `// EXPORT ALL TBC RAIDS\n`;
  output += `// ============================================================================\n\n`;
  output += `export const tbcRaids: Raid[] = [\n`;
  for (const name of exportNames) {
    output += `  ${name},\n`;
  }
  output += `]\n`;

  return output;
}

const typescript = generateTypeScript();
const outputPath = path.join(__dirname, '..', 'data', 'tbc-raids.ts');
fs.writeFileSync(outputPath, typescript);

console.log(`\n✅ Generated complete TBC raid loot tables`);
console.log(`📁 Saved to: ${outputPath}`);
console.log(`\n🎉 All TBC raids now have complete loot data!`);
