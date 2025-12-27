/**
 * Constants for the Secure Chat App
 * Contains dummy cryptographic keys for development/testing
 */

// Cache for generated keys (generated once per session)
let cachedGovPublicKey = null;
let cachedCAPublicKey = null;

/**
 * Generate dummy Government Public Key (ECDH P-384)
 * This generates a dummy key for development (cached per session)
 * In production, this should be provided by a trusted authority
 * @returns {Promise<CryptoKey>} Government public key for ECDH operations
 */
export async function getGovPublicKey() {
  if (cachedGovPublicKey) {
    return cachedGovPublicKey;
  }

  const { subtle } = window.crypto;
  
  // Generate a key pair (we only use the public key)
  // For a true hardcoded constant, generate once and store the JWK in the constants
  const keyPair = await subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-384' },
    true,
    ['deriveKey', 'deriveBits']
  );
  
  cachedGovPublicKey = keyPair.publicKey;
  return cachedGovPublicKey;
}

/**
 * Generate dummy Certificate Authority Public Key (ECDSA P-384)
 * This generates a dummy key for certificate verification (cached per session)
 * In production, this should be from a trusted certificate authority
 * @returns {Promise<CryptoKey>} CA public key for signature verification
 */
export async function getCAPublicKey() {
  if (cachedCAPublicKey) {
    return cachedCAPublicKey;
  }

  const { subtle } = window.crypto;
  console.log("Generating CA Key with usages: ['sign', 'verify']");
  
  // Generate a key pair (we only use the public key)
  // For a true hardcoded constant, generate once and store the JWK in the constants
  const keyPair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-384' },
    true,
    ['sign', 'verify']
  );
  
  cachedCAPublicKey = keyPair.publicKey;
  return cachedCAPublicKey;
}

/**
 * Dummy Government Public Key JWK (hardcoded for consistency)
 * To use this instead of generating a new key each time:
 * 1. Generate a key pair once using getGovPublicKey()
 * 2. Export it using: const jwk = await subtle.exportKey('jwk', publicKey)
 * 3. Replace the placeholder below with the actual JWK
 * 
 * For now, this function generates a new key each time (not truly constant)
 * To make it truly constant, generate once and hardcode the JWK values below
 */
export const GOV_PUBLIC_KEY_JWK = null; // Placeholder - replace with actual JWK if needed

/**
 * Dummy Certificate Authority Public Key JWK (hardcoded for consistency)
 * See GOV_PUBLIC_KEY_JWK for instructions on how to make this truly constant
 */
export const CA_PUBLIC_KEY_JWK = null; // Placeholder - replace with actual JWK if needed
