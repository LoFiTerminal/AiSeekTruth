const Gun = require('gun');
require('gun/axe');

console.log('Testing single key pattern that worked...\n');

const gun1 = Gun({ peers: ['https://aiseektruth-relay-production.up.railway.app/gun'] });
const gun2 = Gun({ peers: ['https://aiseektruth-relay-production.up.railway.app/gun'] });

console.log('User 2: Subscribing to msg_conversation_1...');
gun2.get('msg_conversation_1').map().on((data, key) => {
  if (data && data.content) {
    console.log('\n✅ MESSAGE RECEIVED:', data.content);
    console.log('Key:', key);
    process.exit(0);
  }
});

setTimeout(() => {
  console.log('\nUser 1: Sending message...');
  gun1.get('msg_conversation_1').get('msg123').put({
    content: 'Test ' + Date.now(),
    timestamp: Date.now()
  });
  console.log('Sent, waiting...');
}, 2000);

setTimeout(() => {
  console.log('\nNot received\n');
  process.exit(1);
}, 8000);
