const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const applianceRoutes = require('./routes/appliance.routes');
const feedbackRoutes = require('./routes/feedback.routes');

/* -------------------- Middlewares -------------------- */
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // Allow any localhost origin for local development if not in list
      if (origin.startsWith('http://localhost:')) return callback(null, true);
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

/* -------------------- API Routes -------------------- */
app.use('/api/appliances', applianceRoutes);
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/technician', require('./routes/technician.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/service-requests', require('./routes/serviceRequest.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/feedback', feedbackRoutes);
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/subscription-services', require('./routes/subscriptionService.routes'));
app.use('/api/subscriptions', require('./routes/subscription.routes'));
app.use('/api/chat', require('./routes/chat.routes'));

/* -------------------- Health Check -------------------- */
app.get('/api/health', (req, res) => {
  res.send('ElectroCare API is running');
});



module.exports = app;