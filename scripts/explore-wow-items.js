const { Items } = require('wow-classic-items');

console.log('=== Exploring wow-classic-items package ===\n');

// Instantiate Items class (which is itself an array)
const items = new Items();

console.log('Total items:', items.length);
console.log();

// Sample first few items
console.log('First item:', JSON.stringify(items[0], null, 2));
console.log();

// Sample a TBC-era item (item IDs 23000-35000 range)
const tbcItem = items.find(item => item.itemId >= 28000 && item.itemId <= 35000);
if (tbcItem) {
  console.log('Sample TBC item:', JSON.stringify(tbcItem, null, 2));
}
console.log();

// Check what properties are available
if (items.length > 0) {
  console.log('Available properties:', Object.keys(items[0]));
}
console.log();

// Look for raid items - check if there's a source or zone property
const karazhanItems = items.filter(item => {
  return (
    item.itemId >= 28000 && item.itemId <= 29000 &&
    (item.source?.includes('Karazhan') || item.zone?.includes('Karazhan'))
  );
});

console.log('Karazhan items found:', karazhanItems.length);
if (karazhanItems.length > 0) {
  console.log('Sample Karazhan item:', JSON.stringify(karazhanItems[0], null, 2));
}
