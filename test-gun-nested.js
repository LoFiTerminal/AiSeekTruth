// Test nested paths with .put() vs .set()
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Testing Nested Paths\n');

const gun = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: false,
  radisk: false
});

gun.on('hi', () => console.log('✅ Connected'));

// Test with .put()
console.log('Test 1: Nested path with .put()');
gun.get('test1').get('level2').get('level3').on((data) => {
  if (data && data.message) {
    console.log('✅ .put() nested path works:', data.message);

    // Now test .set()
    console.log('\nTest 2: Nested path with .set()');
    gun.get('test2').get('level2').get('level3').map().on((data) => {
      if (data && data.message) {
        console.log('✅ .set() nested path works:', data.message);
        console.log('\n🎉 Both methods work!\n');
        process.exit(0);
      }
    });

    setTimeout(() => {
      console.log('📡 Publishing with .set()...');
      gun.get('test2').get('level2').get('level3').set({
        message: 'Hello from .set()',
        id: 'msg2',
        timestamp: Date.now()
      });
    }, 1000);
  }
});

setTimeout(() => {
  console.log('📡 Publishing with .put()...');
  gun.get('test1').get('level2').get('level3').put({
    message: 'Hello from .put()',
    timestamp: Date.now()
  });
}, 2000);

setTimeout(() => {
  console.log('\n❌ Timeout');
  process.exit(1);
}, 10000);
