import crypto from 'crypto';

// Key must be 32 bytes (256 bits). Store as 64-char hex in env.
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;  // 96-bit IV recommended for GCM

function getKey(): Buffer {
  const hex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    // In development, derive a deterministic key. In production this MUST be set.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('INTEGRATION_ENCRYPTION_KEY must be set in production (64-char hex)');
    }
    return crypto.createHash('sha256').update('schoolos-dev-integration-key').digest();
  }
  return Buffer.from(hex, 'hex');
}

export const credentialService = {
  encrypt(plaintext: string): string {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: iv(hex):authTag(hex):ciphertext(hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  },

  decrypt(ciphertext: string): string {
    const key = getKey();
    const [ivHex, authTagHex, dataHex] = ciphertext.split(':');
    if (!ivHex || !authTagHex || !dataHex) throw new Error('Invalid encrypted credential format');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const data = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(data) + decipher.final('utf8');
  },

  encryptObject(obj: Record<string, unknown>): string {
    return credentialService.encrypt(JSON.stringify(obj));
  },

  decryptObject(ciphertext: string): Record<string, unknown> {
    return JSON.parse(credentialService.decrypt(ciphertext));
  },
};
