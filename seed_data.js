const mongoose = require('mongoose');
const Category = require('./src/models/Category');
const Brand = require('./src/models/Brand');
const Model = require('./src/models/Model');
require('dotenv').config();

const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected...");

        
        const categories = ['Electronics', 'Home Appliances', 'Kitchen'];
        const catDocs = [];
        for (const name of categories) {
            let cat = await Category.findOne({ name });
            if (!cat) {
                cat = await Category.create({ name });
                console.log(`Created Category: ${name}`);
            }
            catDocs.push(cat);
        }

        
        const brandsData = [
            { name: 'Samsung', category: 'Electronics' },
            { name: 'Apple', category: 'Electronics' },
            { name: 'LG', category: 'Home Appliances' },
            { name: 'Whirlpool', category: 'Home Appliances' }
        ];

        const brandDocs = [];
        for (const b of brandsData) {
            const cat = catDocs.find(c => c.name === b.category);
            let brand = await Brand.findOne({ name: b.name, category_id: cat._id });
            if (!brand) {
                brand = await Brand.create({ name: b.name, category_id: cat._id });
                console.log(`Created Brand: ${b.name}`);
            }
            brandDocs.push(brand);
        }

        
        const modelsData = [
            { name: 'Galaxy S24', brand: 'Samsung' },
            { name: 'QLED TV 55"', brand: 'Samsung' },
            { name: 'OLED C3', brand: 'LG' }
        ];

        for (const m of modelsData) {
            const brand = brandDocs.find(b => b.name === m.brand);
            
            if (brand) {
                let model = await Model.findOne({ name: m.name, brand_id: brand._id });
                if (!model) {
                    model = await Model.create({ name: m.name, brand_id: brand._id });
                    console.log(`Created Model: ${m.name}`);
                }
            }
        }

        console.log("Seeding Complete!");
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

seed();
