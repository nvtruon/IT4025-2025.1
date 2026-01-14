import { io } from 'socket.io-client';
import { Messenger } from '../crypto/Messenger.js';
import { cryptoKeyToJSON } from '../crypto/lib.js';
import StorageService from './StorageService.js';

class ChatService {
  constructor() {
    this.socket = null;
    this.messenger = null;
    this.connected = false;
    this.currentUser = null;
    this.messageHandlers = [];
    this.serverUrl = 'http://localhost:3000'; // Default port 3000 (configurable via init)
    this._connectionResolvers = []; // For waiting on connection
    this.messageQueue = Promise.resolve(); // Queue for sequential message processing
  }

  /**
   * Initialize the chat service with cryptographic keys
   * @param {CryptoKey} certAuthorityPublicKey - Certificate authority public key for verification
   * @param {CryptoKey} govPublicKey - Government public key for encryption
   * @param {string} serverUrl - Optional server URL (defaults to localhost:3001)
   */
  init(certAuthorityPublicKey, govPublicKey, serverUrl = null) {
    if (!certAuthorityPublicKey || !govPublicKey) {
      throw new Error('certAuthorityPublicKey and govPublicKey are required');
    }

    // Initialize Messenger with keys
    this.messenger = new Messenger(certAuthorityPublicKey, govPublicKey);

    // Use provided server URL or default
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }

