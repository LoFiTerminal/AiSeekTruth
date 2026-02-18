// Test the FIXED Railway relay
const Gun = require('gun');
require('gun/axe');

console.log('🔫 Testing FIXED Railway Relay\n');
console.log('📡 Relay: https://aiseektruth-relay-production.up.railway.app/gun\n');

// Create two Gun instances
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

gun1.on('hi', (peer) => {
  if (!connected1) {
    console.log('✅ User 1 connected to:', peer.url);
    connected1 = true;
  }
});

gun2.on('hi', (peer) => {
  if (!connected2) {
    console.log('✅ User 2 connected to:', peer.url);
    connected2 = true;
  }
});

// User 2 subscribes to messages
console.log('👤 User 2: Subscribing to messages...');
gun2.get('test_messages').get('user2').get('user1').map().on((data, key) => {
  if (data && data.content) {
    console.log('\n🎉 SUCCESS! Message received!');
    console.log('📨 From:', data.from);
    console.log('💬 Content:', data.content);
    console.log('⏰ Timestamp:', new Date(data.timestamp).toISOString());
    console.log('\n✅ RAILWAY RELAY IS WORKING! Messages persist and sync!\n');
    process.exit(0);
  }
});

setTimeout(() => {
  console.log('\n👤 User 1: Sending test message...');
  gun1.get('test_messages').get('user2').get('user1').set({
    id: 'test-' + Date.now(),
    from: 'user1',
    to: 'user2',
    content: 'Hello from User 1 via FIXED Railway relay!',
    timestamp: Date.now()
  });
  console.log('✅ Message sent via Railway relay');
  console.log('⏳ Waiting for delivery (10 seconds)...');
}, 3000);

setTimeout(() => {
  console.log('\n⚠️  Message not received within 10 seconds');
  console.log('   This might mean:');
  console.log('   - Railway relay still has old code (check deployment logs)');
  console.log('   - Network latency is high');
  console.log('   - Need to wait longer for sync\n');
  process.exit(1);
}, 13000);
