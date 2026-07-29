# syntax=docker/dockerfile:1.7
# =============================================================================
#  social-network-frontend
# =============================================================================

# -----------------------------------------------------------------------------
#  Stage 1 - build
# -----------------------------------------------------------------------------
#  node:22, not the host's Node. Angular 19 supports ^18.19 / ^20.11 / ^22, and
#  building inside the image means the bundle is identical no matter what the
#  developer happens to have installed - which is the whole point of the .nvmrc
#  sitting next to this file.
FROM node:22-alpine AS builder

WORKDIR /app

# package.json and the lockfile first, on their own. This layer is rebuilt only
# when the dependencies change, so editing a component does not reinstall
# node_modules.
COPY package.json package-lock.json ./

# `npm ci` rather than `npm install`: it installs exactly the lockfile, fails if
# the two disagree, and never silently updates a transitive dependency during a
# build.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

COPY . .

RUN npm run build -- --configuration production

# -----------------------------------------------------------------------------
#  Stage 2 - serve
# -----------------------------------------------------------------------------
#  The Node toolchain does not ship: the output is static files, so the runtime
#  image is nginx and about 50 MB rather than 500 MB with a build toolchain and
#  node_modules inside it.
FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist/social-network-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/healthz | grep -q ok || exit 1

CMD ["nginx", "-g", "daemon off;"]
