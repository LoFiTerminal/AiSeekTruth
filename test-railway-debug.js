// Debug: Test if data is stored and can be read back
const Gun = require('gun');
require('gun/axe');

console.log('🔍 Debug Test: Write then Read\n');

const gun = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: false,
  radisk: false
});

const testPath = 'messages/bob/alice/msg123';

console.log('Step 1: Writing data to relay...');
gun.get('messages').get('bob').get('alice').get('msg123').put({
  content: 'Test message',
  timestamp: Date.now()
});

setTimeout(() => {
  console.log('\nStep 2: Reading back from relay...');
  gun.get('messages').get('bob').get('alice').get('msg123').once((data) => {
    if (data) {
      console.log('\n✅ SUCCESS! Data was stored and retrieved!');
      console.log('📨 Data:', data);
      console.log('\n✅ Relay storage works!\n');

      // Now test .map()
      console.log('Step 3: Testing .map() subscription...');
      gun.get('messages').get('bob').get('alice').map().on((data, key) => {
        console.log('\n✅ .map() received:', key, data);
        process.exit(0);
      });

      setTimeout(() => {
        console.log('\n⚠️  .map() subscription received nothing');
        console.log('   Issue: .map() might not work on nested paths\n');
        process.exit(0);
      }, 5000);
    } else {
      console.log('\n❌ FAILED! Data was not stored');
      console.log('   Relay might not be persisting data\n');
      process.exit(1);
    }
  });
}, 3000);
