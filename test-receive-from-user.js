// Test: Subscribe to user's public key and wait for contact requests
const Gun = require('gun');
require('gun/axe');

const userPublicKey = '_kpVLwSod9etpejZCLK-6lI2vZshErJGvo-0WZKzdBU';

console.log('🧪 Testing Internet Sync via Railway Relay\n');
console.log('👤 Your Public Key:', userPublicKey);
console.log('📡 Connecting to Railway relay...');
console.log('   URL: https://aiseektruth-relay-production.up.railway.app/gun\n');

const gun = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: false,
  radisk: false
});

// Subscribe to contact requests for this user
const requestKey = `creq_${userPublicKey}`;
console.log('🔔 Subscribing to contact requests...');
console.log('   Key:', requestKey);
console.log('');
console.log('✅ Ready! Now send me a contact request from your app:\n');
console.log('   1. In your app, click "+ DM"');
console.log('   2. Paste this key: ClaudeTestUser_Virtual_' + Date.now());
console.log('   3. Add a message (optional)');
console.log('   4. Click "Send Request"\n');
console.log('⏳ Waiting for your contact request...\n');

const startTime = Date.now();
const receivedRequests = new Set();

gun.get(requestKey).map().on((data, reqId) => {
  if (data && data.type === 'contact_request' && !receivedRequests.has(reqId)) {
    receivedRequests.add(reqId);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUCCESS! Contact request received!\n');
    console.log('📨 Request Details:');
    console.log('   ID:', reqId);
    console.log('   From Public Key:', data.fromPublicKey);
    console.log('   From Username:', data.fromUsername);
    console.log('   Encryption Key:', data.fromEncryptionPublicKey);
    console.log('   Message:', data.message || '(no message)');
    console.log('   Timestamp:', new Date(data.timestamp).toISOString());
    console.log('');
    console.log('⏱️  Sync Time:', elapsed, 'seconds');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ INTERNET SYNC WORKS!\n');
    console.log('This proves:');
    console.log('  ✅ Your app sends data correctly');
    console.log('  ✅ Railway relay stores and syncs data');
    console.log('  ✅ Remote users can receive your requests');
    console.log('  ✅ P2P mesh network is working!\n');
    console.log('🎯 You can now connect with real users over the internet!\n');
  }
});

// Keep alive
setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  if (elapsed % 10 === 0 && elapsed > 0) {
    console.log(`⏳ Still waiting... (${elapsed}s elapsed)`);
  }
}, 1000);

// Timeout after 2 minutes
setTimeout(() => {
  if (receivedRequests.size === 0) {
    console.log('\n⚠️  No contact request received after 2 minutes\n');
    console.log('Possible reasons:');
    console.log('  1. Request not sent yet - try sending now');
    console.log('  2. Wrong recipient key - make sure to paste the test key');
    console.log('  3. Check app console for errors\n');
    process.exit(1);
  }
}, 120000);
