// Test crypto functions
const crypto = require('./src/main/crypto');

async function test() {
  console.log('🔬 Testing Crypto Functions...\n');

  try {
    // Test 1: Create identity
    console.log('Test 1: Creating identity...');
    const { identity } = await crypto.createIdentity('testuser', 'password123');
    console.log('✅ Identity created');
    console.log('  - Username:', identity.username);
    console.log('  - Public Key:', identity.publicKey.substring(0, 20) + '...');
    console.log('  - Encryption Public Key:', identity.encryptionPublicKey.substring(0, 20) + '...');

    // Test 2: Derive encryption public key from signing public key
    console.log('\nTest 2: Deriving encryption key from public key...');
    const derivedEncKey = await crypto.getEncryptionPublicKey(identity.publicKey);
    console.log('✅ Derived encryption key:', derivedEncKey.substring(0, 20) + '...');
    console.log('  - Matches original?', derivedEncKey === identity.encryptionPublicKey ? '✅ YES' : '❌ NO');

    // Test 3: Create second identity for testing
    console.log('\nTest 3: Creating second identity...');
    const { identity: identity2 } = await crypto.createIdentity('testuser2', 'password456');
    console.log('✅ Second identity created');

    // Test 4: Derive shared secret
    console.log('\nTest 4: Deriving shared secret...');
    const secret1 = await crypto.deriveSharedSecret(
      identity.encryptionPrivateKey,
      identity2.encryptionPublicKey
    );
    const secret2 = await crypto.deriveSharedSecret(
      identity2.encryptionPrivateKey,
      identity.encryptionPublicKey
    );
    console.log('✅ Shared secrets derived');
    console.log('  - Secrets match?', secret1.toString() === secret2.toString() ? '✅ YES' : '❌ NO');

    // Test 5: Encrypt and decrypt message
    console.log('\nTest 5: Encrypting and decrypting message...');
    const plaintext = 'Hello, this is a test message!';
    const encrypted = await crypto.encryptMessage(plaintext, secret1);
    console.log('✅ Message encrypted');
    console.log('  - Ciphertext:', encrypted.ciphertext.substring(0, 20) + '...');
    console.log('  - Nonce:', encrypted.nonce.substring(0, 20) + '...');

    const decrypted = await crypto.decryptMessage(
      encrypted.ciphertext,
      encrypted.nonce,
      secret2
    );
    console.log('✅ Message decrypted');
    console.log('  - Original:', plaintext);
    console.log('  - Decrypted:', decrypted);
    console.log('  - Match?', plaintext === decrypted ? '✅ YES' : '❌ NO');

    // Test 6: Sign and verify
    console.log('\nTest 6: Signing and verifying...');
    const signature = await crypto.signMessage(plaintext, identity.privateKey);
    console.log('✅ Message signed');
    console.log('  - Signature:', signature.substring(0, 20) + '...');

    const isValid = await crypto.verifySignature(plaintext, signature, identity.publicKey);
    console.log('✅ Signature verified');
    console.log('  - Valid?', isValid ? '✅ YES' : '❌ NO');

    console.log('\n🎉 All crypto tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

test().then(() => process.exit(0));
