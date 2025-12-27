import { Keychain } from '../crypto/Keychain.js';

class StorageService {
  constructor() {
    this.keychain = null;
    this.initialized = false;
  }

  /**
   * Initialize the storage service with a master password
   * Generates the Master Key using Keychain
   * @param {string} password - Master password
   * @returns {Promise<void>}
   */
  async init(password) {
    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new Error('Password must be a non-empty string');
    }

    // Try to load existing keychain from localStorage
    const storedKeychain = localStorage.getItem('keychain_data');
    const storedDigest = localStorage.getItem('keychain_digest');

    if (storedKeychain && storedDigest) {
      try {
        // Load existing keychain
        this.keychain = await Keychain.load(password, storedKeychain, storedDigest);
      } catch (error) {
        // If loading fails (wrong password), create a new one
        console.warn('Failed to load existing keychain, creating new one:', error.message);
        this.keychain = await Keychain.init(password);
        await this._saveKeychain();
      }
    } else {
      // Create new keychain
      this.keychain = await Keychain.init(password);
      await this._saveKeychain();
    }

    this.initialized = true;
  }

  /**
   * Save keychain to localStorage
   * @private
   */
  async _saveKeychain() {
    const [repr, digest] = await this.keychain.dump();
    localStorage.setItem('keychain_data', repr);
    localStorage.setItem('keychain_digest', digest);
  }

  /**
   * Encrypt and save a message to localStorage
   * @param {string} peerName - Name of the peer/recipient
   * @param {object} data - Message data to save (should include timestamp, content, etc.)
   * @returns {Promise<void>}
   */
  async saveMessage(peerName, data) {
    if (!this.initialized || !this.keychain) {
      throw new Error('StorageService not initialized. Call init() first.');
    }

    if (!peerName || typeof peerName !== 'string') {
      throw new Error('peerName must be a non-empty string');
    }

    // Get existing history for this peer
    let history = [];
    try {
      const encryptedHistory = await this.keychain.get(`peer_${peerName}`);
      if (encryptedHistory) {
        history = JSON.parse(encryptedHistory);
      }
    } catch (error) {
      // If no history exists yet, start with empty array
      console.warn(`No existing history for ${peerName}, starting fresh`);
    }

    // Add new message to history
    history.push({
      ...data,
      timestamp: data.timestamp || Date.now()
    });

    // Encrypt and save the updated history
    await this.keychain.set(`peer_${peerName}`, JSON.stringify(history));
    await this._saveKeychain();
  }

  /**
   * Load and decrypt message history for a peer
   * @param {string} peerName - Name of the peer
   * @returns {Promise<Array>} Array of message objects
   */
  async loadHistory(peerName) {
    if (!this.initialized || !this.keychain) {
      throw new Error('StorageService not initialized. Call init() first.');
    }

    if (!peerName || typeof peerName !== 'string') {
      throw new Error('peerName must be a non-empty string');
    }

    try {
      const encryptedHistory = await this.keychain.get(`peer_${peerName}`);
      if (!encryptedHistory) {
        return [];
      }
      return JSON.parse(encryptedHistory);
    } catch (error) {
      console.error(`Error loading history for ${peerName}:`, error);
      return [];
    }
  }

  /**
   * Check if the service is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized && this.keychain !== null;
  }
}

// Export singleton instance
export default new StorageService();

