// Test with .set() pattern (matches app code)
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Testing .set() Pattern (like app)\n');

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

// User 2 subscribes (like app does)
console.log('👤 User 2: Subscribing to messages...');
const processedMessages = new Set();

gun2
  .get('messages')
  .get(user2Key)
  .get(user1Key)
  .map()
  .on((data, key) => {
    if (data && data.message && !processedMessages.has(key)) {
      processedMessages.add(key);
      console.log('\n🎉 SUCCESS! Message received via .set()!');
      console.log('📨 Message:', data.message);
      console.log('⏰ Timestamp:', data.timestamp);
      console.log('\n✅ APP PATTERN WORKS!\n');
      process.exit(0);
    }
  });

setTimeout(() => {
  console.log('\n👤 User 1: Sending message with .set()...');
  gun1
    .get('messages')
    .get(user2Key)
    .get(user1Key)
    .set({
      message: 'Hello via .set()!',
      timestamp: Date.now()
    });
  console.log('✅ Message sent');
  console.log('⏳ Waiting for delivery (8 seconds)...');
}, 2000);

setTimeout(() => {
  console.log('\n⚠️  Message not received');
  console.log('   .set() might have sync issues\n');
  process.exit(1);
}, 10000);
