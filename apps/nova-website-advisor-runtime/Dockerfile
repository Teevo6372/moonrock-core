# syntax=docker/dockerfile:1.7
FROM node:22.18.0-bookworm-slim AS build
WORKDIR /workspace/apps/nova-website-advisor-runtime
COPY apps/nova-website-advisor-runtime/package.json apps/nova-website-advisor-runtime/package-lock.json ./
RUN npm ci --ignore-scripts
COPY apps/nova-website-advisor-runtime ./
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

FROM node:22.18.0-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV NOVA_LOCAL_PORT=8787
ENV NOVA_BIND_HOST=0.0.0.0
WORKDIR /workspace/apps/nova-website-advisor-runtime
COPY --from=build /workspace/apps/nova-website-advisor-runtime/package.json ./
COPY --from=build /workspace/apps/nova-website-advisor-runtime/node_modules ./node_modules
COPY --from=build /workspace/apps/nova-website-advisor-runtime/dist ./dist
COPY --from=build /workspace/apps/nova-website-advisor-runtime/fixtures ./fixtures
COPY --from=build /workspace/apps/nova-website-advisor-runtime/prototype ./prototype
COPY --from=build /workspace/apps/nova-website-advisor-runtime/migrations ./migrations
COPY 0000-enterprise/programs/program-006/runtime-activation/website-advisor/sprint-003/schemas/model-output.schema.json /workspace/0000-enterprise/programs/program-006/runtime-activation/website-advisor/sprint-003/schemas/model-output.schema.json
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/src/server.js"]
