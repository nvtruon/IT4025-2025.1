# Mô tả ngắn gọn cách xây dựng các hàm

## 1) Thư viện crypto: lib.js
- bufferToString(arr): ArrayBuffer -> string bằng Buffer.from(arr).toString().
- genRandomSalt(len): tạo IV ngẫu nhiên Uint8Array(len) qua crypto.getRandomValues.
- cryptoKeyToJSON(key): export CryptoKey sang JWK JSON (subtle.exportKey).
- generateEG(): sinh cặp khóa ECDH P-384 (public/private).
- computeDH(sec, pub): derive shared secret bằng ECDH, re-derive ra HMAC key (dùng cho HKDF/HMAC).
- verifyWithECDSA(pub, msg, sig): verify chữ ký ECDSA P-384 SHA-384.
- HMACtoAESKey(key, data, exportRaw?):
  - sign(HMAC) data để có bytes.
  - import bytes thành AES-GCM key; nếu exportRaw=true thì exportKey('raw').
- HMACtoHMACKey(key, data):
  - sign(HMAC) data -> bytes, import thành HMAC key mới (chuỗi ratchet HMAC).
- HKDF(inputKey, salt, infoStr):
  - sign('0') để có seed HKDF; import 'HKDF' -> deriveKey với salt1/salt2 -> trả về 2 HMAC keys.
- encryptWithGCM(key, plaintext, iv, aad=''):
  - AES-GCM subtle.encrypt với additionalData = Buffer.from(aad).
- decryptWithGCM(key, ciphertext, iv, aad=''):
  - AES-GCM subtle.decrypt với additionalData = Buffer.from(aad).
- generateECDSA(): sinh cặp khóa ECDSA P-384.
- signWithECDSA(sec, msg): ký ECDSA SHA-384.

## 2) Ứng dụng nhắn tin: MessengerClient
- generateCertificate(username):
  - generateEG() lưu cặp khóa người dùng, export public key (JWK) + username thành certificate.
- receiveCertificate(cert, signature):
  - verify chữ ký của CA; import JWK thành CryptoKey ECDH; lưu trong this.certs.
- sendMessage(name, plaintext):
  - Khởi tạo lần đầu: tạo khóa tạm (ephemeral), computeDH với khóa tĩnh nhận -> HKDF('ratchet-init') -> rootKey + sendChainKey.
  - Nếu chỉ nhận trước khi gửi: tạo khóa tạm mới và derive sendChain từ DH(local_ephemeral, remote_static).
  - Derive messageKey = HMACtoAESKey(sendChainKey, counter); export raw để mã hóa cho chính phủ; cập nhật sendChainKey = HMACtoHMACKey(...).
  - Tạo receiverIV; mã hóa khóa message cho chính phủ: govKey = HMACtoAESKey(DH(local_ephemeral, govPub), const), encrypt(messageKeyRaw, ivGov).
  - Header: chứa receiverIV, vGov (khóa tạm gửi), ivGov, cGov, messageNumber, prevChainLength.
  - Mã hóa nội dung bằng AES-GCM với authenticatedData = JSON.stringify(header).
- receiveMessage(name, [header, ciphertext]):
  - Lần đầu: derive rootKey + receiveChainKey = HKDF(DH(local_static, remote_ephemeral), 'ratchet-init').
  - Chống replay: messageId gắn vGov + messageNumber.
  - Nếu vGov mới: trước khi ratchet, sinh và lưu skipped keys đến prevChainLength; sau đó DH ratchet:
    - receiveChain: DH(local_static, remote_ephemeral) -> HKDF('ratchet-step').
    - sendChain: generateEG(); DH(local_ephemeral, remote_static) -> HKDF('ratchet-step').
  - Nếu có skipped key khớp: dùng để giải mã với authenticatedData = header.
  - Bù khoảng trống: sinh skipped keys cho các số nhỏ hơn hiện tại (lưu theo vGov).
  - Giải mã message hiện tại với authenticatedData = header; tăng bộ đếm và cập nhật chain.
- dhRatchet(name, newEphemeralPublicKey):
  - Cập nhật prevSendCounter; derive receiveChain từ DH(local_static, remote_ephemeral).
  - Tạo khóa tạm gửi mới; derive sendChain từ DH(local_ephemeral, remote_static).

## 3) Lưu ý quan trọng
- IV/BufferSource: receiverIV, ivGov, cGov dùng Uint8Array trong header để SubtleCrypto chấp nhận.
- authenticatedData: luôn truyền JSON.stringify(header) khi mã hóa/giải mã nội dung.
- skippedKeys: lưu theo khóa gồm tên + vGov + messageNumber để tránh xung đột qua các bước ratchet.
- Replay: theo dõi messageId (gồm vGov) để phát hiện lặp lại.
