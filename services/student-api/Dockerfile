FROM node:22-alpine

ENV NODE_ENV=production

WORKDIR /app

COPY --chown=node:node package.json ./

RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --chown=node:node src ./src
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node data ./data

USER node

EXPOSE 3100

CMD ["node", "src/server.js"]
