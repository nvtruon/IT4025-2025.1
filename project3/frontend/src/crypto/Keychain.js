"use strict";

/********* External Imports ********/
import { stringToBuffer, bufferToString, encodeBuffer, decodeBuffer, getRandomBytes } from "./keychain-lib.js";

/********* Constants ********/
const PBKDF2_ITERATIONS = 100000;
const MAX_PASSWORD_LENGTH = 64;

/********* Implementation ********/
export class Keychain {
  constructor(kvs = {}, salt = null, masterBits = null, aesKey = null, domainKey = null) {
    this.data = {
      kvs: kvs,
      salt: salt,
    };
    this.secrets = {
      masterBits: masterBits,
      aesKey: aesKey,
      domainKey: domainKey
    };
  };

  /******************************************************************
   * Helper Functions
   ******************************************************************/

  static async _deriveMasterBits(password, saltBuf) {
    const subtle = window.crypto.subtle;
    const keyMaterial = await subtle.importKey(
      "raw",
      stringToBuffer(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    return await subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBuf,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
  }

  static async _importHmacKey(rawBuf) {
    const subtle = window.crypto.subtle;
    return await subtle.importKey(
      "raw",
      rawBuf,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }

  static async _importAesKey(rawBuf) {
    const subtle = window.crypto.subtle;
    return await subtle.importKey(
      "raw",
      rawBuf,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  static async _hmacRaw(hmacKey, dataString) {
    const subtle = window.crypto.subtle;
    const buf = stringToBuffer(dataString);
    return await subtle.sign("HMAC", hmacKey, buf);
  }

  static async _hmacBase64(hmacKey, dataString) {
    const raw = await this._hmacRaw(hmacKey, dataString);
    return encodeBuffer(raw);
  }

  _padPassword(buf) {
    const raw = new Uint8Array(buf);
    if (raw.length > MAX_PASSWORD_LENGTH) {
      throw new Error(`Password exceeds maximum length of ${MAX_PASSWORD_LENGTH} bytes`);
    }
    const out = new Uint8Array(MAX_PASSWORD_LENGTH);
    out.set(raw);
    return out.buffer;
  }

  _unpadPassword(buf) {
    const raw = new Uint8Array(buf);
    let end = raw.length;
    while (end > 0 && raw[end - 1] === 0) end--;
    return raw.slice(0, end).buffer;
  }

  /******************************************************************
   * Public API
   ******************************************************************/

  static async init(password) {
    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new Error("Password must be a non-empty string");
    }

    const saltBuf = getRandomBytes(16);
    const saltB64 = encodeBuffer(saltBuf);

    const masterBits = await this._deriveMasterBits(password, saltBuf);
    const masterHmacKey = await this._importHmacKey(masterBits);

    const encRaw = await this._hmacRaw(masterHmacKey, "enc");
    const domainRaw = await this._hmacRaw(masterHmacKey, "domain");

    const aesKey = await this._importAesKey(encRaw);
    const domainKey = await this._importHmacKey(domainRaw);

    return new Keychain({}, saltB64, masterBits, aesKey, domainKey);
  }

  static async load(password, repr, trustedDataCheck) {
    if (!password || typeof password !== 'string') {
      throw new Error("Password must be a non-empty string");
    }

    if (!repr || typeof repr !== 'string') {
      throw new Error("Invalid representation data");
    }

    let obj;
    try {
      obj = JSON.parse(repr);
    } catch (e) {
      throw new Error("Failed to parse keychain data");
    }

    /* integrity check — must THROW on mismatch */
    const subtle = window.crypto.subtle;
    if (trustedDataCheck) {
      const digest = await subtle.digest("SHA-256", stringToBuffer(repr));
      const digestB64 = encodeBuffer(digest);
      if (digestB64 !== trustedDataCheck) {
        throw new Error("Integrity check failed - data may have been tampered with");
      }
    }

    if (!obj.salt) {
      throw new Error("Invalid keychain format: missing salt");
    }

    const saltBuf = decodeBuffer(obj.salt);

    /* derive keys */
    let masterBits;
    try {
      masterBits = await this._deriveMasterBits(password, saltBuf);
    } catch (e) {
      throw new Error("Failed to derive keys");
    }

    const masterHmacKey = await this._importHmacKey(masterBits);
    const encRaw = await this._hmacRaw(masterHmacKey, "enc");
    const domainRaw = await this._hmacRaw(masterHmacKey, "domain");

    const aesKey = await this._importAesKey(encRaw);
    const domainKey = await this._importHmacKey(domainRaw);

    /* password verification step */
    const keys = Object.keys(obj.kvs);
    if (keys.length > 0) {
      const lookup = keys[0];
      const rec = obj.kvs[lookup];
      try {
        await subtle.decrypt(
          {
            name: "AES-GCM",
            iv: decodeBuffer(rec.iv),
            additionalData: decodeBuffer(lookup)
          },
          aesKey,
          decodeBuffer(rec.ciphertext)
        );
      } catch {
        throw new Error("Incorrect password");
      }
    }

    return new Keychain(obj.kvs, obj.salt, masterBits, aesKey, domainKey);
  }

  async dump() {
    const data = {
      kvs: this.data.kvs,
      salt: this.data.salt
    };

    const repr = JSON.stringify(data);
    const subtle = window.crypto.subtle;
    const digest = await subtle.digest("SHA-256", stringToBuffer(repr));
    const digestB64 = encodeBuffer(digest);

    return [repr, digestB64];
  }

  async get(name) {
    if (!name || typeof name !== 'string') {
      throw new Error("Name must be a non-empty string");
    }

    const subtle = window.crypto.subtle;
    const rawLookup = await Keychain._hmacRaw(this.secrets.domainKey, name);
    const lookup = encodeBuffer(rawLookup);

    if (!(lookup in this.data.kvs)) return null;

    const rec = this.data.kvs[lookup];

    try {
      const pt = await subtle.decrypt(
        {
          name: "AES-GCM",
          iv: decodeBuffer(rec.iv),
          additionalData: rawLookup
        },
        this.secrets.aesKey,
        decodeBuffer(rec.ciphertext)
      );

      const unpadded = this._unpadPassword(pt);
      return bufferToString(unpadded);
    } catch (e) {
      throw new Error(`Failed to decrypt password for '${name}'`);
    }
  }

  async set(name, value) {
    if (!name || typeof name !== 'string') {
      throw new Error("Name must be a non-empty string");
    }

    if (!value || typeof value !== 'string') {
      throw new Error("Value must be a non-empty string");
    }

    const subtle = window.crypto.subtle;
    const rawLookup = await Keychain._hmacRaw(this.secrets.domainKey, name);
    const lookup = encodeBuffer(rawLookup);

    const ptBuf = stringToBuffer(value);
    const padded = this._padPassword(ptBuf);

    const iv = getRandomBytes(12);

    const ciphertext = await subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
        additionalData: rawLookup
      },
      this.secrets.aesKey,
      padded
    );

    this.data.kvs[lookup] = {
      iv: encodeBuffer(iv),
      ciphertext: encodeBuffer(ciphertext)
    };
  }

  async remove(name) {
    if (!name || typeof name !== 'string') {
      throw new Error("Name must be a non-empty string");
    }

    const subtle = window.crypto.subtle;
    const rawLookup = await Keychain._hmacRaw(this.secrets.domainKey, name);
    const lookup = encodeBuffer(rawLookup);

    if (lookup in this.data.kvs) {
      delete this.data.kvs[lookup];
      return true;
    }

    return false;
  }
}

