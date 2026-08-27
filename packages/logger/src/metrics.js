'use strict';

const promClient = require('prom-client');

/**
 * Initializes Prometheus metrics collection for a microservice.
 * @param {string} serviceName - Microservice name.
 * @param {object} [options={}] - Options.
 * @param {promClient.Registry} [options.registry] - Custom Registry (defaults to promClient.register).
 * @returns {object} Metrics object containing registry and metric instruments.
 */
function createMetrics(serviceName, options = {}) {
  const register = options.registry || new promClient.Registry();

  // Set default labels for all metrics collected in this service
  register.setDefaultLabels({
    service_name: serviceName,
  });

  // Enable default Node.js and runtime process metrics
  promClient.collectDefaultMetrics({
    register,
    prefix: 'node_',
  });

  // HTTP Request Duration Histogram
  const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service_name'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  });

  // Total HTTP Requests Counter
  const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests processed',
    labelNames: ['method', 'route', 'status_code', 'service_name'],
    registers: [register],
  });

  // Active Requests Gauge
  const httpActiveRequests = new promClient.Gauge({
    name: 'http_active_requests',
    help: 'Number of active HTTP requests currently being processed',
    labelNames: ['method', 'service_name'],
    registers: [register],
  });

  /**
   * Express endpoint handler for GET /metrics.
   */
  async function metricsHandler(req, res) {
    try {
      res.setHeader('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (err) {
      res.status(500).send(err.message);
    }
  }

  return {
    register,
    promClient,
    httpRequestDurationSeconds,
    httpRequestsTotal,
    httpActiveRequests,
    metricsHandler,
  };
}

module.exports = {
  promClient,
  createMetrics,
};
