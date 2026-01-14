'use strict'

// Browser-compatible version - uses window.crypto instead of node:crypto
const { subtle } = window.crypto

// hằng dùng sinh dữ liệu derive cho chính phủ
export const govEncryptionDataStr = 'AES-GENERATION'

// Helper functions for browser compatibility
function bufferToString(arr) {
  // ArrayBuffer/Uint8Array -> string
  return new TextDecoder().decode(arr)
}

export function genRandomSalt(len = 16) {
  // tạo IV ngẫu nhiên
  return window.crypto.getRandomValues(new Uint8Array(len))
}

export async function cryptoKeyToJSON(cryptoKey) {
  // export CryptoKey -> JWK JSON
  const key = await subtle.exportKey('jwk', cryptoKey)
  return key
}

export async function generateEG() {
  // tạo cặp khóa ECDH
  const keypair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-384' }, true, ['deriveKey', 'deriveBits'])
  const keypairObject = { pub: keypair.publicKey, sec: keypair.privateKey }
  return keypairObject
}

export async function computeDH(myPrivateKey, theirPublicKey) {
  // derive shared secret -> HMAC key
  return await subtle.deriveKey({ name: 'ECDH', public: theirPublicKey }, myPrivateKey,
    { name: 'HMAC', hash: 'SHA-256', length: 256 }, true, ['sign', 'verify'])
}

export async function verifyWithECDSA(publicKey, message, signature) {
  // xác minh chữ ký
  // Convert string to Uint8Array for browser
  const messageBuf = typeof message === 'string' ? new TextEncoder().encode(message) : message
  const sigBuf = signature instanceof ArrayBuffer ? new Uint8Array(signature) : signature
  return await subtle.verify({ name: 'ECDSA', hash: { name: 'SHA-384' } }, publicKey, sigBuf, messageBuf)
}

export async function HMACtoAESKey(key, data, exportToArrayBuffer = false) {
  // Tạo khóa AES từ HMAC (có tùy chọn export raw)
  // key là một CryptoKey
  // data là một string

  // đầu tiên tính toán output HMAC
  const dataBuf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hmacBuf = await subtle.sign({ name: 'HMAC' }, key, dataBuf)

  // Sau đó, re-import với derivedKeyAlgorithm AES-GCM
  const out = await subtle.importKey('raw', hmacBuf, 'AES-GCM', true, ['encrypt', 'decrypt'])

  // Nếu exportToArrayBuffer = true thì xuất khóa dạng ArrayBuffer (phục vụ lưu trữ / mã hóa thêm)
  if (exportToArrayBuffer) {
    return await subtle.exportKey('raw', out)
  }

  // ngược lại, export dưới dạng cryptoKey
  return out
}

export async function HMACtoHMACKey(key, data) {
  // Tạo khóa HMAC kế tiếp từ khóa HMAC hiện tại
  // key là một CryptoKey
  // data là một string

  // đầu tiên tính toán output HMAC
  const dataBuf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hmacBuf = await subtle.sign({ name: 'HMAC' }, key, dataBuf)
  // Sau đó, re-import với derivedKeyAlgorithm HMAC
  return await subtle.importKey('raw', hmacBuf, { name: 'HMAC', hash: 'SHA-256', length: 256 }, true, ['sign'])
}

