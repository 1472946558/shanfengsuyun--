FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data

RUN mkdir -p /data && chown -R node:node /app /data

USER node

EXPOSE 8080

CMD ["node", "src/server.js"]

