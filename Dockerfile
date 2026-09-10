FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
RUN apk add --no-cache nodejs
COPY Caddyfile /etc/caddy/Caddyfile
COPY docker-entrypoint.sh /entrypoint.sh
COPY --from=build /app/dist /srv
COPY scripts/status-lib.mjs scripts/status-api.mjs /app/
RUN chmod +x /entrypoint.sh
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