    // Initialize socket connection
    this._connectSocket();
  }

  /**
   * Connect to the socket server
   * @private
   */
  _connectSocket() {
    if (this.socket && this.socket.connected) {
      return; // Already connected
    }

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('Connected to chat server');
      this.connected = true;
      // Resolve pending connection promises
      if (this._connectionResolvers) {
        this._connectionResolvers.forEach(resolve => resolve());
        this._connectionResolvers = [];
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Handle incoming messages - sequentially!
    this.socket.on('message', (data) => {
      // Chain promises to ensure messages are processed one at a time for Ratchet integrity
      this.messageQueue = this.messageQueue.then(async () => {
        try {
          await this._handleReceive(data);
        } catch (error) {
          console.error('Error processing queued message:', error);
        }
      });
    });

    // Handle other events
    this.socket.on('register_success', () => {
      console.log('Registration successful');
    });

    this.socket.on('users_list', async (data) => {
      console.log('Users list:', data.users);
      if (data.users && Array.isArray(data.users)) {
        for (const user of data.users) {
          // Skip current user
          if (this.currentUser && user.username === this.currentUser) continue;

          try {
            // The server sends { username, publicKey, displayName }
            // We construct the certificate object as expected by Messenger, but add displayName for UI
            const certificate = {
              username: user.username,
              publicKey: user.publicKey,
              displayName: user.displayName // Add display name
            };

            // Pass null for signature since server doesn't provide it
            await this.receiveCertificate(certificate, null);
            console.log(`Received certificate for ${user.username} (${user.displayName || 'No Name'})`);

            // Save Display Name to Storage for Offline Use
            if (user.displayName) {
              await StorageService.savePeerName(user.username, user.displayName);
            }
          } catch (err) {
            console.error(`Failed to process certificate for ${user.username}:`, err);
          }
        }
      }
    });

    this.socket.on('send_success', () => {
      console.log('Message sent successfully');
    });
  }

  /**Wait for socket connection to be established
   * @returns {Promise<void>}
   */
  async waitForConnection() {
    if (this.connected) {
      return; // Already connected
    }

    // Wait for connection with timeout
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout - server may not be running'));
      }, 5000);

      this._connectionResolvers.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  /**
   * Register user with the server
   * @param {string} username - Username to register (HASH)
   * @param {string} displayName - Display name (Plaintext)
   * @returns {Promise<object>} Certificate object
   */
  async register(username, displayName) {
    if (!this.messenger) {
      throw new Error('ChatService not initialized. Call init() first.');
    }

    // Wait for connection if not connected yet
    if (!this.connected) {
      await this.waitForConnection();
    }

    let publicKeyToSend;
    let certificate = null;

    // 1. Try to restore session from storage (Persistence Fix)
    if (StorageService.isInitialized()) {
      const storedState = await StorageService.loadMessengerState();
      if (storedState) {
        try {
          const restoredMessenger = await Messenger.deserialize(
            storedState,
            this.messenger.caPublicKey,
            this.messenger.govPublicKey
          );

          if (restoredMessenger.username === username) {
            console.log('Restored previous session for', username);
            this.messenger = restoredMessenger;
            this.currentUser = username;

            const pubKeyJson = await cryptoKeyToJSON(this.messenger.EGKeyPair.pub);
            publicKeyToSend = pubKeyJson;
          }
        } catch (e) {
          console.warn('Failed to restore session:', e);
        }
      }
    }

    // 2. Start fresh if no session was restored (currentUser not set)
    if (!this.currentUser) {
      // Generate certificate
      certificate = await this.messenger.generateCertificate(username);
      this.currentUser = username;
      publicKeyToSend = certificate.publicKey;

      // Save state
      if (StorageService.isInitialized()) {
        try {
          await StorageService.saveMessengerState(await this.messenger.serialize());
        } catch (e) { console.error("Saving state failed", e); }
      }
    }

    // Register with server and wait for response
    return new Promise((resolve, reject) => {
      const onSuccess = (data) => {
        cleanup();

        // Log what the server returned regarding display name
        console.log('[Register Success] Server returned:', data);

        // Backup the new session to cloud immediately so it persists
        this.backupSession();

        // Resolve with certificate and returned display name
        resolve({
          username,
          publicKey: publicKeyToSend,
          displayName: data ? data.displayName : null
        });
      };

      const onError = (err) => {
        cleanup();
        reject(new Error(err.message || 'Registration failed'));
      };

      const cleanup = () => {
        if (this.socket) {
          this.socket.off('register_success', onSuccess);
          this.socket.off('error', onError);
        }
      };

      this.socket.on('register_success', onSuccess);
      this.socket.on('error', onError);

      // Explicitly send displayName only if it's truthy (prevent sending null/undefined explicitly if we want to update)
      // Actually backend checks "if (displayName)", so sending undefined/null is fine (it ignores it).
      // But let's log what we are sending.
      console.log(`[Register] Sending registration for ${username} with name: "${displayName || '(none)'}"`);
      console.log(`[Register] Payload debug - publicKey:`, publicKeyToSend ? 'PRESENT' : 'MISSING', publicKeyToSend);

      if (!publicKeyToSend) {
        cleanup();
        reject(new Error('Failed to generate public key (Key is null)'));
        return;
      }

      this.socket.emit('register', {
        username: username,
        publicKey: publicKeyToSend,
        displayName: displayName // Send display name if provided
      });

      // Timeout if no response
      setTimeout(() => {
        cleanup();
        reject(new Error('Registration timed out'));
      }, 5000);
    });
  }

  /**
   * Receive and store a certificate for a peer
   * @param {object} certificate - Certificate object
   * @param {ArrayBuffer} signature - Certificate signature
   */
  async receiveCertificate(certificate, signature) {
    if (!this.messenger) {
      throw new Error('ChatService not initialized. Call init() first.');
    }

    await this.messenger.receiveCertificate(certificate, signature);
  }

  /**
   * Get list of users from server
   */
  getUsers() {
    if (!this.socket || !this.connected) {
      throw new Error('Not connected to server');
    }

    this.socket.emit('get_users');
  }

  /**
   * Get the socket instance (for event listeners)
   * @returns {Socket|null} Socket.IO socket instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Send a secure message using Double Ratchet encryption
   * @param {string} text - Plaintext message to send
   * @param {string} recipient - Username of the recipient
   * @returns {Promise<void>}
   */
  async sendSecure(text, recipient) {
    if (!this.messenger) {
      throw new Error('ChatService not initialized. Call init() first.');
    }

    if (!this.socket || !this.connected) {
      throw new Error('Not connected to server');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Message text must be a non-empty string');
    }

    if (!recipient || typeof recipient !== 'string') {
      throw new Error('Recipient must be a non-empty string');
    }

    // Encrypt message using Messenger (Double Ratchet)
    const [header, ciphertext] = await this.messenger.sendMessage(recipient, text);

    // Save ratchet state
    if (StorageService.isInitialized()) {
      await StorageService.saveMessengerState(await this.messenger.serialize());
    }

    // Convert header for transmission (vGov is a CryptoKey, needs to be serialized)
    const vGovJWK = await cryptoKeyToJSON(header.vGov);

    const headerForTransmission = {
      receiverIV: this._arrayBufferToBase64(header.receiverIV),
      vGov: vGovJWK, // Serialized as JWK
      ivGov: this._arrayBufferToBase64(header.ivGov),
      cGov: this._arrayBufferToBase64(header.cGov),
      messageNumber: header.messageNumber,
      prevChainLength: header.prevChainLength
    };

    const ciphertextBase64 = this._arrayBufferToBase64(ciphertext);

    // Emit to socket
    this.socket.emit('send_message', {
      recipient: recipient,
      payload: {
        header: headerForTransmission,
        ciphertext: ciphertextBase64
      }
    });

    // Save message locally using StorageService
    if (StorageService.isInitialized()) {
      try {
        await StorageService.saveMessage(recipient, {
          text: text,
          direction: 'outgoing',
          timestamp: Date.now(),
          recipient: recipient
        });
      } catch (error) {
        console.error('Failed to save outgoing message:', error);
      }
      // Trigger Cloud Backup
      this.backupSession();
    }
  }

  /**
   * Handle received messages - decrypt, save locally, and notify handlers
   * @private
   */
  async _handleReceive(data) {
    if (!this.messenger) {
      console.error('Messenger not initialized, cannot decrypt message');
      return;
    }

    const { sender, payload } = data;
    console.log(`[DEBUG] Received raw message from ${sender}`, payload);

    try {
      // Convert header back - vGov needs to be imported as CryptoKey
      const { subtle } = window.crypto;

      console.log('[DEBUG] Importing vGov key...');
      const vGovKey = await subtle.importKey(
        'jwk',
        payload.header.vGov,
        { name: 'ECDH', namedCurve: 'P-384' },
        true,
        []
      );

      const header = {
        receiverIV: new Uint8Array(this._base64ToArrayBuffer(payload.header.receiverIV)),
        vGov: vGovKey, // Restored as CryptoKey
        ivGov: new Uint8Array(this._base64ToArrayBuffer(payload.header.ivGov)),
        cGov: new Uint8Array(this._base64ToArrayBuffer(payload.header.cGov)),
        messageNumber: payload.header.messageNumber,
        prevChainLength: payload.header.prevChainLength
      };

      console.log('[DEBUG] Header reconstructed. Decrypting with Messenger...');
      const ciphertext = this._base64ToArrayBuffer(payload.ciphertext);

      // Decrypt message using Messenger
      const plaintext = await this.messenger.receiveMessage(sender, [header, ciphertext]);
      console.log(`[DEBUG] Decryption successful: "${plaintext}"`);

      // Save ratchet state
      if (StorageService.isInitialized()) {
        await StorageService.saveMessengerState(await this.messenger.serialize());
      }

      // Save message locally
      if (StorageService.isInitialized()) {
        try {
          await StorageService.saveMessage(sender, {
            text: plaintext,
            direction: 'incoming',
            timestamp: Date.now(),
            sender: sender
          });
        } catch (error) {
          console.error('Failed to save incoming message:', error);
        }
      }

      // Trigger Cloud Backup
      this.backupSession();

      // Notify all message handlers
      this.messageHandlers.forEach(handler => {
        try {
          handler({
            sender: sender,
            text: plaintext,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    } catch (error) {
      console.error('Error decrypting message:', error);
      // Notify handlers of error
      this.messageHandlers.forEach(handler => {
        try {
          handler({
            sender: sender,
            error: error.message || 'Decryption failed',
            timestamp: Date.now()
          });
        } catch (handlerError) {
          console.error('Error in message handler:', handlerError);
        }
      });
    }
  }

  /**
   * Register a callback to handle incoming messages
   * @param {Function} handler - Function to call when a message is received
   * @returns {Function} Unregister function
   */
  onReceive(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    this.messageHandlers.push(handler);

    // Return unregister function
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Convert ArrayBuffer to base64 string
   * @private
   */
  _arrayBufferToBase64(buffer) {
    if (buffer instanceof Uint8Array) {
      const bytes = buffer;
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    }
    // Handle ArrayBuffer
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Convert base64 string to ArrayBuffer
   * @private
   */
  _base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * Check if connected to server
   * @returns {boolean}
   */
  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
  /**
   * Sync session to cloud (Backup)
   */
  async backupSession() {
    if (!this.socket || !this.connected || !this.currentUser) return;

    try {
      if (StorageService.isInitialized()) {
        const data = await StorageService.exportEncryptedData();
        if (data) {
          this.socket.emit('save_backup', {
            username: this.currentUser,
            keychain: data.keychain,
            digest: data.digest
          });
          // console.log('Session backed up to cloud');
        }
      }
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  /**
   * Restore session from cloud
   * @param {string} username 
   * @returns {Promise<boolean>} True if restored
   */
  async restoreSession(username) {
    if (!this.socket) this._connectSocket();

    return new Promise((resolve) => {
      // Wait for connection first
      if (!this.connected) {
        this.waitForConnection().then(() => doRestore()).catch(() => resolve(false));
      } else {
        doRestore();
      }

      const doRestore = () => {
        console.log(`Checking for cloud backup for ${username}...`);

        const onRestored = async (data) => {
          cleanup();
          if (data && data.keychain && data.digest) {
            await StorageService.importEncryptedData(username, data.keychain, data.digest);
            console.log('Cloud backup found and imported!');
            resolve(true);
          } else {
            resolve(false);
          }
        };

        const onNotFound = () => {
          cleanup();
          console.log('No cloud backup found.');
          resolve(false);
        };

        const cleanup = () => {
          this.socket.off('backup_restored', onRestored);
          this.socket.off('backup_not_found', onNotFound);
        };

        this.socket.on('backup_restored', onRestored);
        this.socket.on('backup_not_found', onNotFound);

        this.socket.emit('restore_backup', { username });

        // Timeout
        setTimeout(() => {
          cleanup();
          resolve(false);
        }, 3000);
      };
    });
  }
}

// Export singleton instance
export default new ChatService();


