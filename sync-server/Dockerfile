# Standalone real-time relay image (deployable to Railway/Render/Fly).
FROM node:22-alpine

WORKDIR /app

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm install --omit=dev

# Copy source (runs via tsx at runtime — no build step needed).
COPY . .

# Railway/Render inject PORT; default to 1234 locally.
ENV PORT=1234
EXPOSE 1234

CMD ["npm", "start"]
