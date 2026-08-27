FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY packages/ ./packages/
COPY services/product-service/ ./services/product-service/

RUN npm ci --workspace=packages/common-errors --workspace=packages/logger --workspace=services/product-service

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3002

CMD ["npm", "run", "start", "--workspace=services/product-service"]
