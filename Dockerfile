FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm content:mysteries && pnpm content:tiles && pnpm content:validate && pnpm build && pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data DATABASE_PATH=/data/orientation.sqlite CONTENT_DIR=/content
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/dist-client ./dist-client
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/content /content
COPY docker-entrypoint.sh /usr/local/bin/orientation-entrypoint
RUN chmod +x /usr/local/bin/orientation-entrypoint && mkdir -p /data && chown node:node /data
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["orientation-entrypoint"]
CMD ["node", "dist-server/server/index.js"]
