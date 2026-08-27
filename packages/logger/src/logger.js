'use strict';

const winston = require('winston');
const { getTraceId } = require('./traceContext');

/**
 * Winston format that enriches log entries with service name, trace ID, and standardized fields.
 */
const enrichLogFormat = (serviceName) =>
  winston.format((info) => {
    info.service_name = serviceName;
    if (!info.trace_id) {
      const activeTraceId = getTraceId();
      if (activeTraceId) {
        info.trace_id = activeTraceId;
      }
    }
    return info;
  })();

/**
 * Creates a configured Winston logger instance for a given microservice.
 * @param {string} serviceName - The unique name of the microservice (e.g. 'user-service').
 * @param {object} [options={}] - Additional configuration options.
 * @param {string} [options.logLevel=process.env.LOG_LEVEL || 'info'] - Minimum log level.
 * @param {boolean} [options.prettyPrint=false] - Whether to use colorized human-readable output in dev.
 * @returns {winston.Logger} Configured Winston logger instance.
 */
function createLogger(serviceName, options = {}) {
  const logLevel =
    options.logLevel ||
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === 'test' ? 'error' : 'info');
  const isPretty =
    options.prettyPrint ??
    (process.env.NODE_ENV === 'development' && process.env.LOG_FORMAT !== 'json');

  const formats = [
    winston.format.timestamp({ format: () => new Date().toISOString() }),
    winston.format.errors({ stack: true }),
    enrichLogFormat(serviceName),
  ];

  if (isPretty) {
    formats.push(
      winston.format.colorize(),
      winston.format.printf(
        ({ timestamp, level, message, service_name, trace_id, stack, ...meta }) => {
          const trace = trace_id ? ` [trace: ${trace_id}]` : '';
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          const stackStr = stack ? `\n${stack}` : '';
          return `[${timestamp}] [${level}] [${service_name}]${trace}: ${message}${metaStr}${stackStr}`;
        }
      )
    );
  } else {
    formats.push(winston.format.json());
  }

  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(...formats),
    defaultMeta: {},
    transports: [
      new winston.transports.Console({
        silent: process.env.NODE_ENV === 'test' && !process.env.DEBUG_TESTS,
      }),
    ],
  });

  return logger;
}

module.exports = {
  createLogger,
};
