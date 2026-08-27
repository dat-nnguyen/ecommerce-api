'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Executes a callback within an asynchronous context bound to a trace ID.
 * @param {string} traceId - The unique trace or correlation ID.
 * @param {Function} callback - The function to run within the context.
 * @returns {*} Return value of the callback.
 */
function runWithTraceId(traceId, callback) {
  const store = new Map();
  store.set('traceId', traceId);
  return asyncLocalStorage.run(store, callback);
}

/**
 * Retrieves the current trace ID from the active asynchronous context.
 * @returns {string|null} The active trace ID or null if not within a trace context.
 */
function getTraceId() {
  const store = asyncLocalStorage.getStore();
  return store ? store.get('traceId') || null : null;
}

/**
 * Sets a custom key-value pair in the active trace store.
 * @param {string} key - Metadata key.
 * @param {*} value - Metadata value.
 */
function setContext(key, value) {
  const store = asyncLocalStorage.getStore();
  if (store) {
    store.set(key, value);
  }
}

/**
 * Retrieves a custom key-value pair from the active trace store.
 * @param {string} key - Metadata key.
 * @returns {*} Value associated with key or undefined.
 */
function getContext(key) {
  const store = asyncLocalStorage.getStore();
  return store ? store.get(key) : undefined;
}

module.exports = {
  asyncLocalStorage,
  runWithTraceId,
  getTraceId,
  setContext,
  getContext,
};