export async function HKDF(inputKey, salt, infoStr) {
  // HKDF tạo hai khóa HMAC đầu ra [k1, k2]
  // inputKey là một cryptoKey với derivedKeyAlgorithm HMAC
  // salt là một cryptoKey thứ hai với derivedKeyAlgorithm HMAC
  // infoStr là một string (có thể là một hằng số tùy ý ví dụ: "ratchet-str")
  // trả về một mảng gồm hai output HKDF [hkdfOut1, hkdfOut2]

  // vì derivedKeyAlgorithm của inputKey là HMAC, chúng ta cần sign một hằng số tùy ý và
  // sau đó re-import dưới dạng một CryptoKey với derivedKeyAlgorithm HKDF
  const zeroBuf = new TextEncoder().encode('0')
  const inputKeyBuf = await subtle.sign({ name: 'HMAC' }, inputKey, zeroBuf)
  const inputKeyHKDF = await subtle.importKey('raw', inputKeyBuf, 'HKDF', false, ['deriveKey'])

  // Tạo salt tạm cho hai lượt derive
  const salt1Buf = new TextEncoder().encode('salt1')
  const salt2Buf = new TextEncoder().encode('salt2')
  const salt1 = await subtle.sign({ name: 'HMAC' }, salt, salt1Buf)
  const salt2 = await subtle.sign({ name: 'HMAC' }, salt, salt2Buf)

  // Derive khóa thứ nhất
  const infoBuf = new TextEncoder().encode(infoStr)
  const hkdfOut1 = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: salt1, info: infoBuf },
    inputKeyHKDF, { name: 'HMAC', hash: 'SHA-256', length: 256 }, true, ['sign'])

  // Derive khóa thứ hai
  const hkdfOut2 = await subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: salt2, info: infoBuf },
    inputKeyHKDF, { name: 'HMAC', hash: 'SHA-256', length: 256 }, true, ['sign'])

  return [hkdfOut1, hkdfOut2]
}

export async function encryptWithGCM(key, plaintext, iv, authenticatedData = '') {
  // Mã hóa AES-GCM (có thể kèm dữ liệu xác thực ngoài)
  // key là một cryptoKey với derivedKeyAlgorithm AES-GCM
  // plaintext là một string hoặc ArrayBuffer của dữ liệu bạn muốn mã hóa.
  // iv được dùng cho mã hóa và phải là duy nhất cho mỗi lần sử dụng cùng một key
  // dùng hàm genRandomSalt() để tạo iv và lưu nó trong header để giải mã
  // authenticatedData là một đối số string tùy chọn
  // trả về ciphertext dưới dạng ArrayBuffer
  // authenticatedData không được mã hóa vào ciphertext, nhưng nó sẽ
  // không thể giải mã ciphertext trừ khi nó được truyền vào.
  // (Nếu không có authenticatedData được truyền khi mã hóa, thì nó không
  // cần thiết khi giải mã.)
  const plaintextBuf = typeof plaintext === 'string' ? new TextEncoder().encode(plaintext) : plaintext
  const authDataBuf = typeof authenticatedData === 'string' ? new TextEncoder().encode(authenticatedData) : authenticatedData
  return await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: authDataBuf }, key, plaintextBuf)
}

export async function decryptWithGCM(key, ciphertext, iv, authenticatedData = '') {
  // Giải mã AES-GCM (phải khớp authenticatedData nếu đã dùng khi mã hóa)
  // key là một cryptoKey với derivedKeyAlgorithm AES-GCM
  // ciphertext là một ArrayBuffer
  // iv được dùng trong quá trình mã hóa là cần thiết để giải mã
  // iv nên được truyền qua header của message
  // authenticatedData là tùy chọn, nhưng nếu nó được truyền khi
  // mã hóa, nó phải được truyền bây giờ, nếu không việc giải mã sẽ thất bại.
  // trả về plaintext dưới dạng ArrayBuffer nếu thành công
  // throw exception nếu giải mã thất bại (key sai, phát hiện giả mạo, v.v.)
  const authDataBuf = typeof authenticatedData === 'string' ? new TextEncoder().encode(authenticatedData) : authenticatedData
  return await subtle.decrypt({ name: 'AES-GCM', iv, additionalData: authDataBuf }, key, ciphertext)
}

export async function generateECDSA() {
  // Sinh cặp khóa ECDSA (ký + verify)
  const keypair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-384' }, true, ['sign', 'verify'])
  const keypairObject = { pub: keypair.publicKey, sec: keypair.privateKey }
  return keypairObject
}

export async function signWithECDSA(privateKey, message) {
  // Ký ECDSA trên chuỗi message
  const messageBuf = typeof message === 'string' ? new TextEncoder().encode(message) : message
  return await subtle.sign({ name: 'ECDSA', hash: { name: 'SHA-384' } }, privateKey, messageBuf)
}

// Export bufferToString for use in other files
export { bufferToString }

export async function digest(message) {
  // SHA-256 hash
  const msgBuf = typeof message === 'string' ? new TextEncoder().encode(message) : message
  const hashBuf = await subtle.digest('SHA-256', msgBuf)
  // return as hex string
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

