FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ids.js ./
COPY lib ./lib
COPY public ./public

RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "server.js"]
