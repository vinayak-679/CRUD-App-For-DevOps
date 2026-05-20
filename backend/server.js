require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/error');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const stressRoutes = require('./routes/stress');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger);

// Disable caching for API responses to prevent stale 304 responses
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/stress', stressRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Seed default user
const seedUser = async () => {
  try {
    const existingUser = await User.findOne({ username: 'admin' });
    if (!existingUser) {
      await User.create({ username: 'admin', password: 'admin123' });
      console.log('Default user created: admin / admin123');
    }
  } catch (error) {
    console.error('Error seeding user:', error.message);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  await seedUser();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
