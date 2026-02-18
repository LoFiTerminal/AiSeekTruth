// Test Gun.js connection and messaging
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Testing Gun.js P2P Network...\n');

// Create two Gun instances (simulating two users)
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

let connected1 = false;
let connected2 = false;

// Listen for connections
gun1.on('hi', (peer) => {
  if (!connected1) {
    console.log('✅ User 1 connected to:', peer.url || 'peer');
    connected1 = true;
  }
});

gun2.on('hi', (peer) => {
  if (!connected2) {
    console.log('✅ User 2 connected to:', peer.url || 'peer');
    connected2 = true;
  }
});

// Wait for connections
setTimeout(() => {
  console.log('\n📤 Testing message delivery...');

  const testMessage = {
    id: 'test-msg-' + Date.now(),
    from: 'user1_pubkey',
    to: 'user2_pubkey',
    content: 'Hello from User 1!',
    timestamp: Date.now()
  };

  // User 2 subscribes to messages
  gun2
    .get('messages')
    .get('user2_pubkey')
    .get('user1_pubkey')
    .map()
    .on((data, key) => {
      if (data && data.content) {
        console.log('\n📨 User 2 received message:');
        console.log('  - From:', data.from);
        console.log('  - Content:', data.content);
        console.log('  - Timestamp:', new Date(data.timestamp).toISOString());
        console.log('\n🎉 Gun.js messaging works!');
        process.exit(0);
      }
    });

  // Wait a bit for subscription to be established
  setTimeout(() => {
    console.log('📡 User 1 sending message...');

    // User 1 sends message
    gun1
      .get('messages')
      .get('user2_pubkey')
      .get('user1_pubkey')
      .set(testMessage);

    console.log('✅ Message published to Gun.js');
    console.log('⏳ Waiting for delivery (5 seconds)...');

    // Timeout if message not received
    setTimeout(() => {
      console.log('\n❌ Message not received within 5 seconds');
      console.log('   This could mean:');
      console.log('   1. Gun.js relay is not working');
      console.log('   2. Network latency is high');
      console.log('   3. Subscription path is wrong');
      process.exit(1);
    }, 5000);
  }, 1000);
}, 2000);

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
