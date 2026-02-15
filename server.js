require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const mongoDB = require('./src/config/db');
const socket = require('./socket');
const aiRoutes = require('./src/routes/ai.routes');
const adminRoutes = require('./src/routes/admin.routes');

const PORT = process.env.PORT || 5000;


const startServer = async () => {
  await mongoDB(process.env.MONGO_URI);

  
  const server = http.createServer(app);


  socket.init(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
