'use strict';

const { createLogger } = require('./logger');
const {
  asyncLocalStorage,
  runWithTraceId,
  getTraceId,
  setContext,
  getContext,
} = require('./traceContext');
const { createMetrics, promClient } = require('./metrics');
const {
  createTraceMiddleware,
  createHttpLoggerMiddleware,
  createHttpMetricsMiddleware,
} = require('./httpMiddleware');

module.exports = {
  createLogger,
  asyncLocalStorage,
  runWithTraceId,
  getTraceId,
  setContext,
  getContext,
  createMetrics,
  promClient,
  createTraceMiddleware,
  createHttpLoggerMiddleware,
  createHttpMetricsMiddleware,
};
