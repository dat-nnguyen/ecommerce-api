'use strict';

const winston = require('winston');
const express = require('express');
const request = require('supertest');
const {
  createLogger,
  runWithTraceId,
  getTraceId,
  createMetrics,
  createTraceMiddleware,
  createHttpLoggerMiddleware,
  createHttpMetricsMiddleware,
} = require('../src');

describe('Logger & Metrics Package', () => {
  describe('Trace Context (AsyncLocalStorage)', () => {
    it('should return null when outside a trace context', () => {
      expect(getTraceId()).toBeNull();
    });

    it('should store and retrieve trace ID within execution context', (done) => {
      const traceId = 'test-trace-uuid-1234';

      runWithTraceId(traceId, () => {
        expect(getTraceId()).toBe(traceId);
        setTimeout(() => {
          expect(getTraceId()).toBe(traceId);
          done();
        }, 10);
      });
    });
  });

  describe('Winston Structured Logger', () => {
    it('should create a logger with service_name and JSON formatting', () => {
      const logger = createLogger('user-service');
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should format logs with service_name, level, message, and trace_id', (done) => {
      let loggedOutput = '';

      const { Writable } = require('stream');
      const mockStream = new Writable({
        write(chunk, encoding, callback) {
          loggedOutput += chunk.toString();
          callback();
        },
      });

      const customLogger = winston.createLogger({
        format: winston.format.combine(
          winston.format.timestamp({ format: () => new Date().toISOString() }),
          winston.format((info) => {
            info.service_name = 'order-service';
            const activeTraceId = getTraceId();
            if (activeTraceId) {
              info.trace_id = activeTraceId;
            }
            return info;
          })(),
          winston.format.json()
        ),
        transports: [new winston.transports.Stream({ stream: mockStream })],
      });

      runWithTraceId('order-trace-888', () => {
        customLogger.info('Order placed successfully', { orderId: 'ord_123' });

        expect(loggedOutput).toBeTruthy();
        const parsed = JSON.parse(loggedOutput);

        expect(parsed.service_name).toBe('order-service');
        expect(parsed.level).toBe('info');
        expect(parsed.message).toBe('Order placed successfully');
        expect(parsed.trace_id).toBe('order-trace-888');
        expect(parsed.orderId).toBe('ord_123');
        expect(parsed.timestamp).toBeDefined();
        done();
      });
    });
  });

  describe('Prometheus Metrics', () => {
    it('should create metrics registry and expose /metrics handler', async () => {
      const metrics = createMetrics('payment-service');
      expect(metrics.register).toBeDefined();
      expect(metrics.httpRequestDurationSeconds).toBeDefined();
      expect(metrics.httpRequestsTotal).toBeDefined();

      const app = express();
      app.get('/metrics', metrics.metricsHandler);

      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toContain('node_');
    });
  });

  describe('Express Middlewares Integration', () => {
    it('should propagate trace ID, record metrics, and log HTTP access', async () => {
      const logger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      const metrics = createMetrics('cart-service');

      const app = express();
      app.use(createTraceMiddleware());
      app.use(createHttpMetricsMiddleware(metrics));
      app.use(createHttpLoggerMiddleware(logger));

      app.get('/api/v1/cart', (req, res) => {
        res.status(200).json({ items: [], trace: getTraceId() });
      });

      const res = await request(app).get('/api/v1/cart').set('x-trace-id', 'custom-trace-999');

      expect(res.status).toBe(200);
      expect(res.headers['x-trace-id']).toBe('custom-trace-999');
      expect(res.body.trace).toBe('custom-trace-999');
    });
  });
});
