const mongoose = require('mongoose');
const Technician = require('./src/models/Technician');
const fs = require('fs');
require('dotenv').config();

const FALLBACK_KEY = 'EC_SECURE_PAY_8026_EC_SECURE_PAY';
const ENV_KEY = process.env.ENCRYPTION_KEY;

function decryptCustom(encryptedText, key) {
    if (!key) return null;
    try {
        const crypto = require('crypto');
        const [ivHex, authTagHex, textHex] = encryptedText.split(':');
        if (!ivHex || !authTagHex || !textHex) return null;

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(textHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch(e) {
        return null;
    }
}

function tryDecrypt(text) {
    if (!text) return { success: false, reason: 'empty' };
    if (!text.includes(':')) return { success: false, reason: 'plain_text', value: text };
    
    const d1 = decryptCustom(text, ENV_KEY);
    if (d1) return { success: true, key: 'env', value: d1 };

    const d2 = decryptCustom(text, FALLBACK_KEY);
    if (d2) return { success: true, key: 'fallback', value: d2 };

    return { success: false, reason: 'decryption_failed', raw: text };
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const techs = await Technician.find({});
    const results = techs.map(t => {
        const details = t.payment_details || {};
        const b = details.bank || {};
        
        return {
            name: t.name,
            id: t._id,
            method: details.method,
            bank: {
                account_number: tryDecrypt(b.account_number),
                ifsc_code: tryDecrypt(b.ifsc_code)
            }
        };
    }).filter(r => r.bank.account_number.reason !== 'empty' || r.method !== 'none');

    fs.writeFileSync('debug_crypto.json', JSON.stringify(results, null, 2));
    console.log('Results written to debug_crypto.json');
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
