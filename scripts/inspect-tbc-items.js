const { Items } = require('wow-classic-items');

const items = new Items();

console.log('=== Inspecting TBC Items ===\n');

// Look at epic TBC items with Drop sources
const tbcEpicDrops = items.filter(item => {
  return (
    item.itemId >= 28000 && item.itemId <= 35000 &&
    item.quality === 'Epic' &&
    item.source &&
    item.source.category === 'Drop'
  );
});

console.log(`Found ${tbcEpicDrops.length} epic TBC items from drops\n`);

// Sample 20 items to see what their sources look like
console.log('Sample items:');
for (let i = 0; i < Math.min(20, tbcEpicDrops.length); i++) {
  const item = tbcEpicDrops[i];
  console.log(`[${item.itemId}] ${item.name} (${item.slot}) - Source: ${item.source.name}`);
}

// Check for Karazhan specifically
console.log('\n=== Searching for "Kara" in source names ===');
const karaItems = items.filter(item => {
  return (
    item.source &&
    item.source.name &&
    typeof item.source.name === 'string' &&
    item.source.name.toLowerCase().includes('kara')
  );
});

console.log(`Found ${karaItems.length} items with "Kara" in source`);
for (let i = 0; i < Math.min(10, karaItems.length); i++) {
  const item = karaItems[i];
  console.log(`[${item.itemId}] ${item.name} - Quality: ${item.quality} - Source: ${item.source.name}`);
}

// Check specific item IDs from the existing tbc-raids.ts file
console.log('\n=== Checking known Karazhan item IDs ===');
const knownKaraItems = [28581, 28674, 28727, 28753, 28508, 28503];
for (const itemId of knownKaraItems) {
  const item = items.find(i => i.itemId === itemId);
  if (item) {
    console.log(`[${item.itemId}] ${item.name}`);
    console.log(`  Quality: ${item.quality}`);
    console.log(`  Source: ${JSON.stringify(item.source)}`);
    console.log();
  }
}
