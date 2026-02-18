// Proof-of-concept: Using .put() with message IDs instead of .set()
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Testing FIXED Pattern (.put() with IDs)\n');

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

const user1Key = 'alice_pub';
const user2Key = 'bob_pub';

// User 2 (Bob) subscribes to messages
console.log('👤 Bob: Subscribing to messages from Alice...');
const processedMessages = new Set();

gun2
  .get('messages')
  .get(user2Key)  // Bob's messages
  .get(user1Key)  // From Alice
  .map()  // Iterate over message IDs
  .on((data, messageId) => {
    if (data && data.content && !processedMessages.has(messageId)) {
      processedMessages.add(messageId);
      console.log('\n🎉 SUCCESS! Message received!');
      console.log('📨 ID:', messageId);
      console.log('💬 Content:', data.content);
      console.log('👤 From:', data.from);
      console.log('⏰ Timestamp:', new Date(data.timestamp).toISOString());
      console.log('\n✅ FIXED PATTERN WORKS! This is the solution!\n');
      process.exit(0);
    }
  });

setTimeout(() => {
  console.log('\n👤 Alice: Sending message to Bob...');

  // Generate message ID
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const messageData = {
    id: messageId,
    from: user1Key,
    to: user2Key,
    content: 'Hello Bob! This message uses the FIXED pattern!',
    timestamp: Date.now()
  };

  // Use .get(messageId).put() instead of .set()
  gun1
    .get('messages')
    .get(user2Key)  // Send to Bob
    .get(user1Key)  // From Alice
    .get(messageId)  // ✅ Use message ID as key
    .put(messageData);  // ✅ Use .put() not .set()

  console.log('✅ Message sent with ID:', messageId);
  console.log('⏳ Waiting for delivery (8 seconds)...');
}, 2000);

setTimeout(() => {
  console.log('\n⚠️  Message not received');
  console.log('   Something else is wrong\n');
  process.exit(1);
}, 10000);
