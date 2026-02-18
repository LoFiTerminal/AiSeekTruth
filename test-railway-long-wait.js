// Test with .set() and longer wait time
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Testing .set() with 30 second wait\n');

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

const user1Key = 'testuser1';
const user2Key = 'testuser2';

let received = false;

// User 2 subscribes
console.log('👤 User 2: Subscribing...');
gun2
  .get('messages')
  .get(user2Key)
  .get(user1Key)
  .map()
  .on((data, key) => {
    if (data && data.message && !received) {
      received = true;
      console.log('\n🎉 SUCCESS after extended wait!');
      console.log('📨 Message:', data.message);
      console.log('✅ .set() DOES work, just needs more time\n');
      process.exit(0);
    }
  });

setTimeout(() => {
  console.log('\n👤 User 1: Sending...');
  gun1
    .get('messages')
    .get(user2Key)
    .get(user1Key)
    .set({
      message: 'Test message ' + Date.now(),
      timestamp: Date.now()
    });
  console.log('✅ Sent, waiting 30 seconds...');
}, 2000);

setTimeout(() => {
  if (!received) {
    console.log('\n⚠️  Not received after 30 seconds');
    console.log('   .set() + relay sync issue confirmed\n');
    process.exit(1);
  }
}, 32000);
