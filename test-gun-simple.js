// Simple Gun.js test
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Simple Gun.js Test\n');

const gun = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: false,
  radisk: false
});

gun.on('hi', (peer) => {
  console.log('✅ Connected to:', peer.url);
});

// Test 1: Simple put/get
console.log('\nTest 1: Simple put/get');
const testKey = 'test_' + Date.now();

// Subscribe first
gun.get(testKey).on((data) => {
  if (data && data.message) {
    console.log('✅ Received:', data.message);

    // Test 2: Nested path
    console.log('\nTest 2: Nested path (messages/user1/user2)');

    gun.get('messages').get('user1').get('user2').on((nested) => {
      if (nested && nested.content) {
        console.log('✅ Nested message received:', nested.content);
        console.log('\n🎉 Gun.js is working!\n');
        process.exit(0);
      }
    });

    setTimeout(() => {
      gun.get('messages').get('user1').get('user2').put({
        content: 'Nested test message',
        timestamp: Date.now()
      });
    }, 500);
  }
});

setTimeout(() => {
  console.log('📡 Publishing test data...');
  gun.get(testKey).put({
    message: 'Hello Gun.js!',
    timestamp: Date.now()
  });
}, 2000);

setTimeout(() => {
  console.log('\n❌ Tests timed out');
  process.exit(1);
}, 10000);
