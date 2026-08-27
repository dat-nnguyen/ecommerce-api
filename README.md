# E-Commerce Microservices Platform

A modular microservices architecture for an e-commerce platform built with Node.js, Express, Redis, PostgreSQL/MongoDB, RabbitMQ, Kong API Gateway, and Prometheus/Grafana.

---

## 📁 Repository Structure

```text
ecommerce-platform/
├── .github/
│   └── pull_request_template.md
├── deployments/
│   ├── docker/
│   │   ├── docker-compose.yml          # Local orchestration for all services + infra
│   │   └── docker-compose.override.yml # Local development overrides (bind mounts, debug ports)
│   ├── jenkins/
│   │   ├── Jenkinsfile.gateway         # Pipeline for Kong config / gateway sync
│   │   ├── Jenkinsfile.shared          # Pipeline to test/lint shared libraries
│   │   └── Jenkinsfile.service         # Generic parameterized pipeline for microservices
│   ├── kong/
│   │   ├── kong.yml                    # Declarative configuration (routes, plugins, upstreams)
│   │   └── plugins/                    # Custom Lua or JS plugins (if applicable)
│   └── monitoring/
│       ├── grafana/
│       │   ├── dashboards/             # Pre-configured dashboard JSON definitions
│       │   └── datasources/            # Prometheus data source configuration
│       └── prometheus/
│           └── prometheus.yml          # Scrape configs for all services
│
├── packages/                           # Shared internal libraries
│   ├── common-errors/                  # Centralized HTTP & business error classes
│   ├── event-contracts/                # Event definitions, topics, payload schemas
│   └── logger/                         # Winston base configuration & Prometheus metric helpers
│
├── services/
│   ├── user-service/                   # User authentication, profile management (PostgreSQL)
│   ├── product-service/                # Product catalogue & search (MongoDB)
│   ├── cart-service/                   # Shopping cart state & TTL management (Redis)
│   ├── order-service/                  # Order processing & Saga orchestration (PostgreSQL / RabbitMQ)
│   └── payment-service/                # Payment gateway integration & idempotency (PostgreSQL / RabbitMQ)
│
├── package.json                        # Monorepo workspaces config (npm / pnpm / yarn)
├── .editorconfig
├── .gitignore
├── .prettierrc
└── README.md
```

---

## 🛠️ Prerequisites & Required Tools

- **Node.js**: >= 20.x
- **Package Manager**: `npm` (bundled with Node.js), `pnpm`, or `yarn`
- **Docker & Docker Compose**: Docker Desktop / Docker Engine for running databases, broker, gateway, and monitoring
- **Database Tools** (Optional GUI): pgAdmin / DBeaver / TablePlus / MongoDB Compass
- **API Client**: Postman, Bruno, or curl

---

## 🚀 Getting Started

### 1. Install Dependencies

Run from the root directory:

```bash
npm install
# or
pnpm install
```

### 2. Start Infrastructure via Docker Compose

```bash
cd deployments/docker
docker compose up -d
```

### 3. Service Details

| Service             | Primary Data Store  | Messaging | Default Port               |
| :------------------ | :------------------ | :-------- | :------------------------- |
| **user-service**    | PostgreSQL          | -         | 3001                       |
| **product-service** | MongoDB             | -         | 3002                       |
| **cart-service**    | Redis               | -         | 3003                       |
| **order-service**   | PostgreSQL          | RabbitMQ  | 3004                       |
| **payment-service** | PostgreSQL          | RabbitMQ  | 3005                       |
| **Kong Gateway**    | DB-less (kong.yml)  | -         | 8000 (Proxy), 8001 (Admin) |
| **Prometheus**      | Time-series DB      | -         | 9090                       |
| **Grafana**         | SQLite / Dashboards | -         | 3000                       |
