const mongoose = require('mongoose');
const Category = require('./src/models/Category');
const Brand = require('./src/models/Brand');
const Model = require('./src/models/Model');

require('dotenv').config();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const categoryCount = await Category.countDocuments();
        const brandCount = await Brand.countDocuments();
        const modelCount = await Model.countDocuments();

        console.log(`Categories: ${categoryCount}`);
        console.log(`Brands: ${brandCount}`);
        console.log(`Models: ${modelCount}`);

        if (categoryCount > 0) {
            const cats = await Category.find().limit(5);
            console.log("Sample Categories:", cats.map(c => c.name));
        }

        if (brandCount > 0) {
            const brands = await Brand.find().limit(5);
            console.log("Sample Brands:", brands.map(b => `${b.name} (${b.category_id})`));
        }

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkData();
