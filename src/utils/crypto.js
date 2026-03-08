const crypto = require('crypto');

// The encryption key should be 32 bytes for AES-256
// We'll use the one from .env, or fallback to a hardcoded one for safety (warn in console)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'EC_SECURE_PAY_8026_EC_SECURE_PAY';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const AUTH_TAG_LENGTH = 16;

const FALLBACK_KEY = 'EC_SECURE_PAY_8026_EC_SECURE_PAY';

/**
 * Encrypts a string
 * @param {string} text 
 * @returns {string} - serialized format: iv:authTag:encryptedText
 */
function encrypt(text) {
    if (!text) return null;
    try {
        const key = process.env.ENCRYPTION_KEY || FALLBACK_KEY;
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag().toString('hex');

        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('Encryption Error:', error);
        return null;
    }
}

/**
 * Decrypts a string
 * @param {string} encryptedText - serialized format: iv:authTag:encryptedText
 * @returns {string} - raw text
 */
function decrypt(encryptedText) {
    if (!encryptedText) return null;
    if (!encryptedText.includes(':')) return encryptedText; // Probably plain text

    const tryDecryptWithKey = (text, key) => {
        try {
            const [ivHex, authTagHex, textHex] = text.split(':');
            if (!ivHex || !authTagHex || !textHex) return null;

            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);

            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(textHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            return null;
        }
    };

    // 1. Try with current ENV key
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey) {
        const result = tryDecryptWithKey(encryptedText, envKey);
        if (result) return result;
    }

    // 2. Try with Fallback key (for legacy data)
    const fallbackResult = tryDecryptWithKey(encryptedText, FALLBACK_KEY);
    if (fallbackResult) return fallbackResult;

    // 3. Fallback to raw text if it doesn't look like encrypted (no colons) 
    // but here we know it has colons. Return null to let the controller handle it.
    return null;
}

module.exports = { encrypt, decrypt };
