const express = require('express');
const healthChecker = require('../utils/healthCheck');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /healthz:
 *   get:
 *     summary: Health check endpoint for cloud-native deployments
 *     tags: [Health]
 *     description: |
 *       Returns the health status of the service and its dependencies.
 *       This endpoint follows cloud-native best practices and is designed
 *       for use with container orchestrators, load balancers, and monitoring systems.
 *     responses:
 *       200:
 *         description: Service is healthy and ready to accept traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded]
 *                   description: Overall health status
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   description: When the health check was performed
 *                 uptime:
 *                   type: integer
 *                   description: Service uptime in seconds
 *                 version:
 *                   type: string
 *                   description: Application version
 *                 environment:
 *                   type: string
 *                   description: Current environment (development, production, etc.)
 *                 checks:
 *                   type: object
 *                   description: Individual health check results
 *                 summary:
 *                   type: object
 *                   description: Summary of all health checks
 *             example:
 *               status: "healthy"
 *               timestamp: "2025-06-08T10:30:00.000Z"
 *               uptime: 3600
 *               version: "1.0.0"
 *               environment: "production"
 *               checks:
 *                 database:
 *                   name: "MongoDB Connection"
 *                   status: "healthy"
 *                   message: "Database connection active"
 *                   duration: "15ms"
 *               summary:
 *                 total: 3
 *                 healthy: 3
 *                 unhealthy: 0
 *                 warnings: 0
 *       503:
 *         description: Service is unhealthy and not ready to accept traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: integer
 *                 checks:
 *                   type: object
 *                 summary:
 *                   type: object
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const healthResult = await healthChecker.performHealthCheck();
    
    // Determine HTTP status code based on health
    let statusCode = 200;
    if (healthResult.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    } else if (healthResult.status === 'degraded') {
      statusCode = 200; // Still accepting traffic but with warnings
    }

    // Log health check results for monitoring
    const logLevel = statusCode === 503 ? 'error' : 'info';
    logger[logLevel]('Health check completed', {
      status: healthResult.status,
      duration: healthResult.summary.totalDuration,
      criticalFailures: healthResult.summary.criticalFailures,
      warnings: healthResult.summary.warnings
    });

    // Set appropriate headers
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Check-Duration': healthResult.summary.totalDuration
    });

    res.status(statusCode).json(healthResult);

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Health check failed with exception', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });

    // Return minimal error response without exposing sensitive information
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      message: 'Health check failed',
      summary: {
        total: 0,
        healthy: 0,
        unhealthy: 1,
        warnings: 0,
        criticalFailures: 1,
        totalDuration: `${duration}ms`
      }
    });
  }
});

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness probe endpoint
 *     tags: [Health]
 *     description: |
 *       Simplified readiness check for Kubernetes readiness probes.
 *       Returns 200 if the service is ready to accept traffic, 503 otherwise.
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ready"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Quick readiness check - only check critical dependencies
    const healthResult = await healthChecker.performHealthCheck();
    
    if (healthResult.summary.criticalFailures > 0) {
      return res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /live:
 *   get:
 *     summary: Liveness probe endpoint
 *     tags: [Health]
 *     description: |
 *       Simple liveness check for Kubernetes liveness probes.
 *       Returns 200 if the service process is alive and responding.
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "alive"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: integer
 */
router.get('/live', (req, res) => {
  // Simple liveness check - just verify the process is responding
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

module.exports = router;