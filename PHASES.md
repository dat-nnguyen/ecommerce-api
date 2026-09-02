# 🗺️ E-Commerce Microservices Platform - Project Roadmap & Progress

---

## 📊 Summary of Completed Work

### ✅ Phase 1: Foundation & Shared Packages

- [x] **Project Scaffolding & Directory Structure**
  - Modular monorepo with `packages/`, `services/`, and `deployments/`.
  - Configured Git, GitHub PR template, `.editorconfig`, `.prettierrc`, and `.gitignore`.
  - Monorepo-wide transition to native ES Modules (`"type": "module"`).

- [x] **TODO 1.1: Root Workspace Configuration**
  - Configured `pnpm-workspace.yaml` and root `package.json` workspaces (`packages/*`, `services/*`).
  - Linked internal packages across all microservices using `"workspace:*"`.
  - Added root scripts for monorepo-wide execution: `npm test`, `npm run test:services`, `npm run test:packages`, `npm run lint`, `npm run format`.
  - Configured ESLint (flat config) and Prettier across all workspaces.

- [x] **TODO 1.2: Shared Error & Logger Package**
  - **`@ecommerce/common-errors`**:
    - Base `AppError` operational error class with status code, error code, details, and `toJSON()` serialization.
    - Specific HTTP domain errors: `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`, `InternalServerError`, `BadGatewayError`, `ServiceUnavailableError`, `GatewayTimeoutError`.
    - Express `errorHandler` middleware returning uniform error JSON payloads.
  - **`@ecommerce/logger`**:
    - Node.js `AsyncLocalStorage` for distributed trace context management (`runWithTraceId`, `getTraceId`).
    - Winston structured JSON logger outputting `{ timestamp, level, service_name, trace_id, message, ...context }`.
    - `prom-client` integration exposing Node.js process metrics, HTTP duration histogram (`http_request_duration_seconds`), and `/metrics` handler.
    - Express middlewares for automatic trace ID extraction/generation, access logging, and metrics recording.
  - **Unit Tests**: 20/20 unit tests passing with Jest across both packages.

- [x] **TODO 1.3: Event Contracts Package (`@ecommerce/event-contracts`)**
  - Centralized RabbitMQ exchange & routing key constants.
  - Standard event message wrappers (`eventId`, `eventType`, `timestamp`, `traceId`, `payload`).
  - Event payload constants and interfaces.

---

### ✅ Phase 2: Local Infrastructure & API Gateway (Milestone 2)

