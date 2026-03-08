const mongoose = require('mongoose');
const Technician = require('./src/models/Technician');
const { decrypt } = require('./src/utils/crypto');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to DB');
    const techs = await Technician.find({ 'payment_details.method': { $ne: 'none' } });
    console.log(`Found ${techs.length} technicians with payment details.`);

    techs.forEach(t => {
        console.log(`\nTechnician: ${t.name} (${t._id})`);
        console.log(`Method: ${t.payment_details.method}`);
        
        if (t.payment_details.method === 'bank') {
            const { account_number, ifsc_code } = t.payment_details.bank;
            console.log(`Raw A/C: ${account_number}`);
            console.log(`Decrypted A/C: ${decrypt(account_number)}`);
            console.log(`Raw IFSC: ${ifsc_code}`);
            console.log(`Decrypted IFSC: ${decrypt(ifsc_code)}`);
        } else if (t.payment_details.method === 'upi') {
            const { upi_id } = t.payment_details.upi;
            console.log(`Raw UPI: ${upi_id}`);
            console.log(`Decrypted UPI: ${decrypt(upi_id)}`);
        }
    });

    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
