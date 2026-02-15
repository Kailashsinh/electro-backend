const mongoose = require('mongoose');
require('dotenv').config();

const fixIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const db = mongoose.connection.db;
        const collection = db.collection('feedbacks');

        
        const indexes = await collection.indexes();
        console.log('Current Indexes:', indexes);

        
        const indexName = "request_id_1";
        const indexExists = indexes.find(i => i.name === indexName);

        if (indexExists) {
            console.log(`Dropping index ${indexName}...`);
            await collection.dropIndex(indexName);
            console.log('Index dropped successfully.');
        } else {
            console.log('Index request_id_1 not found (already dropped?)');
        }

        
        await collection.createIndex({ request_id: 1, submitted_by: 1 }, { unique: true });
        console.log('Created compound index on request_id + submitted_by');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
};

fixIndexes();
