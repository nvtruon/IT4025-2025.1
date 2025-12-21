'use strict'

/** Imports: các hàm crypto cần dùng */
import {
  /* Các hàm sau đây là tất cả các hàm mã hóa cơ bản
  mà bạn nên cần cho bài tập này.
  Xem lib.js để biết chi tiết về cách sử dụng. */
  bufferToString,
  genRandomSalt,
  generateEG, // async
  computeDH, // async
  verifyWithECDSA, // async
  HMACtoAESKey, // async
  HMACtoHMACKey, // async
  HKDF, // async
  encryptWithGCM, // async
  decryptWithGCM,
  cryptoKeyToJSON, // async
  govEncryptionDataStr
} from './lib.js'

/** ******* Implementation ********/

export class Messenger {
  constructor(certAuthorityPublicKey, govPublicKey) {
    // giữ khóa CA, gov + trạng thái kết nối
    this.caPublicKey = certAuthorityPublicKey
    this.govPublicKey = govPublicKey
    this.conns = {}
    this.certs = {}
    this.EGKeyPair = {}
    this.username = null
  }

  /**
   * Tạo một certificate để lưu trữ với certificate authority.
   * Certificate phải chứa trường "username".
   *
   * Đối số:
   *   username: string
   *
   * Kiểu trả về: certificate object/dictionary
   */
  async generateCertificate(username) {
    // tạo certificate kèm public key
    const keypair = await generateEG()
    this.EGKeyPair = keypair
    this.username = username

    const pubKeyJson = await cryptoKeyToJSON(keypair.pub)
    
    const certificate = {
      username: username,
      publicKey: pubKeyJson
    }
    
    return certificate
  }

  /**
   * Nhận và lưu trữ certificate của người dùng khác.
   */
  async receiveCertificate(certificate, signature) {
    // xác minh chữ ký CA rồi import khóa
    const certString = JSON.stringify(certificate)
    
    const isValid = await verifyWithECDSA(this.caPublicKey, certString, signature)
    if (!isValid) {
      throw new Error('Invalid certificate signature')
    }

    const { subtle } = window.crypto
    const publicKey = await subtle.importKey(
      'jwk',
      certificate.publicKey,
      { name: 'ECDH', namedCurve: 'P-384' },
      true,
      []
    )

    this.certs[certificate.username] = {
      username: certificate.username,
      publicKey: publicKey
    }
  }

