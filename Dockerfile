FROM oven/bun:1 AS backend-base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS backend-builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY back ./back
COPY shared ./shared
COPY back/index.ts .
RUN bun build ./back/index.ts --outfile ./dist/index.js

FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY front ./front
COPY vite.config.ts tsconfig.json ./
RUN npm run build

FROM node:20-alpine AS final
WORKDIR /app
RUN apk add --no-cache nginx
COPY --from=backend-base /app/node_modules /app/node_modules
COPY --from=backend-builder /app/dist /app/dist
COPY --from=frontend-builder /app/dist/front /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
