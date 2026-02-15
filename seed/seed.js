require('dotenv').config();
const mongoDB = require('../src/config/db');
const { Admin } = require('../src/models');

const main = async () => {
  await mongoDB(process.env.MONGO_URI);

  console.log('Seeding initial data...');

  const admin = await Admin.findOne();
  if (!admin) {
    await Admin.create({ name: 'Super Admin', email: 'kailashsinh@electrocare.test', password: 'denominatore' });
    console.log('Created default admin (password must be hashed & changed).');
  }

  console.log('Seed finished.');
  console.log(admin);
  process.exit(0);
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