  /**
   * Tạo message để gửi đến người dùng khác.
   */
  async sendMessage(name, plaintext) {
    // khởi tạo kết nối lần đầu
    if (!this.certs[name]) {
      throw new Error('Certificate not found for recipient')
    }
    const recipientCert = this.certs[name]

    if (!this.conns[name]) {
      const ephemeralKeypair = await generateEG()
      const sharedSecret = await computeDH(ephemeralKeypair.sec, recipientCert.publicKey)
      
      const [rootKey, sendChainKey] = await HKDF(sharedSecret, sharedSecret, 'ratchet-init')
      
      this.conns[name] = {
        rootKey: rootKey,
        sendChainKey: sendChainKey,
        receiveChainKey: null,
        sendRatchetKey: ephemeralKeypair,
        receiveRatchetKey: null,
        sendCounter: 0,
        receiveCounter: 0,
        prevSendCounter: 0,
        skippedKeys: new Map(),
        receivedMessages: new Set()
      }
    }

    const conn = this.conns[name]
    
    // tạo sendChain nếu bên kia gửi trước
    if (!conn.sendChainKey) {
      const newSendRatchetKey = await generateEG()
      // Dùng khóa CÔNG KHAI TĨNH của bên nhận (recipientCert.publicKey), không dùng khóa tạm đã nhận
      const newDhSecret = await computeDH(
        newSendRatchetKey.sec,
        recipientCert.publicKey
      )
      const [newRootKey, newSendChainKey] = await HKDF(
        conn.rootKey,
        newDhSecret,
        'ratchet-step'
      )
      
      conn.rootKey = newRootKey
      conn.sendChainKey = newSendChainKey
      conn.sendRatchetKey = newSendRatchetKey
      conn.sendCounter = 0
    }
    
    const messageNumber = conn.sendCounter
    conn.sendCounter++

    // Sinh khóa message TRƯỚC khi cập nhật chain
    const messageKey = await HMACtoAESKey(conn.sendChainKey, messageNumber.toString())
    const { subtle } = window.crypto
    const messageKeyRaw = await subtle.exportKey('raw', messageKey)
    conn.sendChainKey = await HMACtoHMACKey(conn.sendChainKey, 'chain-update')
    const receiverIV = genRandomSalt(16)

    // Government encryption
    const govSharedSecret = await computeDH(conn.sendRatchetKey.sec, this.govPublicKey)
    const govKey = await HMACtoAESKey(govSharedSecret, govEncryptionDataStr)
    const ivGov = genRandomSalt(16)
    const cGov = await encryptWithGCM(govKey, messageKeyRaw, ivGov)

    // Tạo header TRƯỚC khi mã hóa plaintext; dùng Uint8Array cho receiverIV
    const header = {
      receiverIV: new Uint8Array(receiverIV),
      vGov: conn.sendRatchetKey.pub,
      ivGov: new Uint8Array(ivGov),
      cGov: new Uint8Array(cGov),
      messageNumber: messageNumber,
      prevChainLength: conn.prevSendCounter
    }

    // Mã hóa nội dung với header làm dữ liệu xác thực (authenticatedData)
    const ciphertext = await encryptWithGCM(
      messageKey,
      plaintext,
      receiverIV,
      JSON.stringify(header)
    )

    return [header, ciphertext]
  }

