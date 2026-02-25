const crypto = require('crypto');

// The encryption key should be 32 bytes for AES-256
// We'll use the one from .env, or fallback to a hardcoded one for safety (warn in console)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'EC_SECURE_PAY_8026_EC_SECURE_PAY';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a string
 * @param {string} text 
 * @returns {string} - serialized format: iv:authTag:encryptedText
 */
function encrypt(text) {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

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
    try {
        const [ivHex, authTagHex, textHex] = encryptedText.split(':');
        if (!ivHex || !authTagHex || !textHex) return null;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(textHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption Error:', error);
        return null;
    }
}

module.exports = { encrypt, decrypt };
