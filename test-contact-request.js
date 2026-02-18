// Test contact request flow with the new flat structure
const Gun = require('gun');
require('gun/axe');

console.log('🧪 Testing Contact Request Flow\n');

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

const aliceKey = 'alice_test_' + Date.now();
const bobKey = 'bob_test_' + Date.now();

console.log('👤 Alice public key:', aliceKey);
console.log('👤 Bob public key:', bobKey);
console.log('');

// Alice subscribes to contact requests
console.log('📡 Alice: Subscribing to contact requests...');
const requestKey = `creq_${aliceKey}`;
console.log('   Subscription key:', requestKey);

const receivedRequests = new Set();

gun1.get(requestKey).map().on((data, reqId) => {
  if (data && data.type === 'contact_request' && !receivedRequests.has(reqId)) {
    receivedRequests.add(reqId);
    console.log('\n🎉 SUCCESS! Alice received contact request!');
    console.log('   Request ID:', reqId);
    console.log('   From:', data.fromPublicKey);
    console.log('   Username:', data.fromUsername);
    console.log('   Message:', data.message);
    console.log('\n✅ CONTACT REQUESTS WORK!\n');
    process.exit(0);
  }
});

// Bob sends contact request after 2 seconds
setTimeout(() => {
  console.log('\n📤 Bob: Sending contact request to Alice...');

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const requestEnvelope = {
    id: requestId,
    fromPublicKey: bobKey,
    fromUsername: 'Bob',
    fromEncryptionPublicKey: 'bob_enc_key_123',
    message: 'Hi Alice, let\'s connect!',
    timestamp: Date.now(),
    type: 'contact_request'
  };

  const sendKey = `creq_${aliceKey}`;
  console.log('   Sending to key:', sendKey);
  console.log('   Request ID:', requestId);

  gun2.get(sendKey).get(requestId).put(requestEnvelope);

  console.log('✅ Contact request sent');
  console.log('⏳ Waiting for Alice to receive...');
}, 2000);

setTimeout(() => {
  console.log('\n⚠️  Contact request not received after 10 seconds');
  console.log('   Issue: Contact requests not syncing through relay\n');
  process.exit(1);
}, 12000);
