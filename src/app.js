const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const applianceRoutes = require('./routes/appliance.routes');
const feedbackRoutes = require('./routes/feedback.routes');

/* -------------------- Middlewares -------------------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

/* -------------------- Health Check -------------------- */
app.get('/api/health', (req, res) => {
  res.send('ElectroCare API is running');
});

/* -------------------- Serve Frontend -------------------- */
// Serve static files from the React frontend app
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// AFTER all API routes, match any other route to serve the React app (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

module.exports = app;