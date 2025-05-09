const express = require('express');
const cors = require('cors');
const messageRoutes = require('../../routes/messages');

// Override auth middleware for testing
jest.mock('../../middleware/auth', () => require('./testAuth'));

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/messages', messageRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app; 