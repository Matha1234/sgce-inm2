# ── Étape 1 : build React avec Vite ────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN echo ">>> VITE_API_BASE_URL = $VITE_API_BASE_URL <<<"

COPY . .
RUN npm run build

# ── Étape 2 : servir les fichiers statiques avec Nginx ─────────────────────
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
