# Use Node.js LTS version (same as the main app)
FROM node:20-slim

# Create app directory
WORKDIR /app

# Install dependencies using npm (because package-lock.json exists)
# Copy only necessary files first for better caching
COPY package.json package-lock.json ./
# Use npm ci for clean installs based on lock file
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code using tsup
RUN npm run build

# No need to expose port as it's likely run as a command by the main app

# Default command (can be overridden in docker-compose)
# This will run the built JS file directly
CMD ["node", "dist/index.js"]
