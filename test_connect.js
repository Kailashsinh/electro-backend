var mongoose = require('mongoose');
require('dotenv').config();

console.log('URI:', process.env.MONGO_URI ? 'Found' : 'Missing');

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected successfully');
    process.exit(0);
}).catch(err => {
    console.error('Connection failed:', err);
    process.exit(1);
});
