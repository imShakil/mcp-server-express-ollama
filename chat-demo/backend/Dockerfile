FROM node:22-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY src/ ./src/
USER app
EXPOSE 4000
CMD ["node", "src/index.js"]
