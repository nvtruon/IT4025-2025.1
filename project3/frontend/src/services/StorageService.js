import { Keychain } from '../crypto/Keychain.js';

class StorageService {
  constructor() {
    this.keychain = null;
    this.initialized = false;
    this.currentUser = null;
    // Memory-only storage (Lossy on reload/close)
    this.memoryStorage = new Map();
  }

  /**
   * Initialize the storage service for a specific user.
   * - If user exists (in memory): Attempt Login (load keychain).
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

    const storedKeychain = this.memoryStorage.get(dataKey);
    const storedDigest = this.memoryStorage.get(digestKey);

    if (storedKeychain && storedDigest) {
      // --- EXISTING USER: LOGIN ---
      console.log(`Attempting login for existing user (Memory): ${username}`);
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
      // Don't save yet, wait for first action? Or save empty?
      await this._saveKeychain();
    }

    this.initialized = true;
  }

  /**
   * Save keychain to memory
   * @private
   */
  async _saveKeychain() {
    if (!this.keychain || !this.currentUser) return;
    const [repr, digest] = await this.keychain.dump();

    const dataKey = `keychain_data_${this.currentUser}`;
    const digestKey = `keychain_digest_${this.currentUser}`;

    this.memoryStorage.set(dataKey, repr);
    this.memoryStorage.set(digestKey, digest);
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
   * Save a peer's display name
   * @param {string} hash - User hash ID
   * @param {string} name - Display Name
   */
  async savePeerName(hash, name) {
    if (!this.initialized || !this.keychain || !hash || !name) return;
    try {
      // We store names individually or in a map? 
      // Individual keys "peer_name_<hash>" avoids huge blobs, 
      // but "known_peers_names" map is easier to load all at once.
      // Let's use a single map for "known_peers_map" = { hash: name }

      let map = {};
      const raw = await this.keychain.get('known_peers_map');
      if (raw) map = JSON.parse(raw);

      if (map[hash] !== name) {
        map[hash] = name;
        await this.keychain.set('known_peers_map', JSON.stringify(map));
      }
    } catch (e) {
      console.error('Failed to save peer name:', e);
    }
  }

  /**
   * Get all known peer names
   * @returns {Promise<object>} Map of hash -> name
   */
  async getPeerNames() {
    if (!this.initialized || !this.keychain) return {};
    try {
      const raw = await this.keychain.get('known_peers_map');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  /**
   * Encrypt and save a message to memory
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
  /**
   * Export raw encrypted keychain data for cloud backup
   * @returns {Promise<{keychain: string, digest: string}|null>}
   */
  async exportEncryptedData() {
    if (!this.currentUser) return null;
    const dataKey = `keychain_data_${this.currentUser}`;
    const digestKey = `keychain_digest_${this.currentUser}`;

    const keychain = this.memoryStorage.get(dataKey);
    const digest = this.memoryStorage.get(digestKey);

    if (keychain && digest) {
      return { keychain, digest };
    }
    return null;
  }

  /**
   * Import raw encrypted keychain data from cloud backup (into MEMORY)
   * @param {string} keychain - Encrypted keychain blob
   * @param {string} digest - Integrity digest
   */
  async importEncryptedData(username, keychain, digest) {
    if (!username || !keychain || !digest) return;

    const dataKey = `keychain_data_${username}`;
    const digestKey = `keychain_digest_${username}`;

    this.memoryStorage.set(dataKey, keychain);
    this.memoryStorage.set(digestKey, digest);
  }
}

// Export singleton instance
export default new StorageService();

