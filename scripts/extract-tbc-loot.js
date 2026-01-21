const { Items } = require('wow-classic-items');
const fs = require('fs');
const path = require('path');

console.log('=== Extracting TBC Raid Loot ===\n');

// Instantiate Items class
const items = new Items();

console.log('Total items in database:', items.length);

// Define TBC raid bosses with their expected names in the source data
const tbcRaidBosses = {
  'Karazhan': [
    'Attumen the Huntsman',
    'Moroes',
    'Maiden of Virtue',
    'Opera Hall', // May include Big Bad Wolf, Romulo, Julianne, The Crone
    'The Curator',
    'Terestian Illhoof',
    'Shade of Aran',
    'Netherspite',
    'Chess Event',
    'Prince Malchezaar',
    'Nightbane'
  ],
  'Gruul\'s Lair': [
    'High King Maulgar',
    'Gruul the Dragonkiller'
  ],
  'Magtheridon\'s Lair': [
    'Magtheridon'
  ],
  'Serpentshrine Cavern': [
    'Hydross the Unstable',
    'The Lurker Below',
    'Leotheras the Blind',
    'Fathom-Lord Karathress',
    'Morogrim Tidewalker',
    'Lady Vashj'
  ],
  'Tempest Keep': [
    'Al\'ar',
    'Void Reaver',
    'High Astromancer Solarian',
    'Kael\'thas Sunstrider'
  ],
  'Mount Hyjal': [
    'Rage Winterchill',
    'Anetheron',
    'Kaz\'rogal',
    'Azgalor',
    'Archimonde'
  ],
  'Black Temple': [
    'High Warlord Naj\'entus',
    'Supremus',
    'Shade of Akama',
    'Teron Gorefiend',
    'Gurtogg Bloodboil',
    'Reliquary of Souls',
    'Mother Shahraz',
    'The Illidari Council',
    'Illidan Stormrage'
  ],
  'Zul\'Aman': [
    'Nalorakk',
    'Akil\'zon',
    'Jan\'alai',
    'Halazzi',
    'Hex Lord Malacrass',
    'Zul\'jin'
  ],
  'Sunwell Plateau': [
    'Kalecgos',
    'Brutallus',
    'Felmyst',
    'The Eredar Twins',
    'M\'uru',
    'Kil\'jaeden'
  ]
};

// Filter for TBC raid items (item IDs roughly 28000-35000, epic quality, from raid bosses)
console.log('\nFiltering for TBC raid items...');

const tbcRaidItems = items.filter(item => {
  // Must be epic quality
  if (item.quality !== 'Epic') return false;

  // Must be from a drop source
  if (!item.source || item.source.category !== 'Drop') return false;

  // Must be equippable (not quest items or consumables)
  const equipSlots = ['Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Wrist', 'Hands', 'Waist', 'Legs', 'Feet', 'Finger', 'Trinket', 'One-Hand', 'Two-Hand', 'Main Hand', 'Off Hand', 'Held In Off-hand', 'Ranged', 'Relic', 'Weapon'];
  if (!equipSlots.includes(item.slot)) return false;

  // Check if it's from a TBC raid boss
  const sourceName = item.source.name;
  for (const raid in tbcRaidBosses) {
    for (const boss of tbcRaidBosses[raid]) {
      if (sourceName && sourceName.includes(boss)) {
        return true;
      }
    }
  }

  return false;
});

console.log(`Found ${tbcRaidItems.length} TBC raid items\n`);

// Organize items by raid and boss
const organizedLoot = {};

for (const raid in tbcRaidBosses) {
  organizedLoot[raid] = {};

  for (const boss of tbcRaidBosses[raid]) {
    const bossItems = tbcRaidItems.filter(item =>
      item.source && item.source.name && item.source.name.includes(boss)
    );

    if (bossItems.length > 0) {
      organizedLoot[raid][boss] = bossItems.map(item => ({
        name: item.name,
        slot: item.slot,
        wowhead_id: item.itemId
      }));
    }
  }
}

// Print summary
console.log('=== Summary by Raid ===');
for (const raid in organizedLoot) {
  const totalItems = Object.values(organizedLoot[raid]).reduce((sum, items) => sum + items.length, 0);
  console.log(`${raid}: ${totalItems} items across ${Object.keys(organizedLoot[raid]).length} bosses`);
}

// Save to JSON for inspection
const outputPath = path.join(__dirname, 'tbc-loot-extracted.json');
fs.writeFileSync(outputPath, JSON.stringify(organizedLoot, null, 2));
console.log(`\nExtracted data saved to: ${outputPath}`);

// Sample output
console.log('\n=== Sample: Karazhan - Attumen the Huntsman ===');
if (organizedLoot['Karazhan'] && organizedLoot['Karazhan']['Attumen the Huntsman']) {
  console.log(JSON.stringify(organizedLoot['Karazhan']['Attumen the Huntsman'], null, 2));
}