- [x] **TODO 2.1: Multi-Container Docker Compose Orchestration**
  - Configured [docker-compose.yml](file:///Users/datnguyen/Documents/project/ecommerce-api/deployments/docker/docker-compose.yml) with 7 production-grade infrastructure containers.
  - Dedicated bridge network `ecommerce-network` for internal DNS resolution.
  - Named persistent volumes: `postgres_data`, `mongo_data`, `redis_data`, `rabbitmq_data`, `prometheus_data`, `grafana_data`.
  - Configured health checks with cold-start buffers (`start_period`, `interval`, `retries`) for:
    - **PostgreSQL 16**: `pg_isready` check
    - **MongoDB 7**: `mongosh` ping check
    - **Redis 7**: `redis-cli ping` check
    - **RabbitMQ 3.13**: `rabbitmq-diagnostics -q ping` check
    - **Kong 3.6**: `kong health` check
    - **Prometheus 2.51**: HTTP `/-/healthy` check
    - **Grafana 10.4**: HTTP `/api/health` check

- [x] **TODO 2.2: Observability Infrastructure Setup (Prometheus & Grafana)**
  - Configured [prometheus.yml](file:///Users/datnguyen/Documents/project/ecommerce-api/deployments/monitoring/prometheus/prometheus.yml) with 15s scrape interval and targets for Prometheus and all 5 microservices (`user-service`, `product-service`, `cart-service`, `order-service`, `payment-service`).
  - Automated Grafana provisioning via [datasource.yml](file:///Users/datnguyen/Documents/project/ecommerce-api/deployments/monitoring/grafana/datasources/datasource.yml) connecting to internal Docker URL `http://prometheus:9090`.

- [x] **TODO 2.3: DB-less Kong API Gateway Setup**
  - Configured [kong.yml](file:///Users/datnguyen/Documents/project/ecommerce-api/deployments/kong/kong.yml) with declarative routing for `/api/v1/auth`, `/api/v1/users`, `/api/v1/products`, `/api/v1/cart`, `/api/v1/orders`, and `/api/v1/payments`.
  - Global plugins enabled:
    - `rate-limiting`: 100 requests / minute
    - `correlation-id`: Generates & propagates UUID `x-trace-id` (matches `@ecommerce/logger` middleware format)
    - `cors`: Handles origins, methods, credentials, and exposes `x-trace-id` header.
  - Verified downstream header injection and upstream routing.

---

### ✅ Phase 3: User & Authentication Service (Milestone 3)

- [x] **TODO 3.1: Service Skeleton, Fail-Fast Config & Database Migrations**
  - **Fail-Fast Config Layer (`src/config/env.js`)**:
    - Strict Zod validation for `PORT`, `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `LOG_LEVEL`.
    - Fail-fast process termination (`process.exit(1)`) with detailed diagnostics if environment variables are missing or invalid.
    - Monorepo-aware `.env` and `.env.test` path resolution using `__dirname`.
  - **Server & App Decoupling (`src/app.js`, `src/server.js`)**:
    - Decoupled Express app definition from HTTP server listener to allow supertest execution without port conflicts.
    - Graceful shutdown lifecycle management handling `SIGTERM`, `SIGINT`, `unhandledRejection`, and `uncaughtException` with connection draining and Prisma disconnect.
    - Built-in `/health` and `/metrics` Prometheus scrape endpoints.
  - **Prisma Schema & Migrations (`prisma/schema.prisma`)**:
    - Defined `Role` enum (`CUSTOMER`, `ADMIN`).
    - `User` model (`id` UUID, `email` unique index, `password_hash`, `name`, `role`, `is_active`, timestamps).
    - `RefreshToken` model (`id` UUID, `user_id` FK with `onDelete: Cascade`, `token_hash` unique index, `expires_at`, `revoked`, `created_at`).
    - Automated migrations executed against PostgreSQL container.

- [x] **TODO 3.2: Data Access, Cryptography & Domain Logic**
  - **Repository Layer Pattern**:
    - `userRepository.js`: `createUser`, `findUserByEmail`, `findUserById`, `updateUser`, `deleteUser`, `countUsers` with automated password exclusion.
    - `refreshTokenRepository.js`: `storeRefreshToken`, `findTokenByHash`, `revokeToken`, `revokeAllUserTokens`, `deleteRefreshToken`, `findActiveTokensByUserId`, `deleteExpiredTokens`.
  - **Cryptography & Token Helpers**:
    - `password.js`: Password hashing with bcrypt (`SALT_ROUNDS = 10`) and constant-time password comparison (`comparePassword`).
    - `token.js`: Crypto random token generation (`generateRandomToken`), SHA-256 hashing for refresh token storage (`hashToken`), JWT access token signing (`signAccessToken`), and JWT verification (`verifyAccessToken`) with domain error mapping.
  - **Domain Services**:
    - `auth.service.js`:
      - Registration: Email uniqueness check -> bcrypt password hashing -> database persistence -> token pair issuance -> sanitized response.
      - Login: Active status check -> bcrypt verification -> token pair issuance.
      - **Refresh Token Rotation & Reuse Detection**: Validates token; if a revoked token is presented (replay attack detected), immediately revokes all user sessions and terminates all tokens. In normal refresh, revokes used token and issues a new access/refresh pair.
      - Logout: Token hashing and soft-revocation in database.
    - `user.service.js`:
      - Profile retrieval (`getProfile`) and profile updates (`updateProfile`) with duplicate email collision prevention.
      - Password change (`changePassword`) with current password verification, bcrypt hashing, and automatic session invalidation across all devices via `revokeAllUserTokens(userId)`.

- [x] **TODO 3.3: HTTP Transport, Validation & Error Wiring**
  - **Request Validation Middleware (`src/middlewares/validate.js`)**:
    - Express middleware validating `req.body`, `req.query`, and `req.params` against Zod schemas.
    - Maps validation errors to structured `ValidationError` with field-level details (`[{ field: 'body.email', message: '...' }]`) for standard 400 JSON responses.
  - **Zod Request Schemas (`src/middlewares/validators/`)**:
    - `auth.validator.js`: `registerSchema` (email, strong password complexity regex, name, role), `loginSchema`, `refreshTokenSchema`.
    - `user.validator.js`: `userIdParamSchema` (UUID), `updateProfileSchema`, `changePasswordSchema` (enforces difference between old and new passwords).
  - **Authentication & RBAC Middlewares (`src/middlewares/auth.middleware.js`)**:
    - `authenticate`: Extracts `Bearer <token>` from `Authorization` header, verifies JWT, and attaches user identity (`req.user = { id, email, role }`).
    - `authorize(...roles)`: Role-Based Access Control middleware factory rejecting unauthorized roles with 403 `ForbiddenError`.
  - **HTTP Controllers & Routes (`src/controllers/`, `src/routes/`)**:
    - `auth.controller.js` & `auth.routes.js`: `/register` (201 Created), `/login` (200 OK), `/refresh` (200 OK), `/logout` (200 OK).
    - `user.controller.js` & `user.routes.js`: Protected `/profile` (GET, PATCH), `/change-password` (PUT).
    - Mounted in `app.js` under `/api/v1/auth` and `/api/v1/users`.

- [x] **Unit & Integration Test Suites**:
  - **91 passing unit & integration tests** in `user-service`.

---

### ✅ Phase 4: Product & Catalog Service (Milestone 4)

- [x] **TODO 4.1: Service Skeleton, Fail-Fast Config & MongoDB Connection**
  - **Fail-Fast Zod Configuration (`src/config/env.js`)**:
    - Strict validation for `PORT`, `NODE_ENV`, `MONGODB_URI`, `REDIS_URI`, `LOG_LEVEL`.
    - Fail-fast process exit (`process.exit(1)`) with detailed diagnostics upon validation failure.
  - **MongoDB Connection Management (`src/config/db.js`)**:
    - Connection pooling via `mongoose.connect()` with custom timeouts.
    - Active lifecycle event listeners (`connected`, `error`, `disconnected`) logging through `@ecommerce/logger`.
    - Clean `connectDB()` and `disconnectDB()` helpers for startup and graceful server teardown.
  - **Server & App Decoupling (`src/app.js`, `src/server.js`)**:
    - Decoupled Express app definition from HTTP server listener for supertest isolation.
    - Graceful shutdown handlers capturing `SIGTERM`, `SIGINT`, `unhandledRejection`, `uncaughtException` with connection drain and Mongoose disconnect.
    - Built-in `/health` and Prometheus `/metrics` scrape endpoints.

- [x] **TODO 4.2: Product Data Model, Compound Indexes & Repository Layer**
  - **Mongoose Schema & Indexing (`src/models/product.model.js`)**:
    - Document schema: `name`, `description`, `price`, `category`, `stock`, `sku` (unique, uppercase), `images`, `isActive`, timestamps.
    - Custom `toJSON` transform mapping `_id` to `id` and stripping `__v`.
    - Text index: `{ name: 'text', description: 'text' }` for full-text catalog search.
    - Compound indexes: `{ category: 1, price: 1 }` and `{ isActive: 1, createdAt: -1 }` for low-latency storefront filtering and sorting.
  - **Repository Layer Pattern (`src/repositories/product.repository.js`)**:
    - Data access methods isolating Mongoose queries: `createProduct`, `findProductById`, `findProductBySku`, `findProducts` (paginated with total count & totalPages), `updateProduct`, `deleteProduct` (soft delete), `decrementStock` (atomic inventory decrement conditional on `stock >= quantity`).

- [x] **TODO 4.3: Product Domain Logic & Business Rules**
  - **Domain Service (`src/services/product.service.js`)**:
    - `createProduct`: Validates unique SKU before insert, throwing `ConflictError` on collision.
    - `getProductById`: Retrieves active product, throwing `NotFoundError` if absent or inactive.
    - `listProducts`: Dynamic query builder supporting category filtering, full-text search (`$text`), price boundary filtering (`$gte`, `$lte`), and pagination.
    - `updateProduct`: Verifies existence, guards against SKU collisions on update, applies partial fields.
    - `deleteProduct`: Soft-deletes active products by flipping `isActive` to `false`.

- [x] **TODO 4.4: Validation Middlewares, HTTP Controllers & Route Wiring**
  - **Request Validation Schemas (`src/validators/product.validator.js`)**:
    - `productIdParamSchema`: Validates 24-hex MongoDB ObjectIds in route params.
    - `createProductSchema`: Enforces required fields, string lengths, non-negative price/stock, valid image URLs.
    - `updateProductSchema`: Validates partial updates with non-empty payload refinement.
    - `queryProductsSchema`: Coerces types and sets default pagination (`page=1`, `limit=20`).
  - **HTTP Controllers & Routes (`src/controllers/product.controller.js`, `src/routes/product.routes.js`)**:
    - `GET /api/v1/products`: List products with pagination metadata (200 OK).
    - `GET /api/v1/products/:id`: Get product by ID (200 OK).
    - `POST /api/v1/products`: Create product (201 Created).
    - `PATCH /api/v1/products/:id`: Update product (200 OK).
    - `DELETE /api/v1/products/:id`: Soft-delete product (200 OK).
    - Mounted on Express app under `/api/v1/products`.

- [x] **Unit & Integration Test Suites**:
  - **56 passing unit & integration tests** across 8 test suites in `product-service`.
  - **147 total passing tests** across the entire monorepo (`pnpm test`).

---

## 🔮 Upcoming Phases & Roadmap

### 🛒 Phase 5: Cart Service (Milestone 5)

- [ ] **TODO 5.1: Cart Service Scaffolding & Redis Integration**
  - Redis client singleton (`ioredis`) & connection healthchecks.
  - Fail-fast Zod configuration (`src/config/env.js`).
  - Express app & server skeleton with graceful shutdown, `/health`, and Prometheus `/metrics`.
- [ ] **TODO 5.2: Cart Repository & Data Access Layer**
  - Redis Hash data structure for cart items: `cart:{userId}` / `cart:{guestSessionId}`.
  - Add item, update item quantity, remove item, clear cart.
  - Guest-to-user cart merging logic upon user login.
  - Cart TTL management (e.g. 7-day automatic key expiration).
- [ ] **TODO 5.3: Cart Domain Service & Validation**
  - Cross-service product availability & price lookup validation.
  - Zod request schemas (`addItemSchema`, `updateQuantitySchema`, `mergeCartSchema`).
- [ ] **TODO 5.4: HTTP Transport & Integration Testing**
  - Routes mounted under `/api/v1/cart`.
  - Controllers for `getCart`, `addItem`, `updateItem`, `removeItem`, `clearCart`, `mergeCart`.
  - Integration tests with Redis mock.

---

### 📦 Phase 6: Order Service & Saga Orchestration (Milestone 6)

- [ ] **TODO 6.1: Order State Machine & Database**
  - PostgreSQL schema for orders & order items with Prisma.
  - State machine: `PENDING` -> `PAYMENT_PENDING` -> `CONFIRMED` -> `SHIPPED` -> `DELIVERED` / `CANCELLED`.
- [ ] **TODO 6.2: RabbitMQ Event Integration**
  - Event publishers for `OrderCreated`, `OrderCancelled`.
  - Event consumers for payment and inventory status events.
- [ ] **TODO 6.3: Order Saga Workflow**
  - Compensating transactions for out-of-stock or payment failure scenarios.

---

### 💳 Phase 7: Payment Service (Milestone 7)

- [ ] **TODO 7.1: Payment Gateway Adapter & Idempotency**
  - Stripe / Payment gateway adapter.
  - Idempotency key table to prevent duplicate charges.
- [ ] **TODO 7.2: RabbitMQ Event Handling**
  - Consumes `OrderCreated` -> processes charge -> emits `PaymentProcessed` or `PaymentFailed`.

---

### 📈 Phase 8: Observability, CI/CD & End-to-End Testing (Milestone 8)

- [ ] **TODO 8.1: Dashboards & Alerting**
  - Pre-configured Grafana dashboards for latency, error rate, and request throughput.
- [ ] **TODO 8.2: CI/CD Automation**
  - GitHub Actions / Jenkins pipelines for automated testing, linting, Docker image builds.
- [ ] **TODO 8.3: End-to-End Integration Testing**
  - Complete checkout flow: Auth -> Browse -> Add to Cart -> Place Order -> Payment -> Completion.
