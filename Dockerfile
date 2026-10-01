# Single-container deploy: Express serves the API and the built React PWA.
# Build:  docker build -t dewantech-todo .
# Run:    docker run -p 4000:4000 --env-file server/.env -e SERVE_CLIENT=true dewantech-todo

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --ignore-scripts
COPY . .
ARG VITE_BASE_PATH=/
ARG VITE_API_URL=
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production SERVE_CLIENT=true PORT=4000
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --workspace server --include-workspace-root=false --ignore-scripts && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "server/dist/index.js"]
