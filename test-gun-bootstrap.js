const Gun = require('gun');

// Test if Gun can bootstrap with AXE
const gun = Gun({
  peers: [],
  axe: true,
  localStorage: false
});

console.log('Testing Gun.js DHT bootstrap...');
console.log('Waiting 10 seconds for peer discovery...');

gun.on('hi', peer => {
  console.log('✅ Connected to peer:', peer.url || 'local');
});

setTimeout(() => {
  console.log('Test complete');
  process.exit(0);
}, 10000);
