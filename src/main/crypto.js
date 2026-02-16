const sodium = require('libsodium-wrappers');

// Promise to track libsodium initialization
let sodiumReadyPromise = null;

async function ensureSodiumReady() {
  if (!sodiumReadyPromise) {
    sodiumReadyPromise = sodium.ready;
  }
  await sodiumReadyPromise;
}

/**
 * Create a new identity with username and password
 * Generates Ed25519 signing keys and derives X25519 encryption keys
 * @param {string} username - User's chosen username
 * @param {string} password - Password for encrypting private keys
 * @returns {Object} Identity object with public/private keys
 */
async function createIdentity(username, password) {
  await ensureSodiumReady();

  // Generate Ed25519 signing key pair
  const signingKeyPair = sodium.crypto_sign_keypair();

  // Derive X25519 encryption keys from Ed25519 keys
  const encryptionPublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(signingKeyPair.publicKey);
  const encryptionPrivateKey = sodium.crypto_sign_ed25519_sk_to_curve25519(signingKeyPair.privateKey);

  const identity = {
    username,
    publicKey: sodium.to_base64(signingKeyPair.publicKey),
    privateKey: sodium.to_base64(signingKeyPair.privateKey),
    encryptionPublicKey: sodium.to_base64(encryptionPublicKey),
    encryptionPrivateKey: sodium.to_base64(encryptionPrivateKey),
    createdAt: Date.now(),
  };

  // Encrypt identity for storage
  const encryptedIdentity = await encryptIdentityForStorage(identity, password);

  return { identity, encryptedIdentity };
}

/**
 * Encrypt identity for secure storage using password
 * Uses Argon2id for key derivation and XSalsa20-Poly1305 for encryption
 * @param {Object} identity - Identity object to encrypt
 * @param {string} password - Password for encryption
 * @returns {Object} Encrypted identity data
 */
async function encryptIdentityForStorage(identity, password) {
  await ensureSodiumReady();

  // Generate random salt for Argon2id (using hardcoded constant since libsodium constants aren't exported)
  const CRYPTO_PWHASH_SALTBYTES = 16; // Standard libsodium constant
  const salt = sodium.randombytes_buf(CRYPTO_PWHASH_SALTBYTES);

  // Derive key from password using Argon2id (using hardcoded constants)
  const CRYPTO_SECRETBOX_KEYBYTES = 32;
  const CRYPTO_PWHASH_OPSLIMIT_INTERACTIVE = 2;
  const CRYPTO_PWHASH_MEMLIMIT_INTERACTIVE = 67108864;
  const CRYPTO_PWHASH_ALG_ARGON2ID13 = 2;

  const key = sodium.crypto_pwhash(
    CRYPTO_SECRETBOX_KEYBYTES,
    password,
    salt,
    CRYPTO_PWHASH_OPSLIMIT_INTERACTIVE,
    CRYPTO_PWHASH_MEMLIMIT_INTERACTIVE,
    CRYPTO_PWHASH_ALG_ARGON2ID13
  );

  // Prepare data to encrypt (private keys only)
  const dataToEncrypt = JSON.stringify({
    privateKey: identity.privateKey,
    encryptionPrivateKey: identity.encryptionPrivateKey,
  });

  // Generate random nonce
  const nonce = sodium.randombytes_buf(24);

  // Encrypt using XSalsa20-Poly1305
  const ciphertext = sodium.crypto_secretbox_easy(dataToEncrypt, nonce, key);

  return {
    username: identity.username,
    publicKey: identity.publicKey,
    encryptionPublicKey: identity.encryptionPublicKey,
    createdAt: identity.createdAt,
    // Encrypted data
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
    salt: sodium.to_base64(salt),
  };
}

/**
 * Decrypt identity from storage using password
 * @param {Object} stored - Encrypted identity from storage
 * @param {string} password - Password for decryption
 * @returns {Object|null} Decrypted identity or null if password incorrect
 */
async function decryptIdentityFromStorage(stored, password) {
  await ensureSodiumReady();

  try {
    const salt = sodium.from_base64(stored.salt);
    const nonce = sodium.from_base64(stored.nonce);
    const ciphertext = sodium.from_base64(stored.ciphertext);

    // Derive key from password using same parameters
    const key = sodium.crypto_pwhash(
      sodium.crypto_secretbox_KEYBYTES,
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );

    // Decrypt
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    const decryptedData = JSON.parse(sodium.to_string(decrypted));

    // Reconstruct full identity
    return {
      username: stored.username,
      publicKey: stored.publicKey,
      privateKey: decryptedData.privateKey,
      encryptionPublicKey: stored.encryptionPublicKey,
      encryptionPrivateKey: decryptedData.encryptionPrivateKey,
      createdAt: stored.createdAt,
    };
  } catch (error) {
    // Decryption failed - wrong password
    return null;
  }
}

