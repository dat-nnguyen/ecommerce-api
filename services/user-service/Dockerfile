FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configs
COPY package*.json ./
COPY packages/ ./packages/
COPY services/user-service/ ./services/user-service/

# Install dependencies for workspaces
RUN npm ci --workspace=packages/common-errors --workspace=packages/logger --workspace=services/user-service

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 3001

CMD ["npm", "run", "start", "--workspace=services/user-service"]
