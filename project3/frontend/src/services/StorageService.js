import { Keychain } from '../crypto/Keychain.js';

class StorageService {
  constructor() {
    this.keychain = null;
    this.initialized = false;
    this.currentUser = null;
  }

  /**
   * Initialize the storage service for a specific user.
   * - If user exists: Attempt Login (load keychain).
   * - If user new: Attempt Register (create keychain).
   * @param {string} username - Username
   * @param {string} password - Master password
   */
  async init(username, password) {
    if (!username || typeof username !== 'string') {
      throw new Error('Username must be a non-empty string');
    }
    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new Error('Password must be a non-empty string');
    }

    this.currentUser = username;

    // Namespace keys by username
    const dataKey = `keychain_data_${username}`;
    const digestKey = `keychain_digest_${username}`;

    const storedKeychain = localStorage.getItem(dataKey);
    const storedDigest = localStorage.getItem(digestKey);

    if (storedKeychain && storedDigest) {
      // --- EXISTING USER: LOGIN ---
      console.log(`Attempting login for existing user: ${username}`);
      try {
        // Load existing keychain - this will THROW if password is wrong
        this.keychain = await Keychain.load(password, storedKeychain, storedDigest);
      } catch (error) {
        console.error('Failed to load keychain:', error);
        if (error.message === 'Incorrect password' || error.message.includes('Integrity check failed')) {
          throw new Error('Incorrect password');
        }
        throw error;
      }
    } else {
      // --- NEW USER: REGISTER ---
      console.log(`Creating new account for: ${username}`);
      this.keychain = await Keychain.init(password);
      await this._saveKeychain();
    }

    this.initialized = true;
  }

  /**
   * Save keychain to localStorage (namespaced)
   * @private
   */
  async _saveKeychain() {
    if (!this.keychain || !this.currentUser) return;
    const [repr, digest] = await this.keychain.dump();

    const dataKey = `keychain_data_${this.currentUser}`;
    const digestKey = `keychain_digest_${this.currentUser}`;

    localStorage.setItem(dataKey, repr);
    localStorage.setItem(digestKey, digest);
  }

  /**
   * Get list of all peers we have chatted with
   * @returns {Promise<string[]>} List of usernames
   */
  async getKnownPeers() {
    if (!this.initialized || !this.keychain) {
      return [];
    }
    try {
      const peersJson = await this.keychain.get('known_peers');
      if (peersJson) {
        return JSON.parse(peersJson);
      }
    } catch (e) {
      console.warn('Failed to load known peers', e);
    }
    return [];
  }

  /**
   * Add a peer to the known peers list
   * @private
   */
  async _addKnownPeer(peerName) {
    try {
      const peers = await this.getKnownPeers();
      if (!peers.includes(peerName)) {
        peers.push(peerName);
        peers.sort(); // Keep sorted
        await this.keychain.set('known_peers', JSON.stringify(peers));
      }
    } catch (e) {
      console.error('Failed to update known peers:', e);
    }
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

    // Track this peer as known
    await this._addKnownPeer(peerName);

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
   * Save Messenger state (including keys) to encrypted storage
   * @param {string} state - Serialized messenger state (JSON string)
   * @returns {Promise<void>}
   */
  async saveMessengerState(state) {
    if (!this.initialized || !this.keychain) {
      throw new Error('StorageService not initialized');
    }
    await this.keychain.set('messenger_state', state);
    await this._saveKeychain();
  }

  /**
   * Load Messenger state from encrypted storage
   * @returns {Promise<string|null>} Serialized messenger state or null
   */
  async loadMessengerState() {
    if (!this.initialized || !this.keychain) {
      throw new Error('StorageService not initialized');
    }
    return await this.keychain.get('messenger_state');
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

