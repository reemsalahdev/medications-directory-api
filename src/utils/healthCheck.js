const mongoose = require('mongoose');
const logger = require('./logger');

class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.registerChecks();
  }

  registerChecks() {
    // Database connectivity check
    this.checks.set('database', {
      name: 'MongoDB Connection',
      check: this.checkDatabase.bind(this),
      timeout: 3000,
      critical: true
    });

    // Memory usage check
    this.checks.set('memory', {
      name: 'Memory Usage',
      check: this.checkMemory.bind(this),
      timeout: 100,
      critical: false
    });

    // Disk space check (if applicable)
    this.checks.set('disk', {
      name: 'Disk Space',
      check: this.checkDisk.bind(this),
      timeout: 200,
      critical: false
    });
  }

  async checkDatabase() {
    try {
      if (mongoose.connection.readyState !== 1) {
        return {
          status: 'unhealthy',
          message: 'Database connection not ready',
          details: { readyState: mongoose.connection.readyState }
        };
      }

      // Perform a simple ping to verify connectivity
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'healthy',
        message: 'Database connection active',
        details: {
          readyState: mongoose.connection.readyState,
          host: mongoose.connection.host,
          name: mongoose.connection.name
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database ping failed',
        details: { error: error.message }
      };
    }
  }

  async checkMemory() {
    try {
      const memUsage = process.memoryUsage();
      const totalMemMB = Math.round(memUsage.rss / 1024 / 1024);
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      
      // Consider unhealthy if using more than 1GB RSS memory
      const isHealthy = totalMemMB < 1024;
      
      return {
        status: isHealthy ? 'healthy' : 'warning',
        message: isHealthy ? 'Memory usage normal' : 'High memory usage detected',
        details: {
          rss: `${totalMemMB}MB`,
          heapUsed: `${heapUsedMB}MB`,
          heapTotal: `${heapTotalMB}MB`,
          external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Memory check failed',
        details: { error: error.message }
      };
    }
  }

  async checkDisk() {
    try {
      // In a real environment, you might check actual disk usage
      // For this example, we'll simulate a basic check
      return {
        status: 'healthy',
        message: 'Disk space sufficient',
        details: {
          note: 'Disk monitoring not implemented in this environment'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Disk check failed',
        details: { error: error.message }
      };
    }
  }

  async runCheck(checkName, checkConfig) {
    const startTime = Date.now();
    
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), checkConfig.timeout);
      });

      // Race between the actual check and timeout
      const result = await Promise.race([
        checkConfig.check(),
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;
      
      return {
        ...result,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        message: error.message.includes('timeout') ? 'Health check timed out' : 'Health check failed',
        details: { error: error.message },
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async performHealthCheck() {
    const startTime = Date.now();
    const results = {};
    let overallStatus = 'healthy';
    let criticalFailures = 0;
    let warnings = 0;

    // Run all health checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, config]) => {
      const result = await this.runCheck(name, config);
      results[name] = {
        name: config.name,
        status: result.status,
        message: result.message,
        duration: result.duration,
        timestamp: result.timestamp,
        critical: config.critical,
        ...(result.details && { details: result.details })
      };

      // Track failures and warnings
      if (result.status === 'unhealthy') {
        if (config.critical) {
          criticalFailures++;
        } else {
          warnings++;
        }
      } else if (result.status === 'warning') {
        warnings++;
      }
    });

    await Promise.all(checkPromises);

    // Determine overall status
    if (criticalFailures > 0) {
      overallStatus = 'unhealthy';
    } else if (warnings > 0) {
      overallStatus = 'degraded';
    }

    const totalDuration = Date.now() - startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: results,
      summary: {
        total: this.checks.size,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length,
        warnings: Object.values(results).filter(r => r.status === 'warning').length,
        criticalFailures,
        totalDuration: `${totalDuration}ms`
      }
    };
  }
}

module.exports = new HealthChecker();