/**
 * Derive shared secret using X25519 ECDH
 * @param {string} myPrivateKeyBase64 - My encryption private key (base64)
 * @param {string} theirPublicKeyBase64 - Their encryption public key (base64)
 * @returns {Uint8Array} Shared secret
 */
async function deriveSharedSecret(myPrivateKeyBase64, theirPublicKeyBase64) {
  await ensureSodiumReady();

  const myPrivateKey = sodium.from_base64(myPrivateKeyBase64);
  const theirPublicKey = sodium.from_base64(theirPublicKeyBase64);

  // Perform X25519 scalar multiplication for ECDH
  const sharedSecret = sodium.crypto_scalarmult(myPrivateKey, theirPublicKey);

  return sharedSecret;
}

/**
 * Encrypt a message using shared secret
 * Uses XSalsa20-Poly1305 authenticated encryption
 * @param {string} plaintext - Message to encrypt
 * @param {Uint8Array} sharedSecret - Shared secret from ECDH
 * @returns {Object} Encrypted message with nonce
 */
async function encryptMessage(plaintext, sharedSecret) {
  await ensureSodiumReady();

  // Generate random nonce
  const nonce = sodium.randombytes_buf(24);

  // Encrypt message
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, sharedSecret);

  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce: sodium.to_base64(nonce),
  };
}

/**
 * Decrypt a message using shared secret
 * @param {string} ciphertextBase64 - Encrypted message (base64)
 * @param {string} nonceBase64 - Nonce (base64)
 * @param {Uint8Array} sharedSecret - Shared secret from ECDH
 * @returns {string|null} Decrypted message or null if verification fails
 */
async function decryptMessage(ciphertextBase64, nonceBase64, sharedSecret) {
  await ensureSodiumReady();

  try {
    const ciphertext = sodium.from_base64(ciphertextBase64);
    const nonce = sodium.from_base64(nonceBase64);

    // Decrypt and verify
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, sharedSecret);

    return sodium.to_string(decrypted);
  } catch (error) {
    // Decryption/verification failed
    return null;
  }
}

/**
 * Sign a message using Ed25519
 * @param {string} message - Message to sign
 * @param {string} privateKeyBase64 - Ed25519 private key (base64)
 * @returns {string} Detached signature (base64)
 */
async function signMessage(message, privateKeyBase64) {
  await ensureSodiumReady();

  const privateKey = sodium.from_base64(privateKeyBase64);

  // Create detached signature
  const signature = sodium.crypto_sign_detached(message, privateKey);

  return sodium.to_base64(signature);
}

/**
 * Verify Ed25519 signature
 * @param {string} message - Original message
 * @param {string} signatureBase64 - Signature (base64)
 * @param {string} publicKeyBase64 - Ed25519 public key (base64)
 * @returns {boolean} True if signature is valid
 */
async function verifySignature(message, signatureBase64, publicKeyBase64) {
  await ensureSodiumReady();

  try {
    const signature = sodium.from_base64(signatureBase64);
    const publicKey = sodium.from_base64(publicKeyBase64);

    // Verify detached signature
    return sodium.crypto_sign_verify_detached(signature, message, publicKey);
  } catch (error) {
    return false;
  }
}

/**
 * Generate unique message ID
 * @returns {string} Random message ID
 */
async function generateMessageId() {
  await ensureSodiumReady();

  const randomBytes = sodium.randombytes_buf(16);
  return sodium.to_base64(randomBytes);
}

/**
 * Convert signing public key to encryption public key
 * @param {string} publicKeyBase64 - Ed25519 public key (base64)
 * @returns {string} X25519 public key (base64)
 */
async function getEncryptionPublicKey(publicKeyBase64) {
  await ensureSodiumReady();

  const publicKey = sodium.from_base64(publicKeyBase64);
  const encryptionPublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(publicKey);

  return sodium.to_base64(encryptionPublicKey);
}

/**
 * Generate random bytes for various purposes
 * @param {number} length - Number of random bytes
 * @returns {string} Random bytes (base64)
 */
async function generateRandomBytes(length) {
  await ensureSodiumReady();

  const randomBytes = sodium.randombytes_buf(length);
  return sodium.to_base64(randomBytes);
}

module.exports = {
  createIdentity,
  encryptIdentityForStorage,
  decryptIdentityFromStorage,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
  signMessage,
  verifySignature,
  generateMessageId,
  getEncryptionPublicKey,
  generateRandomBytes,
};
