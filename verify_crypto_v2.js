const mongoose = require('mongoose');
const Technician = require('./src/models/Technician');
require('dotenv').config();

const FALLBACK_KEY = 'EC_SECURE_PAY_8026_EC_SECURE_PAY';
const ENV_KEY = process.env.ENCRYPTION_KEY;

function tryDecrypt(text) {
    if (!text || !text.includes(':')) return { success: false, reason: 'plain_text' };
    
    // Try with ENV_KEY
    try {
        const d1 = decryptCustom(text, ENV_KEY);
        if (d1) return { success: true, key: 'env', value: d1 };
    } catch(e) {}

    // Try with FALLBACK_KEY
    try {
        const d2 = decryptCustom(text, FALLBACK_KEY);
        if (d2) return { success: true, key: 'fallback', value: d2 };
    } catch(e) {}

    return { success: false, reason: 'decryption_failed' };
}

function decryptCustom(encryptedText, key) {
    const crypto = require('crypto');
    const [ivHex, authTagHex, textHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(textHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to DB');
    const techs = await Technician.find({});
    console.log(`Found ${techs.length} technicians.\n`);

    techs.forEach(t => {
        const details = t.payment_details || {};
        if (details.method === 'none' && !details.bank?.account_number) return;

        console.log(`--- Technician: ${t.name} (${t._id}) ---`);
        console.log(`Method: ${details.method}`);
        
        const b = details.bank || {};
        if (b.account_number) {
            const res = tryDecrypt(b.account_number);
            console.log(`A/C Status: ${res.success ? 'Success' : res.reason}`);
            if (res.success) console.log(`Decrypted A/C (${res.key}): ${res.value}`);
            else console.log(`Raw A/C: ${b.account_number}`);
        }
    });

    process.exit();
})
