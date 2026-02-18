// Test with public Gun.js relays that store data
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Testing Public Gun.js Relays\n');

const publicRelays = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://e2eec.herokuapp.com/gun'
];

const gun = Gun({
  peers: publicRelays,
  localStorage: false,
  radisk: false
});

let connected = false;
gun.on('hi', (peer) => {
  if (!connected) {
    console.log('✅ Connected to:', peer.url);
    connected = true;
  }
});

// Subscribe to test path
const testId = 'test_' + Date.now();
console.log('Listening on:', testId);

gun.get('messages').get('testuser1').get('testuser2').map().on((data, key) => {
  if (data && data.content) {
    console.log('\n📨 Message received!');
    console.log('  - Content:', data.content);
    console.log('  - ID:', data.id);
    console.log('\n🎉 Public relays work!');
    process.exit(0);
  }
});

setTimeout(() => {
  console.log('\n📡 Sending test message...');
  gun.get('messages').get('testuser1').get('testuser2').set({
    id: testId,
    content: 'Test message via public relay',
    timestamp: Date.now()
  });
  console.log('✅ Message sent, waiting for delivery...');
}, 3000);

setTimeout(() => {
  console.log('\n❌ No message received within 8 seconds');
  console.log('   Public relays might be down or slow');
  process.exit(1);
}, 12000);
