// Test: Shallow vs Deep paths
const Gun = require('gun');
require('gun/axe');

console.log('🔍 Testing Path Depth\n');

const gun = Gun({
  peers: ['https://aiseektruth-relay-production.up.railway.app/gun'],
  localStorage: false,
  radisk: false
});

// Test 1: Shallow path
console.log('Test 1: Shallow path (test1)');
gun.get('test1').put({ msg: 'shallow', ts: Date.now() });

setTimeout(() => {
  gun.get('test1').once((data) => {
    if (data) {
      console.log('✅ Shallow path works:', data.msg);

      // Test 2: Medium depth
      console.log('\nTest 2: Medium depth (test2/alice)');
      gun.get('test2').get('alice').put({ msg: 'medium', ts: Date.now() });

      setTimeout(() => {
        gun.get('test2').get('alice').once((data2) => {
          if (data2) {
            console.log('✅ Medium depth works:', data2.msg);

            // Test 3: Deep path
            console.log('\nTest 3: Deep path (test3/bob/alice)');
            gun.get('test3').get('bob').get('alice').put({ msg: 'deep', ts: Date.now() });

            setTimeout(() => {
              gun.get('test3').get('bob').get('alice').once((data3) => {
                if (data3) {
                  console.log('✅ Deep path works:', data3.msg);
                  console.log('\n✅ ALL PATHS WORK!\n');
                } else {
                  console.log('❌ Deep path FAILED');
                  console.log('   Path depth limit reached\n');
                }
                process.exit(0);
              });
            }, 3000);
          } else {
            console.log('❌ Medium depth FAILED\n');
            process.exit(1);
          }
        });
      }, 3000);
    } else {
      console.log('❌ Shallow path FAILED\n');
      process.exit(1);
    }
  });
}, 3000);
