const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const swaggerSetup = require('./config/swagger');

// Import routes
const authRoutes = require('./routes/auth');
const medicationRoutes = require('./routes/medications');
const alternativeRoutes = require('./routes/alternatives');
const pharmacyRoutes = require('./routes/pharmacies');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3010;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting (exclude health endpoints from rate limiting)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path.startsWith('/healthz') || 
           req.path.startsWith('/ready') || 
           req.path.startsWith('/live');
  }
});
app.use('/api/', limiter);

// Logging (exclude health endpoints from access logs to reduce noise)
app.use(morgan('combined', { 
  stream: { write: message => logger.info(message.trim()) },
  skip: (req) => {
    // Skip logging for health check endpoints to reduce log noise
    return req.path.startsWith('/healthz') || 
           req.path.startsWith('/ready') || 
           req.path.startsWith('/live');
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
swaggerSetup(app);

// Health check endpoints (no authentication required, no rate limiting)
app.use('/healthz', healthRoutes);
app.use('/ready', healthRoutes);
app.use('/live', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/alternatives', alternativeRoutes);
app.use('/api/pharmacies', pharmacyRoutes);

// Legacy health check endpoint (for backward compatibility)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist.`
  });
});

// Error handling middleware
app.use(errorHandler);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medications_directory')
  .then(() => {
    logger.info('Connected to MongoDB');
    
    // Create default admin user
    require('./utils/createAdmin')();

    // Start server only after successful database connection
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`Health check available at http://localhost:${PORT}/healthz`);
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  mongoose.connection.close().then(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  mongoose.connection.close().then(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;