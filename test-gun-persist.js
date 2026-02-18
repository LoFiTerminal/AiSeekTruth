// Test if Gun.js data persists
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Testing Gun.js Data Persistence\n');

const gun = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: true,  // Enable local storage
  radisk: true,        // Enable persistence
  file: 'test-radata'
});

gun.on('hi', () => console.log('✅ Connected'));

const testKey = 'persist_test_' + Date.now();

console.log('Step 1: Writing data...');
gun.get(testKey).put({
  message: 'This should persist',
  timestamp: Date.now()
});

setTimeout(() => {
  console.log('Step 2: Reading data back...');
  gun.get(testKey).once((data) => {
    if (data && data.message) {
      console.log('✅ Data persisted:', data.message);

      // Now test nested paths
      console.log('\nStep 3: Testing nested write...');
      gun.get('nested').get('level2').get('level3').put({
        content: 'Nested data',
        id: 'nested-1'
      });

      setTimeout(() => {
        console.log('Step 4: Reading nested data...');
        gun.get('nested').get('level2').get('level3').once((nested) => {
          if (nested && nested.content) {
            console.log('✅ Nested data works:', nested.content);
            console.log('\n🎉 Local storage works!');
            console.log('   The issue might be with cross-instance sync\n');
            process.exit(0);
          } else {
            console.log('❌ Nested data not found');
            process.exit(1);
          }
        });
      }, 1000);
    } else {
      console.log('❌ Data not persisted');
      process.exit(1);
    }
  });
}, 2000);

setTimeout(() => {
  console.log('\n❌ Timeout');
  process.exit(1);
}, 8000);