  /**
   * Giải mã một message nhận được từ người dùng khác.
   */
  async receiveMessage(name, [header, ciphertext]) {
    // thiết lập kết nối nếu lần đầu nhận
    const messageNumber = header.messageNumber
    const receiverIV = new Uint8Array(header.receiverIV)
    const ephemeralPublicKey = header.vGov

    if (!this.conns[name]) {
      const sharedSecret = await computeDH(this.EGKeyPair.sec, ephemeralPublicKey)
      const [rootKey, receiveChainKey] = await HKDF(sharedSecret, sharedSecret, 'ratchet-init')
      
      this.conns[name] = {
        rootKey: rootKey,
        sendChainKey: null,
        receiveChainKey: receiveChainKey,
        sendRatchetKey: null,
        receiveRatchetKey: ephemeralPublicKey,
        sendCounter: 0,
        receiveCounter: 0,
        prevSendCounter: 0,
        skippedKeys: new Map(),
        receivedMessages: new Set()
      }
    }

    const conn = this.conns[name]

    // tạo id chống replay (gắn khóa ratchet)
    const vGovKeyJsonStr = JSON.stringify(await cryptoKeyToJSON(ephemeralPublicKey))

    // Dùng vGov trong messageId để tránh trùng sau các lần ratchet
    const messageId = `${name}-${vGovKeyJsonStr}-${messageNumber}`
    if (conn.receivedMessages.has(messageId)) {
      throw new Error('Replay attack detected')
    }

    // Check if we need to perform DH ratchet (new ephemeral key)
    const currentKeyJson = conn.receiveRatchetKey ? await cryptoKeyToJSON(conn.receiveRatchetKey) : null
    const newKeyJson = await cryptoKeyToJSON(ephemeralPublicKey)
    if (JSON.stringify(currentKeyJson) !== JSON.stringify(newKeyJson)) {
      // Lưu các khóa bị bỏ lỡ của chain cũ trước khi ratchet
      if (conn.receiveRatchetKey && header.prevChainLength > conn.receiveCounter) {
        const oldVGovKeyJsonStr = JSON.stringify(await cryptoKeyToJSON(conn.receiveRatchetKey))
        while (conn.receiveCounter < header.prevChainLength) {
          const skipMessageKey = await HMACtoAESKey(conn.receiveChainKey, conn.receiveCounter.toString())
          const skipKeyId = `${name}-${oldVGovKeyJsonStr}-${conn.receiveCounter}`
          conn.skippedKeys.set(skipKeyId, skipMessageKey)
          conn.receiveChainKey = await HMACtoHMACKey(conn.receiveChainKey, 'chain-update')
          conn.receiveCounter++
        }
      }
      // Thực hiện DH ratchet chuyển sang khóa tạm mới
      await this.dhRatchet(name, ephemeralPublicKey)
    }

    // Tra cứu khóa bỏ lỡ (skipped key) với ID có vGov
    const skippedKeyId = `${name}-${vGovKeyJsonStr}-${messageNumber}`
    if (conn.skippedKeys.has(skippedKeyId)) {
      const messageKey = conn.skippedKeys.get(skippedKeyId)
      conn.skippedKeys.delete(skippedKeyId)
      const plaintextBuffer = await decryptWithGCM(
        messageKey,
        ciphertext,
        receiverIV,
        JSON.stringify(header)
      )
      conn.receivedMessages.add(messageId)
      return bufferToString(plaintextBuffer)
    }

    // tạo và lưu các skipped key cho khoảng trống
    while (conn.receiveCounter < messageNumber) {
      const skipMessageKey = await HMACtoAESKey(conn.receiveChainKey, conn.receiveCounter.toString())
      const skipKeyId = `${name}-${vGovKeyJsonStr}-${conn.receiveCounter}`
      conn.skippedKeys.set(skipKeyId, skipMessageKey)
      conn.receiveChainKey = await HMACtoHMACKey(conn.receiveChainKey, 'chain-update')
      conn.receiveCounter++
    }

    // sinh khóa message hiện tại rồi giải mã
    const messageKey = await HMACtoAESKey(conn.receiveChainKey, messageNumber.toString())
    conn.receiveChainKey = await HMACtoHMACKey(conn.receiveChainKey, 'chain-update')
    conn.receiveCounter++
    // Giải mã với authenticatedData là header
    const plaintextBuffer = await decryptWithGCM(messageKey, ciphertext, receiverIV, JSON.stringify(header))
    conn.receivedMessages.add(messageId)
    return bufferToString(plaintextBuffer)
  }

  /**
   * ✅ DH Ratchet - Khi nhận ephemeral public key mới
   */
  async dhRatchet(name, newEphemeralPublicKey) {
    // Bước ratchet: cập nhật root + receiveChain + tạo sendChain mới
    const conn = this.conns[name]
    
    // Lưu bộ đếm send hiện tại trước khi ratchet
    conn.prevSendCounter = conn.sendCounter
    // Cập nhật receive chain bằng DH(khóa riêng tĩnh local, khóa tạm mới remote)
    const dhSecret = await computeDH(this.EGKeyPair.sec, newEphemeralPublicKey)
    const [newRootKey, newReceiveChainKey] = await HKDF(
      conn.rootKey,
      dhSecret,
      'ratchet-step'
    )
    
    conn.rootKey = newRootKey
    conn.receiveChainKey = newReceiveChainKey
    conn.receiveRatchetKey = newEphemeralPublicKey
    conn.receiveCounter = 0

    // Tạo khóa tạm mới để gửi và cập nhật send chain bằng DH(khóa tạm mới local, khóa tĩnh remote)
    const newSendRatchetKey = await generateEG()
    const peerStaticPub = this.certs[name].publicKey
    const newDhSecret = await computeDH(
      newSendRatchetKey.sec,
      peerStaticPub
    )
    const [newRootKey2, newSendChainKey] = await HKDF(
      conn.rootKey,
      newDhSecret,
      'ratchet-step'
    )
    
    conn.rootKey = newRootKey2
    conn.sendChainKey = newSendChainKey
    conn.sendRatchetKey = newSendRatchetKey
    conn.sendCounter = 0
  }
}

