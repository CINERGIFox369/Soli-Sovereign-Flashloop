# Build stage
FROM node:22-alpine AS build
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json* ./
# Install dev dependencies so tsc is available
RUN npm install
COPY . .
# Build TypeScript into dist/
RUN npm run build

# ... previous lines unchanged ...

# Runtime stage: install only production deps and copy dist
FROM node:22-alpine
RUN apk upgrade --no-cache
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --only=production
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production

# Add a non-root user and use it
RUN adduser -D appuser
USER appuser

CMD ["node","--enable-source-maps","dist/script/keeper.js"]
