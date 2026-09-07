import dbManager from '../config/db.js';
import { mapRowToIdempotency } from '../models/payment.model.js';

/**
 * Atomically attempts to create and lock a new idempotency key with 'STARTED' status.
 * Uses `ON CONFLICT (key) DO NOTHING` to prevent race conditions across concurrent requests.
 *
 * @param {Object} params - Idempotency key parameters.
 * @param {string} params.key - Unique client-provided idempotency key.
 * @param {string} params.userId - Unique user identifier.
 * @param {string} params.requestPath - HTTP request endpoint path.
 * @param {string} params.requestParamsHash - SHA-256 hash of the request body/parameters.
 * @param {import('pg').PoolClient} [client=null] - Optional transaction client.
 * @returns {Promise<Object|null>} Created idempotency record if lock acquired, or null if key already exists.
 */
export async function createOrLockKey(
  { key, userId, requestPath, requestParamsHash },
  client = null
) {
  const executor = client || dbManager;
  const result = await executor.query(
    `INSERT INTO idempotency_keys (key, user_id, request_path, request_params_hash, status, locked_at)
     VALUES ($1, $2, $3, $4, 'STARTED', NOW())
     ON CONFLICT (key) DO NOTHING
     RETURNING *`,
    [key, userId, requestPath, requestParamsHash]
  );

  return mapRowToIdempotency(result.rows[0]);
}

/**
 * Retrieves an existing idempotency record by its key.
 *
 * @param {string} key - Idempotency key to find.
 * @param {import('pg').PoolClient} [client=null] - Optional transaction client.
 * @returns {Promise<Object|null>} Idempotency domain object, or null if not found.
 */
export async function findKey(key, client = null) {
  const executor = client || dbManager;
  const result = await executor.query('SELECT * FROM idempotency_keys WHERE key = $1', [key]);

  return mapRowToIdempotency(result.rows[0]);
}

/**
 * Updates an idempotency record to 'COMPLETED' status and stores the final HTTP response payload.
 *
 * @param {Object} params - Completion details.
 * @param {string} params.key - Idempotency key.
 * @param {number} params.responseCode - Final HTTP response status code (e.g. 200, 201).
 * @param {Object|Array} params.responseBody - Serialized JSON response envelope to cache.
 * @param {import('pg').PoolClient} [client=null] - Optional transaction client.
 * @returns {Promise<Object|null>} Updated idempotency domain object, or null if key not found.
 */
export async function updateCompletedKey(
  { key, responseCode, responseBody },
  client = null
) {
  const executor = client || dbManager;
  const result = await executor.query(
    `UPDATE idempotency_keys
     SET status = 'COMPLETED',
         response_code = $1,
         response_body = $2,
         updated_at = NOW()
     WHERE key = $3
     RETURNING *`,
    [responseCode, JSON.stringify(responseBody), key]
  );

  return mapRowToIdempotency(result.rows[0]);
}

/**
 * Marks an idempotency record as 'FAILED' when the underlying operation terminates with an unhandled error.
 *
 * @param {string} key - Idempotency key to mark failed.
 * @param {import('pg').PoolClient} [client=null] - Optional transaction client.
 * @returns {Promise<Object|null>} Updated idempotency domain object, or null if key not found.
 */
export async function updateFailedKey(key, client = null) {
  const executor = client || dbManager;
  const result = await executor.query(
    `UPDATE idempotency_keys
     SET status = 'FAILED',
         updated_at = NOW()
     WHERE key = $1
     RETURNING *`,
    [key]
  );

  return mapRowToIdempotency(result.rows[0]);
}

export default {
  createOrLockKey,
  findKey,
  updateCompletedKey,
  updateFailedKey,
};
