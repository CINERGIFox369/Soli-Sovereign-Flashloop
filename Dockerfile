# Build stage
<<<<<<< HEAD
FROM node:22-alpine3.20 AS build
=======
FROM node:20-alpine3.20 AS build
>>>>>>> fix/ci-oidc-on-origin
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json* ./
# Install dev dependencies so tsc is available
RUN npm ci
COPY . .
# Build TypeScript into dist/
RUN npm run build

# Runtime stage: install only production deps and copy dist
<<<<<<< HEAD
FROM node:22-alpine3.20
=======
FROM node:20-alpine3.20
>>>>>>> fix/ci-oidc-on-origin
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
# Default command runs keeper; override in container app args
CMD ["node","--enable-source-maps","dist/script/keeper.js"]
