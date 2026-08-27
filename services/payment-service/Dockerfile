FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/payment-service/ ./services/payment-service/

RUN npm ci --workspace=packages/common-errors --workspace=packages/event-contracts --workspace=packages/logger --workspace=services/payment-service

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3005

CMD ["npm", "run", "start", "--workspace=services/payment-service"]
