const { Items } = require('wow-classic-items');

const items = new Items();

console.log('=== Finding TBC Raid Zone IDs ===\n');

// Find items with "Boss Drop" category
const bossDrops = items.filter(item => {
  return (
    item.source &&
    item.source.category === 'Boss Drop' &&
    item.quality === 'Epic' &&
    item.source.zone
  );
});

console.log(`Total boss drop items: ${bossDrops.length}\n`);

// Group by zone and show sample boss names
const zoneData = {};

for (const item of bossDrops) {
  const zoneId = item.source.zone;
  const bossName = item.source.name;

  if (!zoneData[zoneId]) {
    zoneData[zoneId] = {
      bosses: new Set(),
      itemCount: 0
    };
  }

  zoneData[zoneId].bosses.add(bossName);
  zoneData[zoneId].itemCount++;
}

// Sort by zone ID
const sortedZones = Object.keys(zoneData)
  .map(Number)
  .sort((a, b) => a - b);

console.log('Zone IDs with boss drops:');
for (const zoneId of sortedZones) {
  const zone = zoneData[zoneId];
  const bossList = Array.from(zone.bosses).slice(0, 5).join(', ');
  const moreText = zone.bosses.size > 5 ? ` ... +${zone.bosses.size - 5} more` : '';
  console.log(`Zone ${zoneId}: ${zone.itemCount} items, ${zone.bosses.size} bosses`);
  console.log(`  Bosses: ${bossList}${moreText}`);
  console.log();
}

// Look for specific TBC raids by boss names
console.log('=== TBC Raid Zone Identification ===');
const tbcBossNames = {
  'Karazhan': ['Attumen', 'Moroes', 'Maiden of Virtue', 'Curator', 'Shade of Aran', 'Netherspite', 'Prince Malchezaar', 'Nightbane'],
  'Gruul': ['High King Maulgar', 'Gruul'],
  'Magtheridon': ['Magtheridon'],
  'Serpentshrine': ['Hydross', 'Lurker', 'Leotheras', 'Karathress', 'Morogrim', 'Vashj'],
  'Tempest Keep': ['Al\'ar', 'Void Reaver', 'Solarian', 'Kael\'thas'],
  'Hyjal': ['Winterchill', 'Anetheron', 'Kaz\'rogal', 'Azgalor', 'Archimonde'],
  'Black Temple': ['Naj\'entus', 'Supremus', 'Akama', 'Gorefiend', 'Bloodboil', 'Reliquary', 'Shahraz', 'Illidari', 'Illidan'],
  'Zul\'Aman': ['Nalorakk', 'Akil\'zon', 'Jan\'alai', 'Halazzi', 'Malacrass', 'Zul\'jin'],
  'Sunwell': ['Kalecgos', 'Brutallus', 'Felmyst', 'Eredar', 'M\'uru', 'Kil\'jaeden']
};

for (const [raidName, keywords] of Object.entries(tbcBossNames)) {
  console.log(`\n${raidName}:`);

  for (const keyword of keywords) {
    const matchingZones = sortedZones.filter(zoneId => {
      const bosses = Array.from(zoneData[zoneId].bosses);
      return bosses.some(boss => boss.toLowerCase().includes(keyword.toLowerCase()));
    });

    if (matchingZones.length > 0) {
      const zoneId = matchingZones[0];
      const matchingBoss = Array.from(zoneData[zoneId].bosses).find(boss =>
        boss.toLowerCase().includes(keyword.toLowerCase())
      );
      console.log(`  ${matchingBoss} → Zone ${zoneId}`);
    }
  }
}
