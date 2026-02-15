const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { hashPassword } = require('./src/utils/password');
const Admin = require('./src/models/Admin');

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const email = 'admin@electrocare.com';
        const password = 'admin'; 
        const name = 'Super Admin';

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log('Admin already exists');
            process.exit();
        }

        const hashedPassword = await hashPassword(password);

        await Admin.create({
            name,
            email,
            password: hashedPassword
        });

        console.log(`Admin created successfully.\nEmail: ${email}\nPassword: ${password}`);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
