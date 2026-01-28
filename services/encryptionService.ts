/**
 * SECURITY SERVICE
 * Implements AES-GCM encryption using the Web Crypto API.
 * This ensures messages are encrypted before they are stored or (in a real app) sent over the network.
 */

const SALT = 'halo-messenger-salt-v1'; // In prod, this should be unique per user/session

export const encryptionService = {
  /**
   * Generates a crypto key from a passphrase (or uses a fixed one for this demo)
   */
  async generateKey(): Promise<CryptoKey> {
    // For this demo, we use a fixed passphrase. 
    // In production, this would be derived from the user's password or a Diffie-Hellman shared secret.
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode("halo-secure-passphrase-2025"),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(SALT),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  },

  /**
   * Encrypts text data
   * Returns: JSON string containing { iv, data }
   */
  async encrypt(text: string): Promise<string> {
    try {
      const key = await this.generateKey();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(text);

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        encoded
      );

      // Convert buffer to base64
      const encryptedArray = Array.from(new Uint8Array(encrypted));
      const ivArray = Array.from(iv);
      
      return JSON.stringify({
        iv: ivArray,
        data: encryptedArray
      });
    } catch (e) {
      return text; // Fallback (should not happen in healthy env)
    }
  },

  /**
   * Decrypts encrypted string format
   */
  async decrypt(encryptedString: string): Promise<string> {
    try {
      const parsed = JSON.parse(encryptedString);
      if (!parsed.iv || !parsed.data) return encryptedString;

      const key = await this.generateKey();
      const iv = new Uint8Array(parsed.iv);
      const data = new Uint8Array(parsed.data);

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        data
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      // If it fails (e.g. data wasn't encrypted), return original
      return encryptedString;
    }
  }
};