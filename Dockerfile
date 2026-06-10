# Blissri the Bakeshoppe — production image for AWS App Runner / any container host
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the application
COPY server ./server
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/server.js"]
