import crypto from 'crypto';

// Standard AES-256-GCM encryption helper
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // IV length for GCM is 12 bytes
const TAG_LENGTH = 16; // Auth tag length is 16 bytes

// Derive a 32-byte key from the environment variable or a fallback
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-pvc-card-pro-encryption-key-fallback-32-chars';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plain text string.
 * Returns a hex-encoded string containing IV + Auth Tag + Ciphertext.
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted hex string.
 * Returns the original plain text, or null if decryption fails.
 */
export function decrypt(encryptedText: string): string | null {
  if (!encryptedText) return null;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return null;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return null;
  }
}
