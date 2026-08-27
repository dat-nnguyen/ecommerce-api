FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/order-service/ ./services/order-service/

RUN npm ci --workspace=packages/common-errors --workspace=packages/event-contracts --workspace=packages/logger --workspace=services/order-service

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3004

CMD ["npm", "run", "start", "--workspace=services/order-service"]
