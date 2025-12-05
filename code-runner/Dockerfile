# Code runner - placeholder service (execution is in backend)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY code-runner/package.json ./code-runner/

# Install dependencies
RUN npm install --workspace=code-runner

# Copy source
COPY code-runner ./code-runner

# Build TypeScript
RUN npm run build --workspace=code-runner

EXPOSE 3002

# Simple health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

CMD ["node", "code-runner/dist/index.js"]
