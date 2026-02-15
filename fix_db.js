const mongoose = require('mongoose');
const Brand = require('./src/models/Brand');
require('dotenv').config();

const fix = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB...");

        console.log("Dropping indexes on brands collection...");
        try {
            await Brand.collection.dropIndex('name_1');
            console.log("Dropped name_1 index.");
        } catch (e) {
            console.log("Index name_1 might not exist or verify failed:", e.message);
        }

        
        const indexes = await Brand.collection.indexes();
        console.log("Current Indexes:", indexes);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

fix();
