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
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      this.connected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Handle incoming messages
    this.socket.on('message', async (data) => {
      await this._handleReceive(data);
    });

    // Handle other events
    this.socket.on('register_success', () => {
      console.log('Registration successful');
    });

    this.socket.on('users_list', (data) => {
      console.log('Users list:', data.users);
    });

    this.socket.on('send_success', () => {
      console.log('Message sent successfully');
    });
  }

  /**
   * Register user with the server
   * @param {string} username - Username to register
   * @returns {Promise<object>} Certificate object
   */
  async register(username) {
    if (!this.messenger) {
      throw new Error('ChatService not initialized. Call init() first.');
    }

    if (!this.socket || !this.connected) {
      throw new Error('Not connected to server');
    }

    // Generate certificate
    const certificate = await this.messenger.generateCertificate(username);
    this.currentUser = username;

    // Register with server
    this.socket.emit('register', {
      username: username,
      publicKey: certificate.publicKey
    });

    return certificate;
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

    try {
      // Convert header back - vGov needs to be imported as CryptoKey
      const { subtle } = window.crypto;
      const vGovKey = await subtle.importKey(
        'jwk',
        payload.header.vGov,
        { name: 'ECDH', namedCurve: 'P-384' },
        true,
        []
      );

      const header = {
        receiverIV: this._base64ToArrayBuffer(payload.header.receiverIV),
        vGov: vGovKey, // Restored as CryptoKey
        ivGov: this._base64ToArrayBuffer(payload.header.ivGov),
        cGov: this._base64ToArrayBuffer(payload.header.cGov),
        messageNumber: payload.header.messageNumber,
        prevChainLength: payload.header.prevChainLength
      };
      const ciphertext = this._base64ToArrayBuffer(payload.ciphertext);

      // Decrypt message using Messenger
      const plaintext = await this.messenger.receiveMessage(sender, [header, ciphertext]);

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
            error: error.message,
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
}

// Export singleton instance
export default new ChatService();

