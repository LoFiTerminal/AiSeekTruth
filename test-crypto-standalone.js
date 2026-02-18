// Test if crypto libraries work
const sodium = require('libsodium-wrappers-sumo');

async function testCrypto() {
  try {
    console.log('Testing crypto libraries...\n');

    await sodium.ready;
    console.log('✅ Sodium initialized');

    // Test key generation
    const signingKeyPair = sodium.crypto_sign_keypair();
    console.log('✅ Signing keypair generated');
    console.log('   Public key length:', signingKeyPair.publicKey.length);

    const encryptionKeyPair = sodium.crypto_box_keypair();
    console.log('✅ Encryption keypair generated');
    console.log('   Public key length:', encryptionKeyPair.publicKey.length);

    // Test encryption
    const message = 'Hello World';
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const key = sodium.crypto_secretbox_keygen();
    const encrypted = sodium.crypto_secretbox_easy(message, nonce, key);
    console.log('✅ Message encrypted');

    const decrypted = sodium.crypto_secretbox_open_easy(encrypted, nonce, key);
    const decryptedText = sodium.to_string(decrypted);
    console.log('✅ Message decrypted:', decryptedText);

    if (decryptedText === message) {
      console.log('\n🎉 All crypto tests passed!');
      console.log('Crypto is working correctly.\n');
    } else {
      console.log('\n❌ Decryption failed!');
    }

  } catch (error) {
    console.error('❌ Crypto test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testCrypto();
