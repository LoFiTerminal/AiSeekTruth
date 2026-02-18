const Gun = require('gun');

console.log('🧪 Testing relay connection...\n');

const gun = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: false,
  axe: false  // Disable AXE for simpler test
});

gun.on('hi', (peer) => {
  console.log('✅ Connected to:', peer.url || 'peer');
});

// Write test data
const testKey = 'connection_test_' + Date.now();
console.log('Writing test data with key:', testKey);

gun.get(testKey).put({ test: 'hello', time: Date.now() }, (ack) => {
  console.log('Write acknowledgment:', ack.err || 'OK');
});

setTimeout(() => {
  console.log('\n📖 Attempting to read back...');
  gun.get(testKey).once((data) => {
    if (data) {
      console.log('✅ SUCCESS! Data synced through relay:', data);
    } else {
      console.log('❌ FAILED: No data received');
    }
    process.exit(0);
  });
}, 2000);

setTimeout(() => process.exit(1), 5000);
