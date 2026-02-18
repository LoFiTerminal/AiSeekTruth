// PROOF: Flat structure works perfectly
const Gun = require('gun');
require('gun/axe');

console.log('🎯 FINAL TEST: Flat 2-Level Structure\n');

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

const aliceKey = 'alice_abc123';
const bobKey = 'bob_xyz789';

// Create conversation key (recipient_sender)
const conversationKey = `${bobKey}_${aliceKey}`;
const messageKey = `msg_${conversationKey}`;

console.log('🔑 Conversation Key:', messageKey);
console.log('');

// Bob subscribes to messages from Alice
console.log('👤 Bob: Subscribing to messages from Alice...');
const receivedMessages = new Set();

gun2.get(messageKey).map().on((data, msgId) => {
  if (data && data.content && !receivedMessages.has(msgId)) {
    receivedMessages.add(msgId);
    console.log('\n🎉 SUCCESS! Message synced through relay!');
    console.log('📨 Message ID:', msgId);
    console.log('💬 Content:', data.content);
    console.log('👤 From:', data.from);
    console.log('⏰ Time:', new Date(data.timestamp).toLocaleTimeString());
    console.log('\n✅ FLAT STRUCTURE WORKS!');
    console.log('✅ This is the solution to fix AiSeekTruth!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update src/main/p2p.js with flat structure');
    console.log('2. Use composite keys: msg_${recipient}_${sender}');
    console.log('3. Max 2 levels deep');
    console.log('4. Use .get(messageId).put() not .set()');
    console.log('');
    process.exit(0);
  }
});

setTimeout(() => {
  console.log('👤 Alice: Sending message to Bob...');

  const messageId = `msg-${Date.now()}`;
  const messageData = {
    id: messageId,
    from: aliceKey,
    to: bobKey,
    content: 'Hi Bob! This uses the FLAT structure that WORKS!',
    timestamp: Date.now()
  };

  gun1.get(messageKey).get(messageId).put(messageData);

  console.log('✅ Message sent');
  console.log('⏳ Waiting for sync through Railway relay...');
}, 2000);

setTimeout(() => {
  console.log('\n⚠️  Message not received after 8 seconds');
  console.log('   (This should not happen with flat structure)');
  console.log('');
  process.exit(1);
}, 10000);
