// Simpler test - direct put/get instead of set/map
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Simple Railway Relay Test\n');

const gun1 = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: false,
  radisk: false
});

const gun2 = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: false,
  radisk: false
});

// User 2 subscribes to a simple key
console.log('👤 User 2: Subscribing to test_key...');
gun2.get('test_key').on((data, key) => {
  if (data && data.message) {
    console.log('\n🎉 SUCCESS! Data received!');
    console.log('📨 Message:', data.message);
    console.log('⏰ Timestamp:', data.timestamp);
    console.log('\n✅ RELAY WORKS!\n');
    process.exit(0);
  }
});

setTimeout(() => {
  console.log('\n👤 User 1: Writing to test_key...');
  gun1.get('test_key').put({
    message: 'Hello via Railway!',
    timestamp: Date.now()
  });
  console.log('✅ Data written');
  console.log('⏳ Waiting for sync (8 seconds)...');
}, 2000);

setTimeout(() => {
  console.log('\n⚠️  Data not received');
  console.log('   Relay might not be storing data\n');
  process.exit(1);
}, 10000);
